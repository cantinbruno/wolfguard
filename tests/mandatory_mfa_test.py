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
from push_fixture import configure_push,approve_latest

ROOT=Path(__file__).resolve().parents[1]

def run():
    codes_only=True
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin,'WG_TEST_MFA_REQUIRED':'1','WG_TEST_PUSH_PRIMARY':'1','WG_TEST_PHONE_REQUIRED':'0' if codes_only else '1','WG_TEST_PUSH':'1','WG_TEST_MANUAL_USERS':'1'})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    def api(path,data,token=None,method='POST',headers=None):
        raw=json.dumps(data).encode();h={'Origin':origin,'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {}),**(headers or {})}
        with urlopen(Request(backend+'/api/'+path,data=raw,headers=h,method=method)) as response:return json.load(response)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);errors=[]
            def context():
                c=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                c.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+('?' + urlsplit(route.request.url).query if urlsplit(route.request.url).query else ''))))
                c.on('page',lambda page:page.on('pageerror',lambda error:errors.append(str(error))))
                configure_push(c,origin)
                if codes_only:c.add_init_script("globalThis.browserEnrollCalls=0;if(navigator.serviceWorker)navigator.serviceWorker.register=async()=>{browserEnrollCalls++;throw new Error('Browser registration must not be needed for TOTP');};")
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
                page.locator('#webEnrollSaved').check();page.locator('#webEnrollContinue').click()
                if codes_only:
                    expect(page.locator('#app')).to_be_visible(timeout=20000);expect(page.locator('#webPhoneEnrollRegister')).to_have_count(0)
                    assert page.evaluate('WolfGuardCloud.currentUser().mfa.primary')=='authenticator'
                    assert page.evaluate('WolfGuardCloud.currentUser().mfa.complete')
                    assert page.evaluate('browserEnrollCalls')==0
                else:
                    expect(page.locator('#webPhoneEnrollRegister')).to_be_visible();expect(page.locator('#app')).to_be_hidden();page.locator('#webPhoneEnrollRegister').click();approve_latest(page,origin,backend)
                return secret
            enter(owner,CODE);owner_secret=enroll(owner)
            owner.locator('#settingsBtn').click();expect(owner.locator('#webOTPSettings')).to_contain_text('Authenticator')
            if codes_only:
                expect(owner.locator('#webMFADescription')).to_contain_text('application d’authentification')
                expect(owner.locator('#webMFAStepPhone,#webDuoSettings')).to_have_count(0)
                expect(owner.locator('#webPhoneSettings')).to_have_count(0)
            expect(owner.get_by_role('button',name='Désactiver Authenticator',exact=True)).to_have_count(0)
            owner.locator('#settings-tab-users').click();owner.locator('#wgUserAdd').click();owner.locator('#wgUserName').fill('personal-mfa@example.test');owner.locator('#wgUserSave').click();expect(owner.locator('#wgUserInvitation')).to_be_visible()
            invitation=owner.locator('#wgUserInvitationLink').input_value()
            guest=context().new_page();guest.goto(invitation);expect(guest.locator('#webAccountSetupForm')).to_be_visible(timeout=15000)
            expect(guest.locator('#webAccountSetupForm')).to_contain_text('Authenticator')
            guest.locator('#webAccountUsername').fill('personal-mfa@example.test');guest.locator('#webAccountCode').fill('12345678');guest.locator('#webAccountConfirm').fill('12345678');guest.locator('#webAccountSetupForm button[type=submit]').click()
            expect(guest.locator('#webEnrollSecret')).to_be_visible(timeout=20000)
            for width in [1440,390,320]:
                guest.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});assert guest.evaluate('document.documentElement.scrollWidth<=innerWidth')
                guest.screenshot(path=str(ROOT/f'.cache/mandatory-mfa-{width}.png'),animations='disabled')
            guest_secret=enroll(guest);assert guest_secret!=owner_secret
            assert guest.evaluate("async()=>!(await get('items','private-note'))")
            expect(guest.locator('.permission-empty')).to_contain_text('Aucun espace')
            assert guest.evaluate('WolfGuardCloud.currentUser().mfa.authenticator')
            guest.reload();expect(guest.locator('#app')).to_be_visible(timeout=20000);expect(guest.locator('.web-mfa-enrollment')).to_have_count(0)
            with urlopen(backend+'/__test/advance/30001'):pass
            guest.evaluate('lockApplication()');ready(guest);enter(guest,'12345678')
            if codes_only:
                expect(guest.locator('.web-push-dialog,#webPhoneEnrollRegister')).to_have_count(0)
                expect(guest.locator('.app-dialog-input')).to_be_visible();guest.locator('.app-dialog-input').fill(otp(guest_secret,time.time()+30.001));guest.locator('.app-dialog-submit').click();expect(guest.locator('#app')).to_be_visible(timeout=20000)
            else:approve_latest(guest,origin,backend)
            with urlopen(backend+'/__test/advance/30001'):pass
            guest.evaluate('lockApplication()');ready(guest);enter(guest,'12345678')
            if not codes_only:
                expect(guest.locator('.web-push-dialog')).to_be_visible();expect(guest.locator('.app-dialog-input')).to_have_count(0);guest.locator('#webPushRecovery').click()
            expect(guest.locator('.app-dialog-input')).to_be_visible();guest.locator('.app-dialog-input').fill(otp(guest_secret,time.time()+60.002));guest.locator('.app-dialog-submit').click();expect(guest.locator('#app')).to_be_visible(timeout=20000)
            if codes_only:assert guest.evaluate('browserEnrollCalls')==0
            assert not errors,errors
            browser.close()
    finally:process.terminate();process.wait(timeout=10);server.shutdown();server.server_close()
    print('PASS: mandatory MFA with existing TOTP only, no browser association, private account factors, repeated logins and generic authenticator settings' if codes_only else 'PASS: mandatory own MFA at invited signup, no workspace before OTP, unique secrets, recovery acknowledgement, push without OTP before approval, explicit OTP backup and verified reload')

if __name__=='__main__':run()
