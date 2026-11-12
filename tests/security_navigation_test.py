"""One security workspace, inline tools, permissions and responsive layout."""
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
            group = page.locator('#securityBtn')
            expect(page.locator('.workspace-section-button')).to_have_count(4)
            expect(page.locator('#securityNavigation,.security-navigation')).to_have_count(0)
            expect(page.locator('.global-tabs [data-section^="scan-"],.global-tabs [data-section="edr"],.global-tabs [data-section="remote"],#agentsBtn')).to_have_count(0)
            group.click()
            expect(page.locator('.agents-workspace')).to_be_visible()
            expect(page.locator('#agentToolPanel')).to_be_hidden()
            page.evaluate('window.__securityRoot = document.querySelector(".agents-workspace")')
            for section in ['scan-passive','scan-active','scan-map','scan-vulnerability','edr','remote']:
                page.evaluate('section => openSection(section)', section)
                page.wait_for_function('() => !sectionTransition.active')
                expect(page.locator('#app')).to_have_attribute('data-primary-section','security')
                expect(group).to_have_attribute('aria-pressed','true')
                expect(page.locator('#agentToolHost')).to_be_visible()
                expect(page.locator('#agentsList')).to_be_visible()
                assert page.evaluate('window.__securityRoot === document.querySelector(".agents-workspace")')
                expect(page.locator('#securityNavigation')).to_have_count(0)
            page.locator('#agentToolClose').click()
            expect(page.locator('#agentToolPanel')).to_be_hidden()
            page.locator('#agentsManage').click()
            expect(page.locator('#closeAgentsBtn')).to_be_visible()
            page.locator('#closeAgentsBtn').click()
            expect(page.locator('#agentsManage')).to_be_focused()
            page.locator('.global-tabs [data-section="library"]').click()
            page.wait_for_function('() => !sectionTransition.active')
            expect(page.locator('.agents-workspace')).to_have_count(0)
            group.click()
            expect(page.locator('.agents-workspace')).to_be_visible()
            for width in [1920,1440,1024,768,390,320]:
                page.set_viewport_size({'width':width,'height':900})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
                expect(group).to_be_visible()
                expect(page.locator('#settingsBtn')).to_be_visible()
            page.evaluate("""() => {const access=WolfGuardAccess;window.WolfGuardAccess={...access,can:()=>false,allows:s=>['library','scan-active'].includes(s)};topNavigation.refresh()}""")
            expect(page.locator('.workspace-section-button')).to_have_count(2)
            expect(group).to_have_count(1)
            page.evaluate("""() => {const access=WolfGuardAccess;window.WolfGuardAccess={...access,allows:s=>s==='library'};topNavigation.refresh()}""")
            expect(group).to_have_count(0)
            assert not errors,errors
            browser.close()
            print('PASS: one security section, no subnavigation, persistent agents and inline tools, permissions and mobile layout')
    finally:
        server.shutdown()
        server.server_close()


if __name__=='__main__':
    run()
