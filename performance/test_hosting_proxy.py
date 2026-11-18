"""Integration check for the real nginx image; requires docker and a frontend build."""
import http.server,threading,subprocess,tempfile,pathlib,requests,time,json,socket
root=pathlib.Path(__file__).resolve().parents[2] / 'frontend'
class Backend(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200)
  if self.path.endswith('set'):self.send_header('Set-Cookie',('GAESA' if 'gaesa' in self.path else 'GCLB')+'=affinity-fixture; Path=/; Secure; HttpOnly')
  self.send_header('Content-Type','application/json');self.end_headers()
  self.wfile.write(json.dumps({'cookie':self.headers.get('Cookie'),'authorization':self.headers.get('Authorization')}).encode())
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Backend)
backend_port=server.server_address[1]
with socket.socket() as probe:
 probe.bind(('127.0.0.1',0)); proxy_port=probe.getsockname()[1]
proxy_url=f'http://127.0.0.1:{proxy_port}'
threading.Thread(target=server.serve_forever,daemon=True).start()
with tempfile.TemporaryDirectory(prefix='vista-nginx-') as tmp:
 p=pathlib.Path(tmp,'default.conf');p.write_text((root/'nginx/default.conf.template').read_text().replace('${BACKEND_URL}',f'http://127.0.0.1:{backend_port}').replace('${NGINX_LOCAL_RESOLVERS}','127.0.0.53').replace('listen 8080;',f'listen 127.0.0.1:{proxy_port};'))
 # Parent directory must be traversable for nginx uid101.
 pathlib.Path(tmp).chmod(0o755)
 name='vista-hosting-proxy-test'
 try:
  subprocess.run(['docker','run','-d','--name',name,'--network','host','-v',str(p)+':/etc/nginx/conf.d/default.conf:ro','-v',str(root/'dist')+':/usr/share/nginx/html:ro','nginxinc/nginx-unprivileged:1.30-alpine'],check=True,capture_output=True)
  for i in range(30):
   try:r=requests.get(proxy_url+'/api/set',timeout=2);break
   except requests.RequestException:time.sleep(.2)
  else:
   print(subprocess.run(['docker','logs',name],capture_output=True,text=True).stdout)
   print(subprocess.run(['docker','logs',name],capture_output=True,text=True).stderr)
   raise AssertionError('nginx did not start')
  assert r.status_code==200,r.text
  assert '__session=GCLB:affinity-fixture' in r.headers['Set-Cookie'],r.headers
  assert 'HttpOnly' in r.headers['Set-Cookie'] and 'SameSite=Lax' in r.headers['Set-Cookie']
  assert 'no-store' in r.headers['Cache-Control']
  r=requests.get(proxy_url+'/api/check',headers={'Cookie':'__session=affinity-fixture','Authorization':'Bearer test-placeholder'},timeout=3)
  assert 'GCLB=affinity-fixture' in r.json()['cookie'],r.text
  assert r.json()['authorization']=='Bearer test-placeholder'
  assert 'Set-Cookie' not in r.headers
  for cookie in ['GAESA','GCLB']:
   r=requests.get(proxy_url+('/api/gaesa-set' if cookie=='GAESA' else '/api/set'),timeout=3)
   assert '__session='+cookie+':affinity-fixture' in r.headers['Set-Cookie']
   r=requests.get(proxy_url+'/api/check',headers={'Cookie':'__session='+cookie+':affinity-fixture'},timeout=3)
   assert cookie+'=affinity-fixture' in r.json()['cookie']
  r=requests.get(proxy_url+'/api/auth/check',headers={'Cookie':'GCLB=original-fixture'},timeout=3)
  assert r.json()['cookie']=='GCLB=original-fixture'
  assert 'no-store' in r.headers['Cache-Control']
  r=requests.get(proxy_url+'/login',timeout=3);assert r.status_code==200 and 'no-cache' in r.headers['Cache-Control']
  print('PASS: nginx config, Hosting GAESA/GCLB bridge, legacy GCLB, bearer forwarding, API no-store and SPA fallback')
 finally:
  subprocess.run(['docker','rm','-f',name],capture_output=True)
server.shutdown()
