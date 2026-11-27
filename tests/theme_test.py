"""Headless: Clair and Automatique (system) ambiances; pictures and the reading paper keep their colors."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright,expect
from original_app_test import Quiet,enter_code

ROOT=Path(__file__).resolve().parents[1]
CODE='01234567'
FILTER="getComputedStyle(document.documentElement).filter"

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')));Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);errors=[]
            context=browser.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce',color_scheme='dark')
            page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(origin+'/');enter_code(page,CODE,creating=True);expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            assert page.evaluate(FILTER)=='none' and page.evaluate("document.documentElement.dataset.uiTheme")=='midnight','dark by default'
            # The embedded interface font (Inter) really loads from the site itself.
            assert page.evaluate("document.fonts.load('16px \"Inter Variable\"').then(fonts=>fonts.length>0&&document.fonts.check('16px \"Inter Variable\"'))"),'Inter Variable is loaded'
            assert 'Inter Variable' in page.evaluate("getComputedStyle(document.body).fontFamily")
            # The application fills exactly the window on every main screen: the page itself never
            # grows with its content (inner panes scroll) and never ends before the bottom of the window.
            for section in ['library','vault','tools','security']:
                page.locator(f'.workspace-section-button[data-section={section}]').click();page.wait_for_function('()=>!sectionTransition.active');page.wait_for_timeout(300)
                sizes=page.evaluate("({page:document.documentElement.scrollHeight,app:document.querySelector('#app').getBoundingClientRect().height,window:innerHeight})")
                assert sizes['page']<=sizes['window']+1 and abs(sizes['app']-sizes['window'])<=1,(section,sizes)
            # The setting offers both new ambiances and saves the choice.
            page.locator('#settingsBtn').click();page.locator('#settings-tab-interface').click()
            options=page.locator('select[data-ui-setting=theme] option,#settings-interface select option').all_inner_texts()
            assert 'Clair' in options and 'Automatique (selon le système)' in options,options
            def choose(value):
                page.evaluate("(v)=>{localStorage.setItem(interfacePreferenceKey(),JSON.stringify({theme:v}));applyInterfacePreferences()}",value)
            choose('light');assert 'invert(1)' in page.evaluate(FILTER)
            choose('midnight');assert page.evaluate(FILTER)=='none'
            # Automatique follows the system, live.
            choose('auto');assert page.evaluate("document.documentElement.dataset.uiTheme")=='auto'
            assert page.evaluate(FILTER)=='none','system dark: unchanged'
            page.emulate_media(color_scheme='light');page.wait_for_timeout(200);assert 'invert(1)' in page.evaluate(FILTER),'system light: light ambiance'
            page.emulate_media(color_scheme='dark');page.wait_for_timeout(200);assert page.evaluate(FILTER)=='none'
            # What must keep its own colors is inverted back; printing is never inverted.
            page.emulate_media(color_scheme='light');page.locator('#closeSettingsBtn').click()
            assert 'invert(1)' in page.evaluate("getComputedStyle(document.querySelector('.wolf-logo')).filter"),'logo keeps its colors'
            page.emulate_media(media='print');assert page.evaluate(FILTER)=='none','no inversion when printing'
            assert not errors,errors
            browser.close()
    finally:server.shutdown();server.server_close()
    print('PASS: Clair and Automatique ambiances follow the setting and the system, pictures keep their colors, printing is never inverted')

if __name__=='__main__':run()
