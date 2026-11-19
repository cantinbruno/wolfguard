"""AoE completion uses the real encrypted cloud commit and preserves old notes."""
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
API = 'https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'
CODE = '07942685'


class Quiet(WolfGuardTestHandler):
    def log_message(self, *_args):
        pass


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT/'docs')))
    url = f'http://127.0.0.1:{server.server_port}/'
    node = Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process = subprocess.Popen([str(node), str(ROOT/'tests/server-fixture.mjs')], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, env={**os.environ, 'WG_TEST_ORIGIN': url.rstrip('/')})
    backend = 'http://127.0.0.1:' + str(json.loads(process.stdout.readline())['port'])
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            # Create only a synthetic local vault, then upload it to the isolated API.
            context = browser.new_context(reduced_motion='reduce')
            page = context.new_page()
            page.goto(url)
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async code => {
              const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const folders=[{id:'my-games',name:'Jeux',section:'library',parentId:null},{id:'my-aoe',name:'AOE',section:'library',parentId:'my-games'}];
              const items=[{id:'my-french',type:'memo',unifiedDocument:true,title:'Français',folderId:'my-aoe',content:'<p>Mon ouverture commencée.</p>',favorite:true,tags:['perso'],attachments:[],commandBlocks:[]},{id:'other-game',type:'memo',unifiedDocument:true,title:'Autre jeu',content:'<p>À conserver.</p>',folderId:'my-games'}];
              const result=await c.create({version:2,items,folders,settings:[],activity:[]},code);await s.write(result.envelope,0);
            }""", CODE)
            page.set_viewport_size({'width':1440,'height':1000})
            writes = []

            def proxy(route):
                parsed = urlsplit(route.request.url)
                if route.request.method in ('POST','PUT') and parsed.path == '/api/vault':
                    writes.append(parsed.path)
                route.fulfill(response=route.fetch(url=backend+parsed.path+('?' + parsed.query if parsed.query else '')))

            context.route(API+'/**', proxy)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url+'?sync-test#activate='+('b'*64))
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.keyboard.type(CODE)
            expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.evaluate("openSection('library')")
            page.wait_for_function('()=>!sectionTransition.active')
            page.wait_for_function("async()=>(await all('items')).filter(x=>x.aoe4CivilizationId).length===25")
            assert writes, 'No real encrypted API write'
            notes = page.evaluate("async()=>({items:await all('items'),folders:await all('folders')})")
            french = next(x for x in notes['items'] if x['id']=='my-french')
            assert french['folderId']=='my-aoe' and french['favorite']
            assert french['content'].endswith('<p>Mon ouverture commencée.</p>')
            assert len([x for x in notes['folders'] if x['parentId']=='my-games']) == 1
            assert next(x for x in notes['items'] if x['id']=='other-game')['content']=='<p>À conserver.</p>'
            guide = next(x for x in notes['items'] if x.get('aoe4CivilizationId')=='vikings')
            page.evaluate('id=>openById(id)',guide['id'])
            page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('.reader-rich-content')).to_contain_text('automatiquement')
            expect(page.locator('.reader-rich-content table tbody tr')).to_have_count(7)
            expect(page.locator('.reader-rich-content a[href="https://www.ageofempires.com/civilizations/"]')).to_have_count(1)
            for width in (1440,390):
                page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
                page.screenshot(path=str(ROOT/f'.cache/aoe4-guide-{width}.png'), animations='disabled')
            # Read the stored ciphertext through a fresh decrypt, not the in-memory DB.
            assert page.evaluate("""async code=>{
              const c=await import('./browser/crypto.js');
              const envelope=await WolfGuardCloud.load();
              const opened=await c.openWithKey(envelope,state.vaultKey,Uint8Array.from(atob(envelope.salt),x=>x.charCodeAt(0)));
              return opened.payload.items.filter(x=>x.aoe4CivilizationId).length===25;
            }""", CODE)
            page.reload()
            expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.evaluate("openSection('library')")
            page.wait_for_function('()=>!sectionTransition.active')
            assert page.evaluate("async()=>(await all('items')).filter(x=>x.aoe4CivilizationId).length")==25
            # A later user edit/deletion is never undone by re-opening Memo.
            page.evaluate("""async id=>{await db.batch([{action:'delete',store:'items',id},{action:'put',store:'items',record:{...(await get('items','my-french')),content:'<p>Ma correction finale.</p>'}}]);await ensureUnifiedLibrary();}""",guide['id'])
            assert page.evaluate("async()=>(await all('items')).filter(x=>x.aoe4CivilizationId).length")==24
            assert page.evaluate("async()=>(await get('items','my-french')).content")=='<p>Ma correction finale.</p>'
            assert not errors, errors
            context.close()
            browser.close()
            print('PASS: 25 guides, existing notes retained, encrypted API write, reload persistence, mobile reader, edits and deletions respected')
    finally:
        server.shutdown()
        server.server_close()
        process.terminate()
        process.wait(timeout=15)


if __name__ == '__main__':
    run()
