"""Code-only entry and Authenticator enrollment in a real browser."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from urllib.request import urlopen
import base64, hashlib, hmac, json, os, struct, subprocess, time
from playwright.sync_api import sync_playwright, expect
from shared_workspace_test import Quiet, ready, unlock, API, CODE
from session_resume_test import seed

ROOT = Path(__file__).resolve().parents[1]

def otp(secret, seconds):
    digest = hmac.new(base64.b32decode(secret), struct.pack('>Q', int(seconds)//30), hashlib.sha1).digest()
    offset = digest[-1] & 15
    return str((struct.unpack('>I', digest[offset:offset+4])[0] & 0x7fffffff) % 1000000).zfill(6)

def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    node = Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process = subprocess.Popen([str(node), str(ROOT/'tests/server-fixture.mjs')], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, env={**os.environ, 'WG_TEST_ORIGIN':origin,'WG_TEST_PUSH':'1','WG_TEST_PUSH_PRIMARY':'1'})
    backend = 'http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            context = browser.new_context(viewport={'width':1440, 'height':1000}, reduced_motion='reduce')
            context.route(API+'/**', lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path, headers={**route.request.headers,'cf-connecting-ip':'192.0.2.1'})))
            page = context.new_page(); errors=[]; page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(origin+'/'); ready(page); seed(page)
            page.goto(origin+'/?sync-test#activate='+('b'*64)); unlock(page)
            expect(page.locator('#webUsername')).to_be_hidden()
            page.locator('#settingsBtn').click();page.locator('#settings-tab-users').click()
            expect(page.locator('#wgUsersList')).to_contain_text('MFA non configurée')
            page.get_by_role('button',name='Configurer ma MFA').click()
            expect(page.locator('#webOTPForm')).to_be_visible()
            page.locator('#webOTPPassword').fill(CODE)
            page.locator('#webOTPForm button[type=submit]').click()
            expect(page.locator('#webOTPSecret')).to_be_visible()
            secret = page.locator('#webOTPSecret').input_value()
            expect(page.locator('#webOTPQR')).to_be_visible()
            assert page.locator('#webOTPQR').evaluate('(canvas)=>canvas.width>200&&canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data.some((value,index)=>index%4!==3&&value===0)')
            page.locator('#webOTPCode').fill(otp(secret,time.time()))
            page.locator('#webOTPSettings button[type=submit]').click()
            recovery = page.get_by_role('textbox', name='Codes de secours')
            expect(recovery).to_be_visible()
            codes = recovery.input_value().splitlines(); assert len(codes)==8
            expect(page.locator('#webMFAState')).to_contain_text('MFA activée')
            expect(page.locator('#webDuoSettings')).to_be_visible();expect(page.locator('#webPhoneSettings')).to_have_count(0)
            for width in [1440,390,320]:
                page.set_viewport_size({'width':width,'height':900})
                page.wait_for_timeout(200)
                page.screenshot(path=str(ROOT/f'.cache/otp-layout-{width}.png'),animations='disabled')
                assert page.locator('#webOTPSettings').evaluate('(e)=>e.scrollWidth<=e.clientWidth&&e.getBoundingClientRect().right<=innerWidth')
            page.set_viewport_size({'width':1440,'height':1000})
            page.screenshot(path=str(ROOT/'.cache/authenticator-settings.png'),animations='disabled')
            page.locator('#closeSettingsBtn').click()
            page.evaluate('lockApplication()'); ready(page)
            with urlopen(backend+'/__test/advance/60000'): pass
            login_bodies=[]
            page.on('request',lambda request:login_bodies.append(json.loads(request.post_data)) if request.url.endswith('/api/login') else None)
            page.locator('#lock').focus(); page.keyboard.type(CODE)
            prompt=page.locator('.app-dialog-input'); expect(prompt).to_be_visible()
            expect(page.locator('#app')).to_be_hidden()
            prompt.fill(otp(secret,time.time()+60));page.locator('.app-dialog-submit').click()
            expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert len(login_bodies)==2 and all('username' not in body for body in login_bodies)
            assert 'otp' not in login_bodies[0] and len(login_bodies[1]['otp'])==6
            page.reload(); expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.evaluate('lockApplication()'); ready(page)
            page.locator('#lock').focus();page.keyboard.type(CODE)
            expect(prompt).to_be_visible();prompt.fill(codes[0]);page.locator('.app-dialog-submit').click()
            expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.locator('#settingsBtn').click(); expect(page.locator('#webOTPPassword')).to_be_visible()
            page.locator('#webOTPPassword').fill(CODE);page.locator('#webOTPCode').fill(codes[1]);page.locator('#webOTPForm button[type=submit]').click()
            expect(page.locator('#webOTPFeedback')).to_contain_text('désactivé')
            assert not errors, errors
            browser.close()
            print('PASS: code-only entry, Authenticator setup, mobile layout, OTP login, reload, recovery and disabling')
    finally:
        process.terminate();process.wait(timeout=5);server.shutdown()

if __name__=='__main__':run()
