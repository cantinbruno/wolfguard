"""A refresh resumes one authenticated tab without extending its idle deadline."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json
import os
import subprocess
from playwright.sync_api import sync_playwright, expect
from site_fixture import WolfGuardTestHandler

ROOT = Path(__file__).resolve().parents[1]
CODE = '07942685'
API = 'https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'


class Quiet(WolfGuardTestHandler):
    def log_message(self, *_args):
        pass


def ready(page):
    expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)


def unlocked(page):
    expect(page.locator('#app')).to_be_visible(timeout=30000)
    page.wait_for_function("() => !document.querySelector('#app').inert")


def seed(page):
    page.evaluate("""async code => {
      const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
      const payload={version:2,items:[{id:'resume-note',type:'memo',unifiedDocument:true,title:'Reprise sans code',content:'<p>Contenu conserve</p>',tags:[],folderId:null}],folders:[],settings:[],activity:[]};
      const result=await c.create(payload,code);await s.write(result.envelope,0);
    }""", CODE)


def run():
    node = Path(os.environ['LOCALAPPDATA']) / 'WolfGuardWeb/runtime/node.exe'
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT/'docs')))
    url = f'http://127.0.0.1:{server.server_port}/'
    backend_process = subprocess.Popen([str(node), str(ROOT/'tests/server-fixture.mjs')], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, env={**os.environ,'WG_TEST_ORIGIN':url.rstrip('/')})
    backend = 'http://127.0.0.1:' + str(json.loads(backend_process.stdout.readline())['port'])
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            local = browser.new_context(reduced_motion='reduce')
            page = local.new_page()
            # Keep real Navigation Timing: Playwright's full clock mock erases
            # navigation entries, which this reload-only feature must inspect.
            page.add_init_script("""(() => {const now=Date.now.bind(Date);Date.now=()=>now()+Number(sessionStorage.getItem('resume-test-offset')||0);})();""")
            errors = []; page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url); ready(page); seed(page); page.reload(); ready(page)
            page.keyboard.type(CODE); unlocked(page)
            page.evaluate("openItem('resume-note')")
            expect(page.locator('.reader-document-heading h1')).to_have_text('Reprise sans code')
            ticket = page.evaluate("JSON.parse(sessionStorage.getItem('wolfguard-tab-session-v1'))")
            assert ticket and CODE not in json.dumps(ticket) and 'Contenu conserve' not in json.dumps(ticket)
            assert page.evaluate("""async () => {
              const s=await import('./browser/storage.js'),db=await s.connect();
              const id=JSON.parse(sessionStorage.getItem('wolfguard-tab-session-v1')).id;
              const entry=await new Promise(resolve=>{const r=db.transaction('encrypted').objectStore('encrypted').get('tab-session:'+id);r.onsuccess=()=>resolve(r.result)});
              try{await crypto.subtle.exportKey('raw',entry.key);return false}catch{return entry.key.extractable===false}
            }""")
            page.reload(); unlocked(page)
            expect(page.locator('.reader-document-heading h1')).to_have_text('Reprise sans code')
            assert page.evaluate("JSON.parse(sessionStorage.getItem('wolfguard-tab-session-v1')).clock.started") == ticket['clock']['started']
            print('PASS: refresh resumes the same document without the PIN; the stored key remains non-extractable and no clear content or PIN is persisted')

            # An opener may copy sessionStorage. Its new navigation must not
            # unlock or delete the original tab's reload ticket.
            with page.expect_popup() as opened:
                page.evaluate('window.open(location.href)')
            other = opened.value; ready(other)
            expect(other.locator('#app')).not_to_be_visible(); other.close()
            page.reload(); unlocked(page)
            page.evaluate("""() => {
              Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
            }""")
            expect(page.locator('#app')).to_be_visible()
            page.evaluate("""() => {
              Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));
            }""")
            active = page.evaluate("JSON.parse(sessionStorage.getItem('wolfguard-tab-session-v1')).clock.active")
            page.evaluate("active=>sessionStorage.setItem('resume-test-offset',String(active+14*60000-Date.now()))",active)
            page.reload(); unlocked(page)
            page.evaluate("sessionStorage.setItem('resume-test-offset',String(Number(sessionStorage.getItem('resume-test-offset'))+61000))")
            assert page.evaluate("async()=>{try{await all('items');return false}catch{return true}}")
            expect(page.locator('#app')).not_to_be_visible(); ready(page)
            assert page.evaluate("sessionStorage.getItem('wolfguard-tab-session-v1')") is None
            assert page.evaluate('state.vaultKey===null')
            page.keyboard.type(CODE); unlocked(page)
            page.evaluate('lockApplication()'); ready(page); page.reload(); ready(page)
            expect(page.locator('#app')).not_to_be_visible()
            page.keyboard.type(CODE); unlocked(page)
            page.locator('#settingsBtn').click(); page.locator('#changeCodeBtn').click()
            page.locator('#oldAccessCode').fill(CODE)
            page.locator('#newAccessCode').fill('09876543'); page.locator('#confirmAccessCode').fill('09876543')
            page.locator('#webChangePassword').click()
            expect(page.locator('.settings-modal')).not_to_be_visible(timeout=15000)
            page.reload(); unlocked(page)
            assert page.evaluate("async()=>!!await get('items','resume-note')")
            print('PASS: new tabs stay locked, changing tab preserves the session, refresh does not reset the 15-minute timeout, and manual locking clears the ticket')
            local.close()

            a = browser.new_context(reduced_motion='reduce'); b = browser.new_context(reduced_motion='reduce')
            calls = []
            for context in [a, b]:
                def proxy(route):
                    calls.append(urlsplit(route.request.url).path)
                    route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path))
                context.route(API+'/**', proxy)
            first = a.new_page(); first.on('pageerror', lambda error: errors.append(str(error)))
            first.goto(url); ready(first); seed(first)
            first.goto(url+'?sync-test#activate='+('b'*64)); ready(first); first.keyboard.type(CODE); unlocked(first)
            second = b.new_page(); second.goto(url+'?sync-test'); ready(second); second.keyboard.type(CODE); unlocked(second)
            second.evaluate("async()=>{const note=await get('items','resume-note');await put('items',{...note,title:'Modifie sur un autre appareil'});}")
            first.evaluate("switchPrimaryWorkspace('scan-active')")
            expect(first.locator('#scanTitle')).to_have_text('Scan actif d’une machine')
            before = len(calls)
            first.reload(); unlocked(first)
            expect(first.locator('#scanTitle')).to_have_text('Scan actif d’une machine')
            assert first.evaluate("async()=>(await get('items','resume-note')).title") == 'Modifie sur un autre appareil'
            assert '/api/login' not in calls[before:] and '/api/logout' not in calls[before:], calls[before:]
            # The server remains authoritative even when the local ticket is fresh.
            credential = first.evaluate('WolfGuardCloud.sessionState().token')
            response = a.request.post(backend+'/api/logout', headers={'Authorization':'Bearer '+credential})
            assert response.status == 200
            first.reload(); ready(first)
            expect(first.locator('#app')).not_to_be_visible()
            assert first.evaluate("sessionStorage.getItem('wolfguard-tab-session-v1')") is None
            assert not errors, errors
            a.close(); b.close(); browser.close()
            print('PASS: cloud refresh reuses its authenticated session, fetches the latest data and restores the section; a revoked server session cannot resume')
    finally:
        server.shutdown(); server.server_close(); backend_process.terminate(); backend_process.wait(timeout=10)


if __name__ == '__main__':
    run()
