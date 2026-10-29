"""GitHub Pages entry: the good link opens the app; bad links end at real 404s."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
import hashlib,json,os,subprocess

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
            browser=p.chromium.launch();context=browser.new_context(reduced_motion='reduce')
            calls=[];errors=[]
            def proxy(route):
                calls.append(urlsplit(route.request.url).path)
                route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path))
            context.route(API+'/**',proxy)
            page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            def missing(suffix):
                page.goto('about:blank')
                with page.expect_response(lambda response:response.url==url+'404') as result:
                    page.goto(url+suffix,wait_until='commit')
                assert result.value.status==404
                expect(page).to_have_url(url+'404')
                assert page.locator('#keypad,#app,#entry-message').count()==0
            wrong=('0' if key[0]!='0' else '1')+key[1:]
            for suffix in ['', '?access=incorrect','?access='+wrong,'?access='+key+'&extra=1','index.html?access='+key,'#access='+key]:missing(suffix)
            page.goto('about:blank');response=page.goto(url+'inconnu?access='+key)
            assert response.status==404
            assert page.locator('#keypad,#app').count()==0
            page.goto(url+'?access='+key)
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
            assert page.locator('script:not([integrity]),link[rel=stylesheet]:not([integrity])').count()==0
            page.keyboard.type('01234567')
            expect(page.locator('#lock .access-heading h2')).to_have_text('Confirmer le code')
            page.keyboard.type('01234567');expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.reload();expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
            page.keyboard.type('01234567');expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.set_viewport_size({'width':390,'height':844});page.reload()
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            missing('')
            context.unroute(API+'/**');context.route(API+'/**',lambda route:route.abort())
            missing('?access='+key)
            assert calls and all(path=='/api/entry' for path in calls)
            assert not errors,errors
            assert not (ROOT/'docs/404.html').exists()
            browser.close()
        print('PASS: entree GitHub Pages conservee, bon lien ouvre le clavier, mauvais liens diriges vers une vraie 404, donnees conservees au rechargement, mobile et panne API verifies')
    finally:
        server.shutdown();server.server_close();process.terminate();process.wait(timeout=10)

if __name__=='__main__':run()
