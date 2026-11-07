"""Headless regression: application MFA alone, recovery and one-hour sessions."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from urllib.request import urlopen
import json,os,subprocess,time
from playwright.sync_api import sync_playwright,expect
from shared_workspace_test import Quiet,ready,unlock,API,CODE
from session_resume_test import seed
from otp_workspace_test import otp

ROOT=Path(__file__).resolve().parents[1]
def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')));Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port']);offset=0
    def advance(ms):
        nonlocal offset
        with urlopen(backend+'/__test/advance/'+str(ms)):pass
        offset+=ms
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            context.add_init_script("(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+Number(sessionStorage.getItem('phone-clock-offset')||0)})();")
            context.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path)))
            page=context.new_page();errors=[];requests=[];page.on('pageerror',lambda error:errors.append(str(error)));page.on('request',lambda request:requests.append(urlsplit(request.url).path))
            page.goto(origin+'/');ready(page);seed(page);page.goto(origin+'/?sync-test#activate='+('b'*64));unlock(page)
            page.locator('#settingsBtn').click();page.locator('#webOTPPassword').fill(CODE);page.locator('#webOTPForm button[type=submit]').click();expect(page.locator('#webOTPSecret')).to_be_visible();secret=page.locator('#webOTPSecret').input_value()
            page.locator('#webOTPCode').fill(otp(secret,time.time()));page.locator('#webOTPSettings button[type=submit]').click();expect(page.locator('#webMFAState')).to_contain_text('MFA activée')
            codes=page.get_by_role('textbox',name='Codes de secours').input_value().splitlines();assert len(codes)==8;expect(page.locator('#webPhoneSettings')).to_have_count(0)
            page.locator('#closeSettingsBtn').click();page.evaluate('lockApplication()');ready(page);advance(60000)
            page.locator('#lock').focus();page.keyboard.type(CODE);expect(page.locator('.app-dialog-input')).to_be_visible();page.locator('.app-dialog-input').fill(otp(secret,time.time()+offset/1000));page.locator('.app-dialog-submit').click();expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.locator('#settingsBtn').click();page.locator('#settings-tab-users').click();expect(page.locator('.users-mfa')).to_contain_text('MFA activée');assert 'Téléphone' not in page.locator('.users-mfa').inner_text();page.locator('#closeSettingsBtn').click()
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.evaluate('lockApplication()');ready(page);page.locator('#lock').focus();page.keyboard.type(CODE);expect(page.locator('.app-dialog-input')).to_be_visible();page.locator('.app-dialog-input').fill(codes[0]);page.locator('.app-dialog-submit').click();expect(page.locator('#app')).to_be_visible(timeout=20000)
            clock=page.evaluate("JSON.parse(sessionStorage.getItem('wolfguard-tab-session-v1')).clock")
            advance(59*60000);page.evaluate("active=>sessionStorage.setItem('phone-clock-offset',String(active+59*60000-Date.now()))",clock['active']);page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            advance(61000);page.evaluate("sessionStorage.setItem('phone-clock-offset',String(Number(sessionStorage.getItem('phone-clock-offset'))+61000))");page.reload();ready(page);expect(page.locator('#app')).to_be_hidden()
            assert not any(path.startswith('/api/push/') or path.startswith('/api/users/push') for path in requests),requests
            assert not errors,errors
            browser.close()
    finally:process.terminate();process.wait(timeout=10);server.shutdown();server.server_close()
    print('PASS: Authenticator-only login, complete account status, no push requests, recovery, verified reload and one-hour inactivity')
if __name__=='__main__':run()
