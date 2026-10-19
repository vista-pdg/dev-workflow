"""Explicitly invoked cloud check; two billable generations, no credentials in evidence."""
import argparse
import json
from pathlib import Path

import requests


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--host", default="https://vista-pdg.web.app")
    args = parser.parse_args()
    assert args.host in {"https://vista-pdg.web.app", "https://vista.kuros.work"}
    account = json.loads(args.manifest.read_text())["accounts"][0]
    session = requests.Session()
    session.headers["User-Agent"] = "VISTA-authorized-hosting-verification/1"
    refresh = None
    evidence = {"host": args.host, "checks": {}, "generations": 0}

    def call(method, path, **kwargs):
        response = session.request(method, args.host + path, timeout=60, **kwargs)
        response.raise_for_status()
        return response

    try:
        auth = call("POST", "/api/auth/login", json={"email": account["email"], "password": account["password"]}).json()
        refresh = auth["refreshToken"]
        session.headers["Authorization"] = "Bearer " + auth["accessToken"]
        call("DELETE", "/api/assistant/session")
        first = call("POST", "/api/generate", json={"type": "stack", "prompt": "Crea una pila con los valores 3, 7, 9, con 9 en el tope."})
        evidence["generations"] += 1
        assert first.json().get("nodes") and first.json()["meta"]["type"] == "stack"
        evidence["checks"]["memory_header_active"] = first.headers.get("X-Assistant-Memory") == "active"
        cookies = [c for c in session.cookies if c.name == "__session"]
        evidence["checks"]["affinity_cookie_secure_httponly"] = bool(cookies) and all(c.secure and "HttpOnly" in c._rest for c in cookies)
        for _ in range(10):
            status = call("GET", "/api/assistant/session")
            assert status.json()["active"] and status.json()["structureType"] == "stack"
            assert "no-store" in status.headers.get("Cache-Control", "")
        evidence["checks"]["session_continuity_10_requests"] = True
        auth = call("POST", "/api/auth/refresh", json={"refreshToken": refresh}).json()
        refresh = auth["refreshToken"]
        session.headers["Authorization"] = "Bearer " + auth["accessToken"]
        assert call("GET", "/api/assistant/session").json()["active"]
        evidence["checks"]["refresh_preserves_session"] = True
        second = call("POST", "/api/generate", json={"type": "stack", "prompt": "Sobre la pila actual, agrega 12 en el tope conservando los valores que ya contiene."})
        evidence["generations"] += 1
        assert second.json().get("nodes") and second.json()["meta"]["type"] == "stack"
        evidence["checks"]["followup_structure"] = True
        assert all(evidence["checks"].values()), evidence["checks"]
    finally:
        if refresh:
            call("DELETE", "/api/assistant/session")
            call("POST", "/api/auth/logout", json={"refreshToken": refresh})
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(evidence, indent=2))
    print(json.dumps(evidence))


if __name__ == "__main__":
    main()
