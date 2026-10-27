"""Recover real encrypted WolfGuard data using two independent browser profiles."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.request import urlopen
from urllib.parse import urlsplit
import argparse, json, os, subprocess
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
API='https://wolfguard-web-cantin.paledove36.chatgpt.site'
CODE='07942685'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def ready(page):expect(page.locator('#keypad button').first).to_be_enabled(timeout=20000)
def unlock(page,code=CODE):
    ready(page);page.keyboard.type(code)
    expect(page.locator('#app')).to_be_visible(timeout=30000)
    page.wait_for_function('()=>!document.querySelector("#app").inert')

def run(backend=None):
    process=None
    if not backend:
        node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
        process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
        backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    server=ThreadingHTTPServer(('127.0.0.1',4178),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();url='http://127.0.0.1:4178/'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();a=browser.new_context(reduced_motion='reduce');b=browser.new_context(reduced_motion='reduce')
            errors=[];calls=[]
            for context in [a,b]:
                def proxy(route):
                    calls.append(urlsplit(route.request.url).path)
                    route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path))
                context.route(API+'/**',proxy)
            first=a.new_page();first.on('pageerror',lambda e:errors.append(str(e)))
            first.goto(url);ready(first)
            # Preserve an existing encrypted local workspace, including a vault secret.
            first.evaluate("""async()=>{
              const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const payload={version:2,items:[{id:'memo-test',type:'memo',title:'Ma fiche existante',content:'<p>Document complet</p>',tags:[]}],folders:[],settings:[],activity:[]};
              const result=await c.create(payload,'07942685');
              payload.items.push({id:'vault-test',type:'vault',title:'Mon coffre existant',tags:[],vaultBlobEnc:await encryptBlobWithKey(JSON.stringify({username:'bruno-test',password:'SECRET-TEST-42',notes:'',custom:[]}),result.key)});
              await s.write(await c.seal(payload,result.key,result.salt,1),0);
            }""")
            original_backup=first.evaluate("async()=>await (await import('./browser/storage.js')).read()")
            first.goto(url+'?sync-test');ready(first)
            # Opening the link in an existing tab can change only the fragment.
            first.goto(url+'?sync-test#activate='+('b'*64));ready(first)
            first.wait_for_function('()=>!location.hash')
            assert 'activate' not in first.url
            unlock(first)
            expect(first.locator('#webSaveState')).to_contain_text('Synchronisé')
            assert first.evaluate("async()=>(await all('items')).length")==2
            print('PASS: activation avec le code existant et transfert automatique du memo et du coffre')

            second=b.new_page();second.on('pageerror',lambda e:errors.append(str(e)))
            second.goto(url+'?sync-test');ready(second)
            expect(second.locator('#lock .access-heading h2')).to_be_empty()
            expect(second.locator('#githubAccess,#githubConnectForm')).to_have_count(0)
            unlock(second)
            assert second.evaluate("async()=>JSON.parse(await decryptBlobWithKey((await get('items','vault-test')).vaultBlobEnc,state.vaultKey)).password")=='SECRET-TEST-42'
            assert second.evaluate("async()=>(await get('items','memo-test')).title")=='Ma fiche existante'
            print('PASS: navigateur vierge, un seul code, recuperation du memo et du secret du coffre')

            first.evaluate("async()=>{const item=await get('items','memo-test');item.title='Modification du premier appareil';await put('items',item)}")
            # A stale editor must not overwrite the newly committed remote data.
            result=second.evaluate("""async()=>{const item=await get('items','memo-test');item.title='Conflit du second appareil';try{await put('items',item);return 'incorrect'}catch(e){return e.message}}""")
            assert 'autre copie' in result.lower(),result
            assert second.evaluate("async()=>!!(await (await import('./browser/storage.js')).recoveries()).find(r=>r.key==='cloud-pending')")
            second.evaluate('lockApplication()');unlock(second)
            assert second.evaluate("async()=>(await get('items','memo-test')).title")=='Modification du premier appareil'
            print('PASS: conflit entre appareils refuse, copie non synchronisee conservee, reouverture a jour')

            first.evaluate("""()=>{
              const original=IDBObjectStore.prototype.put;window.failCache=false;
              IDBObjectStore.prototype.put=function(value,key){const request=Reflect.apply(original,this,arguments);if(key==='workspace'&&window.failCache){window.failCache=false;this.transaction.abort();}return request;};
            }""")
            first.evaluate("""async()=>{window.failCache=true;const item=await get('items','memo-test');item.title='Sauve sur le serveur malgre panne locale';try{await put('items',item)}catch{}}""")
            expect(first.locator('#lock')).to_be_visible(timeout=15000);unlock(first)
            assert first.evaluate("async()=>(await get('items','memo-test')).title")=='Sauve sur le serveur malgre panne locale'
            print('PASS: panne locale apres confirmation distante, verrouillage puis recuperation de la modification')

            first.locator('#settingsBtn').click();first.locator('#changeCodeBtn').click()
            first.locator('#oldAccessCode').fill(CODE);first.locator('#newAccessCode').fill('09876543');first.locator('#confirmAccessCode').fill('09876543')
            first.evaluate('window.failCache=true');first.locator('#webChangePassword').click()
            expect(first.locator('#modalRoot')).to_be_empty(timeout=20000)
            expect(first.locator('#lock')).to_be_visible(timeout=15000);unlock(first,'09876543')
            second.evaluate('lockApplication()');unlock(second,'09876543')
            assert second.evaluate("async()=>JSON.parse(await decryptBlobWithKey((await get('items','vault-test')).vaultBlobEnc,state.vaultKey)).password")=='SECRET-TEST-42'
            print('PASS: nouveau code sur les deux appareils, meme apres panne locale pendant sa modification')

            # Restore an older backup encrypted with the previous code into the
            # shared workspace, preserving the current login code and vault key.
            first.locator('#settingsBtn').click();first.locator('[data-settings-tab=data]').click()
            first.locator('#webBackupFile').set_input_files({'name':'synthetic.wgweb','mimeType':'application/json','buffer':json.dumps(original_backup).encode()})
            first.locator('.app-dialog-submit').click()
            expect(first.locator('.app-dialog-input')).to_have_attribute('type','password')
            first.locator('.app-dialog-input').fill(CODE);first.locator('.app-dialog-submit').click()
            expect(first.locator('#lock')).to_be_visible(timeout=20000);unlock(first,'09876543')
            second.evaluate('lockApplication()');unlock(second,'09876543')
            assert second.evaluate("async()=>(await get('items','memo-test')).title")=='Ma fiche existante'
            assert second.evaluate("async()=>JSON.parse(await decryptBlobWithKey((await get('items','vault-test')).vaultBlobEnc,state.vaultKey)).password")=='SECRET-TEST-42'
            print('PASS: ancienne sauvegarde restauree et partagee avec le code actuel, coffre rechiffre')

            second.evaluate('lockApplication()');ready(second);second.keyboard.type('00000000')
            expect(second.locator('#lockError')).to_contain_text('Réessaie dans',timeout=15000)
            first.evaluate('lockApplication()');ready(first);first.keyboard.type('09876543')
            expect(first.locator('#lockError')).to_contain_text('Réessaie dans',timeout=15000)
            print('PASS: echec sur un appareil, delai serveur impose aussi au second appareil')
            assert not errors,errors
            assert '/api/vault' in calls and '/api/setup' in calls
            a.close();b.close();browser.close()
    finally:
        server.shutdown();server.server_close()
        if process:process.terminate();process.wait(timeout=10)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--backend');args=parser.parse_args();run(args.backend)
