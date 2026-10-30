"""Purpose-specific scan forms, map exploration and audit triage in the browser."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright, expect
from scan_workspace_test import Quiet, navigate, paste, PASSIVE, XML

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
                expect(page.locator('#wgAgentPair,#wgAgentSelect,#wgAgentDownload')).to_have_count(0)
                expect(page.locator('#scanTarget')).to_have_count(1 if kind in ['active','map'] else 0)
                expect(page.locator('#wgScanPorts,#wgScanIdentify')).to_have_count(2 if kind=='active' else 0)
                expect(page.locator('#wgPassiveScope')).to_have_count(1 if kind=='passive' else 0)
                expect(page.locator('#wgScanCommand')).to_have_count(0 if kind=='vulnerability' else 1)
                expect(page.locator('#wgAgentTimeout')).to_have_count(1 if kind in ['active','map'] else 0)
                # Check actual placement, not just different names or colors.
                placement=page.evaluate('''()=>{const box=s=>document.querySelector(s).getBoundingClientRect();
                  const overview=box('#wgScanOverview'),agent=box('#wgScanAgentHost'),metrics=box('#wgScanMetrics'),page=box('.wgscan');
                  return {right:agent.left>=overview.right,above:agent.bottom<=overview.top,wide:overview.width>page.width*.85,left:metrics.right<=overview.left};}''')
                assert placement[{'passive':'right','active':'above','map':'wide','vulnerability':'left'}[kind]],(kind,placement)
                page.screenshot(path=str(ROOT/f'.cache/scan-layout-{kind}-empty.png'),animations='disabled')
                if kind=='passive':
                    page.locator('[data-passive-settings]').click()
                    expect(page.locator('#settings-tab-agents')).to_have_attribute('aria-selected','true')
                    page.locator('#closeSettingsBtn').click()
            print('PASS: four distinct forms and empty states, common agent managed only in settings')

            navigate(page,'passive'); page.locator('#wgPassiveScope').select_option('listeners')
            paste(page,json.dumps(PASSIVE),'Tables locales')
            expect(page.locator('.wgscan-local-socket')).to_have_count(2)
            expect(page.locator('.wgscan-neighbor-row')).to_have_count(1)
            page.locator('.wgscan-local-socket').first.click()
            expect(page.locator('#wgScanDetailBody')).to_contain_text('PID')
            page.locator('#wgScanDetail [data-wg-close]').click()
            local={'strategy':'passive','workspace':'passive','results':[
                {'address':'0.0.0.0','port':22,'transport':'TCP','status':'listening','pid':42,'processName':'sshd'},
                {'address':'::','port':5353,'transport':'UDP','status':'bound','pid':42,'processName':'sshd'},
                {'address':'127.0.0.1','port':8080,'transport':'TCP','status':'listening','pid':77,'processName':'proxy-local'},
                {'address':'0:0:0:0:0:0:0:1','port':631,'transport':'TCP','status':'listening','pid':0,'processName':'printd'},
                {'address':'192.0.2.10','port':51000,'transport':'TCP','status':'connection','pid':88,'processName':'browser','remoteAddress':'2001:db8::20','remotePort':443},
                {'address':'2001:db8::10','port':51001,'transport':'TCP','status':'connection','pid':88,'processName':'browser','remoteAddress':'2001:db8::20','remotePort':443},
                {'address':'192.0.2.1','transport':'ARP','status':'observed','macAddress':'00:11:22:33:44:55','interfaceName':'Ethernet'},
                {'address':'2001:db8::1','transport':'NDP','status':'observed','macAddress':'00:11:22:33:44:66','interfaceName':'eth0'},
                {'address':'127.0.0.1','transport':'TCP','status':'error','detail':'Permission denied'},
                {'address':'192.0.2.10','port':9000,'transport':'TCP','status':'listening','pid':99,'processName':'<img src=x onerror=alert(1)>','detail':'<script>alert(1)</script>'}]}
            paste(page,json.dumps(local),'Analyse locale')
            expect(page.locator('.passive-explorer-count')).to_contain_text('10 / 10 observations')
            expect(page.locator('.passive-explorer-count')).not_to_contain_text('Processus non fourni')
            expect(page.locator('.passive-binding-notice strong')).to_contain_text('2 écoute')
            expect(page.locator('.passive-other-row')).to_have_count(1)
            page.locator('[data-passive-broad]').click()
            expect(page.locator('.wgscan-local-socket')).to_have_count(2)
            page.locator('[data-wg-tab=rows]').click()
            expect(page.locator('#wgScanRows tbody tr')).to_have_count(2)
            expect(page.locator('.passive-table-context')).to_be_visible()
            with page.expect_download() as downloaded:page.locator('#wgScanExport').click()
            csv=Path(downloaded.value.path()).read_text(encoding='utf-8-sig')
            assert page.evaluate("value=>webScanModel.parse(value,'passive').rows.length",csv)==2
            page.locator('[data-wg-tab=overview]').click();page.locator('[data-passive-reset]').first.click()
            page.locator('#wgPassiveBinding').select_option('loopback')
            expect(page.locator('.wgscan-local-socket')).to_have_count(2)
            page.locator('[data-passive-process="pid:0"]').click()
            expect(page.locator('.wgscan-local-socket')).to_have_count(1)
            expect(page.locator('.wgscan-local-socket')).to_contain_text('printd')
            page.locator('[data-passive-reset]').first.click();page.locator('#wgPassiveTransport').select_option('UDP')
            expect(page.locator('.wgscan-local-socket')).to_have_count(1)
            page.locator('[data-passive-reset]').first.click();page.locator('[data-passive-category=connections]').click()
            expect(page.locator('.wgscan-connection-row')).to_have_count(2)
            expect(page.locator('.passive-connections')).to_contain_text('[2001:db8::10]:51001')
            expect(page.locator('.passive-connections')).to_contain_text('[2001:db8::20]:443')
            page.locator('#wgPassiveSearch').fill('browser');expect(page.locator('.wgscan-connection-row')).to_have_count(2)
            page.locator('#wgPassiveSearch').evaluate('el=>el.setSelectionRange(0,0)');page.keyboard.type('x')
            assert page.locator('#wgPassiveSearch').evaluate('el=>el.selectionStart')==1
            page.keyboard.press('Backspace');expect(page.locator('.wgscan-connection-row')).to_have_count(2)
            page.locator('[data-passive-process="pid:88"]').click()
            page.locator('[data-wg-tab=rows]').click();expect(page.locator('#wgScanRows tbody tr')).to_have_count(2)
            page.locator('#wgPassiveTableReset').click();expect(page.locator('#wgScanRows tbody tr')).to_have_count(10)
            page.locator('[data-wg-tab=overview]').click();page.locator('[data-passive-category=neighbours]').click()
            expect(page.locator('.wgscan-neighbor-row')).to_have_count(2)
            page.locator('#wgPassiveSearch').fill('not-in-report');expect(page.locator('.passive-no-results')).to_be_visible()
            page.locator('[data-passive-reset]').first.click()
            expect(page.locator('.passive-observation-board img,.passive-observation-board script')).to_have_count(0)
            many={'strategy':'passive','workspace':'passive','results':[{'address':'127.0.0.1','port':port,'transport':'TCP','status':'listening','pid':77,'processName':'local-test'} for port in range(1,121)]}
            paste(page,json.dumps(many),'Relevé étendu')
            expect(page.locator('.wgscan-local-socket')).to_have_count(10)
            page.locator('.passive-listeners [data-passive-table]').click()
            expect(page.locator('#wgScanRows tbody tr')).to_have_count(75)
            page.locator('#wgScanNext').click();expect(page.locator('#wgScanRows tbody tr')).to_have_count(45)
            with page.expect_download() as downloaded:page.locator('#wgScanExport').click()
            csv=Path(downloaded.value.path()).read_text(encoding='utf-8-sig')
            assert page.evaluate("value=>webScanModel.parse(value,'passive').rows.length",csv)==120
            paste(page,json.dumps(local),'Analyse locale')
            print('PASS: passive categories, protocol/binding/process filters, PID zero, IPv6 endpoints and complete filtered exports')
            navigate(page,'active');paste(page,XML,'Services')
            expect(page.locator('.wgscan-service-card')).to_have_count(1)
            page.locator('.wgscan-service-card').click();expect(page.locator('#wgScanDetailBody')).to_contain_text('OpenSSH')
            page.locator('#wgScanDetail [data-wg-close]').click()

            navigate(page,'map');paste(page,XML,'Réseau')
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
            print('PASS: local sockets and services open evidence; map supports keyboard, host selection, zoom and search')

            navigate(page,'vulnerability')
            audit={'strategy':'passive','workspace':'vulnerability','results':[
                {'address':'127.0.0.1','transport':'AUDIT','checkId':'firewall','title':'Pare-feu','status':'issue','severity':'critical','detail':'Protection inactive','recommendation':'Activer la protection'},
                {'address':'127.0.0.1','transport':'AUDIT','checkId':'updates','title':'Correctifs','status':'issue','severity':'medium','detail':'Correctifs disponibles','recommendation':'Installer les correctifs'},
                {'address':'127.0.0.1','transport':'AUDIT','checkId':'cache','title':'Cache local','status':'notchecked','severity':'info','detail':'Cache absent'},
                {'address':'127.0.0.1','transport':'AUDIT','checkId':'disk','title':'Chiffrement','status':'passed','severity':'high','detail':'Actif'},
                {'address':'127.0.0.1','transport':'AUDIT','checkId':'xss','title':'<img src=x onerror=alert(1)>','status':'issue','severity':'low','detail':'<script>alert(1)</script>','recommendation':'<svg onload=alert(1)>'}]}
            paste(page,json.dumps(audit),'Audit multi-système')
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
            print('PASS: audit prioritizes risks, filters severity and proof, copies recommendations and escapes imported content')

            for width,height in [(1440,1000),(900,900),(768,900),(390,844),(320,720)]:
                page.set_viewport_size({'width':width,'height':height})
                for kind in ['passive','active','map','vulnerability']:
                    navigate(page,kind)
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,kind)
                    assert page.locator('.wgscan').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),(width,kind)
                    if kind=='passive' and width<=768:
                        assert page.locator('#wgScanOverview').bounding_box()['y']<page.locator('.scan-monitor-controls').bounding_box()['y']
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
