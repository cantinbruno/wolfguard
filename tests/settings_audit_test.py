"""Exercise the security inventory and its secret-free manual audit export, headlessly."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from tempfile import TemporaryDirectory
import sys
import re
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
        with sync_playwright() as p, TemporaryDirectory(prefix='settings-audit-', dir=ROOT / '.cache') as output:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 950}, accept_downloads=True)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async () => {
                const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
                const items=[{id:'audit-private',type:'memo',title:'NE_PAS_EXPORTER_CE_SECRET',content:'<p>Donnees privees</p>',folderId:null,tags:[],createdAt:new Date().toISOString()}];
                const result=await c.create({version:2,items,folders:[],settings:[],activity:[]},'01234567');
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
            expect(page.locator('#settings-tab-audit')).to_have_attribute('aria-selected', 'true')
            records = panel.locator('.settings-audit-record')
            count = records.count()
            assert count >= 20
            expect(panel.locator('#settingsAuditObservations')).to_contain_text('HTTPS non observé')
            expect(panel.locator('#settingsAuditObservations')).to_contain_text('Non observable dans cette session')
            expect(panel.locator('#settingsAuditObservations')).to_contain_text('Désactivée dans les sources')
            # The inventory is a repository audit: every cited file must exist.
            for source in panel.locator('.settings-audit-sources code').all_text_contents():
                assert (ROOT / source).is_file(), source
            panel.locator('#settingsAuditSearch').fill('pbkdf2 600 32')
            expect(panel.locator('.settings-audit-record:visible')).to_have_count(1)
            record = panel.locator('[data-audit-id=workspace]')
            record.locator('summary').focus()
            page.keyboard.press('Enter')
            expect(record).to_have_attribute('open', '')
            record.locator('input').check()
            expect(panel.locator('#settingsAuditCount')).to_contain_text('1 vérifié manuellement')
            panel.locator('#settingsAuditGroup').select_option('network')
            expect(panel.locator('#settingsAuditEmpty')).to_be_visible()
            panel.locator('#settingsAuditSearch').fill('connectivite')
            expect(panel.locator('.settings-audit-record:visible')).to_have_count(7)
            # Export all records, including the checked point hidden by the filter.
            with page.expect_download() as event:
                panel.locator('#settingsAuditExport').click()
            download = event.value
            target = Path(output) / download.suggested_filename
            download.save_as(target)
            content = target.read_text(encoding='utf-8')
            assert content.count('## ') == count + 1
            assert '- [x] Contrôle effectué manuellement' in content
            assert '600 000' in content and '100 000' in content and '250 000' in content
            assert '01234567' not in content and not re.search(r'Bearer [a-f0-9]{64}', content)
            assert 'NE_PAS_EXPORTER_CE_SECRET' not in content
            assert 'sans scan ni certification' in content
            page.locator('#settings-tab-security').click()
            page.locator('#settings-tab-audit').click()
            expect(panel.locator('#settingsAuditCount')).to_contain_text('1 vérifié manuellement')
            panel.locator('#settingsAuditSearch').fill('')
            panel.locator('#settingsAuditGroup').select_option('')
            for width in [1440, 900, 390]:
                page.set_viewport_size({'width':width,'height':950})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
                assert page.locator('.settings-main').evaluate('el=>el.scrollWidth <= el.clientWidth'), width
                assert panel.evaluate('el=>el.scrollWidth <= el.clientWidth'), width
                if '--screenshots' in sys.argv:
                    page.screenshot(path=str(ROOT / '.cache' / f'settings-audit-{width}.png'), animations='disabled')
            page.keyboard.press('Escape')
            expect(page.locator('.settings-modal')).to_have_count(0)
            page.evaluate("openSettings('audit')")
            expect(page.locator('#settings-audit')).to_be_visible()
            expect(page.locator('#settingsAuditCount')).to_contain_text('0 vérifié manuellement')
            page.evaluate('lockApplication()')
            expect(page.locator('.settings-modal')).to_have_count(0)
            assert not errors, errors
            browser.close()
            print('PASS: inventaire, sources, recherche multi-termes, filtres, clavier, export complet sans code, verifications temporaires, affichage bureau/mobile et nettoyage au verrouillage.')
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    run()
