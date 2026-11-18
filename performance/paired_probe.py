"""Interleaved fresh HTTPS connections; no account or Vertex traffic."""
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import random
import time

import requests
from domain_routing import use_firebase_origin

HOSTS = ["https://vista.kuros.work", "https://vista-pdg.web.app",
         "https://vista-frontend-sbt7d3iyka-uc.a.run.app"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds", type=int, default=40)
    parser.add_argument("--label", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--route-firebase", action="store_true")
    args = parser.parse_args()
    assert 1 <= args.rounds <= 100
    routing = use_firebase_origin() if args.route_firebase else {"mode": "system-dns"}
    rng = random.Random(20261019)
    samples = []
    for index in range(args.rounds):
        hosts = HOSTS.copy()
        rng.shuffle(hosts)
        for host in hosts:
            start = time.monotonic()
            sample = {"host": host, "round": index + 1,
                      "at": datetime.now(timezone.utc).isoformat()}
            try:
                with requests.get(host + "/", timeout=(5, 10),
                        headers={"Connection": "close", "User-Agent": "VISTA-authorized-domain-performance/1"}) as response:
                    sample.update(status=response.status_code,
                                  validHtml=response.status_code == 200 and "/assets/" in response.text,
                                  bytes=len(response.content))
            except requests.RequestException as exc:
                sample.update(status=0, validHtml=False, error=type(exc).__name__)
            sample["ms"] = round((time.monotonic() - start) * 1000, 3)
            samples.append(sample)
    summary = {}
    for host in HOSTS:
        group = [s for s in samples if s["host"] == host]
        valid = sorted(s["ms"] for s in group if s["validHtml"])
        summary[host] = {"requests": len(group), "failures": sum(not s["validHtml"] for s in group),
                         **({f"p{q}Ms": valid[math.ceil(q / 100 * len(valid)) - 1] for q in [50, 95, 99]} if valid else {})}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"label": args.label, "freshConnections": True, "dnsRouting": routing,
                                      "summary": summary, "samples": samples}, indent=2))
    print(json.dumps(summary), flush=True)


if __name__ == "__main__":
    main()
