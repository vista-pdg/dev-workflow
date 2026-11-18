"""Exact nearest-rank percentiles from sanitized Locust samples, not rounded histogram bins."""
import json
import math
from collections import Counter
from pathlib import Path
import argparse


def percentiles(samples):
    values = sorted(s["ms"] for s in samples)
    if not values:
        return {}
    return {f"p{q}": round(values[max(0, math.ceil(q / 100 * len(values)) - 1)], 2) for q in [50, 95, 99]} | {"max": round(max(values), 2)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    phases = []
    for metadata in sorted(args.directory.rglob("*-metadata.json")):
        data = json.loads(metadata.read_text())
        data["phasePath"] = str(metadata.relative_to(args.directory).parent)
        samples = [json.loads(line) for line in metadata.with_name(metadata.name.replace("-metadata.json", "-samples.jsonl")).read_text().splitlines()]
        endpoints = {}
        for name in sorted({s["name"] for s in samples}):
            group = [s for s in samples if s["name"] == name]
            endpoints[name] = {"requests": len(group), "failures": sum(bool(s["failure"]) for s in group), **percentiles(group)}
        generation = [s for s in samples if s["name"].startswith("vertex/")]
        data.update({"requests": len(samples), "failures": sum(bool(s["failure"]) for s in samples),
                     "generationPercentilesMs": percentiles(generation),
                     "memory": dict(Counter(s.get("memory") for s in generation)), "endpoints": endpoints})
        phases.append(data)
    (args.directory / "summary.json").write_text(json.dumps(phases, indent=2))
    for data in phases:
        print(json.dumps({k:data[k] for k in ["mode", "host", "users", "ready", "generations", "generationFailures", "maxInflightGenerations", "requests", "failures", "generationPercentilesMs"]}))


if __name__ == "__main__":
    main()
