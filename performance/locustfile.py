"""Bounded, real-provider classroom exercise. Never logs credentials or raw responses."""
import json
import os
import random
import re
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import gevent
from gevent.event import Event
from locust import HttpUser, between, events, task
from locust.exception import StopUser
from domain_routing import use_firebase_origin

DNS_ROUTING = use_firebase_origin() if os.environ.get("VISTA_LOAD_ROUTE_FIREBASE") == "true" else {"mode": "system-dns"}

MODE = os.environ.get("VISTA_LOAD_MODE", "baseline")
EXPECTED_USERS = int(os.environ.get("VISTA_LOAD_USERS", "40"))
MANIFEST = json.loads(Path(os.environ["VISTA_LOAD_ACCOUNTS"]).read_text())
OUTPUT = Path(os.environ["VISTA_LOAD_OUTPUT"])
OUTPUT.mkdir(parents=True, exist_ok=True)
ACCOUNTS = iter(MANIFEST["accounts"])
GATE = Event()
ready = finished = generated = inflight = peak = failures = 0
samples = []
started = None

CASES = [
    ("stack", None, "Crea una pila con los valores 3, 7, 9, 12, 18, con 18 en el tope."),
    ("queue", None, "Crea una cola con los valores 3, 7, 9, 12, 18, con 3 al frente."),
    ("tree", "avl", "Crea un árbol AVL insertando 30, 20, 40, 10, 25, 35, 50."),
    ("tree", "bst", "Crea un árbol BST insertando 30, 20, 40, 10, 25, 35, 50."),
    ("graph", None, "Crea un grafo no dirigido de 5 nodos en ciclo C5."),
    ("linked-list", "singly", "Crea una lista simplemente enlazada con valores 3, 7, 9, 12, 18."),
]


@events.test_start.add_listener
def begin(environment, **kwargs):
    global started
    started = datetime.now(timezone.utc).isoformat()


@events.request.add_listener
def sample(request_type, name, response_time, response_length, response=None, exception=None, **kwargs):
    samples.append({"at": datetime.now(timezone.utc).isoformat(), "method": request_type,
                    "name": name, "ms": round(response_time, 3), "bytes": response_length,
                    "status": getattr(response, "status_code", 0),
                    "failure": None if exception is None else str(exception)[:220],
                    "memory": response.headers.get("X-Assistant-Memory") if response is not None and name.startswith("vertex/") else None})


@events.test_stop.add_listener
def end(environment, **kwargs):
    data = {"mode": MODE, "host": environment.host, "start": started,
            "end": datetime.now(timezone.utc).isoformat(), "users": EXPECTED_USERS,
            "ready": ready, "finished": finished, "generations": generated,
            "generationFailures": failures, "maxInflightGenerations": peak,
            "dnsRouting": DNS_ROUTING,
            "statusCounts": dict(Counter(str(s["status"]) for s in samples))}
    (OUTPUT / f"{MODE}-metadata.json").write_text(json.dumps(data, indent=2))
    (OUTPUT / f"{MODE}-samples.jsonl").write_text("".join(json.dumps(s) + "\n" for s in samples))


class Student(HttpUser):
    wait_time = between(15, 25)

    def on_start(self):
        global ready
        self.account = next(ACCOUNTS)
        self.round = 0
        self.closed = False
        self.refresh = None
        self.refresh_at = time.monotonic() + 600
        self.client.headers["User-Agent"] = "VISTA-authorized-classroom-performance/1"
        with self.client.get("/", name="frontend/html", timeout=60, catch_response=True) as response:
            if response.status_code == 200:
                assets = re.findall(r'(?:src|href)="(/assets/[^\"]+)"', response.text)
            else:
                assets = []
        for asset in assets:
            self.client.get(asset, name="frontend/js" if asset.endswith(".js") else "frontend/css", timeout=60)
        with self.client.post("/api/auth/login", name="auth/login", json={"email": self.account["email"], "password": self.account["password"]}, timeout=60, catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Login HTTP {response.status_code}")
                raise StopUser()
            auth = response.json()
            self.client.headers["Authorization"] = "Bearer " + auth["accessToken"]
            self.refresh = auth["refreshToken"]
        for path, name in [("/api/algorithm/catalog", "api/catalog"), ("/api/assistant/quota", "api/quota"), ("/api/assistant/session", "api/session")]:
            self.client.get(path, name=name, timeout=60)
        ready += 1
        if ready == EXPECTED_USERS:
            GATE.set()

    def on_stop(self):
        if self.refresh:
            self.client.delete("/api/assistant/session", name="api/clear-session", timeout=30)
            self.client.post("/api/auth/logout", name="auth/logout", json={"refreshToken": self.refresh}, timeout=30)
            self.refresh = None

    def algorithm(self):
        with self.client.post("/api/algorithm/steps", name="api/algorithm-avl", json={"type": "tree", "subtype": "avl", "operation": "insert", "values": [30, 20, 10, 25, 40]}, headers={"X-Visualization-Mode": "2D"}, timeout=60, catch_response=True) as response:
            if response.status_code == 200 and not response.json().get("steps"):
                response.failure("Algorithm returned no steps")

    @task
    def work(self):
        global generated, inflight, peak, failures, finished
        if MODE == "soak" and time.monotonic() >= self.refresh_at:
            with self.client.post("/api/auth/refresh", name="auth/refresh",
                    json={"refreshToken": self.refresh}, timeout=30, catch_response=True) as response:
                if response.status_code != 200:
                    response.failure(f"Refresh HTTP {response.status_code}")
                    self.environment.runner.quit()
                    raise StopUser()
                auth = response.json()
                self.client.headers["Authorization"] = "Bearer " + auth["accessToken"]
                self.refresh = auth["refreshToken"]
                self.refresh_at = time.monotonic() + 600
        if MODE == "baseline":
            self.client.get("/api/assistant/quota", name="api/quota", timeout=60)
            self.client.get("/api/assistant/session", name="api/session", timeout=60)
            self.algorithm()
            return
        if MODE == "burst" and not GATE.wait(timeout=90):
            self.environment.runner.quit()
            return
        kind, subtype, prompt = CASES[(self.account["id"] + self.round) % len(CASES)]
        body = {"type": kind, "prompt": prompt}
        if subtype:
            body["subtype"] = subtype
        generated += 1
        assert generated <= (EXPECTED_USERS * 20 if MODE == "soak" else 80 if MODE == "mixed" else EXPECTED_USERS)
        inflight += 1
        peak = max(peak, inflight)
        label = "vertex/generate-chat" if self.round else "vertex/generate-structure"
        try:
            with self.client.post("/api/generate", name=label, json=body, headers={"X-Visualization-Mode": "2D"}, timeout=60, catch_response=True) as response:
                if response.status_code != 200:
                    failures += 1
                    # Only controlled prompt data; never response headers/session tokens.
                    message = ""
                    try:
                        message = str(response.json().get("message", ""))[:160]
                    except ValueError:
                        pass
                    response.failure(f"Generation HTTP {response.status_code}: {message}")
                else:
                    data = response.json()
                    if data.get("error") or not data.get("nodes") or data.get("meta", {}).get("type") != kind:
                        failures += 1
                        response.failure("Invalid structure, empty nodes or wrong type")
        finally:
            inflight -= 1
        self.algorithm()
        self.client.get("/api/assistant/session", name="api/session", timeout=60)
        self.round += 1
        if generated >= 10 and failures / generated > 0.25:
            gevent.spawn_later(1, self.environment.runner.quit)
        if self.round >= (20 if MODE == "soak" else 2 if MODE == "mixed" else 1):
            finished += 1
            if finished == EXPECTED_USERS:
                gevent.spawn_later(2, self.environment.runner.quit)
            raise StopUser()
        gevent.sleep(random.uniform(60, 90) if MODE == "soak" else random.uniform(30, 45))
