"""Query public Maven package coordinates from dependency:tree JSON; never sends source."""
import argparse
import concurrent.futures
from datetime import datetime, timezone
import json
from pathlib import Path

import requests

parser = argparse.ArgumentParser()
parser.add_argument('tree', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
packages = {}


def visit(node):
    for child in node.get('children', []):
        name = child['groupId'] + ':' + child['artifactId']
        packages[(name, child['version'])] = {
            'name': name, 'version': child['version'], 'scope': child.get('scope')}
        visit(child)


visit(json.loads(args.tree.read_text()))
packages = list(packages.values())
queries = [{'package': {'ecosystem': 'Maven', 'name': p['name']},
            'version': p['version']} for p in packages]
response = requests.post('https://api.osv.dev/v1/querybatch', json={'queries': queries}, timeout=60)
response.raise_for_status()
results = response.json()['results']
assert len(results) == len(packages)
for query, result in zip(queries, results):
    while result.get('next_page_token'):
        query['page_token'] = result.pop('next_page_token')
        page = requests.post('https://api.osv.dev/v1/querybatch',
                             json={'queries': [query]}, timeout=60)
        page.raise_for_status()
        next_result = page.json()['results'][0]
        result.setdefault('vulns', []).extend(next_result.get('vulns', []))
        if next_result.get('next_page_token'):
            result['next_page_token'] = next_result['next_page_token']
findings = [dict(p, result=r) for p, r in zip(packages, results) if r.get('vulns')]
ids = {v['id'] for f in findings for v in f['result']['vulns']}


def detail(advisory_id):
    response = requests.get('https://api.osv.dev/v1/vulns/' + advisory_id, timeout=30)
    response.raise_for_status()
    return advisory_id, response.json()


with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    advisories = dict(pool.map(detail, ids))
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps({
    'at': datetime.now(timezone.utc).isoformat(), 'source': 'https://api.osv.dev/v1/querybatch',
    'packagesChecked': len(packages), 'packages': packages, 'findings': findings,
    'advisories': advisories}, indent=2))
print(json.dumps({'packagesChecked': len(packages), 'packagesWithFindings': len(findings),
                  'advisoryCount': len(advisories)}))
