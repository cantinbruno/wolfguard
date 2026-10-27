"""Exercise hostile content, enforced session deadlines, framing and asset integrity."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def ready(page):
    expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
def unlock(page):
    ready(page);page.keyboard.type('07942685')
    expect(page.locator('#app')).to_be_visible(timeout=20000)
    page.wait_for_function("()=>!document.querySelector('#app').inert")
def closed(page):
    expect(page.locator('#app')).not_to_be_visible()
    assert page.evaluate('state.vaultKey===null')
    expect(page.locator('#content')).to_be_empty()
    ready(page)

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            context=browser.new_context()
            page=context.new_page();page.clock.install()
            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(url);ready(page)
            page.evaluate("""async()=>{
              const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const payload={version:2,items:[],folders:[],settings:[{key:'autoLockMinutes',value:0}],activity:[]};
              const r=await c.create(payload,'07942685');
              payload.items.push({id:'secret',type:'vault',title:'Secret de test',tags:[],vaultBlobEnc:await encryptBlobWithKey(JSON.stringify({username:'synthetic',password:'SECRET-943!',notes:'',custom:[]}),r.key)});
              // A real legacy v2 envelope must upgrade without losing vault fields.
              const iv=crypto.getRandomValues(new Uint8Array(12));
              const bytes=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('wolfguard-workspace|2|AES-256-GCM|PBKDF2-SHA256')},r.key,new TextEncoder().encode(JSON.stringify(payload))));
              await s.write({...r.envelope,version:2,iv:btoa(String.fromCharCode(...iv)),data:btoa(String.fromCharCode(...bytes))},0);
            }""")
            page.reload();unlock(page)
            assert page.evaluate("async()=>(await (await import('./browser/storage.js')).read()).version")==3
            csp=page.locator('meta[http-equiv=Content-Security-Policy]').get_attribute('content')
            assert "script-src-attr 'none'" in csp and "'unsafe-eval'" not in csp
            assert page.locator('script[src]:not([integrity]),link[rel=stylesheet]:not([integrity])').count()==0
            clean=page.evaluate('html=>documentHTML(html)', """<p id="globalSearch" data-wg-click="deleteItem('secret')">Texte</p><img src=x onerror="window.pwned=true"><a href="javascript:alert(1)">Lien</a><a target="_blank" href="https://example.invalid">Source</a>""")
            assert 'data-wg-' not in clean and 'onerror' not in clean and 'javascript:' not in clean
            assert 'id="globalSearch"' not in clean and 'noopener noreferrer' in clean
            page.evaluate("""()=>{const b=document.createElement('button');b.id='injectionProbe';b.textContent='test';b.setAttribute('onclick','window.inlineExecuted=true');document.body.append(b);b.click();b.remove()}""")
            assert not page.evaluate('Boolean(window.inlineExecuted)')
            print('PASS: CSP stricte, integrite des fichiers, attributs de commande et contenus malveillants neutralises')

            # The delegated actions keep the real editor controls operational.
            page.evaluate('newLibraryItem()')
            page.locator('#fTitle').fill('Fiche securisee')
            page.locator('#richEditor').fill('Texte de test')
            page.locator('#richEditor').select_text()
            page.get_by_role('button',name='Gras',exact=True).click()
            page.locator('.library-editor-heading').get_by_role('button',name='Enregistrer',exact=True).click()
            expect(page.locator('.document-reader b,.document-reader strong')).to_have_count(1)
            page.evaluate("openById('secret')")
            expect(page.locator('#passMask')).not_to_have_text('SECRET-943!')
            page.locator('#showPassword').click()
            expect(page.locator('#passMask')).to_have_text('SECRET-943!')
            page.clock.fast_forward(15100)
            expect(page.locator('#passMask')).not_to_have_text('SECRET-943!')
            print('PASS: commandes deleguees, editeur riche et masquage automatique du secret apres 15 secondes')

            # A fake clipboard exercises cleanup without reading or changing the OS clipboard.
            page.evaluate("""()=>{
              window.testClipboard='';
              Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.testClipboard=text},readText:async()=>window.testClipboard}});
              Object.defineProperty(navigator,'permissions',{configurable:true,value:{query:async()=>({state:'granted'})}});
            }""")
            page.evaluate("copySecret('SECRET-CLIPBOARD')")
            page.clock.fast_forward(30100)
            assert page.evaluate('window.testClipboard')==''
            page.evaluate("copySecret('SECRET-CLIPBOARD')")
            page.evaluate("window.testClipboard='Nouvelle copie a conserver'")
            page.clock.fast_forward(30100)
            assert page.evaluate('window.testClipboard')=='Nouvelle copie a conserver'
            closed(page)
            print('PASS: presse-papiers nettoye si autorise, nouvelle copie preservee, verrouillage impose malgre ancien reglage desactive')

            unlock(page)
            page.clock.fast_forward(55000)
            page.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Shift',bubbles:true}))")
            page.clock.fast_forward(6000);closed(page)
            unlock(page)
            for _ in range(16):
                page.clock.fast_forward(55000)
                page.keyboard.press('Shift')
            page.clock.fast_forward(20100);closed(page)
            print('PASS: activite artificielle sans effet et session maximale de 15 minutes meme avec activite reelle')

            unlock(page)
            page.clock.set_system_time(page.evaluate('Date.now()+61000'))
            assert page.evaluate("async()=>{try{await all('items');return false}catch{return true}}")
            closed(page)
            print('PASS: acces refuse si le delai expire avant le declenchement du minuteur')
            page.evaluate("""()=>{
              const transaction=IDBDatabase.prototype.transaction;
              IDBDatabase.prototype.transaction=function(stores,mode,...args){
                if(mode==='readwrite')throw new DOMException('Test: disque plein','QuotaExceededError');
                return transaction.call(this,stores,mode,...args);
              };
            }""")
            page.keyboard.type('99999999')
            expect(page.locator('#lockError')).to_contain_text('contrôle des tentatives est indisponible')
            expect(page.locator('#keypad button').first).to_be_disabled()
            print('PASS: nouvelles tentatives refusees si leur enregistrement devient impossible')
            assert not errors,errors
            context.close()

            framed=browser.new_context();host=framed.new_page()
            host.route('**/frame-host',lambda route:route.fulfill(content_type='text/html',body='<iframe src="/"></iframe>'))
            host.goto(url+'frame-host')
            frame=host.frame_locator('iframe')
            expect(frame.locator('#lockError')).to_contain_text('propre onglet')
            expect(frame.locator('#keypad button')).to_have_count(0)
            framed.close()
            def corrupt(route):
                response=route.fetch()
                route.fulfill(response=response,body=response.body()+b'\n// altered asset')
            for asset in ['adapter.js','crypto.bundle.js','storage.bundle.js','github-sync.bundle.js']:
                tampered=browser.new_context();blocked=tampered.new_page()
                blocked.route('**/browser/'+asset+'?*',corrupt)
                blocked.goto(url)
                expect(blocked.locator('#keypad button')).to_have_count(0)
                expect(blocked.locator('#app')).not_to_be_visible()
                if asset=='adapter.js':assert blocked.evaluate("typeof webWorkspace==='undefined'")
                tampered.close()
            browser.close()
            print('PASS: ouverture dans une frame refusee et fichier modifie bloque par SRI')
    finally:
        server.shutdown();server.server_close()

if __name__=='__main__':run()
