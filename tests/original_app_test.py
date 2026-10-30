"""Exercise the actual WolfGuard UI, with a disposable encrypted browser profile."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import tempfile
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
PASSWORD = '01234567'
NEW_PASSWORD = '08765432'
LEGACY_PASSWORD = 'ancien mot de passe de test 643!'

from site_fixture import WolfGuardTestHandler

class Quiet(WolfGuardTestHandler):
    def log_message(self, *_args):
        pass

def enter_code(page, code, creating=False):
    expect(page.locator('#keypad')).to_be_visible()
    expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
    page.keyboard.type(code)
    if creating:
        expect(page.locator('#lock .access-heading h2')).to_have_text('Confirmer le code')
        page.keyboard.type(code)

def run():
    server = ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}/'
    try:
        with tempfile.TemporaryDirectory(prefix='wolfguard-original-') as temporary, sync_playwright() as p:
            browser=p.chromium.launch()
            context=browser.new_context(accept_downloads=True, reduced_motion='reduce')
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(url)
            expect(page.locator('#keypad button')).to_have_count(12)
            expect(page.locator('#pinDots .dot')).to_have_count(8)
            expect(page.locator('#webAccessForm')).not_to_be_visible()
            page.locator('[data-key="0"]').click()
            expect(page.locator('#pinDots .dot.on')).to_have_count(1)
            page.locator('[data-key=Backspace]').click()
            expect(page.locator('#pinDots .dot.on')).to_have_count(0)
            page.locator('[data-key="1"]').click()
            page.locator('[data-key=C]').click()
            expect(page.locator('#pinDots .dot.on')).to_have_count(0)
            enter_code(page,PASSWORD)
            expect(page.locator('#lock .access-heading h2')).to_have_text('Confirmer le code')
            enter_code(page,'01234568')
            expect(page.locator('#lockError')).to_contain_text('ne correspondent pas')
            expect(page.locator('#lock .access-heading h2')).to_have_text('Créer le code de la base')
            enter_code(page,PASSWORD,creating=True)
            expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.wait_for_function("() => !document.querySelector('#app').inert")
            counts=page.evaluate("async()=>({sources:(await all('items')).filter(item=>item.consolidatedInto).length,guides:(await all('items')).filter(item=>item.consolidatedGuideVersion).length,visible:(await activeItems()).length})")
            assert counts['sources']==740, counts
            assert counts['visible']==counts['guides'] and 0<counts['guides']<counts['sources'], counts
            assert not page.evaluate("async()=>!!(await get('items','tech-netsec-v3-report-stp-guard'))")
            assert page.locator('.workspace-section-button').count()==6
            expect(page.locator('.workspace-section-button[data-section=vault]')).to_have_count(0)
            assert page.locator('#richEditor').count()==0
            print('PASS: interface originale, navigation originale, bibliotheque complete fournie')

            page.evaluate('newLibraryItem()')
            page.locator('#fTitle').fill('Fiche confidentielle de test')
            expect(page.locator('#fTitle')).to_have_value('Fiche confidentielle de test')
            page.locator('#richEditor').focus()
            page.locator('#richEditor').evaluate("el=>{const data=new DataTransfer();data.setData('text/html','<h2>Titre riche</h2><p>Texte <strong>en gras</strong> confidentiel.</p><img src=x onerror=\"window.xss=true\">');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));el.dispatchEvent(new Event('input',{bubbles:true}))}")
            expect(page.locator('#fTitle')).to_have_value('Fiche confidentielle de test')
            page.get_by_role('button',name='+ Ajouter une commande',exact=True).click()
            assert page.locator('.library-command-editor').count()==1
            expect(page.locator('#fTitle')).to_have_value('Fiche confidentielle de test')
            expect(page.locator('#richEditor')).to_contain_text('en gras')
            page.locator('.library-editor-heading').get_by_role('button',name='Enregistrer',exact=True).click()
            expect(page.locator('.document-reader')).to_be_visible()
            assert page.locator('.document-reader strong,.document-reader b').count()>=1, page.locator('.document-reader').inner_html()
            assert not page.evaluate('Boolean(window.xss)')
            assert page.locator('.document-reader [onerror]').count()==0
            memo=page.evaluate("async()=> (await all('items')).find(i=>i.title==='Fiche confidentielle de test')")
            assert 'en gras' in memo['content'] and ('<strong' in memo['content'] or '<b>' in memo['content'])
            print('PASS: editeur riche original, commandes integrees, lecture et nettoyage XSS')

            # Existing Checklist data must not prevent opening or saving the restored app.
            page.evaluate("setMode('edit')")
            page.locator('#richEditor').fill('Brouillon a conserver pendant les scans')
            page.locator('.workspace-section-button[data-section=scan-passive]').click()
            page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('#scanTitle')).to_have_text('Scan passif d’une machine')
            expect(page.locator('#toolboxShell,.scan-mode-navigation')).to_have_count(0)
            page.locator('.workspace-section-button[data-section=scan-active]').click()
            page.wait_for_function('()=>!sectionTransition.active')
            page.locator('#scanTarget').fill('192.0.2.42')
            page.locator('.workspace-section-button[data-section=library]').click()
            page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('#richEditor')).to_have_text('Brouillon a conserver pendant les scans')
            page.locator('.library-editor-heading').get_by_role('button',name='Enregistrer',exact=True).click()
            print('PASS: brouillon du memo conserve pendant les changements entre les deux scans')

            expect(page.locator('[data-section=checklist]')).to_have_count(0)
            page.evaluate("async()=>await put('items',{id:'saved-task',type:'task',title:'Ancienne tache conservee',content:'Note de checklist',completed:true,priority:'high',dueDate:'2030-01-15',createdAt:now(),updatedAt:now()})")
            assert not page.evaluate("workspaceModules.allowsItem({type:'task'})")
            # Old vault records are retained encrypted, outside navigation and search.
            vault_id='archived-vault-test'
            page.evaluate("""async id=>await put('items',{id,type:'vault',title:'Acces confidentiel de test',tags:[],folderId:null,vaultBlobEnc:await encryptBlobWithKey(JSON.stringify({username:'synthetic@example.invalid',password:'SECRET-TEST-COFFRE-943!',host:'192.168.1.20',notes:'Note confidentielle du coffre',custom:[]}),state.vaultKey),encryptionVersion:2,createdAt:now(),updatedAt:now()})""",vault_id)
            assert not page.evaluate("workspaceModules.allowsItem({type:'vault'})")
            assert not page.evaluate("openSection('vault')")
            clear=page.evaluate("async id=>await vaultData(await get('items',id))",vault_id)
            assert clear['password']=='SECRET-TEST-COFFRE-943!'
            stored=page.evaluate("async()=>await (await import('./browser/storage.js')).read()")
            for secret in ['Acces confidentiel','SECRET-TEST','Fiche confidentielle','synthetic@example']:
                assert secret not in json.dumps(stored)
            assert page.evaluate("""async password=>{const c=await import('./browser/crypto.js');const s=await import('./browser/storage.js');const original=await s.read();const damaged=structuredClone(original);damaged.data=(damaged.data[0]==='A'?'B':'A')+damaged.data.slice(1);try{await c.open(damaged,password);return false}catch{return true}}""",PASSWORD)
            print('PASS: ancienne donnee du coffre conservee chiffree, section retiree')

            page.locator('.workspace-section-button[data-section=tools]').click()
            page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('#toolboxShell')).to_be_visible()
            assert page.locator('[data-toolbox-nav]').count()==4
            expect(page.locator('[data-toolbox-nav=active],[data-toolbox-nav=passive]')).to_have_count(0)
            page.locator('[data-toolbox-nav=ports]').click()
            page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('.protocol-content')).to_be_visible(timeout=15000)
            page.locator('.workspace-section-button[data-section=scan-passive]').click()
            page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('#scanTitle')).to_have_text('Scan passif d’une machine')
            expect(page.locator('#scanStart')).to_have_count(0)
            expect(page.locator('#wgScanImport')).to_be_enabled()
            page.locator('.workspace-section-button[data-section=scan-active]').click()
            page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('#scanTarget')).to_have_value('192.0.2.42')
            expect(page.locator('#scanStart')).to_have_count(0)
            expect(page.locator('#wgScanImport')).to_be_enabled()
            assert 'Nmap' in page.locator('#content').inner_text()
            print('PASS: quatre outils, deux sections scan distinctes, execution Windows explicitement indiquee')

            page.locator('#settingsBtn').click()
            expect(page.locator('.settings-modal')).to_be_visible()
            page.locator('[data-settings-tab=data]').click()
            with page.expect_download() as info:
                page.locator('#exp').click()
            backup=Path(temporary)/'backup.wgweb'
            info.value.save_as(backup)
            assert json.loads(backup.read_text())['version']==3
            page.locator('#closeSettingsBtn').click()
            page.evaluate('lockApplication()')
            expect(page.locator('#app')).not_to_be_visible()
            assert page.locator('#content').inner_text()==''
            expect(page.locator('#webConfirmRow')).not_to_be_visible()
            enter_code(page,'01234568')
            expect(page.locator('#lockError')).to_contain_text('incorrect')
            enter_code(page,PASSWORD)
            expect(page.locator('#app')).to_be_visible(timeout=15000)
            page.wait_for_function("() => !document.querySelector('#app').inert")
            print('PASS: sauvegarde complete chiffree, verrouillage, mauvais mot de passe et reouverture')

            page.locator('#settingsBtn').click()
            page.locator('#changeCodeBtn').click()
            page.locator('#oldAccessCode').fill(PASSWORD)
            page.locator('#newAccessCode').fill(NEW_PASSWORD)
            page.locator('#confirmAccessCode').fill(NEW_PASSWORD)
            page.locator('#webChangePassword').click()
            expect(page.locator('.settings-modal')).not_to_be_visible(timeout=10000)
            page.evaluate('lockApplication()')
            enter_code(page,NEW_PASSWORD)
            expect(page.locator('#app')).to_be_visible(timeout=15000)
            page.wait_for_function("() => !document.querySelector('#app').inert")
            clear=page.evaluate("async id=>await vaultData(await get('items',id))",vault_id)
            assert clear['password']=='SECRET-TEST-COFFRE-943!'
            assert page.evaluate("async()=>(await get('items','saved-task')).completed")
            print('PASS: changement du mot de passe et rechiffrement des secrets du coffre')

            # Restore into another browser profile, without sharing any storage.
            other=browser.new_context(reduced_motion='reduce')
            restored=other.new_page()
            restored.goto(url)
            restored.locator('#webBackupFile').set_input_files(backup)
            expect(restored.locator('#lock .access-heading h2')).to_have_text('Ouvrir une sauvegarde')
            enter_code(restored,PASSWORD)
            expect(restored.locator('#app')).to_be_visible(timeout=20000)
            restored.wait_for_function("() => !document.querySelector('#app').inert")
            assert restored.evaluate("async()=>Boolean((await all('items')).find(i=>i.title==='Fiche confidentielle de test'))")
            assert restored.evaluate("async()=>(await get('items','saved-task')).content")=='Note de checklist'
            print('PASS: anciennes taches conservees et restaurables, sans section Checklist')
            cache=ROOT/'.cache'
            cache.mkdir(exist_ok=True)
            restored.screenshot(path=str(cache/'original-desktop.png'),full_page=True)
            restored.set_viewport_size({'width':390,'height':844})
            restored.screenshot(path=str(cache/'original-mobile.png'),full_page=True)
            assert restored.evaluate('document.documentElement.scrollWidth<=innerWidth')
            print('PASS: restauration complete et interface originale mobile')
            legacy_context=browser.new_context(reduced_motion='reduce')
            legacy=legacy_context.new_page()
            legacy.goto(url)
            legacy.evaluate("""async password=>{const c=await import('./browser/crypto.js');const s=await import('./browser/storage.js');const salt=crypto.getRandomValues(new Uint8Array(16));const key=await c.deriveKey(password,salt);const envelope=await c.seal({version:1,items:[{id:'old-vault',type:'vault',title:'Ancien acces',username:'legacy',password:'legacy-secret',content:'Ancienne note',url:'',folder:null,updatedAt:'2026-01-01'}],folders:[]},key,salt,1);await s.write(envelope,0)}""",LEGACY_PASSWORD)
            legacy.reload()
            expect(legacy.locator('#keypad button').first).to_be_enabled(timeout=10000)
            legacy.evaluate("""password=>{const data=new DataTransfer();data.setData('text',password);document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}))}""",LEGACY_PASSWORD)
            expect(legacy.locator('#app')).to_be_visible(timeout=20000)
            assert legacy.evaluate("async()=> (await vaultData(await get('items','old-vault'))).password")=='legacy-secret'
            assert legacy.evaluate("async()=> (await (await import('./browser/storage.js')).read()).version")==3
            print('PASS: reprise automatique des donnees de la precedente version web')
            assert not errors, errors
            legacy_context.close();other.close();context.close();browser.close()
    finally:
        server.shutdown();server.server_close()

if __name__=='__main__':
    run()
