"""Bounded fleet and per-machine logs, using synthetic endpoints only."""
import time
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import expect
from account_ui_fixture import account_ui, ROOT
from shared_workspace_test import API
from site_fixture import open_security


def run():
    with account_ui() as (page, context, origin, errors):
        now = int(time.time()*1000)
        state = {'count': 60, 'fail': False, 'calls': []}
        agents = [{'id': str(index+1)*32 if index < 9 else format(index+1, '032x'),
                   'name': f'Poste {index:02}', 'platform': 'win32', 'online': True,
                   'lastSeen': now, 'version': 'f'*64, 'capabilities': ['endpoint-protection-v1']}
                  for index in range(60)]
        events = [{'id': 'event-'+str(index), 'key': format(index+1, '064x'), 'occurredAt': now-index*1000,
                   'provider': 'WolfGuard', 'title': 'Événement '+str(index), 'detail': 'État confirmé',
                   'resource': '', 'status': 'alert' if index % 2 == 0 else 'info',
                   'severity': 'high' if index % 2 == 0 else 'info'} for index in range(55)]
        events[0].update(title='Alerte <img src=x onerror=alert(1)>', resource='C:\\Synthetic\\file.exe')

        def route_api(route):
            url = urlsplit(route.request.url)
            if url.path == '/api/agents':
                route.fulfill(json={'agents': agents[:state['count']]})
            elif url.path == '/api/edr':
                route.fulfill(json={'endpoints': [{**agent, 'health': 'attention', 'alerts': 3, 'blocks': 0,
                    'collectedAt': now, 'receivedAt': now, 'snapshot': {'provider': 'Defender', 'antivirus': 'enabled',
                    'realtime': 'disabled', 'firewall': 'enabled', 'signatures': 'enabled'},
                    'policy': {'mode': 'observe', 'realtime': True, 'firewall': True}} for agent in agents[:state['count']]], 'serverTime': now})
            else:
                params = parse_qs(url.query)
                state['calls'].append(params['agentId'][0])
                if state['fail']:
                    route.fulfill(status=503, json={'error': 'Relais temporairement indisponible'})
                elif params['agentId'][0] != agents[0]['id']:
                    route.fulfill(json={'events': [{**events[0], 'title': 'Journal du deuxième poste'}], 'next': None, 'commands': []})
                else:
                    older = 'beforeAt' in params
                    route.fulfill(json={'events': events[49:] if older else events[:50],
                        'next': None if older else {'beforeAt': events[49]['occurredAt'], 'beforeKey': events[49]['key']}, 'commands': []})
        for endpoint in ['/api/agents', '/api/edr', '/api/edr/events*']:
            page.route(API+endpoint, route_api)
        open_security(page)
        expect(page.locator('[data-agent-row]')).to_have_count(60)
        box = page.locator('.agents-console').bounding_box()
        scrolling = page.locator('.agents-table-scroll')
        assert scrolling.evaluate('el=>el.scrollHeight>el.clientHeight')
        header_top = page.locator('.agents-table th').first.bounding_box()['y']
        scrolling.hover()
        page.mouse.wheel(0, 700)
        page.wait_for_function('()=>document.querySelector(".agents-table-scroll").scrollTop>100')
        assert abs(page.locator('.agents-table th').first.bounding_box()['y']-header_top)<2
        assert page.locator('#content').evaluate('el=>el.scrollTop') == 0
        state['count'] = 1
        page.locator('#agentsRefresh').click()
        expect(page.locator('[data-agent-row]')).to_have_count(1)
        assert abs(page.locator('.agents-console').bounding_box()['height']-box['height'])<2
        page.locator('[data-open-agent-journal]').click()
        expect(page.locator('[data-record-tab=journal]')).to_have_attribute('aria-selected', 'true')
        expect(page.locator('.agent-log-row')).to_have_count(50)
        page.locator('#agentDetailsClose').click()
        page.locator('[data-fleet-agent]').click()
        page.locator('#agentDetailsJournal').click()
        expect(page.locator('.agent-log-row')).to_have_count(50)
        page.locator('[data-record-tab=overview]').click()
        page.locator('[data-record-journal]').click()
        expect(page.locator('[data-record-tab=journal]')).to_have_attribute('aria-selected', 'true')
        page.locator('.agent-journal-help > summary').click()
        expect(page.locator('.agent-journal-help')).to_contain_text('quarantaines')
        expect(page.locator('.agent-journal-help')).to_contain_text('vérification des signatures')
        page.locator('.agent-journal-help > summary').click()
        expect(page.locator('.agent-log-row img')).to_have_count(0)
        page.locator('[data-journal-more]').click()
        expect(page.locator('.agent-log-row')).to_have_count(55)
        expect(page.locator('[data-journal-more]')).to_be_hidden()
        page.locator('[data-journal-filter]').select_option('alerts')
        expect(page.locator('.agent-log-row')).to_have_count(28)
        page.locator('[data-journal-search]').fill('file.exe')
        expect(page.locator('.agent-log-row')).to_have_count(1)
        page.locator('.agent-log-row summary').click()
        expect(page.locator('.agent-log-row')).to_contain_text('C:\\Synthetic\\file.exe')
        page.locator('[data-journal-search]').fill('')
        page.locator('[data-journal-filter]').select_option('all')
        page.locator('[data-journal-pause]').click()
        calls = len(state['calls'])
        page.evaluate('document.querySelector("#agentsRefresh").click()')
        expect(page.locator('#agentsRefresh')).to_be_enabled()
        assert len(state['calls']) == calls
        state['fail'] = True
        page.locator('[data-journal-refresh]').click()
        expect(page.locator('[data-journal-status]')).to_contain_text('Actualisation impossible')
        expect(page.locator('.agent-log-row')).to_have_count(55)
        state['fail'] = False
        page.locator('[data-journal-refresh]').click()
        expect(page.locator('.agent-log-row')).to_have_count(50)
        for width in [1920, 1440, 850, 700, 640, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 900})
            bounds=page.locator('#agentDetailsPanel').bounding_box()
            assert bounds['width']>=width*.9 and bounds['height']>=810, (width,bounds)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
            assert page.locator('#agentDetailsPanel').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), width
            assert page.locator('.agent-journal-list').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), width
            if width in [1440, 390]:
                page.screenshot(path=str(ROOT/f'.cache/agent-journal-{width}.png'), animations='disabled')
        page.locator('#agentDetailsClose').click()
        state['count'] = 2
        page.locator('#agentsRefresh').click()
        expect(page.locator('[data-agent-row]')).to_have_count(2)
        page.locator('[data-fleet-agent]').nth(1).click()
        page.locator('[data-record-tab=journal]').click()
        expect(page.locator('.agent-log-row')).to_have_count(1)
        expect(page.locator('.agent-log-row')).to_contain_text('Journal du deuxième poste')
        assert set(state['calls']) == {agents[0]['id'], agents[1]['id']}
        page.locator('#agentDetailsClose').click()
        page.locator('#settingsBtn').click()
        for width in [1920, 1440, 850, 700, 640, 390, 320]:
            page.set_viewport_size({'width':width,'height':900})
            bounds=page.locator('.settings-modal').bounding_box()
            assert bounds['width']>=width*.9 and bounds['height']>=810, (width,bounds)
            assert page.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), width
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
            if width in [1440,390]:
                page.screenshot(path=str(ROOT/f'.cache/settings-large-{width}.png'), animations='disabled')
        page.locator('.settings-close').click()
        assert not errors, errors
    print('PASS: fixed fleet height and internal wheel scrolling, scoped logs, paging/deduplication, filters, pause, outage, machine switch, escaped evidence and 320px layout')


if __name__ == '__main__':
    run()
