"""Headless: Ctrl+K finds memos, vault entries by their title only, and settings tabs."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright,expect
from original_app_test import Quiet,enter_code

ROOT=Path(__file__).resolve().parents[1]
CODE='01234567'

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')));Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(origin+'/');enter_code(page,CODE,creating=True);expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.locator('.workspace-section-button[data-section=vault]').click();page.wait_for_function('()=>!sectionTransition.active')
            page.get_by_role('button',name='Nouvel accès',exact=True).click();page.locator('#fTitle').fill('Routeur du bureau');page.locator('#fPass').fill('SEARCH-SECRET-77');page.locator('.vault-edit-footer .primary').click();expect(page.locator('#passMask')).to_be_visible()
            page.evaluate('window.workspaceSearch.invalidate()')
            def search(text,scope='all'):
                page.keyboard.press('Control+k');expect(page.locator('#globalSearch')).to_be_focused()
                page.locator('#globalSearch').fill(text)
                page.locator('#globalSearchScope').select_option(scope)
                expect(page.locator('#globalSearchStatus')).not_to_have_text('',timeout=10000)
            search('routeur','vault');expect(page.locator('.search-result').first).to_contain_text('Routeur du bureau',timeout=10000)
            search('SEARCH-SECRET-77');expect(page.locator('.search-result')).to_have_count(0,timeout=10000)
            search('ambiance');expect(page.locator('.search-result').first).to_contain_text('Interface',timeout=10000)
            page.locator('.search-result').first.click();expect(page.locator('#settings-tab-interface')).to_have_attribute('aria-selected','true',timeout=10000)
            page.locator('#closeSettingsBtn').click()
            search('interface','library');expect(page.locator('.search-result').first).to_be_visible(timeout=10000);expect(page.locator('.search-result .search-result-meta',has_text='Paramètre')).to_have_count(0)
            search('procédure','settings');expect(page.locator('.search-result')).to_have_count(0,timeout=10000)
            assert not errors,errors
            browser.close()
    finally:server.shutdown();server.server_close()
    print('PASS: global search finds vault entries by title only, never by secret, and opens settings tabs; section filters apply')

if __name__=='__main__':run()
