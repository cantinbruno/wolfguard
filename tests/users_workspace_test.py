"""First admin setup, personal logins, account controls and dedicated agents."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json,os,subprocess
from playwright.sync_api import sync_playwright,expect
from shared_workspace_test import Quiet,ready,API,CODE

ROOT=Path(__file__).resolve().parents[1]
ADMIN=CODE

def login(page,name,code):
    ready(page);expect(page.locator('#webUsername')).to_have_value('');page.locator('#webUsername').fill(name);page.locator('#lock').focus();page.keyboard.type(code)
    expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin,'WG_TEST_MANUAL_USERS':'1'})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();errors=[]
            def context(ip):
                result=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                result.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+'?'+urlsplit(route.request.url).query,headers={**route.request.headers,'cf-connecting-ip':ip})))
                return result
            owner=context('192.0.2.1');guest=context('192.0.2.2');owner.add_init_script("localStorage.setItem('wolfguard-username-v1','previous@example.test')");first=owner.new_page();first.on('pageerror',lambda error:errors.append(str(error)))
            first.goto(origin+'/?sync-test');ready(first)
            expect(first.locator('#webUsername')).to_have_value('');expect(first.locator('#webUsername')).to_have_accessible_name('Nom d’utilisateur');assert first.evaluate("localStorage.getItem('wolfguard-username-v1')") is None
            first.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const payload={version:2,items:[{id:'personal-preserved',type:'memo',title:'Fiche conservée',content:'<p>Contenu avant les utilisateurs</p>',tags:[],commandBlocks:[]}],folders:[],settings:[],activity:[]};const result=await c.create(payload,'07942685');payload.items.push({id:'retained-vault',type:'vault',title:'Ancienne donnée',vaultBlobEnc:await encryptBlobWithKey(JSON.stringify({password:'synthetic-retained-secret'}),result.key)});await s.write(await c.seal(payload,result.key,result.salt,1),0)}""")
            first.goto(origin+'/?sync-test&users-test#activate='+('b'*64));ready(first)
            first.locator('#webUsername').fill('cantin.bruno@gmx.fr');first.locator('#lock').focus();first.keyboard.type(CODE)
            expect(first.locator('#app')).to_be_visible(timeout=20000);first.wait_for_function('()=>!document.querySelector("#app").inert')
            assert first.evaluate("async()=>(await get('items','personal-preserved')).content")=='<p>Contenu avant les utilisateurs</p>'
            assert first.evaluate("async()=>JSON.parse(await decryptBlobWithKey((await get('items','retained-vault')).vaultBlobEnc,state.vaultKey)).password")=='synthetic-retained-secret'
            expect(first.locator('#webUserSetupForm')).to_have_count(0);assert first.evaluate('WolfGuardCloud.hasUsers()') is True
            assert first.evaluate('state.vaultKey.extractable') is False
            assert ADMIN not in first.evaluate('JSON.stringify(sessionStorage)')
            first.reload();expect(first.locator('#app')).to_be_visible(timeout=20000)
            print('PASS: pre-created owner signs in with the existing code without a creation form, preserves the encrypted note and vault, and reloads with a non-extractable key')

            def users():
                first.locator('#settingsBtn').click();first.locator('#settings-tab-users').click()
            users();expect(first.locator('#settings-tab-agents,#wgUserRole')).to_have_count(0)
            expect(first.locator('#webUsername')).to_have_attribute('type','text')
            expect(first.locator('#wgUsersList')).to_contain_text('cantin.bruno@gmx.fr')
            first.locator('#wgUserAdd').click();first.locator('#wgUserName').fill('alice@example.test');first.locator('#wgUserCode').fill('12345678');first.locator('#wgUserSave').click()
            expect(first.locator('#wgUsersList')).to_contain_text('alice@example.test')
            owner_row=first.locator('.user-card').filter(has=first.get_by_text('cantin.bruno@gmx.fr',exact=True));expect(owner_row).to_contain_text('Compte protégé')
            owner_row.get_by_role('button',name='Modifier',exact=True).click();expect(first.locator('#wgUserName')).to_have_attribute('readonly','');expect(first.locator('#wgUserDisabled')).to_be_disabled();first.locator('#wgUserCancel').click()
            for width in [1440,1150,1050,900,640,390,320]:
                first.set_viewport_size({'width':width,'height':1000 if width>640 else 844})
                assert first.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                assert first.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
                if width in [1440,390]:first.screenshot(path=str(ROOT/f'.cache/users-settings-{width}.png'),animations='disabled')
            first.locator('#closeSettingsBtn').click()
            for width in [1440,1150,1050,900,640,390,320]:
                first.set_viewport_size({'width':width,'height':1000 if width>640 else 844})
                assert first.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                a=first.locator('#agentsBtn').bounding_box();b=first.locator('#settingsBtn').bounding_box()
                assert a['x']+a['width']<=b['x']+1 and abs(a['y']-b['y'])<1,(width,a,b,first.evaluate("()=>{const s=getComputedStyle(document.querySelector('.topbar'));return {areas:s.gridTemplateAreas,columns:s.gridTemplateColumns,agent:getComputedStyle(document.querySelector('#agentsBtn')).gridArea,settings:getComputedStyle(document.querySelector('#settingsBtn')).gridArea}}"))
                first.locator('#agentsBtn').click();expect(first.locator('.agents-modal')).to_be_visible()
                assert first.locator('#closeAgentsBtn').evaluate('el=>{const r=el.getBoundingClientRect(),d=el.closest(".agents-modal").getBoundingClientRect();return r.left>=d.left&&r.right<=d.right&&r.top>=d.top&&r.bottom<=d.top+68&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
                expect(first.locator('#wgAgentPair')).to_be_visible()
                first.locator('#wgAgentPair').scroll_into_view_if_needed()
                assert first.locator('#wgAgentPair').evaluate('el=>{const r=el.getBoundingClientRect(),d=el.closest(".agents-modal").getBoundingClientRect();return r.left>=d.left&&r.right<=d.right&&r.top>=d.top&&r.bottom<=d.bottom}')
                first.locator('.agents-dialog-content').evaluate('el=>el.scrollTop=0')
                assert first.locator('.agents-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1')
                if width in [1440,390]:first.screenshot(path=str(ROOT/f'.cache/agents-dialog-{width}.png'),animations='disabled')
                first.keyboard.press('Escape');expect(first.locator('.agents-modal')).to_have_count(0);expect(first.locator('#agentsBtn')).to_be_focused()
            first.set_viewport_size({'width':1440,'height':1000})
            print('PASS: user creation, protected last administrator, responsive account settings and a dedicated Agents button beside Settings from 320px to desktop')

            second=guest.new_page();second.on('pageerror',lambda error:errors.append(str(error)));second.goto(origin+'/?sync-test');login(second,'alice@example.test','12345678')
            assert second.evaluate("async()=>(await get('items','personal-preserved')).content")=='<p>Contenu avant les utilisateurs</p>'
            second.locator('#settingsBtn').click()
            for tab in ['users','access']:expect(second.locator('#settings-tab-'+tab)).to_be_visible();expect(second.locator('#settings-tab-'+tab)).to_be_disabled()
            second.locator('#settings-tab-interface').click();second.keyboard.press('ArrowRight');expect(second.locator('#settings-tab-history')).to_be_focused()
            second.evaluate("setSettingsTab('access')");expect(second.locator('#settings-tab-history')).to_have_attribute('aria-selected','true');second.locator('#closeSettingsBtn').click()
            second.evaluate("async()=>{const note=await get('items','personal-preserved');await put('items',{...note,title:'Modifie par un membre'})}")
            assert first.evaluate("async()=>{await webWorkspace.refreshShared();return (await get('items','personal-preserved')).title}")=='Modifie par un membre'
            first.evaluate("async()=>{const note=await get('items','personal-preserved');await put('items',{...note,title:'Modifie par administrateur'})}")
            assert second.evaluate("async()=>{await webWorkspace.refreshShared();return (await get('items','personal-preserved')).title}")=='Modifie par administrateur'
            assert second.evaluate("async()=>{try{await WolfGuardCloud.agentRequest('users');return false}catch{return true}}")
            second.locator('#agentsBtn').click();expect(second.locator('#wgAgentFleetPanel')).to_be_visible();expect(second.locator('#wgAgentAdd')).to_be_hidden();second.locator('#closeAgentsBtn').click()
            print('PASS: personal member login reads the same data, shows disabled access controls and shares edits in both directions and has a read-only agent management view')

            users()
            def alice():return first.locator('.user-card').filter(has=first.get_by_text('alice@example.test',exact=True))
            def manage(name):
                if alice().locator('details').get_attribute('open') is None:alice().locator('summary').click()
                alice().get_by_role('button',name=name,exact=True).click()
            manage('Désactiver');first.locator('.app-dialog-submit').click();expect(alice()).to_contain_text('Compte désactivé')
            second.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(second.locator('#lock')).to_be_visible()
            manage('Activer');first.locator('.app-dialog-submit').click();expect(alice()).not_to_contain_text('Compte désactivé');login(second,'alice@example.test','12345678')
            manage('Réinitialiser le code');first.locator('.app-dialog-input').fill('23456789');first.locator('.app-dialog-submit').click();expect(first.locator('.app-dialog-input')).to_have_count(0)
            with first.expect_response(lambda response:urlsplit(response.url).path=='/api/users/reset-code' and response.status==200):first.locator('.app-dialog-submit').click()
            expect(first.locator('#wgUsersStatus')).to_contain_text('Action effectuée')
            second.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(second.locator('#lock')).to_be_visible();login(second,'alice@example.test','23456789')
            first.locator('#closeSettingsBtn').click();first.locator('#settingsBtn').click();first.locator('#changeCodeBtn').click()
            first.locator('#oldAccessCode').fill(ADMIN);first.locator('#newAccessCode').fill('56781234');first.locator('#confirmAccessCode').fill('56781234');first.locator('#webChangePassword').click()
            expect(first.locator('#modalRoot')).to_be_empty();assert second.evaluate('async()=>{await WolfGuardCloud.touch();return true}')
            first.evaluate('lockApplication()');login(first,'cantin.bruno@gmx.fr','56781234')
            print('PASS: disable/enable and code reset revoke the right user; changing the administrator code leaves the member and shared encryption intact')
            first.locator('#settingsBtn').click();first.locator('#settings-tab-data').click();first.locator('#exp').click()
            first.locator('.app-dialog-input').fill('56781234')
            with first.expect_download() as downloaded:first.locator('.app-dialog-submit').click()
            backup=json.loads(Path(downloaded.value.path()).read_text(encoding='utf8'))
            assert first.evaluate("""async envelope=>{const c=await import('./browser/crypto.js'),result=await c.open(envelope,'56781234');return result.payload.items.some(row=>row.id==='personal-preserved')&&JSON.parse(await decryptBlobWithKey(result.payload.items.find(row=>row.id==='retained-vault').vaultBlobEnc,result.key)).password==='synthetic-retained-secret'}""",backup)
            first.locator('#closeSettingsBtn').click()
            print('PASS: standalone backup uses the personal code and keeps both notes and legacy encrypted vault records readable')
            users();manage('Supprimer');first.locator('.app-dialog-submit').click();expect(alice()).to_have_count(0)
            second.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(second.locator('#lock')).to_be_visible()
            first.locator('#closeSettingsBtn').click();assert first.evaluate("async()=>(await get('items','personal-preserved')).content")=='<p>Contenu avant les utilisateurs</p>'
            assert not errors,errors
            browser.close()
    finally:
        server.shutdown();server.server_close();process.terminate();process.wait(timeout=10)

if __name__=='__main__':run()
