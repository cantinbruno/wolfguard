"""Retired browser push stays disabled; Authenticator and indefinite sessions remain usable."""
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
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin,'WG_TEST_PUSH':'1','WG_TEST_BROWSER_PUSH':'0'})
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
                c.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+'?'+urlsplit(route.request.url).query,headers={**route.request.headers,'cf-connecting-ip':'192.0.2.1'})))
                c.on('page',lambda page:page.on('pageerror',lambda e:errors.append(str(e))))
                return c
            desktop=context();desktop.add_init_script("(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+Number(sessionStorage.getItem('phone-clock-offset')||0)})();")
            page=desktop.new_page();page.goto(origin+'/');ready(page);seed(page);page.goto(origin+'/?sync-test#activate='+('b'*64));unlock(page)
            page.locator('#settingsBtn').click();page.locator('#settings-tab-users').click();page.locator('.users-account-security summary').click();page.get_by_role('button',name='Configurer ma MFA').click()
            page.locator('#webOTPPassword').fill(CODE);page.locator('#webOTPForm button[type=submit]').click()
            expect(page.locator('#webOTPSecret')).to_be_visible();secret=page.locator('#webOTPSecret').input_value()
            page.locator('#webOTPCode').fill(current_otp());page.locator('#webOTPSettings button[type=submit]').click()
            recovery=page.get_by_role('textbox',name='Codes de secours');expect(recovery).to_be_visible();codes=recovery.input_value().splitlines()
            # Browser push was retired before this change. Existing push service
            # configuration must not replace the Authenticator login or create a
            # browser association implicitly.
            expect(page.locator('#webPhoneSettings,#webPhoneRegister')).to_have_count(0)
            token=page.evaluate('WolfGuardCloud.sessionState().token')
            retired=desktop.request.get(backend+'/api/users/push',headers={'Authorization':'Bearer '+token,'Origin':origin})
            assert retired.status==410,retired.text()
            assert page.evaluate("async()=>!(await indexedDB.databases()).some(db=>db.name==='wolfguard-phone-v1')")
            page.locator('#closeSettingsBtn').click()
            page.evaluate('lockApplication()');ready(page);advance(30000)
            page.locator('#lock').focus();page.keyboard.type(CODE)
            expect(page.locator('.web-push-dialog')).to_have_count(0)
            prompt=page.locator('.app-dialog-input');expect(prompt).to_be_visible()
            prompt.fill(current_otp());page.locator('.app-dialog-submit').click()
            expect(page.locator('#app')).to_be_visible(timeout=20000)
            advance(24*60*60000)
            page.evaluate("sessionStorage.setItem('phone-clock-offset',String(24*60*60000))")
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.evaluate('lockApplication()');ready(page)
            page.locator('#lock').focus();page.keyboard.type(CODE)
            expect(prompt).to_be_visible();prompt.fill(codes[0]);page.locator('.app-dialog-submit').click()
            expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert messages()==[],messages()
            assert not errors,errors
            browser.close();print('PASS: retired browser association stays disabled, Authenticator and recovery still work, no push delivered, indefinite reload and manual lock')
    finally:
        process.terminate();process.wait(timeout=5);server.shutdown()

if __name__=='__main__':run()
