"""Duo settings, Universal Prompt handoff, verified callback and OTP recovery."""
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from pathlib import Path
from urllib.parse import urlsplit,parse_qs,urlencode
from urllib.request import urlopen
import json,os,subprocess,time,base64
from playwright.sync_api import sync_playwright,expect
from shared_workspace_test import Quiet,ready,unlock,API,CODE
from session_resume_test import seed
from otp_workspace_test import otp

ROOT=Path(__file__).resolve().parents[1]
def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')));Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],env={**os.environ,'WG_TEST_ORIGIN':origin,'WG_TEST_DUO':'1','WG_TEST_BROWSER_PUSH':'0'},stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');errors=[]
            def proxy(route):route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+('?' +urlsplit(route.request.url).query if urlsplit(route.request.url).query else '')))
            context.route(API+'/**',proxy);context.route(origin+'/api/duo/**',proxy)
            context.add_init_script("globalThis.browserRegistrations=0;if(navigator.serviceWorker)navigator.serviceWorker.register=()=>{browserRegistrations++;throw new Error('Retired browser push');};")
            def provider(route):
                jwt=parse_qs(urlsplit(route.request.url).query)['request'][0].split('.')[1];payload=json.loads(base64.urlsafe_b64decode(jwt+'='*(-len(jwt)%4)))
                target=origin+'/api/duo/callback?'+urlencode({'state':payload['state'],'code':'fixture-approval'})
                route.fulfill(content_type='text/html',body='<h1>Duo Mobile · simulated provider</h1><a href="'+target.replace('&','&amp;')+'">Approuver</a>')
            context.route('https://api-12345678.duosecurity.com/oauth/v1/authorize*',provider)
            page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)));page.goto(origin+'/');ready(page);seed(page);page.goto(origin+'/?sync-test#activate='+('b'*64));unlock(page)
            page.locator('#settingsBtn').click();expect(page.locator('#webDuoSettings')).to_contain_text('pas encore configuré');expect(page.locator('#webPhoneSettings')).to_have_count(0)
            page.locator('#webOTPPassword').fill(CODE);page.locator('#webOTPForm button[type=submit]').click();expect(page.locator('#webOTPSecret')).to_be_visible();secret=page.locator('#webOTPSecret').input_value();page.locator('#webOTPCode').fill(otp(secret,time.time()));page.locator('#webOTPSettings button[type=submit]').click();expect(page.get_by_role('textbox',name='Codes de secours')).to_be_visible()
            with urlopen(backend+'/__test/advance/60001'):pass
            for width in [1440,390,320]:
                page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(ROOT/f'.cache/duo-settings-{width}.png'))
            page.set_viewport_size({'width':1440,'height':1000})
            page.locator('#webDuoHost').fill('api-12345678.duosecurity.com');page.locator('#webDuoClient').fill('DI'+'A'*18);page.locator('#webDuoSecret').fill('B'*40);page.locator('#webDuoPIN').fill(CODE);page.locator('#webDuoOTP').fill(otp(secret,time.time()+60.001));page.locator('#webDuoForm button[type=submit]').click();expect(page.locator('#webDuoFeedback')).to_contain_text('Configuration enregistrée');expect(page.locator('#webDuoSecret')).to_have_value('');expect(page.locator('#webMFADescription')).to_contain_text('Duo Mobile est la validation principale')
            page.locator('#closeSettingsBtn').click();page.evaluate('lockApplication()');ready(page);page.locator('#lock').focus();page.keyboard.type(CODE);expect(page.locator('.web-duo-dialog')).to_be_visible(timeout=20000);expect(page.locator('#app')).to_be_hidden()
            with page.expect_popup() as opening:page.locator('#webDuoOpen').click()
            popup=opening.value;expect(popup.get_by_role('link',name='Approuver')).to_be_visible();popup.get_by_role('link',name='Approuver').click();expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert page.evaluate('WolfGuardCloud.currentUser().mfa.primary')=='duo';assert page.evaluate('browserRegistrations')==0
            with urlopen(backend+'/__test/advance/30001'):pass
            page.evaluate('lockApplication()');ready(page);page.locator('#lock').focus();page.keyboard.type(CODE);expect(page.locator('.web-duo-dialog')).to_be_visible();page.locator('#webDuoBackup').click();expect(page.locator('.app-dialog-input')).to_be_visible();page.locator('.app-dialog-input').fill(otp(secret,time.time()+90.002));page.locator('.app-dialog-submit').click();expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert page.evaluate('browserRegistrations')==0;assert not errors,errors
            browser.close();print('PASS: Duo admin setup, encrypted-secret entry, mobile layout, Universal Prompt popup, signed callback to login, explicit OTP backup and no browser push registration (simulated Duo service).')
    finally:process.terminate();process.wait(timeout=10);server.shutdown();server.server_close()
if __name__=='__main__':run()
