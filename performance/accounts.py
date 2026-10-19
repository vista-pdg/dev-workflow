"""Provision/clean only the explicitly recorded load-test accounts; admin tokens stay in memory."""
import argparse
import json
import os
import re
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path

import requests


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["setup", "cleanup"])
    parser.add_argument("--host", required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--seed-admin-from", type=Path, required=True)
    parser.add_argument("--count", type=int, default=40)
    args = parser.parse_args()
    if not 1 <= args.count <= 40:
        parser.error("This exercise is bounded to 40 students")
    seed = args.seed_admin_from.read_text()
    admin = re.search(r'ensureUser\("(admin@vista.com)",\s*"[^"]*",\s*"([^"]*)"', seed)
    if not admin:
        raise RuntimeError("Provisioned administrator not found")
    session = requests.Session()
    session.headers["User-Agent"] = "VISTA-authorized-classroom-performance/1"

    def request(method, path, **kwargs):
        response = session.request(method, args.host + path, timeout=(10, 140), **kwargs)
        if not response.ok:
            raise RuntimeError(f"{method} {path}: HTTP {response.status_code}")
        return response.json() if response.content else None

    auth = request("POST", "/api/auth/login", json={"email": admin[1], "password": admin[2]})
    assert "ADMIN" in auth["roles"]
    session.headers["Authorization"] = "Bearer " + auth["accessToken"]
    try:
        if args.action == "setup":
            if args.manifest.exists():
                raise RuntimeError("Refusing to replace an existing account manifest")
            run_id = datetime.now(timezone.utc).strftime("%Y%m%d") + "-" + secrets.token_hex(3)
            course = "PERF-" + run_id.upper()
            term = next(t["code"] for t in request("GET", "/api/admin/terms") if t["active"])
            role = next(r["id"] for r in request("GET", "/api/admin/roles") if r["name"] == "STUDENT")
            manifest = {"host": args.host, "runId": run_id, "courseCode": course, "term": term, "accounts": []}
            args.manifest.parent.mkdir(parents=True, exist_ok=True, mode=0o700)

            def save():
                fd = os.open(args.manifest, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
                with os.fdopen(fd, "w") as handle:
                    json.dump(manifest, handle)

            save()
            request("POST", "/api/admin/courses", json={"code": course, "name": "Prueba temporal de carga · 40 estudiantes", "termCode": term})
            for index in range(args.count):
                email = f"perf-{run_id}-{index + 1:02d}@example.invalid"
                password = secrets.token_urlsafe(24)
                user = request("POST", "/api/admin/users", json={"displayName": f"Carga temporal {index + 1:02d}", "email": email, "password": password, "roleIds": [role]})
                manifest["accounts"].append({"id": user["id"], "email": email, "password": password})
                save()
                request("PUT", f"/api/admin/students/{user['id']}/course", json={"courseCode": course})
                time.sleep(0.15)
                if (index + 1) % 10 == 0:
                    print(f"Prepared {index + 1}/{args.count} isolated students", flush=True)
            print(json.dumps({"course": course, "students": len(manifest["accounts"])}), flush=True)
        else:
            manifest = json.loads(args.manifest.read_text())
            assert manifest["host"] == args.host and manifest["courseCode"].startswith("PERF-")
            users = {u["id"]: u for u in request("GET", "/api/admin/users")}
            removed = 0
            for account in manifest["accounts"]:
                user = users.get(account["id"])
                if user is None:
                    continue
                assert user["email"] == account["email"] and user["email"].startswith("perf-") and user["email"].endswith("@example.invalid")
                request("DELETE", f"/api/admin/users/{account['id']}")
                removed += 1
                time.sleep(0.15)
            print(json.dumps({"testAccountsRemoved": removed, "temporaryCourse": manifest["courseCode"]}), flush=True)
    finally:
        request("POST", "/api/auth/logout", json={"refreshToken": auth["refreshToken"]})


if __name__ == "__main__":
    main()
