"""Headless agent console: real routing, selected target, capabilities and availability."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit, parse_qs
import json, os, subprocess, time

from playwright.sync_api import sync_playwright, expect
from scan_workspace_test import Quiet
from site_fixture import open_security

ROOT = Path(__file__).resolve().parents[1]
API = 'https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'
CAPABILITIES = ['network-scan-v3', 'network-target-v1', 'network-auto-map-v1', 'network-topology-v1', 'security-audit-v1', 'endpoint-protection-v1', 'remote-desktop-v1', 'remote-terminal-v1', 'remote-files-v1']


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT / 'docs')))
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    node = Path(os.environ['LOCALAPPDATA']) / 'WolfGuardWeb/runtime/node.exe'
    process = subprocess.Popen([str(node), str(ROOT / 'tests/server-fixture.mjs')], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, env={**os.environ, 'WG_TEST_ORIGIN': origin})
    backend = 'http://127.0.0.1:' + str(json.loads(process.stdout.readline())['port'])
    agents = [dict(id=letter * 32, name=name, platform=platform, online=online, lastSeen=int(time.time()*1000), capabilities=capabilities) for letter, name, platform, online, capabilities in [
        ('a', 'Poste accueil', 'win32', True, CAPABILITIES),
        ('b', 'Serveur sélectionné', 'linux', True, CAPABILITIES),
        ('c', 'Poste hors ligne', 'darwin', False, CAPABILITIES),
        ('d', 'Agent ancien <img src=x>', 'win32', True, ['network-scan-v3'])]]
    for index, agent in enumerate(agents): agent['version'] = str(index + 1) * 64
    state = {'fail': False, 'protection_fail': False, 'old_reports': False, 'endpoints_only': False}
    event_agents, started, summary_calls = [], [], []

    def route_api(route):
        url = urlsplit(route.request.url)
        if url.path == '/api/agents':
            if state['fail']: route.fulfill(status=503, json={'error': 'Service indisponible'})
            else: route.fulfill(json={'agents': [] if state['endpoints_only'] else agents})
        elif url.path == '/api/edr':
            summary_calls.append(url.path)
            endpoints = [{**agent, 'health': ['protected','attention','protected','unknown'][index], 'alerts': 3 if index == 1 else 0, 'blocks': 0, 'collectedAt': None if index == 3 else int(time.time()*1000) - (300000 if state['old_reports'] else 0), 'snapshot': None if index == 3 else {'provider':'Microsoft Defender' if index == 0 else 'Protection native', 'antivirus':'enabled','realtime':'disabled' if index == 1 else 'enabled','firewall':'enabled','signatures':'enabled','canEnforce':False}, 'policy': {'mode': 'observe', 'realtime': True, 'firewall': True}, 'revision': 0} for index, agent in enumerate(agents)]
            if state['protection_fail']: route.fulfill(status=503, json={'error': 'Relevés indisponibles'})
            else: route.fulfill(json={'endpoints': endpoints, 'serverTime': int(time.time()*1000)})
        elif url.path == '/api/edr/events':
            event_agents.append(parse_qs(url.query)['agentId'][0])
            route.fulfill(json={'events': [], 'commands': [], 'next': None})
        elif url.path == '/api/remote/start':
            started.append(route.request.post_data_json)
            route.fulfill(status=400, json={'error': 'Unexpected session start'})
        else:
            route.fallback()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            context.route(API + '/**', lambda route: route.fulfill(response=route.fetch(url=backend + urlsplit(route.request.url).path + '?' + urlsplit(route.request.url).query)))
            context.route(API + '/api/agents', route_api)
            context.route(API + '/api/edr**', route_api)
            context.route(API + '/api/remote/start', route_api)
            page = context.new_page()
            def options(index):
                if page.locator('#agentActions').count(): page.keyboard.press('Escape')
                page.locator('[data-fleet-agent="' + agents[index]['id'] + '"]').click(button='right')
                expect(page.locator('#agentActions')).to_be_visible()
                expect(page.locator('#agentActions h2')).to_have_text(agents[index]['name'])
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(origin + '/?sync-test')
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async id => {const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const result=await c.create({version:2,items:[],folders:[],settings:[{key:'scanAgentId',value:id}],activity:[]},'07942685');await s.write(result.envelope,0)}""", agents[0]['id'])
            page.goto(origin + '/?sync-test&console-test#activate=' + 'b'*64)
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.keyboard.type('07942685')
            expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.wait_for_function('() => !document.querySelector("#app").inert')
            open_security(page)
            expect(page.locator('#securityNavigation')).to_have_count(0)
            expect(page.locator('.workspace-section-button')).to_have_count(4)
            page.evaluate('window.__securityRoot = document.querySelector(".agents-workspace")')
            expect(page.locator('[data-fleet-agent]')).to_have_count(4)
            expect(page.locator('#agentsMetrics strong')).to_have_text(['4', '1', '3', '4'])
            assert page.locator('.agents-table-scroll').bounding_box()['y'] < 340
            assert all(row['height'] <= 60 for row in page.locator('[data-agent-row]').evaluate_all('rows => rows.map(row => ({height: row.getBoundingClientRect().height}))'))
            state['endpoints_only'] = True
            page.locator('#agentsRefresh').click()
            expect(page.locator('[data-fleet-agent]')).to_have_count(4)
            expect(page.locator('.agents-health[data-health="protected"]')).to_have_count(1)
            state['endpoints_only'] = False
            page.locator('#agentsRefresh').click()
            expect(page.locator('#agentActions')).to_have_count(0)
            page.locator('[data-fleet-agent="' + agents[0]['id'] + '"]').click()
            expect(page.locator('#agentActions')).to_have_count(0)
            options(1)
            assert page.evaluate('setting("scanAgentId", "")') == agents[0]['id']
            expect(page.locator('#agentToolPanel')).to_be_hidden()
            page.keyboard.press('End')
            expect(page.locator('[data-fleet-action="files"]')).to_be_focused()
            page.keyboard.press('Home')
            expect(page.locator('[data-fleet-action="passive"]')).to_be_focused()
            page.keyboard.press('ArrowDown')
            expect(page.locator('[data-fleet-action="active"]')).to_be_focused()
            page.keyboard.press('Escape')
            expect(page.locator('#agentActions')).to_have_count(0)
            expect(page.locator('[data-fleet-agent="' + agents[1]['id'] + '"]')).to_be_focused()
            page.keyboard.press('Shift+F10')
            expect(page.locator('#agentActions h2')).to_have_text(agents[1]['name'])
            page.locator('.agents-heading h1').click()
            expect(page.locator('#agentActions')).to_have_count(0)
            touch_row = page.locator('[data-fleet-agent="' + agents[0]['id'] + '"]')
            touch_box = touch_row.bounding_box()
            touch = {'pointerType':'touch', 'isPrimary':True, 'pointerId':7, 'clientX':touch_box['x'] + 20, 'clientY':touch_box['y'] + 10}
            touch_row.dispatch_event('pointerdown', touch)
            expect(page.locator('#agentActions')).to_be_visible(timeout=2000)
            touch_row.dispatch_event('pointerup', touch)
            expect(page.locator('#agentActions h2')).to_have_text(agents[0]['name'])
            page.keyboard.press('Escape')
            touch_row.dispatch_event('pointerdown', touch)
            touch_row.dispatch_event('pointermove', {**touch, 'clientX':touch['clientX'] + 30})
            touch_row.dispatch_event('pointerup', touch)
            page.wait_for_timeout(650)
            expect(page.locator('#agentActions')).to_have_count(0)
            options(1)
            page.locator('[data-fleet-action="active"]').click()
            page.wait_for_function('() => !sectionTransition.active')
            expect(page.locator('#wgAgentName')).to_contain_text(agents[1]['name'])
            assert page.evaluate('setting("scanAgentId", "")') == agents[1]['id']
            expect(page.locator('#agentActions')).to_have_count(0)
            page.locator('#agentToolClose').click()
            page.locator('[data-fleet-agent="' + agents[0]['id'] + '"]').click()
            expect(page.locator('.agents-table th')).to_have_count(6)
            expect(page.locator('[data-agent-row="' + agents[0]['id'] + '"] [data-health="protected"]')).to_have_text('Protégé')
            expect(page.locator('[data-agent-row="' + agents[1]['id'] + '"] .agents-alerts')).to_have_text('3')
            expect(page.locator('[data-agent-row="' + agents[2]['id'] + '"] [data-health="unknown"]')).to_have_text('État non confirmé')
            expect(page.locator('[data-agent-row="' + agents[2]['id'] + '"] .agents-alerts')).to_have_text('0')
            expect(page.locator('[data-agent-row="' + agents[3]['id'] + '"] .agents-alerts')).to_have_text('—')
            expect(page.locator('[data-agent-row="' + agents[0]['id'] + '"] [data-agent-check][data-check="enabled"]')).to_have_count(4)
            expect(page.locator('[data-agent-row="' + agents[1]['id'] + '"] [data-agent-check="realtime"]')).to_have_attribute('data-check','disabled')
            expect(page.locator('[data-agent-row="' + agents[2]['id'] + '"] [data-agent-check][data-check="unknown"]')).to_have_count(4)
            state['old_reports'] = True
            page.locator('#agentsRefresh').click()
            expect(page.locator('.agents-health[data-health="protected"]')).to_have_count(0)
            expect(page.locator('[data-agent-check][data-check="enabled"]')).to_have_count(0)
            state['old_reports'] = False
            page.locator('#agentsRefresh').click()
            expect(page.locator('.agents-health[data-health="protected"]')).to_have_count(1)
            with page.expect_response(lambda response: '/api/edr/events?' in response.url and agents[0]['id'] in response.url):
                page.locator('[data-agent-security="' + agents[0]['id'] + '"]').click()
            expect(page.locator('#edrDetailName')).to_have_text(agents[0]['name'])
            assert event_agents[-1] == agents[0]['id']
            page.locator('#agentToolClose').click()
            page.locator('[data-agent-sort="name"]').click()
            expect(page.locator('[data-agent-column="name"]')).to_have_attribute('aria-sort', 'descending')
            expect(page.locator('[data-fleet-agent]').first).to_have_attribute('data-fleet-agent', agents[1]['id'])
            expect(page.locator('[data-agent-sort="name"]')).to_be_focused()
            page.locator('[data-agent-sort="alerts"]').click()
            page.locator('[data-agent-sort="alerts"]').click()
            expect(page.locator('[data-fleet-agent]').first).to_have_attribute('data-fleet-agent', agents[1]['id'])
            expect(page.locator('[data-fleet-agent]').last).to_have_attribute('data-fleet-agent', agents[3]['id'])
            page.locator('#agentsPlatform').select_option('linux')
            page.locator('#agentsProtection').select_option('attention')
            page.locator('#agentsFilter').select_option('online')
            expect(page.locator('[data-fleet-agent]')).to_have_count(1)
            expect(page.locator('[data-fleet-agent]')).to_have_attribute('data-fleet-agent', agents[1]['id'])
            expect(page.locator('[data-agent-clear]')).to_have_count(3)
            expect(page.locator('#agentsCount')).to_contain_text('(hors filtre)')
            expect(page.locator('#agentActions')).to_have_count(0)
            page.locator('[data-agent-clear="platform"]').click()
            expect(page.locator('#agentsPlatform')).to_have_value('all')
            expect(page.locator('#agentsPlatform')).to_be_focused()
            expect(page.locator('#agentsFilter')).to_have_value('online')
            expect(page.locator('#agentsProtection')).to_have_value('attention')
            expect(page.locator('[data-fleet-agent]')).to_have_count(1)
            page.locator('#agentsClearFilters').click()
            expect(page.locator('[data-fleet-agent]')).to_have_count(4)
            expect(page.locator('#agentsSearch')).to_be_focused()
            expect(page.locator('#agentActions')).to_have_count(0)
            assert page.evaluate('setting("scanAgentId", "")') == agents[0]['id']
            page.locator('#agentsPlatform').select_option('linux')
            page.locator('#agentsProtection').select_option('attention')
            page.locator('#agentsFilter').select_option('online')
            page.locator('#agentsSearch').fill('aucun-resultat')
            expect(page.locator('[data-fleet-agent]')).to_have_count(0)
            expect(page.locator('#agentsList')).to_contain_text('Aucun poste pour ces filtres')
            page.locator('#agentsSearch').fill('<img src=x>')
            expect(page.locator('#agentsActiveFilters')).to_contain_text('<img src=x>')
            expect(page.locator('#agentsActiveFilters img')).to_have_count(0)
            page.locator('#agentsClearFilters').click()
            expect(page.locator('#agentsSearch')).to_be_focused()
            expect(page.locator('[data-fleet-agent]')).to_have_count(4)
            expect(page.locator('#agentsPlatform')).to_have_value('all')
            expect(page.locator('#agentsProtection')).to_have_value('all')
            expect(page.locator('#agentsFilter')).to_have_value('all')
            page.locator('#agentsSearch').fill('11111111')
            expect(page.locator('[data-fleet-agent]')).to_have_count(1)
            page.locator('#agentsClearFilters').click()
            page.locator('#agentsProtection').select_option('protected')
            expect(page.locator('[data-fleet-agent]')).to_have_count(1)
            expect(page.locator('[data-fleet-agent]')).to_have_attribute('data-fleet-agent', agents[0]['id'])
            page.locator('#agentsProtection').select_option('alerts')
            expect(page.locator('[data-fleet-agent]')).to_have_count(1)
            expect(page.locator('[data-fleet-agent]')).to_have_attribute('data-fleet-agent', agents[1]['id'])
            page.locator('#agentsClearFilters').click()
            state['protection_fail'] = True
            page.locator('#agentsRefresh').click()
            expect(page.locator('#agentsStatus')).to_contain_text('relevés de protection')
            expect(page.locator('.agents-health[data-health="protected"]')).to_have_count(0)
            expect(page.locator('.agents-alerts')).to_have_text(['—'] * 4)
            options(0)
            expect(page.locator('[data-fleet-action="active"]')).to_be_enabled()
            state['protection_fail'] = False
            page.locator('#agentsRefresh').click()
            expect(page.locator('.agents-health[data-health="protected"]')).to_have_count(1)
            page.evaluate("""() => {window.__consoleAccess=WolfGuardAccess;window.WolfGuardAccess={...WolfGuardAccess,can:right=>right==='edr.read'?false:window.__consoleAccess.can(right)}}""")
            previous_calls = len(summary_calls)
            page.locator('#agentsRefresh').click()
            expect(page.locator('#agentsProtection')).to_be_disabled()
            expect(page.locator('.agents-health')).to_have_text(['Accès non accordé'] * 4)
            assert len(summary_calls) == previous_calls
            page.evaluate('window.WolfGuardAccess=window.__consoleAccess')
            page.locator('#agentsRefresh').click()
            expect(page.locator('.agents-health[data-health="protected"]')).to_have_count(1)
            page.locator('[data-agent-sort="name"]').click()
            page.locator('[data-agent-row="' + agents[1]['id'] + '"] td').nth(1).click()
            expect(page.locator('#agentActions')).to_have_count(0)
            page.screenshot(path=str(ROOT / '.cache/ems-endpoints-desktop.png'), animations='disabled', full_page=True)
            expect(page.locator('#agentsDensity')).to_have_count(0)
            page.locator('[data-fleet-agent="' + agents[1]['id'] + '"]').click()
            expect(page.locator('#agentActions')).to_have_count(0)
            assert page.evaluate('setting("scanAgentId", "")') == agents[1]['id']

            for action, section in [('active', 'scan-active'), ('passive', 'scan-passive'), ('map', 'scan-map'), ('vulnerability', 'scan-vulnerability'), ('desktop', 'remote'), ('terminal', 'remote'), ('files', 'remote'), ('edr', 'edr')]:
                options(1)
                page.locator(f'[data-fleet-action="{action}"]').click()
                page.wait_for_function('() => !sectionTransition.active')
                assert page.evaluate('state.section') == section
                assert page.evaluate('window.__securityRoot === document.querySelector(".agents-workspace")')
                expect(page.locator('#securityBtn')).to_have_attribute('aria-pressed', 'true')
                expect(page.locator('[data-fleet-agent]')).to_have_count(4)
                expect(page.locator('#agentToolHost')).to_be_visible()
                expect(page.locator('#agentActions')).to_have_count(0)
                if section == 'remote':
                    expect(page.locator('#wgRemoteAgent')).to_contain_text(agents[1]['name'])
                    expect(page.locator('#wgRemoteMode' + action.title())).to_have_attribute('aria-pressed', 'true')
                elif section == 'edr':
                    expect(page.locator('#edrDetailName')).to_have_text(agents[1]['name'])
                    assert event_agents[-1] == agents[1]['id']
                    page.locator('[data-fleet-agent="' + agents[0]['id'] + '"]').click()
                    expect(page.locator('#edrDetailName')).to_have_text(agents[0]['name'])
                    page.wait_for_function('() => !document.querySelector("[data-fleet-agent]").disabled')
                    assert event_agents[-1] == agents[0]['id']
                    page.locator('[data-fleet-agent="' + agents[1]['id'] + '"]').click()
                    expect(page.locator('#edrDetailName')).to_have_text(agents[1]['name'])
                else:
                    expect(page.locator('#wgAgentName')).to_contain_text(agents[1]['name'])
                for width in [1440,768,390,320]:
                    page.set_viewport_size({'width':width,'height':1000})
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (action,width)
                    assert page.locator('#agentToolPanel').evaluate('el=>el.scrollWidth<=el.clientWidth'), (action,width)
                    if width==1440 and action in ['active','terminal','edr']:page.screenshot(path=str(ROOT/f'.cache/unified-security-{action}.png'),animations='disabled')
                page.set_viewport_size({'width':1440,'height':1000})
                page.locator('#agentToolClose').click()
                page.wait_for_function('() => !sectionTransition.active')
                expect(page.locator('#agentToolPanel')).to_be_hidden()
                expect(page.locator('#agentActions')).to_have_count(0)
            assert not started
            options(1)
            page.locator('[data-fleet-action="active"]').focus()
            page.evaluate('document.querySelector("#agentsRefresh").click()')
            expect(page.locator('#agentsRefresh')).to_be_enabled()
            expect(page.locator('[data-fleet-action="active"]')).to_be_focused()
            page.keyboard.press('Escape')
            expect(page.locator('[data-fleet-agent="' + agents[1]['id'] + '"]')).to_be_focused()

            page.locator('#agentsSearch').fill('selectionne')
            expect(page.locator('[data-fleet-agent]')).to_have_count(1)
            page.locator('#agentsSearch').fill('')
            page.locator('#agentsFilter').select_option('offline')
            expect(page.locator('[data-fleet-agent]')).to_have_count(1)
            page.locator('[data-fleet-agent]').click()
            expect(page.locator('#agentActions')).to_have_count(0)
            options(2)
            expect(page.locator('[data-fleet-action="terminal"]')).to_be_disabled()
            expect(page.locator('[data-fleet-action="edr"]')).to_be_enabled()
            page.keyboard.press('Escape')
            page.locator('#agentsFilter').select_option('all')
            page.locator('[data-fleet-agent="' + agents[3]['id'] + '"]').click()
            expect(page.locator('#agentActions')).to_have_count(0)
            options(3)
            expect(page.locator('[data-fleet-action="active"]')).to_be_enabled()
            expect(page.locator('[data-fleet-action="terminal"]')).to_be_disabled()
            expect(page.locator('[data-fleet-action="terminal"]')).to_contain_text('Mise à jour')
            expect(page.locator('#agentsList img')).to_have_count(0)
            for width in [1920, 1440, 1024, 768, 390, 320]:
                page.set_viewport_size({'width': width, 'height': 1000})
                options(3)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
                assert page.locator('#agentActions').evaluate('el => el.scrollWidth <= el.clientWidth'), width
                bounds = page.locator('#agentActions').bounding_box()
                assert bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= width, bounds
                assert bounds['y'] >= 0 and bounds['y'] + bounds['height'] <= 1000, bounds
                if width in [1440, 390]: page.screenshot(path=str(ROOT / f'.cache/agents-console-{width}.png'), animations='disabled')
                if width in [1440, 390]:
                    page.keyboard.press('Escape')
                    page.screenshot(path=str(ROOT / f'.cache/security-compact-{width}.png'), animations='disabled')
            page.keyboard.press('Escape')
            page.set_viewport_size({'width':1440,'height':1000})
            page.locator('[data-fleet-agent="' + agents[1]['id'] + '"]').click()
            options(1)
            page.evaluate("""async () => {const access=WolfGuardAccess;window.WolfGuardAccess={...access,can:right=>right==='remote.write'?false:access.can(right)};await agentsWorkspace.render()}""")
            expect(page.locator('[data-fleet-action="terminal"]')).to_be_disabled()
            expect(page.locator('[data-fleet-action="terminal"]')).to_contain_text('Droit d’accès')
            state['fail'] = True
            page.locator('#agentsRefresh').click()
            expect(page.locator('#agentsStatus')).to_contain_text('plus confirmée')
            options(1)
            expect(page.locator('[data-fleet-action="active"]')).to_be_disabled()
            expect(page.locator('#agentsMetrics strong')).to_have_text(['4', '—', '—', '—'])
            page.evaluate('lockApplication()')
            expect(page.locator('#agentActions')).to_have_count(0)
            assert not errors, errors
            browser.close()
            print('PASS: right-click options only, keyboard and long press, exact action targets, menu dismissal and lock cleanup, permissions, telemetry, filters and mobile layout')
    finally:
        process.terminate()
        process.wait(timeout=10)
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    run()
