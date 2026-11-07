"""GitHub Pages entry: valid link opens the app, invalid links fail DNS natively."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
import hashlib,json,os,subprocess
from site_fixture import PRIVATE_ACCESS_FILE

ROOT=Path(__file__).resolve().parents[1]
API='https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'
UNAVAILABLE='https://site-introuvable.invalid/'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
    def send_error(self,code,message=None,explain=None):
        if code!=404:return super().send_error(code,message,explain)
        data=(ROOT/'docs/404.html').read_bytes()
        self.send_response(404)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Content-Length',str(len(data)))
        self.end_headers()
        if self.command!='HEAD':self.wfile.write(data)

def run():
    key=json.loads(PRIVATE_ACCESS_FILE.read_text())['key']
    env={**os.environ,'WG_TEST_ENTRY_HASH':hashlib.sha256(key.encode()).hexdigest()}
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],env=env,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    server=ThreadingHTTPServer(('127.0.0.1',4178),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    url='http://127.0.0.1:4178/'
    try:
        with sync_playwright() as p:
            # Inspect the native error screen in a full browser, not headless shell.
            browser=p.chromium.launch(channel='msedge');context=browser.new_context(reduced_motion='reduce')
            context.add_init_script("globalThis.cspViolations=[];document.addEventListener('securitypolicyviolation',event=>cspViolations.push({directive:event.effectiveDirective,blocked:event.blockedURI}));")
            # Stub inference only: the real private-entry CSP must permit the
            # module worker and its message exchange without downloading weights.
            context.route('**/js/ai/worker.js*',lambda route:route.fulfill(content_type='text/javascript',body="self.onmessage=({data})=>self.postMessage({id:data.id,type:'ready',device:'wasm'});"))
            calls=[];errors=[]
            def proxy(route):
                calls.append(urlsplit(route.request.url).path)
                route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path))
            context.route(API+'/**',proxy)
            page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            def ready():
                expect(page.locator('#keypad')).to_be_visible(timeout=30000)
                expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
            def missing(suffix):
                page.goto('about:blank')
                with page.expect_event('requestfailed',predicate=lambda request:request.url==UNAVAILABLE) as failure:
                    page.goto(url+suffix,wait_until='commit')
                assert failure.value.failure=='net::ERR_NAME_NOT_RESOLVED'
                expect(page.locator('#main-frame-error')).to_be_visible()
                assert page.locator('#keypad,#app,#entry-message').count()==0
            wrong=('0' if key[0]!='0' else '1')+key[1:]
            for suffix in ['', '?access=incorrect','?access='+wrong,'?access='+key+'&extra=1','index.html?access='+key,'#access='+key]:missing(suffix)
            response=context.request.get(url+'inconnu?access='+key)
            assert response.status==404 and response.body()==(ROOT/'docs/404.html').read_bytes()
            missing('inconnu?access='+key)
            page.goto(url+'?access='+key)
            ready()
            assert page.locator('script:not([integrity]),link[rel=stylesheet]:not([integrity])').count()==0
            page.keyboard.type('01234567')
            expect(page.locator('#lock .access-heading h2')).to_have_text('Confirmer le code')
            page.keyboard.type('01234567');expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.wait_for_function('()=>!document.querySelector("#app").inert')
            assert page.locator('script[src*="push-device"]').count()==0
            assert page.evaluate("async()=>!(await navigator.serviceWorker.getRegistration('/'))")
            assert page.evaluate("async()=>(await WolfGuardBrowserAI.prepare()).type")=='ready'
            manifest=context.new_cdp_session(page).send('Page.getAppManifest')
            assert manifest['url'].endswith('/phone-manifest.json') and not manifest['errors'],manifest
            assert not page.evaluate('cspViolations'),page.evaluate('cspViolations')
            page.evaluate('WolfGuardBrowserAI.dispose()')
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.set_viewport_size({'width':390,'height':844});page.reload()
            expect(page.locator('#app')).to_be_visible(timeout=30000)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            missing('')
            context.unroute(API+'/**');context.route(API+'/**',lambda route:route.abort())
            missing('?access='+key)
            assert calls and all(path=='/api/entry' for path in calls)
            assert not errors,errors
            assert not (ROOT/'docs/browser/not-found.html').exists()
            browser.close()
        print('PASS: private encrypted entry, AI worker, manifest, no browser push registration, native DNS failures, reload, mobile and API outage verified')
    finally:
        server.shutdown();server.server_close();process.terminate();process.wait(timeout=10)

if __name__=='__main__':run()
