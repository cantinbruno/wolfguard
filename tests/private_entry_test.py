"""The HTTP server, rather than an error message inside a 200 page, gates entry."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from urllib.parse import urlsplit
import hashlib, json, os, secrets, subprocess

ROOT=Path(__file__).resolve().parents[1]
SITE='https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'

def run():
    key=secrets.token_hex(32)
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    env={**os.environ,'WG_TEST_ENTRY_HASH':hashlib.sha256(key.encode()).hexdigest(),'WG_TEST_FRONTEND_ORIGIN':SITE}
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],env=env,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            context=browser.new_context(reduced_motion='reduce')
            calls=[];errors=[]
            def proxy(route):
                url=urlsplit(route.request.url)
                calls.append(url.path)
                route.fulfill(response=route.fetch(url=backend+url.path+('?' + url.query if url.query else '')))
            context.route(SITE+'/**',proxy)
            page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            for suffix in ['/', '/#access='+key, '/?access='+('f'*64), '/?access=incorrect', '/?access='+key+'&extra=1', '/index.html?access='+key, '/inconnu?access='+key]:
                response=context.request.get(backend+suffix)
                assert response.status==404,(suffix,response.status)
                assert response.body()==b''
                assert 'no-store' in response.headers['cache-control']
            assert not (ROOT/'docs/index.html').exists()
            assert not (ROOT/'docs/404.html').exists()
            response=page.goto(SITE+'/?access='+key+'#activate='+('b'*64))
            assert response.status==200
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
            assert page.evaluate('WolfGuardCloud.enabled')
            page.keyboard.type('01234567')
            expect(page.locator('#lock .access-heading h2')).to_have_text('Confirmer le code')
            page.keyboard.type('01234567')
            expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.reload()
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
            page.keyboard.type('01234567')
            expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.set_viewport_size({'width':390,'height':844})
            page.reload()
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=30000)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert page.locator('script:not([integrity]),link[rel=stylesheet]:not([integrity])').count()==0
            assert not errors,errors
            assert '/api/status' in calls
            browser.close()
        print('PASS: vraies reponses HTTP 404 vides sans lien valide, HTTP 200 uniquement avec la bonne cle, code et donnees conserves au rechargement, bureau et mobile')
    finally:
        process.terminate();process.wait(timeout=10)

if __name__=='__main__':run()
