"""Exercise the real published gate with the disposable verification API."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import hashlib, json, os, subprocess
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
API='https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    key=json.loads((ROOT/'.local-archive/site-access.json').read_text())['key']
    env={**os.environ,'WG_TEST_ENTRY_HASH':hashlib.sha256(key.encode()).hexdigest()}
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],env=env,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    server=ThreadingHTTPServer(('127.0.0.1',4178),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    url='http://127.0.0.1:4178/'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            context=browser.new_context(reduced_motion='reduce')
            calls=[];errors=[];requests=[]
            def proxy(route):
                calls.append(urlsplit(route.request.url).path)
                route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path))
            context.route(API+'/**',proxy)
            page=context.new_page()
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('request',lambda req:requests.append(req.url))
            def navigate(address):
                page.goto('about:blank')
                page.goto(address)
            navigate(url)
            expect(page.locator('#entry-message')).to_have_text('Page introuvable.')
            assert page.locator('#keypad,#app').count()==0
            assert not calls
            for suffix in ['#access=incorrect','?ancienne=1#access='+key,'index.html#access='+key]:
                navigate(url+suffix)
                expect(page.locator('#entry-message')).to_have_text('Page introuvable.')
                assert page.locator('#keypad,#app').count()==0
                assert not calls
            navigate(url+'#access='+('f'*64))
            expect(page.locator('#entry-message')).to_have_text('Page introuvable.')
            assert page.locator('#keypad,#app').count()==0
            assert not any('/site-entry.json' in req for req in requests)
            calls.clear()
            navigate(url+'mauvais/chemin#access='+key)
            assert page.locator('#keypad,#app').count()==0
            assert not calls
            navigate(url+'#access='+key)
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
            assert '#access=' in page.url
            assert page.locator('script:not([integrity]),link[rel=stylesheet]:not([integrity])').count()==0
            page.keyboard.type('01234567')
            expect(page.locator('#lock .access-heading h2')).to_have_text('Confirmer le code')
            page.keyboard.type('01234567')
            expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.reload()
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
            page.keyboard.type('01234567')
            expect(page.locator('#app')).to_be_visible(timeout=30000)
            assert not any(key in urlsplit(req).path or key in urlsplit(req).query for req in requests)
            assert not errors,errors
            page.set_viewport_size({'width':390,'height':844})
            page.reload()
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            # Removing the fragment in the same tab must close the app again.
            with page.expect_navigation(wait_until='load'):
                page.evaluate('location.hash=""')
            expect(page.locator('#entry-message')).to_have_text('Page introuvable.')
            assert page.locator('#keypad,#app').count()==0
            navigate(url+'#access='+key)
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
            # An API outage must never fall back to exposing the application.
            context.unroute(API+'/**')
            context.route(API+'/**',lambda route:route.abort())
            page.reload()
            expect(page.locator('#entry-message')).to_contain_text('Ouverture indisponible')
            assert page.locator('#keypad,#app').count()==0
            browser.close()
            print('PASS: lien absent ou incorrect masque le site, lien valide ouvre le clavier, donnees conservees au rechargement, mobile et panne serveur verifies')
    finally:
        server.shutdown();server.server_close();process.terminate();process.wait(timeout=10)

if __name__=='__main__':run()
