"""Grouped security navigation, access changes and responsive layout (headless)."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright, expect
from original_app_test import Quiet, enter_code, PASSWORD

ROOT = Path(__file__).resolve().parents[1]


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT / 'docs')))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            enter_code(page, PASSWORD, creating=True)
            expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.wait_for_function('() => !document.querySelector("#app").inert')
            group = page.locator('.workspace-security-button')
            security = page.locator('#securityNavigation')
            expect(group).to_have_text('Sécurité')
            expect(security).to_be_hidden()
            expect(page.locator('.global-tabs [data-section^="scan-"],.global-tabs [data-section="edr"]')).to_have_count(0)
            expect(page.locator('.topbar #agentsBtn')).to_have_count(0)
            expect(security.locator('button')).to_have_count(7)

            group.click()
            expect(security).to_be_visible()
            expect(group).to_have_attribute('aria-pressed', 'true')
            expect(page.locator('.agents-workspace h1')).to_have_text('Mes agents')
            expect(page.locator('.global-tabs [data-section="remote"]')).to_have_count(0)
            for section in ['scan-active', 'scan-map', 'scan-vulnerability', 'edr', 'remote', 'scan-passive']:
                security.locator(f'[data-section="{section}"]').click()
                page.wait_for_function('() => !sectionTransition.active')
                expect(security.locator(f'[data-section="{section}"]')).to_have_attribute('aria-pressed', 'true')
                expect(group).to_have_attribute('aria-pressed', 'true')
            security.locator('#agentsBtn').click()
            page.locator('#agentsManage').click()
            expect(page.locator('#closeAgentsBtn')).to_be_visible()
            page.locator('#closeAgentsBtn').click()
            expect(page.locator('#agentsBtn')).to_be_focused()

            security.locator('[data-section="scan-map"]').click()
            page.wait_for_function('() => !sectionTransition.active')
            page.locator('.global-tabs [data-section="library"]').click()
            page.wait_for_function('() => !sectionTransition.active')
            expect(security).to_be_hidden()
            group.click()
            page.wait_for_function('() => !sectionTransition.active')
            expect(security.locator('[data-section="agents"]')).to_have_attribute('aria-pressed', 'true')

            for width in [1920, 1440, 1024, 768, 390, 320]:
                page.set_viewport_size({'width': width, 'height': 900})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
                assert security.evaluate('el => el.scrollWidth >= el.clientWidth'), width
                expect(group).to_be_visible()
                expect(page.locator('#settingsBtn')).to_be_visible()

            # Rebuild the navigation when permissions change, including Agents alone.
            page.evaluate("""() => {
              window.WolfGuardAccess = {can: () => false, allows: s => ['library', 'scan-active'].includes(s)};
              topNavigation.refresh();
            }""")
            expect(security.locator('[data-section]')).to_have_count(1)
            expect(page.locator('#agentsBtn')).to_have_count(0)
            page.evaluate("""() => {
              window.WolfGuardAccess = {can: () => true, allows: s => ['library', 'agents'].includes(s)};
              topNavigation.refresh();
            }""")
            group.click()
            expect(page.locator('.agents-workspace')).to_be_visible()
            expect(page.locator('#agentsBtn')).to_be_visible()
            assert not errors, errors
            browser.close()
            print('PASS: security grouping, all destinations, agents, resume, permissions and mobile layout')
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    run()
