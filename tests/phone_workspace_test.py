"""Real browser: OTP, phone signing key, approve/refuse and one-hour reload."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from urllib.request import urlopen
import json, os, subprocess, time
from playwright.sync_api import sync_playwright, expect
from shared_workspace_test import Quiet, ready, unlock, API, CODE
from session_resume_test import seed
from otp_workspace_test import otp

ROOT=Path(__file__).resolve().parents[1]

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin,'WG_TEST_PUSH':'1'})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port']);offset=0
    def advance(ms):
        nonlocal offset
        with urlopen(backend+'/__test/advance/'+str(ms)):pass
        offset+=ms
    def current_otp():return otp(secret,time.time()+offset/1000)
    def messages():
        with urlopen(backend+'/__test/push-messages') as r:return json.load(r)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();errors=[]
            def context():
                c=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                c.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path,headers={**route.request.headers,'cf-connecting-ip':'192.0.2.1'})))
                c.on('page',lambda page:page.on('pageerror',lambda e:errors.append(str(e))))
                return c
            desktop=context();desktop.add_init_script("(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+Number(sessionStorage.getItem('phone-clock-offset')||0)})();")
            page=desktop.new_page();page.goto(origin+'/');ready(page);seed(page);page.goto(origin+'/?sync-test#activate='+('b'*64));unlock(page)
            page.locator('#settingsBtn').click();page.locator('#webOTPPassword').fill(CODE);page.locator('#webOTPForm button[type=submit]').click()
            expect(page.locator('#webOTPSecret')).to_be_visible();secret=page.locator('#webOTPSecret').input_value()
            page.locator('#webOTPCode').fill(current_otp());page.locator('#webOTPSettings button[type=submit]').click()
            recovery=page.get_by_role('textbox',name='Codes de secours');expect(recovery).to_be_visible();codes=recovery.input_value().splitlines()
            phone=context();phone.grant_permissions(['notifications'],origin=origin)
            # Simulate the browser push service only; worker registration,
            # permission, private CryptoKey storage and signatures remain real.
            phone.add_init_script("""(()=>{const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\\+/g,'-').replace(/\\//g,'_');const subscription=async()=>{const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);const json={endpoint:'https://fcm.googleapis.com/fcm/send/browser-test',expirationTime:null,keys:{p256dh:b64(new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey))),auth:b64(crypto.getRandomValues(new Uint8Array(16)))}};return {toJSON:()=>json}};PushManager.prototype.getSubscription=async()=>null;PushManager.prototype.subscribe=subscription;})();""")
            mobile=phone.new_page();mobile.goto(origin+'/?sync-test');ready(mobile);advance(30000);mobile.locator('#lock').focus();mobile.keyboard.type(CODE)
            prompt=mobile.locator('.app-dialog-input');expect(prompt).to_be_visible();prompt.fill(current_otp());mobile.locator('.app-dialog-submit').click();expect(mobile.locator('#app')).to_be_visible(timeout=20000)
            mobile.locator('#settingsBtn').click();expect(mobile.locator('#webPhoneRegister')).to_be_visible();advance(30000)
            mobile.locator('#webPhoneCode').fill(CODE);mobile.locator('#webPhoneOTP').fill(current_otp());mobile.locator('#webPhoneRegister').click()
            expect(mobile.locator('#webPhoneSettings [role=status]')).to_contain_text('Téléphone associé',timeout=20000)
            assert mobile.evaluate('async()=>{const d=await WolfGuardPhone.read();return d.key.extractable===false}')
            assert messages()[-1]['type']=='associated'
            page.locator('#closeSettingsBtn').click();page.evaluate('lockApplication()');ready(page)
            def begin():
                advance(30000);page.locator('#lock').focus();page.keyboard.type(CODE)
                expect(page.locator('.app-dialog-input')).to_be_visible();page.locator('.app-dialog-input').fill(current_otp());page.locator('.app-dialog-submit').click()
                expect(page.locator('.web-push-dialog')).to_be_visible();expect(page.locator('#app')).to_be_hidden()
                message=messages()[-1];assert message['type']=='login'
                expect(page.locator('.web-push-number')).to_have_text(message['displayCode']);return message
            message=begin();approval=phone.new_page();approval.goto(origin+'/approve.html#request='+message['id']+'&device='+message['deviceId'])
            expect(approval.locator('#phoneApprove')).to_be_visible();approval.reload();expect(approval.locator('#phoneApprove')).to_be_visible();expect(approval.locator('#phoneNumber')).to_have_text(message['displayCode']);approval.locator('#phoneApprove').click()
            expect(approval.locator('#phoneStatus')).to_contain_text('Connexion approuvée');expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.evaluate('lockApplication()');ready(page);message=begin()
            approval.goto(origin+'/approve.html#request='+message['id']+'&device='+message['deviceId']);expect(approval.locator('#phoneDeny')).to_be_visible();approval.locator('#phoneDeny').click()
            expect(page.locator('#lockError')).to_contain_text('refusée',timeout=15000)
            page.locator('#lock').focus();page.keyboard.type(CODE);expect(page.locator('.app-dialog-input')).to_be_visible();page.locator('.app-dialog-input').fill(codes[0]);page.locator('.app-dialog-submit').click();expect(page.locator('#app')).to_be_visible(timeout=20000)
            clock=page.evaluate("JSON.parse(sessionStorage.getItem('wolfguard-tab-session-v1')).clock")
            advance(59*60000);page.evaluate("active=>sessionStorage.setItem('phone-clock-offset',String(active+59*60000-Date.now()))",clock['active']);page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            advance(61000);page.evaluate("sessionStorage.setItem('phone-clock-offset',String(Number(sessionStorage.getItem('phone-clock-offset'))+61000))");page.reload();ready(page);expect(page.locator('#app')).to_be_hidden()
            assert not errors,errors
            browser.close();print('PASS: OTP plus phone approval/refusal, private signing key, recovery, reload at 59 minutes and lock after one hour')
    finally:
        process.terminate();process.wait(timeout=5);server.shutdown()

if __name__=='__main__':run()
