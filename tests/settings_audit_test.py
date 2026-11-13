"""Check the plain security information page without opening a browser window."""
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
            page.locator('#settings-tab-audit').click()
            panel = page.locator('#settings-audit')
            expect(panel).to_be_visible()
            expect(panel.locator('h3')).to_have_text('Protection de l’application')
            expect(panel.locator('input,select,button,details')).to_have_count(0)
            expect(panel).to_contain_text('600 000 itérations')
            expect(panel).to_contain_text('100 000 itérations')
            expect(panel).to_contain_text('Après 4 heures d’inactivité')
            expect(panel).to_contain_text('secret serveur dédié')
            expect(panel).not_to_contain_text('sauvegarde')
            expect(panel.locator('.settings-protection-group').filter(has_text='Prise en main autorisée')).to_have_count(1)
            expect(panel.locator('.settings-protection-group').filter(has_text='Partage et permissions conservés')).to_have_count(1)
            expect(panel.locator('.settings-protection-weaknesses')).not_to_contain_text('Prise en main')
            expect(panel.locator('.settings-protection-weaknesses')).not_to_contain_text('Accès de l’hébergeur')
            expect(panel.locator('.settings-protection-group')).to_have_count(3)
            expect(panel.locator('.settings-protection-weaknesses')).to_be_visible()
            for width in [1440,900,390]:
                page.set_viewport_size({'width':width,'height':950})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
                assert page.locator('.settings-main').evaluate('el=>el.scrollWidth <= el.clientWidth'), width
                assert panel.evaluate('el=>el.scrollWidth <= el.clientWidth'), width
            page.locator('#settings-tab-security').click()
            page.locator('#settings-tab-audit').click()
            expect(panel).to_be_visible()
            page.keyboard.press('Escape')
            expect(page.locator('.settings-modal')).to_have_count(0)
            page.evaluate("openSettings('audit')")
            expect(panel).to_be_visible()
            page.evaluate('lockApplication()')
            expect(page.locator('.settings-modal')).to_have_count(0)
            assert not errors, errors
            browser.close()
            print('PASS: page de protections et limites, lecture directe sans controles, navigation, bureau/mobile et verrouillage.')
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    run()
