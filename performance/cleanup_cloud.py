"""Remove only manifest-owned test data; use existing backend secret references, never values."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import secrets
import subprocess
import sys
import time

parser = argparse.ArgumentParser()
parser.add_argument('--manifest', type=Path, required=True)
parser.add_argument('--seed-admin-from', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--execute', action='store_true')
args = parser.parse_args()
manifest = json.loads(args.manifest.read_text())
assert re.fullmatch(r'[0-9]{8}-[0-9a-f]{6}', manifest['runId'])
assert manifest['courseCode'] == 'PERF-' + manifest['runId'].upper()
assert manifest['host'] in ['https://vista.kuros.work', 'https://vista-frontend-sbt7d3iyka-uc.a.run.app',
                            'https://vista-pdg.web.app']
assert 1 <= len(manifest['accounts']) <= 40
for account in manifest['accounts']:
    assert isinstance(account['id'], int) and account['id'] > 0
    assert re.fullmatch('perf-' + re.escape(manifest['runId']) + r'-[0-9]{2}@example\.invalid', account['email'])
ids = ','.join(str(a['id']) for a in manifest['accounts'])
assert len(set(a['id'] for a in manifest['accounts'])) == len(manifest['accounts'])
course = manifest['courseCode']
array = f'ARRAY[{ids}]::bigint[]'
sql = f"""BEGIN;
SELECT jsonb_build_object('cleanup','database-capacity','maxConnections',current_setting('max_connections')::integer)::text;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
LOCK TABLE users,courses IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM users WHERE id=ANY({array})) THEN RAISE EXCEPTION 'Test accounts still exist; cancel SQL cleanup'; END IF;
 IF EXISTS (SELECT 1 FROM users u JOIN courses c ON c.id=u.course_id WHERE c.code='{course}') THEN RAISE EXCEPTION 'Test course has enrollments; cancel'; END IF;
END $$;
WITH removed AS (DELETE FROM generation_events WHERE course_code='{course}' RETURNING id)
 SELECT jsonb_build_object('cleanup','performance-events','removed',count(*))::text FROM removed;
WITH removed AS (DELETE FROM assistant_usage WHERE user_id=ANY({array}) RETURNING id)
 SELECT jsonb_build_object('cleanup','performance-usage','removed',count(*))::text FROM removed;
DELETE FROM courses WHERE code='{course}' AND name='Prueba temporal de carga · 40 estudiantes';
SELECT jsonb_build_object('cleanup','performance-complete',
 'remainingAccounts',(SELECT count(*) FROM users WHERE id=ANY({array})),
 'remainingCourses',(SELECT count(*) FROM courses WHERE code='{course}'),
 'remainingEvents',(SELECT count(*) FROM generation_events WHERE course_code='{course}'),
 'remainingUsage',(SELECT count(*) FROM assistant_usage WHERE user_id=ANY({array})))::text;
COMMIT;"""
if not args.execute:
    print(json.dumps({'dryRun': True, 'course': course, 'accounts': len(manifest['accounts']),
                      'project': 'vista-pdg', 'jobIsDeletedAfterExecution': True}))
    sys.exit()
subprocess.run([sys.executable, str(Path(__file__).with_name('accounts.py')), 'cleanup',
                '--host', manifest['host'], '--manifest', str(args.manifest),
                '--seed-admin-from', str(args.seed_admin_from)], check=True)
job = 'vista-perf-cleanup-' + manifest['runId'] + '-' + secrets.token_hex(2)
started = datetime.now(timezone.utc).isoformat()
try:
    command = ['gcloud', 'run', 'jobs', 'create', job, '--quiet', '--project', 'vista-pdg',
        '--region', 'us-central1', '--image', 'docker.io/library/postgres:17',
        '--service-account', 'run-vista-backend@vista-pdg.iam.gserviceaccount.com',
        '--network', 'vista-vpc', '--subnet', 'vista-run-us-central1',
        '--vpc-egress', 'private-ranges-only', '--tasks', '1', '--max-retries', '0',
        '--task-timeout', '90s', '--cpu', '1', '--memory', '512Mi',
        '--set-env-vars', 'PGHOST=10.196.128.3,PGDATABASE=vista_pdg,PGUSER=vista,PGSSLMODE=require,PGCONNECT_TIMEOUT=15',
        '--set-secrets', 'PGPASSWORD=vista-db-password:latest', '--command', 'psql',
        '--args=^~^--no-psqlrc~--set=ON_ERROR_STOP=1~--tuples-only~--no-align~--command~' + sql,
        '--execute-now', '--wait']
    subprocess.run(command, check=True)
    query = ('resource.type="cloud_run_job" AND resource.labels.job_name="' + job
             + '" AND timestamp>="' + started + '"')
    records = []
    # Job completion can precede Cloud Logging publication. Keep the manifest if verification fails.
    for attempt in range(6):
        logs = subprocess.check_output(['gcloud', 'logging', 'read', query, '--project', 'vista-pdg',
                                        '--limit', '100', '--format', 'json(jsonPayload,textPayload)'], text=True)
        records = []
        for row in json.loads(logs):
            if not isinstance(row, dict):
                continue
            data = row.get('jsonPayload')
            if not isinstance(data, dict):
                try:
                    data = json.loads(row.get('textPayload', ''))
                except ValueError:
                    continue
            if data.get('cleanup'):
                records.append(data)
        if any(r['cleanup'] == 'performance-complete' for r in records):
            break
        if attempt < 5:
            time.sleep(5)
    complete = next(r for r in records if r['cleanup'] == 'performance-complete')
    assert all(complete[k] == 0 for k in ['remainingAccounts', 'remainingCourses', 'remainingEvents', 'remainingUsage'])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({'runId': manifest['runId'], 'course': course,
        'accountsRemoved': len(manifest['accounts']), 'records': records, 'temporaryJob': job}, indent=2))
    args.manifest.unlink()
    print('Verified cleanup; local credential manifest removed', flush=True)
finally:
    subprocess.run(['gcloud', 'run', 'jobs', 'delete', job, '--project', 'vista-pdg',
                    '--region', 'us-central1', '--quiet'], check=True)
