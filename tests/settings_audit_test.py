"""Check settings navigation after removing the information page, headlessly."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect
from site_fixture import WolfGuardTestHandler

ROOT = Path(__file__).resolve().parents[1]


class Quiet(WolfGuardTestHandler):
    def log_message(self, *_args):
        pass


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT / 'docs')))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width':1440, 'height':950})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async () => {
                const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
                const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'01234567');
                await s.write(result.envelope,0);
            }""")
            page.reload()
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.keyboard.type('01234567')
            expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.wait_for_function("() => !document.querySelector('#app').inert")
            page.locator('#settingsBtn').click()
            expect(page.locator('#settings-tab-audit,#settings-audit')).to_have_count(0)
            panel = page.locator('#settings-account')
            expect(panel).to_be_visible()
            expect(panel.locator('h3')).to_have_text('Mon compte et sécurité')
            expect(page.locator('#settings-tab-security,#settings-security,#accountSecurityBtn')).to_have_count(0)
            expect(panel.locator('#changeCodeBtn')).to_be_visible()
            expect(panel.locator('#lockNowBtn')).to_be_visible()
            for width in [1440,900,390]:
                page.set_viewport_size({'width':width,'height':950})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
                assert page.locator('.settings-main').evaluate('el=>el.scrollWidth <= el.clientWidth'), width
                assert panel.evaluate('el=>el.scrollWidth <= el.clientWidth'), width
            page.locator('#settings-tab-account').focus()
            page.keyboard.press('ArrowDown')
            expect(page.locator('#settings-data')).to_be_visible()
            page.keyboard.press('Escape')
            expect(page.locator('.settings-modal')).to_have_count(0)
            page.evaluate("openSettings('audit')")
            expect(panel).to_be_visible()
            page.evaluate("openSettings('security')")
            expect(panel).to_be_visible()
            page.evaluate('lockApplication()')
            expect(page.locator('.settings-modal')).to_have_count(0)
            assert not errors, errors
            browser.close()
            print('PASS: protection section removed, settings keyboard navigation, legacy fallback, desktop/mobile and locking.')
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    run()
