"""A cached private gate retains its CSP after document.write of the new app."""
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from pathlib import Path
from urllib.parse import urlsplit
import hashlib,json,os,subprocess
from playwright.sync_api import sync_playwright,expect
from private_entry_test import Quiet,API
from site_fixture import PRIVATE_ACCESS_FILE
from push_fixture import configure_push

ROOT=Path(__file__).resolve().parents[1]

class CachedGate(Quiet):
    visits=0
    always_blocked=False
    def do_GET(self):
        if urlsplit(self.path).path=='/seed':
            data=b'<!doctype html><title>Local regression fixture</title>'
            self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
        if urlsplit(self.path).path=='/':
            type(self).visits+=1
            data=(ROOT/'docs/index.html').read_bytes()
            if type(self).visits==1 or type(self).always_blocked:data=data.replace(b"worker-src 'self'",b"worker-src 'none'")
            self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Cache-Control','max-age=600');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        else:super().do_GET()

def run():
    key=json.loads(PRIVATE_ACCESS_FILE.read_text())['key']
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(CachedGate,directory=str(ROOT/'docs')));Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],env={**os.environ,'WG_TEST_ENTRY_HASH':hashlib.sha256(key.encode()).hexdigest(),'WG_TEST_ORIGIN':origin},stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(channel='msedge');context=browser.new_context();configure_push(context,origin)
            context.add_init_script("globalThis.permissionRequests=0;const original=Notification.requestPermission.bind(Notification);Notification.requestPermission=(...args)=>{permissionRequests++;return original(...args);};")
            # Account setup consumes its fragment while recovery fetches the gate.
            context.add_init_script("document.addEventListener('securitypolicyviolation',event=>{if(event.effectiveDirective==='worker-src')history.replaceState(null,'',location.pathname+location.search);});")
            context.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path)))
            page=context.new_page();page.goto(origin+'/seed')
            saved=page.evaluate("""async()=>{const c=await import('/browser/crypto.js'),s=await import('/browser/storage.js');const result=await c.create({version:2,items:[{id:'saved',type:'memo',title:'Preserved fixture',content:'<p>Existing encrypted data</p>'}],folders:[],settings:[],activity:[]},'01234567');await s.write(result.envelope,0);return result.envelope;}""")
            page.goto(origin+'/?access='+key+'#account='+('a'*64));expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
            if os.environ.get('WG_REPRODUCE_OLD_CSP')=='1':
                result=page.evaluate("async()=>{try{await navigator.serviceWorker.register('/push-worker.js');return 'unexpected success';}catch(error){return error.message;}}")
                assert 'Content Security Policy' in result,result
                print('REPRODUCED: fresh app inherits worker-src none from the cached private gate.')
            else:
                page.wait_for_function("async()=>!!(await navigator.serviceWorker.getRegistration('/'))?.active",timeout=30000)
                expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
                assert page.evaluate('permissionRequests')==0
                assert page.evaluate('async()=>await WolfGuardPhone.read()') is None
                assert page.evaluate('async()=>await WolfGuardStorage.read()')==saved
                result=page.evaluate("""async()=>{const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const key=WolfGuardPhone.base64(await crypto.subtle.exportKey('raw',pair.publicKey));return WolfGuardPhone.register(key,async data=>({id:data.deviceId,subscription:data.subscription}));}""")
                assert len(result['id'])==32 and result['subscription']['endpoint'].startswith('https://fcm.googleapis.com/')
                assert CachedGate.visits>=2
                assert page.evaluate("sessionStorage.getItem('wolfguard-push-csp-refresh')") is None
                # The private URL and existing encrypted data are retained.
                assert urlsplit(page.url).query=='access='+key
                assert urlsplit(page.url).fragment=='account='+('a'*64)
                print('PASS: old cached gate refreshed automatically; real service worker and phone registration succeed without clearing browser storage.')
                # An externally enforced policy must not cause a reload loop.
                CachedGate.visits=0;CachedGate.always_blocked=True
                blocked=browser.new_context();configure_push(blocked,origin)
                blocked.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path)))
                page=blocked.new_page();page.goto(origin+'/?access='+key)
                page.wait_for_function("()=>!!sessionStorage.getItem('wolfguard-push-csp-refresh')")
                expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
                page.wait_for_timeout(1500);visits=CachedGate.visits;page.wait_for_timeout(1500)
                assert CachedGate.visits==visits and visits<=3
                result=page.evaluate("async()=>{try{await WolfGuardPhone.register('test',()=>{});return '';}catch(error){return error.message;}}")
                assert 'ancienne règle de sécurité' in result and 'Content Security Policy' not in result
                print('PASS: persistent CSP restriction has one refresh attempt, a readable error and no reload loop.')
            browser.close()
    finally:process.terminate();process.wait(timeout=10);server.shutdown();server.server_close()

if __name__=='__main__':run()
