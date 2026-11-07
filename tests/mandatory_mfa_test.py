"""Headless, real API: invitations require individual MFA before workspace access."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from urllib.request import Request,urlopen
import json,os,subprocess,time
from playwright.sync_api import sync_playwright,expect
from shared_workspace_test import Quiet,ready,API,CODE
from otp_workspace_test import otp

ROOT=Path(__file__).resolve().parents[1]

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin,'WG_TEST_MFA_REQUIRED':'1','WG_TEST_MANUAL_USERS':'1'})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    def api(path,data,token=None,method='POST',headers=None):
        raw=json.dumps(data).encode();h={'Origin':origin,'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {}),**(headers or {})}
        with urlopen(Request(backend+'/api/'+path,data=raw,headers=h,method=method)) as response:return json.load(response)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);errors=[]
            def context():
                c=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                c.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path)))
                c.on('page',lambda page:page.on('pageerror',lambda error:errors.append(str(error))))
                return c
            owner=context().new_page();owner.goto(origin+'/?sync-test');ready(owner)
            encrypted=owner.evaluate("""async()=>{const c=await import('./browser/crypto.js');const result=await c.create({version:2,items:[{id:'private-note',type:'memo',title:'Private fixture',content:'<p>Only after MFA</p>'}],folders:[],settings:[],activity:[]},'99887766');return {envelope:result.envelope,workspace:await c.workspaceMaterial('99887766',result.salt)}}""")
            setup=api('setup',{'code':'99887766'},headers={'X-WG-Activation':'b'*64})
            envelope=encrypted['envelope'];serialized=json.dumps(envelope).encode()
            api('vault',envelope,setup['token'],'PUT',{'X-WG-Version':'0','X-WG-Size':str(len(serialized))})
            api('users/initialize',{'username':'cantin.bruno@gmx.fr','code':CODE,'oldCode':'99887766','workspace':encrypted['workspace'],'version':1},setup['token'])
            owner.reload();ready(owner)
            def enter(page,code):page.locator('#lock').focus();page.keyboard.type(code)
            def enroll(page):
                expect(page.locator('.web-mfa-enrollment')).to_be_visible(timeout=20000);expect(page.locator('#app')).to_be_hidden()
                expect(page.locator('#webEnrollQR')).to_be_visible();secret=page.locator('#webEnrollSecret').input_value()
                assert len(secret)==32
                page.locator('#webEnrollOTP').fill(otp(secret,time.time()));page.locator('#webEnrollForm button[type=submit]').click()
                expect(page.locator('#webEnrollRecovery')).to_be_visible(timeout=15000);codes=page.locator('#webEnrollRecovery').input_value().splitlines();assert len(codes)==8
                expect(page.locator('#app')).to_be_hidden();expect(page.locator('#webEnrollContinue')).to_be_disabled()
                page.locator('#webEnrollSaved').check();page.locator('#webEnrollContinue').click();expect(page.locator('#app')).to_be_visible(timeout=20000)
                return secret
            enter(owner,CODE);owner_secret=enroll(owner)
            owner.locator('#settingsBtn').click();expect(owner.locator('#webOTPSettings')).to_contain_text('obligatoire')
            expect(owner.get_by_role('button',name='Désactiver Authenticator',exact=True)).to_have_count(0)
            owner.locator('#settings-tab-users').click();owner.locator('#wgUserInvite').click();expect(owner.locator('#wgUserInvitation')).to_be_visible()
            invitation=owner.locator('#wgUserInvitationLink').input_value()
            guest=context().new_page();guest.goto(invitation);expect(guest.locator('#webAccountSetupForm')).to_be_visible(timeout=15000)
            expect(guest.locator('#webAccountSetupForm')).to_contain_text('MFA est obligatoire')
            guest.locator('#webAccountUsername').fill('personal-mfa@example.test');guest.locator('#webAccountCode').fill('12345678');guest.locator('#webAccountConfirm').fill('12345678');guest.locator('#webAccountSetupForm button[type=submit]').click()
            expect(guest.locator('#webEnrollSecret')).to_be_visible(timeout=20000)
            for width in [1440,390,320]:
                guest.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});assert guest.evaluate('document.documentElement.scrollWidth<=innerWidth')
                guest.screenshot(path=str(ROOT/f'.cache/mandatory-mfa-{width}.png'),animations='disabled')
            guest_secret=enroll(guest);assert guest_secret!=owner_secret
            assert guest.evaluate("async()=>(await get('items','private-note')).content")=='<p>Only after MFA</p>'
            assert guest.evaluate('WolfGuardCloud.currentUser().mfa.authenticator')
            guest.reload();expect(guest.locator('#app')).to_be_visible(timeout=20000);expect(guest.locator('.web-mfa-enrollment')).to_have_count(0)
            guest.evaluate('lockApplication()');ready(guest);enter(guest,'12345678');expect(guest.locator('.app-dialog-input')).to_be_visible()
            expect(guest.locator('#app')).to_be_hidden();guest.locator('.app-dialog-cancel').click();expect(guest.locator('#lockError')).to_contain_text('annulée');ready(guest)
            with urlopen(backend+'/__test/advance/60000'):pass
            enter(guest,'12345678');expect(guest.locator('.app-dialog-input')).to_be_visible();guest.locator('.app-dialog-input').fill(otp(guest_secret,time.time()+60));guest.locator('.app-dialog-submit').click();expect(guest.locator('#app')).to_be_visible(timeout=20000)
            assert not errors,errors
            browser.close()
    finally:process.terminate();process.wait(timeout=10);server.shutdown();server.server_close()
    print('PASS: mandatory own MFA at invited signup, no workspace before OTP, unique secrets, recovery acknowledgement, every fresh session and verified reload')

if __name__=='__main__':run()
