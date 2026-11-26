"""Headless regression of the November 26 report using synthetic local data."""
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from site_fixture import WolfGuardTestHandler

ROOT=Path(__file__).resolve().parents[1]
class Quiet(WolfGuardTestHandler):
    def log_message(self,*args): pass

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True)
            page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async()=>{
              const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const result=await c.create({version:2,items:[{id:'report-memo',type:'memo',title:'Russe',folderId:'source',tags:['ancien-tag'],content:'<table><tbody><tr><th style="background-color:#ffe699">Économie</th><th>Armée</th></tr><tr><td>Villageois</td><td>Archers</td></tr></tbody></table>'}],folders:[{id:'source',section:'library',name:'Départ',parentId:null},{id:'destination',section:'library',name:'Arrivée',parentId:null}],settings:[],activity:[]},'07942685');await s.write(result.envelope,0);
            }""")
            page.reload();expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000);page.keyboard.type('07942685')
            expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.evaluate("async()=>{await selectFolder('source');await dropOnFolder({preventDefault(){},stopPropagation(){},currentTarget:{classList:{remove(){}}},dataTransfer:{getData(){return JSON.stringify({kind:'item',id:'report-memo'})}}},'destination');}")
            assert page.evaluate('state.folder')=='source'
            assert page.evaluate("async()=>(await get('items','report-memo')).folderId")=='destination'
            page.evaluate("openById('report-memo')");page.wait_for_function('()=>!sectionTransition.active');page.evaluate("setMode('edit')")
            expect(page.locator('#richEditor th').first).to_be_visible()
            assert page.locator('#richEditor th').first.evaluate("el=>getComputedStyle(el).color")=='rgb(0, 0, 0)'
            page.locator('#richEditor th').first.click();page.evaluate("syncRichEditorSelection();applyEditorCellColor('#164e63')")
            cell=page.locator('#richEditor th').first
            assert cell.evaluate("el=>getComputedStyle(el).backgroundColor")=='rgb(22, 78, 99)'
            assert cell.evaluate("el=>getComputedStyle(el).color")=='rgb(255, 255, 255)'
            rect=cell.bounding_box();page.mouse.move(rect['x']+rect['width']-2,rect['y']+rect['height']/2);page.mouse.down();page.mouse.move(rect['x']+rect['width']-70,rect['y']+rect['height']/2,steps=6);page.mouse.up()
            assert page.locator('#richEditor table').evaluate('el=>!!el.style.width')
            page.evaluate("""()=>{window.reportWrites=0;const original=db.saveEditedItem.bind(db);db.saveEditedItem=async(...args)=>{reportWrites++;await new Promise(resolve=>setTimeout(resolve,80));return original(...args);};window.reportSaves=Promise.all([saveLibraryItem('report-memo'),saveLibraryItem('report-memo')]);}""")
            page.evaluate('async()=>await reportSaves');assert page.evaluate('reportWrites')==1

            expect(page.locator('#richEditor')).to_have_count(0)
            saved=page.evaluate("async()=>await get('items','report-memo')")
            assert 'background-color' in saved['content'] and 'width:' in saved['content']
            assert 'Mots clés' not in page.locator('#detailHost').inner_text()
            page.evaluate("""async()=>{const secret={username:'test-user',password:'Synthetic-secret',url:'https://example.invalid/login',host:'test.invalid',notes:'',custom:[]};await put('items',{id:'report-vault',type:'vault',title:'Accès de test',folderId:null,tags:[],vaultBlobEnc:await encSecret(JSON.stringify(secret)),encryptionVersion:2});await openSection('vault');}""")
            expect(page.locator('.vault-catalog-values')).to_contain_text('https://example.invalid/login')
            expect(page.get_by_role('button',name='Copier le nom',exact=True)).to_be_visible()
            page.evaluate("async()=>{window.reportExport=await webWorkspace.exportData('24681357');}")
            assert page.evaluate("JSON.stringify(window.reportExport).includes('Synthetic-secret')")==False
            page.evaluate("async()=>{await lockApplication();}")
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000);page.keyboard.type('07942685');expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.evaluate("()=>{window.reportImport=webWorkspace.importData(reportExport.envelope,'24681357');}")
            page.locator('.app-dialog-submit').click();page.evaluate('async()=>await reportImport')
            assert page.evaluate("async()=>{const rows=await all('items');const copy=rows.find(row=>row.type==='vault'&&row.id!=='report-vault');return (await vaultData(copy,false)).password}")=='Synthetic-secret'
            # A different browser profile has a different workspace key. Nested
            # vault secrets must remain readable after the encrypted transfer.
            transfer=page.evaluate('reportExport.envelope')
            target_context=browser.new_context(reduced_motion='reduce');target=target_context.new_page()
            target.goto(f'http://127.0.0.1:{server.server_port}/')
            expect(target.locator('#keypad button').first).to_be_enabled(timeout=15000)
            target.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const data=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'13572468');await s.write(data.envelope,0)}""")
            target.reload();expect(target.locator('#keypad button').first).to_be_enabled(timeout=15000);target.keyboard.type('13572468');expect(target.locator('#app')).to_be_visible(timeout=20000)
            target.evaluate("value=>{window.otherImport=webWorkspace.importData(value,'24681357');}",transfer)
            target.locator('.app-dialog-submit').click();target.evaluate('async()=>await otherImport')
            assert target.evaluate("async()=>{const row=(await all('items')).find(row=>row.type==='vault');return (await vaultData(row,false)).password}")=='Synthetic-secret'
            target_context.close()
            page.locator('#settingsBtn').click()
            expect(page.locator('#accountStorageBtn')).to_have_count(0);expect(page.locator('#autoLockSelect')).to_have_count(0)
            page.locator('#settings-tab-data').click();expect(page.locator('#exportDataBtn')).to_be_visible();expect(page.locator('#importDataBtn')).to_be_visible()
            for width in [1440,850,390]:
                page.set_viewport_size({'width':width,'height':950})
                assert page.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1')
            assert not errors, errors
            browser.close()
            print('PASS: déplacements stables, couleurs et redimensionnement enregistrés, coffre lisible, transfert chiffré et compte simplifié')
    finally:
        server.shutdown();server.server_close()

if __name__=='__main__':run()
