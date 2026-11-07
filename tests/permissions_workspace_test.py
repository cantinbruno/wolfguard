"""Advanced permission editor and scoped encrypted sessions, entirely headless."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json,os,subprocess
from playwright.sync_api import sync_playwright,expect
from shared_workspace_test import Quiet,ready,unlock,API,CODE

ROOT=Path(__file__).resolve().parents[1]

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')));Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);errors=[]
            def context():
                result=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                result.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+('?' + urlsplit(route.request.url).query if urlsplit(route.request.url).query else ''))))
                return result
            owner=context();guest=context();first=owner.new_page();first.on('pageerror',lambda error:errors.append(str(error)))
            first.goto(origin+'/');ready(first)
            first.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js'),r=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');await s.write(r.envelope,0)}""")
            first.goto(origin+'/?sync-test#activate='+('b'*64));unlock(first)
            first.evaluate("""async()=>{await db.batch([{action:'put',store:'folders',record:{id:'rights-team',name:'Équipe autorisée',section:'library',parentId:null}},{action:'put',store:'folders',record:{id:'rights-private',name:'Direction privée',section:'library',parentId:null}},{action:'put',store:'items',record:{id:'rights-note',type:'memo',title:'Procédure équipe',content:'<p>Visible par l’équipe</p>',folderId:'rights-team',unifiedDocument:true,commandBlocks:[],tags:[]}},{action:'put',store:'items',record:{id:'rights-hidden',type:'memo',title:'Interdit direction',content:'secret de direction',folderId:'rights-private',unifiedDocument:true,commandBlocks:[],tags:[]}},{action:'put',store:'items',record:{id:'rights-vault',type:'vault',title:'Accès serveur',vaultBlobEnc:await encryptBlobWithKey(JSON.stringify({password:'rights-secret-945!'}),state.vaultKey)}}]);}""")
            first.locator('#settingsBtn').click();first.locator('#settings-tab-users').click();first.locator('#wgUserAdd').click();first.locator('#wgUserName').fill('rights@example.test');first.locator('#wgUserSave').click();expect(first.locator('#wgUserInvitation')).to_be_visible();link=first.locator('#wgUserInvitationLink').input_value()
            card=first.locator('.user-card').filter(has=first.get_by_text('rights@example.test',exact=True));expect(card).to_be_visible()
            second=guest.new_page();second.on('pageerror',lambda error:errors.append(str(error)));second.goto(link);expect(second.locator('#webAccountSetupForm')).to_be_visible();second.locator('#webAccountUsername').fill('rights@example.test');second.locator('#webAccountCode').fill('12345678');second.locator('#webAccountConfirm').fill('12345678');second.locator('#webAccountSetupForm button[type=submit]').click();ready(second);second.locator('#lock').focus();second.keyboard.type('12345678');expect(second.locator('#app')).to_be_visible(timeout=20000)
            expect(second.locator('.permission-empty')).to_contain_text('Aucun espace');expect(second.locator('.workspace-section-button')).to_have_count(0);assert second.evaluate("async()=>(await all('items')).length")==0
            print('PASS: new account has no data and no sections before rights are assigned')
            card.click();expect(first.locator('#wgPermissionForm')).to_be_visible()
            first.locator('[data-permission-profile=reader]').click();expect(first.locator('#wgPermissionSave')).to_be_enabled();first.locator('#wgUsersRefresh').click();first.locator('#settings-tab-users').click();expect(first.locator('#wgPermissionProfile')).to_have_value('reader')
            first.locator('#settings-tab-interface').click();expect(first.locator('.app-dialog')).to_be_visible();first.locator('.app-dialog-cancel').click();expect(first.locator('#settings-tab-users')).to_have_attribute('aria-selected','true')
            first.locator('#closeSettingsBtn').click();expect(first.locator('.app-dialog')).to_be_visible();first.locator('.app-dialog-cancel').click();expect(first.locator('#wgPermissionProfile')).to_have_value('reader')
            first.locator('.user-card').filter(has=first.get_by_text('cantin.bruno@gmx.fr',exact=True)).click();expect(first.locator('.app-dialog')).to_be_visible();first.locator('.app-dialog-cancel').click();expect(first.locator('#wgPermissionProfile')).to_have_value('reader');expect(first.locator('#wgUserOverview h4')).to_have_text('rights@example.test')
            first.locator('.user-card').filter(has=first.get_by_text('cantin.bruno@gmx.fr',exact=True)).click();first.locator('.app-dialog-submit').click();expect(first.locator('.permission-owner')).to_be_visible();expect(first.locator('#wgPermissionSave')).to_have_count(0)
            card.click();expect(first.locator('#wgPermissionForm')).to_be_visible();first.locator('#wgUserInvitationClose').click()
            for width in [1440,1119,850,640,390,320]:
                first.set_viewport_size({'width':width,'height':1000 if width>640 else 844});first.locator('.settings-main').evaluate('(el)=>el.scrollTop=0');first.screenshot(path=str(ROOT/f'.cache/users-rights-{width}.png'));assert first.evaluate('document.documentElement.scrollWidth<=innerWidth');assert first.locator('.settings-modal').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1')
            first.set_viewport_size({'width':1440,'height':1000})
            first.locator('[data-permission-profile=reader]').click();first.locator('[data-permission-scopes]').evaluate('(el)=>el.open=true');first.get_by_text('Périmètre de la bibliothèque',exact=True).evaluate('(el)=>el.parentElement.open=true');first.locator('[data-scope-mode=library]').select_option('selected');first.locator('[data-add-target=library-folders]').select_option('rights-team');first.locator('[data-add-rule=library][data-kind=folders]').click()
            for width in [1440,390,320]:
                first.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});first.screenshot(path=str(ROOT/f'.cache/permissions-{width}.png'),animations='disabled');assert first.evaluate('document.documentElement.scrollWidth<=innerWidth')
            first.set_viewport_size({'width':1440,'height':1000});first.get_by_text('Durée et motif du changement',exact=True).click();first.locator('#wgPermissionReason').fill('Accès de consultation');first.locator('#wgPermissionSave').click();expect(first.locator('#wgPermissionHost')).to_contain_text('Droits enregistrés')
            expect(first.locator('[data-permission-profile=collaborator]')).to_be_enabled();first.locator('[data-permission-profile=collaborator]').click();first.get_by_role('button',name='Annuler les modifications',exact=True).click();expect(first.locator('#wgPermissionProfile')).to_have_value('custom')
            second.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(second.locator('#lock')).to_be_visible();second.locator('#lock').focus();second.keyboard.type('12345678');expect(second.locator('#app')).to_be_visible(timeout=20000);second.wait_for_function('()=>!document.querySelector("#app").inert')
            assert not second.evaluate("async()=>(await all('items')).some(row=>row.id==='rights-hidden')")
            assert second.evaluate("async()=>(await get('items','rights-vault')).secretsRestricted")
            second.evaluate("openSection('library','rights-note')");expect(second.locator('[data-item-action=edit]')).to_have_count(0);expect(second.locator('[data-item-action=delete]')).to_have_count(0)
            denied=second.evaluate("""async()=>{try{await db.updateItem('rights-note',row=>row.title='Refusé');return (await get('items','rights-note')).title==='Procédure équipe'}catch(error){return error.code==='PERMISSION_DENIED'}}""");assert denied
            second.locator('.workspace-section-button[data-section=vault]').click();second.evaluate("openSection('vault','rights-vault')");expect(second.locator('#detailHost')).to_contain_text('ne fait pas partie de vos droits');assert 'rights-secret-945!' not in second.locator('body').inner_text()
            second.reload();expect(second.locator('#app')).to_be_visible(timeout=20000);assert second.evaluate('WolfGuardCloud.can("vault.secrets")') is False
            print('PASS: reader sees only its allowed folder, cannot edit or decrypt secrets, and reload preserves the restricted session')
            card.click();first.locator('[data-permission-profile=collaborator]').click();first.locator('[data-permission-scopes]').evaluate('(el)=>el.open=true');first.get_by_text('Périmètre de la bibliothèque',exact=True).evaluate('(el)=>el.parentElement.open=true');first.locator('[data-scope-mode=library]').select_option('selected');first.locator('[data-add-target=library-folders]').select_option('rights-team');first.locator('[data-add-rule=library][data-kind=folders]').click();first.locator('[data-rule-section=library][data-rule-kind=folders][data-rule-id=rights-team]').select_option('write');first.locator('#wgPermissionSave').click();expect(first.locator('#wgPermissionHost')).to_contain_text('Droits enregistrés')
            second.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(second.locator('#lock')).to_be_visible();second.locator('#lock').focus();second.keyboard.type('12345678');expect(second.locator('#app')).to_be_visible(timeout=20000);second.wait_for_function('()=>!document.querySelector("#app").inert');second.evaluate("db.updateItem('rights-note',row=>row.title='Procédure modifiée')")
            assert second.evaluate("async()=>JSON.parse(await decryptBlobWithKey((await get('items','rights-vault')).vaultBlobEnc,state.vaultKey)).password")=='rights-secret-945!'
            first.locator('#wgPermissionsAudit').click();expect(first.locator('.permission-audit')).to_have_count(2);expect(first.locator('#wgPermissionHost')).to_contain_text('Accès de consultation')
            first.reload();expect(first.locator('#app')).to_be_visible(timeout=20000);assert first.evaluate("async()=>(await get('items','rights-note')).title")=='Procédure modifiée';assert first.evaluate("async()=>(await get('items','rights-hidden')).content")=='secret de direction'
            assert not errors,errors
            browser.close();print('PASS: custom scope permits edits, preserves hidden data, rewraps vault secrets and records permission changes')
    finally:
        process.terminate();process.wait(timeout=10);server.shutdown();server.server_close()

if __name__=='__main__':run()
