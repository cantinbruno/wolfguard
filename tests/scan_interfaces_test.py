"""Purpose-specific scan forms, map exploration and audit triage in the browser."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright, expect
from scan_workspace_test import Quiet, navigate, feed_report, export_report, PASSIVE, XML

ROOT = Path(__file__).resolve().parents[1]


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
            errors = []; page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            page.reload(); expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.keyboard.type('07942685'); expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.wait_for_function('()=>!document.querySelector("#app").inert')

            # Empty views and inputs describe the actual operation; agent setup stays in settings.
            for kind in ['passive','active','map','vulnerability']:
                navigate(page,kind)
                expect(page.locator('.wgscan')).to_have_attribute('data-layout',{'passive':'monitor','active':'probe','map':'atlas','vulnerability':'review'}[kind])
                expect(page.locator('[data-empty-kind]')).to_have_attribute('data-empty-kind',kind)
                expect(page.locator('#wgScanAgentHost #wgAgentLaunch')).to_have_count(1)
                expect(page.locator('#wgAgentPair,#wgAgentSelect,#wgAgentDownload,#wgAgentSettings,[data-passive-settings]')).to_have_count(0)
                expect(page.locator('#scanTarget')).to_have_count(1 if kind in ['passive','active','map'] else 0)
                expect(page.locator('#wgScanPorts,#wgScanIdentify')).to_have_count(2 if kind=='active' else 0)
                expect(page.locator('#wgPassiveScope')).to_have_count(0)
                expect(page.locator('#wgScanCommand,#wgScanImport,#wgScanFile,#wgScanPaste,#wgScanDrop,#wgScanImportDialog,.wgscan-manual')).to_have_count(0)
                expect(page.locator('#wgAgentTimeout')).to_have_count(1 if kind in ['active','map'] else 0)
                expect(page.locator('.scan-setup')).to_have_count(1)
                expect(page.locator('.scan-output')).to_be_hidden()
                expect(page.locator('#wgAgentLaunchHint')).to_contain_text('Paramètres → Agents')
                # The first screen has a single card, with one launch action after its fields.
                placement=page.evaluate('''()=>{const box=s=>document.querySelector(s).getBoundingClientRect();
                  const card=box('.scan-setup'),fields=box('.scan-setup-fields'),agent=box('#wgScanAgentHost');
                  return {width:card.width,fieldsAbove:fields.bottom<=agent.top,inside:agent.left>=card.left&&agent.right<=card.right};}''')
                assert placement['fieldsAbove'] and placement['inside'] and placement['width']<=900,(kind,placement)
                page.screenshot(path=str(ROOT/f'.cache/scan-layout-{kind}-empty.png'),animations='disabled')
                page.set_viewport_size({'width':390,'height':844})
                page.screenshot(path=str(ROOT/f'.cache/scan-setup-{kind}-mobile.png'),animations='disabled')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),kind
                page.set_viewport_size({'width':1440,'height':1000})
            page.locator('#settingsBtn').click();page.locator('#settings-tab-agents').click()
            expect(page.locator('#wgAgentSelect')).to_be_visible()
            page.locator('#closeSettingsBtn').click()
            print('PASS: four distinct forms and empty states, common agent managed only in settings')

            navigate(page,'passive');page.locator('#scanTarget').fill('192.0.2.1');feed_report(page,json.dumps(PASSIVE),'Réseau passif')
            expect(page.locator('.passive-network-device')).to_have_count(1)
            expect(page.locator('[data-passive-process],.wgscan-local-socket,.wgscan-connection-row,#wgPassiveBinding,#wgPassiveScope')).to_have_count(0)
            page.locator('.passive-network-device').click()
            expect(page.locator('#wgScanDetailBody')).to_contain_text('Interface réseau')
            expect(page.locator('#wgScanDetailBody')).not_to_contain_text('PID')
            page.locator('#wgScanDetail [data-wg-close]').click()
            network={'strategy':'passive','workspace':'passive','results':[
                {'address':'192.0.2.1','transport':'ARP','status':'observed','macAddress':'00:11:22:33:44:55','interfaceName':'Ethernet'},
                {'address':'2001:db8::1','transport':'NDP','status':'observed','macAddress':'00:11:22:33:44:66','interfaceName':'Ethernet'},
                {'address':'192.0.2.2','transport':'ARP','status':'observed','macAddress':'00:11:22:33:44:77','interfaceName':'Wi-Fi','hostname':'<img src=x onerror=alert(1)>'},
                {'address':'127.0.0.1','port':8080,'transport':'TCP','status':'listening','pid':77,'processName':'host-only-secret'}]}
            feed_report(page,json.dumps(network),'Caches réseau')
            expect(page.locator('.passive-network-device')).to_have_count(1)
            assert page.locator('#wgScanMetrics strong').all_text_contents()==['1','1','0','1']
            raw=export_report(page)
            assert 'host-only-secret' not in raw and 'processName' not in raw and 'pid' not in raw
            assert '192.0.2.1' in raw and '2001:db8::1' not in raw
            page.locator('#scanTarget').fill('2001:db8::1');feed_report(page,json.dumps(network),'Cible IPv6')
            expect(page.locator('.passive-network-device')).to_have_count(1)
            expect(page.locator('.passive-network-device')).to_contain_text('2001:db8::1')
            page.locator('#scanTarget').fill('inconnu.example.local');feed_report(page,json.dumps(network),'Cible inconnue')
            expect(page.locator('.passive-network-device')).to_have_count(0)
            expect(page.locator('#wgScanReportStamp')).to_contain_text('Cible inconnue')
            print('PASS: passive requires one IP/FQDN, excludes unrelated neighbors and shows empty reports for unknown targets')
            navigate(page,'active');page.locator('#scanTarget').fill('192.0.2.50');feed_report(page,XML,'Services')
            expect(page.locator('.wgscan-service-card')).to_have_count(1)
            page.locator('.wgscan-service-card').click();expect(page.locator('#wgScanDetailBody')).to_contain_text('OpenSSH')
            page.locator('#wgScanDetail [data-wg-close]').click()

            page.locator('[data-wg-tab=rows]').click()
            page.locator('#wgScanSearch').fill('ssh')
            page.locator('#wgScanSearch').evaluate('el=>el.setSelectionRange(0,0)')
            page.keyboard.type('x')
            expect(page.locator('#wgScanSearch')).to_have_value('xssh')
            assert page.locator('#wgScanSearch').evaluate('el=>el.selectionStart')==1
            page.keyboard.press('Backspace')
            expect(page.locator('#wgScanSearch')).to_have_value('ssh')
            expect(page.locator('#wgScanRows tbody tr')).to_have_count(1)
            page.locator('#wgScanSort').select_option('status');expect(page.locator('#wgScanSort')).to_be_focused()
            page.locator('#wgScanFilter').select_option('open');expect(page.locator('#wgScanFilter')).to_be_focused()
            page.locator('#wgScanFilter').select_option('all');page.locator('#wgScanSearch').fill('')

            navigate(page,'map');feed_report(page,XML,'Réseau')
            page.locator('[data-map-select="192.0.2.51"]').click()
            expect(page.locator('.wgscan-map-selection')).to_have_attribute('data-selected-address','192.0.2.51')
            expect(page.locator('.wgscan-map-selection')).to_contain_text('Non confirmée')
            page.locator('[data-map-address]').focus();page.keyboard.press('Enter')
            expect(page.locator('.wgscan-map-selection')).to_have_attribute('data-selected-address','192.0.2.50')
            expect(page.locator('[data-map-address]')).to_be_focused()
            initial = page.locator('.wgscan-map-canvas svg').get_attribute('viewBox')
            page.locator('[data-map-zoom=in]').click()
            assert page.locator('.wgscan-map-canvas svg').get_attribute('viewBox') != initial
            page.locator('[data-map-zoom=fit]').click()
            assert page.locator('.wgscan-map-canvas svg').get_attribute('viewBox') == initial
            page.locator('#wgMapSearch').fill('192.0.2.51');expect(page.locator('[data-map-select]')).to_have_count(1)
            expect(page.locator('[data-map-address]')).to_have_count(0)
            page.locator('[data-map-observations]').click();expect(page.locator('#wgScanRows tbody tr')).to_have_count(1)
            page.locator('[data-wg-tab=overview]').click();page.locator('#wgMapSearch').fill('')
            expect(page.locator('.wgscan-map-explorer img,.wgscan-map-explorer script')).to_have_count(0)
            print('PASS: network neighbors and services open evidence; map supports keyboard, host selection, zoom and search')

            navigate(page,'vulnerability')
            audit={'strategy':'passive','workspace':'vulnerability','results':[
                {'address':'127.0.0.1','transport':'AUDIT','checkId':'firewall','title':'Pare-feu','status':'issue','severity':'critical','detail':'Protection inactive','recommendation':'Activer la protection'},
                {'address':'127.0.0.1','transport':'AUDIT','checkId':'updates','title':'Correctifs','status':'issue','severity':'medium','detail':'Correctifs disponibles','recommendation':'Installer les correctifs'},
                {'address':'127.0.0.1','transport':'AUDIT','checkId':'cache','title':'Cache local','status':'notchecked','severity':'info','detail':'Cache absent'},
                {'address':'127.0.0.1','transport':'AUDIT','checkId':'disk','title':'Chiffrement','status':'passed','severity':'high','detail':'Actif'},
                {'address':'127.0.0.1','transport':'AUDIT','checkId':'xss','title':'<img src=x onerror=alert(1)>','status':'issue','severity':'low','detail':'<script>alert(1)</script>','recommendation':'<svg onload=alert(1)>'}]}
            feed_report(page,json.dumps(audit),'Audit multi-système')
            expect(page.locator('.wgscan-audit-item')).to_have_count(5)
            assert page.locator('.wgscan-audit-item[data-audit-status=issue]').first.get_attribute('data-severity')=='critical'
            assert not page.locator('.wgscan-audit-passed').evaluate('el=>el.open')
            page.locator('[data-audit-filter=notchecked]').click();expect(page.locator('.wgscan-audit-item')).to_have_count(1)
            expect(page.locator('.wgscan-audit-item')).to_have_attribute('data-audit-status','notchecked')
            page.locator('[data-audit-filter=all]').click();page.locator('#wgAuditSeverity').select_option('critical')
            expect(page.locator('.wgscan-audit-item')).to_have_count(1)
            expect(page.locator('.wgscan-audit-proof')).to_contain_text('Protection inactive')
            page.evaluate("window.__copied='';copyText=async value=>{window.__copied=value;return true}")
            page.locator('[data-audit-copy]').click();assert page.evaluate('window.__copied')=='Activer la protection'
            page.locator('#wgAuditSeverity').select_option('all');page.locator('#wgAuditSearch').fill('correctifs')
            expect(page.locator('.wgscan-audit-item')).to_have_count(1)
            page.locator('[data-wg-tab=rows]').click();expect(page.locator('#wgScanRows tbody tr')).to_have_count(1)
            page.locator('.wgscan-row-detail').click()
            expect(page.locator('#wgScanDetailTitle')).to_have_text('Correctifs')
            expect(page.locator('#wgScanDetailBody')).to_contain_text('Preuve du contrôle')
            page.locator('#wgScanDetail [data-wg-close]').click()
            page.locator('[data-wg-tab=overview]').click();page.locator('#wgAuditSearch').fill('')
            expect(page.locator('.wgscan-audit-overview script,.wgscan-audit-overview img,.wgscan-audit-overview svg')).to_have_count(0)
            print('PASS: audit prioritizes risks, filters severity and proof, copies recommendations and escapes report content')

            navigate(page,'active');page.locator('[data-wg-profile=custom]').click();page.locator('#wgScanPorts').fill('22,8443')
            page.locator('.wgscan-agent-options summary').click()
            page.locator('#wgAgentTimeout').fill('2300');page.locator('[data-wg-tab=changes]').click();page.locator('#wgScanReference').click()
            navigate(page,'map');page.locator('#scanTarget').fill('192.0.2.0/24');page.locator('.wgscan-agent-options summary').click();page.locator('#wgAgentTimeout').fill('700')
            for kind in ['map','passive','vulnerability']:
                navigate(page,kind);page.locator('[data-wg-tab=changes]').click()
                expect(page.locator('#wgScanReferenceLabel')).to_contain_text('Aucune référence')
            navigate(page,'active')
            expect(page.locator('#scanTarget')).to_have_value('192.0.2.50')
            expect(page.locator('#wgScanPorts')).to_have_value('22,8443');expect(page.locator('#wgAgentTimeout')).to_have_value('2300')
            expect(page.locator('#wgScanReferenceLabel')).to_contain_text('Services')
            navigate(page,'map');expect(page.locator('#scanTarget')).to_have_value('192.0.2.0/24');expect(page.locator('#wgAgentTimeout')).to_have_value('700')
            navigate(page,'passive');expect(page.locator('#scanTarget')).to_have_value('inconnu.example.local')
            print('PASS: editing a search keeps the caret and focus; all four scans keep independent targets, options, reports and references')

            for width,height in [(1440,1000),(900,900),(768,900),(390,844),(320,720)]:
                page.set_viewport_size({'width':width,'height':height})
                for kind in ['passive','active','map','vulnerability']:
                    navigate(page,kind)
                    expect(page.locator('#wgAgentSelect,#wgAgentSettings,[data-passive-settings]')).to_have_count(0)
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,kind)
                    assert page.locator('.wgscan').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),(width,kind)
                    if kind=='passive' and width<=768:
                        expect(page.locator('#wgPassiveQuickCollect')).to_be_visible()
                    page.locator('#wgScanTab-overview').focus();page.keyboard.press('ArrowRight')
                    expect(page.locator('#wgScanTab-rows')).to_be_focused()
                    page.keyboard.press('Home');expect(page.locator('#wgScanTab-overview')).to_be_focused()
                    if width in [1440,390]:
                        page.locator('#content').evaluate('el=>el.scrollTop=0')
                        page.screenshot(path=str(ROOT/f'.cache/interfaces-{kind}-{width}.png'),animations='disabled')
            assert not errors,errors
            print('PASS: all four workspaces from 320 to 1440px without overflow, keyboard navigation preserved')
            browser.close()
    finally:
        server.shutdown();server.server_close()


if __name__=='__main__':run()
