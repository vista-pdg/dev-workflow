"""Read Cloud Monitoring with OAuth held only in memory; save metrics, never credentials."""
import argparse
import concurrent.futures
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import requests


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", default="vista-pdg")
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", default=datetime.now(timezone.utc).isoformat())
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    token = subprocess.check_output(["gcloud", "auth", "print-access-token"], text=True).strip()
    headers = {"Authorization": "Bearer " + token}
    base = f"https://monitoring.googleapis.com/v3/projects/{args.project}"
    metrics = [
        "run.googleapis.com/request_count", "run.googleapis.com/request_latencies",
        "run.googleapis.com/container/cpu/utilizations", "run.googleapis.com/container/memory/utilizations",
        "run.googleapis.com/container/instance_count", "run.googleapis.com/container/max_request_concurrencies",
        "cloudsql.googleapis.com/database/cpu/utilization", "cloudsql.googleapis.com/database/memory/utilization",
        "cloudsql.googleapis.com/database/memory/components", "cloudsql.googleapis.com/database/memory/usage",
        "cloudsql.googleapis.com/database/memory/total_usage", "cloudsql.googleapis.com/database/memory/quota",
        "cloudsql.googleapis.com/database/postgresql/num_backends", "cloudsql.googleapis.com/database/network/connections",
    ]
    discovered = requests.get(base + "/metricDescriptors", headers=headers, params={"filter": 'metric.type = starts_with("aiplatform.googleapis.com/publisher/online_serving")', "pageSize": 100}, timeout=45)
    if discovered.ok:
        metrics += [m["type"] for m in discovered.json().get("metricDescriptors", [])
                    if any(word in m["type"] for word in ["invocation", "token", "quota", "error", "latenc", "first", "response"])]

    def fetch(metric):
        condition = f'metric.type = "{metric}"'
        if metric.startswith("run."):
            condition += ' AND (resource.labels.service_name="vista-frontend" OR resource.labels.service_name="vista-backend")'
        elif metric.startswith("cloudsql."):
            condition += f' AND resource.labels.database_id="{args.project}:vista-pg"'
        params = {"filter": condition, "interval.startTime": args.start, "interval.endTime": args.end, "view": "FULL", "pageSize": 1000}
        response = requests.get(base + "/timeSeries", headers=headers, params=params, timeout=45)
        if not response.ok:
            return metric, {"http": response.status_code, "message": response.json().get("error", {}).get("message", "")}
        data = response.json()
        return metric, {"series": data.get("timeSeries", []), "incomplete": bool(data.get("nextPageToken"))}

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        result = dict(pool.map(fetch, metrics))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"start": args.start, "end": args.end, "metrics": result}, indent=2))
    print(json.dumps({"metrics": len(result), "withData": sum(bool(v.get("series")) for v in result.values()), "errors": {k:v["http"] for k,v in result.items() if "http" in v}}))


if __name__ == "__main__":
    main()
