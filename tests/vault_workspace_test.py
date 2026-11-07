"""Headless vault: creation, encryption, masking, metadata search and reload."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright,expect
from original_app_test import Quiet,enter_code

ROOT=Path(__file__).resolve().parents[1]
CODE='01234567'

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')));Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(origin+'/');enter_code(page,CODE,creating=True);expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            vault=page.locator('.workspace-section-button[data-section=vault]');expect(vault).to_contain_text('Coffre-fort');assert page.locator('.workspace-section-button').count()==8
            vault.click();page.wait_for_function('()=>!sectionTransition.active');expect(page.locator('.catalog-vault h2')).to_have_text('Coffre-fort')
            page.get_by_role('button',name='Nouveau dossier',exact=True).click();page.locator('#folderName').fill('Services internes');page.locator('#saveFolder').click();expect(page.locator('#modalRoot')).to_be_empty()
            page.get_by_role('button',name='Nouvel accès',exact=True).click();expect(page.locator('#fTitle')).to_be_visible()
            page.get_by_role('button',name='Générer',exact=False).click();expect(page.locator('#pgOut')).to_be_visible();generated=page.locator('#pgOut').inner_text();assert len(generated)==24
            page.locator('#pgUse').click();expect(page.locator('#fPass')).to_have_value(generated)
            # Generation alone must mark an unsaved change.
            page.locator('.workspace-section-button[data-section=tools]').click();expect(page.locator('.app-dialog')).to_be_visible();page.locator('.app-dialog-cancel').click();expect(page.locator('#fPass')).to_have_value(generated)
            password='VAULT-SYNTHETIC-943!';username='fixture@example.invalid';notes='VAULT-NOTE-NONPUBLIC'
            page.locator('#fTitle').fill('Portail interne');page.locator('#fUser').fill(username);page.locator('#fPass').fill(password);page.locator('#fUrl').fill('https://internal.example.invalid');page.locator('#fHost').fill('server-fixture');page.locator('#fNotes').fill(notes)
            page.locator('#fFolder').select_option(label='Services internes');page.locator('.vault-edit-footer .primary').click();expect(page.locator('#passMask')).to_be_visible();expect(page.locator('#passMask')).not_to_contain_text(password)
            stored=page.evaluate("async()=>(await all('items')).find(item=>item.type==='vault'&&item.title==='Portail interne')")
            for secret in [password,username,notes,'server-fixture']:assert secret not in json.dumps(stored)
            assert stored['vaultBlobEnc'] and 'passwordEnc' not in stored
            envelope=page.evaluate("async()=>await (await import('./browser/storage.js')).read()")
            assert password not in json.dumps(envelope) and username not in json.dumps(envelope)
            page.locator('#showPassword').click();expect(page.locator('#passMask')).to_have_text(password);page.locator('#showPassword').click();expect(page.locator('#passMask')).not_to_contain_text(password)
            page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.vaultTestClipboard=text,readText:async()=>window.vaultTestClipboard}})")
            page.locator('#copyPassword').click();page.wait_for_function('()=>window.vaultTestClipboard==="VAULT-SYNTHETIC-943!"')
            page.locator('#workspaceBack').click();expect(page.locator('#workspaceLocalSearch')).to_be_visible();page.locator('#workspaceLocalSearch').fill(password);expect(page.locator('#workspaceCatalogItems article')).to_have_count(0)
            page.locator('#workspaceLocalSearch').fill('Portail');expect(page.locator('#workspaceCatalogItems article')).to_have_count(1);assert password not in page.locator('body').inner_text()
            page.locator('.workspace-item-title').click();expect(page.locator('#passMask')).to_be_visible()
            for width in [1440,390,320]:
                page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
                page.screenshot(path=str(ROOT/f'.cache/vault-detail-{width}.png'),animations='disabled')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.evaluate('({viewport:innerWidth,width:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll("body *")].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,10).map(el=>({tag:el.tagName,id:el.id,class:el.className,width:el.getBoundingClientRect().width}))})')
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000);expect(page.locator('#passMask')).to_be_visible();expect(page.locator('#passMask')).not_to_contain_text(password)
            page.evaluate('lockApplication()');expect(page.locator('#lock')).to_be_visible();assert password not in page.locator('body').inner_text();assert not page.evaluate('state.vaultKey')
            assert not errors,errors
            browser.close()
    finally:server.shutdown();server.server_close()
    print('PASS: vault navigation, folders, generator, unsaved-change guard, encrypted secrets, reveal/copy, metadata-only search, mobile layout, reload and lock')

if __name__=='__main__':run()
