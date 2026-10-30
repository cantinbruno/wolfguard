"""Browser -> authenticated relay -> actual agent -> live web results on two devices."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json,os,subprocess
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
API='https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'
CODE='07942685'
from site_fixture import WolfGuardTestHandler

class Quiet(WolfGuardTestHandler):
    def log_message(self,*args):pass
def ready(page):expect(page.locator('#keypad button').first).to_be_enabled(timeout=20000)
def unlock(page):
    ready(page);page.keyboard.type(CODE);expect(page.locator('#app')).to_be_visible(timeout=30000)
    page.wait_for_function('()=>!document.querySelector("#app").inert')
def navigate(page,kind):
    page.locator(f'.workspace-section-button[data-section=scan-{kind}]').click();page.wait_for_function('()=>!sectionTransition.active')

def run():
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    backend_process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
    backend='http://127.0.0.1:'+str(json.loads(backend_process.stdout.readline())['port'])
    server=ThreadingHTTPServer(('127.0.0.1',4178),partial(Quiet,directory=str(ROOT/'docs')));Thread(target=server.serve_forever,daemon=True).start()
    runner=None
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();a=browser.new_context(viewport={'width':1440,'height':1000});b=browser.new_context();errors=[]
            for context in [a,b]:
                context.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+'?'+urlsplit(route.request.url).query)))
            first=a.new_page();first.on('pageerror',lambda error:errors.append(str(error)))
            first.goto('http://127.0.0.1:4178/?sync-test');ready(first)
            first.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            first.goto('http://127.0.0.1:4178/?sync-test&agent-test#activate='+('b'*64));unlock(first)
            first.locator('#settingsBtn').click();first.locator('[data-settings-tab=agents]').click();first.locator('#wgAgentPair').click()
            expect(first.locator('#wgAgentPairCode code')).to_have_text(__import__('re').compile(r'^[a-f0-9]{32}$'))
            expect(first.locator('#wgAgentConnect')).to_be_visible()
            expect(first.locator('.agent-manager-empty')).to_have_count(1)
            code=first.locator('#wgAgentPairCode code').inner_text()
            first.screenshot(path=str(ROOT/'.cache/agent-download-desktop.png'),full_page=True)
            first.set_viewport_size({'width':390,'height':844})
            assert first.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert first.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1')
            first.screenshot(path=str(ROOT/'.cache/agent-download-mobile.png'),full_page=True)
            first.set_viewport_size({'width':1280,'height':900})
            for platform,filename in [('linux','WolfGuard-Agent-Linux.zip'),('darwin','WolfGuard-Agent-macOS.zip'),('win32','WolfGuard-Agent-Windows.exe')]:
                first.locator('[data-agent-platform="'+platform+'"]').click()
                expect(first.locator('[data-agent-platform="'+platform+'"]')).to_have_attribute('aria-pressed','true')
                with first.expect_download() as download:first.locator('#wgAgentDownload').click()
                assert download.value.suggested_filename==filename
                assert Path(download.value.path()).read_bytes()==(ROOT/'app/downloads'/filename).read_bytes()
            assert download.value.suggested_filename=='WolfGuard-Agent-Windows.exe'
            installer=Path(download.value.path()).read_bytes()
            assert installer==(ROOT/'app/downloads/WolfGuard-Agent-Windows.exe').read_bytes()
            assert installer[:2]==b'MZ'
            expect(first.locator('#settings-agents')).to_contain_text('Un poste commun')
            runner=subprocess.Popen([str(node),str(ROOT/'tests/agent-runner.mjs')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
            runner.stdin.write(json.dumps({'backend':backend,'code':code}));runner.stdin.close();assert runner.stdout.readline().strip()=='ready'
            expect(first.locator('#wgAgentSelect')).to_be_enabled(timeout=20000)
            windows_id=first.locator('#wgAgentSelect').input_value()
            first.locator('#wgAgentSelect').select_option(windows_id)
            expect(first.locator('#wgAgentSetupStatus')).to_contain_text('Agent commun enregistré')
            expect(first.locator('#wgAgentCurrentTitle')).to_contain_text('Agent integration')
            expect(first.locator('.agent-manager-machine[data-selected=true]')).to_have_count(1)
            expect(first.locator('#wgAgentNewPost')).to_be_visible(timeout=15000)
            first.locator('#wgAgentViewPosts').click()
            expect(first.locator('#wgAgentFleetPanel')).to_be_visible()
            first.locator('#closeSettingsBtn').click();navigate(first,'passive');expect(first.locator('#wgAgentLaunch')).to_be_enabled(timeout=20000)
            expect(first.locator('#wgAgentSelect,#wgAgentPair,#wgAgentManage')).to_have_count(0)
            first.locator('#wgAgentLaunch').click();expect(first.locator('#wgAgentProgress span')).to_contain_text('Scan terminé',timeout=30000)
            expect(first.locator('#wgScanReportStamp')).to_contain_text('Agent · Windows')
            first.locator('[data-wg-tab=rows]').click();expect(first.locator('#wgScanRows tbody tr')).to_have_count(2)
            expect(first.locator('#wgScanRows tbody')).to_contain_text('192.168.10.1')
            print('PASS: association unique depuis le web, vrai agent independant, collecte automatique et resultat sans import')
            first.locator('#wgPassiveScope').select_option('listeners')
            with first.expect_request(lambda request:request.method=='POST' and request.url.endswith('/scans')) as requested:
                first.locator('#wgAgentLaunch').click()
            assert requested.value.post_data_json['passiveScope']=='listeners'
            expect(first.locator('#wgScanRows tbody tr')).to_have_count(1,timeout=30000)
            expect(first.locator('#wgScanRows tbody')).to_contain_text('127.0.0.1')
            expect(first.locator('#wgAgentProgress span')).to_contain_text('Scan terminé',timeout=30000)
            first.locator('#wgPassiveScope').select_option('all')
            first.set_viewport_size({'width':390,'height':844})
            expect(first.locator('#wgPassiveQuickCollect')).to_be_enabled(timeout=15000)
            first.locator('#wgPassiveQuickCollect').click()
            expect(first.locator('#wgScanRows tbody tr')).to_have_count(2,timeout=30000)
            expect(first.locator('#wgAgentProgress span')).to_contain_text('Scan terminé',timeout=30000)
            first.set_viewport_size({'width':1280,'height':900})
            print('PASS: passive scope reaches the real agent, listeners exclude neighbors and all restores the complete result')
            navigate(first,'active');first.locator('#scanTarget').fill('127.0.0.1');first.locator('[data-wg-profile=custom]').click();first.locator('#wgScanPorts').fill('4178')
            expect(first.locator('#wgAgentLaunch')).to_be_enabled(timeout=15000);first.locator('#wgAgentLaunch').click()
            expect(first.locator('#wgAgentProgress span')).to_contain_text('Scan terminé',timeout=30000)
            first.locator('[data-wg-tab=rows]').click();expect(first.locator('#wgScanRows tbody')).to_contain_text('Ouvert')
            expect(first.locator('#wgScanRows tbody')).to_contain_text('4178')
            first.screenshot(path=str(ROOT/'.cache/agent-active-desktop.png'),full_page=True)
            second=b.new_page();second.on('pageerror',lambda error:errors.append(str(error)));second.goto('http://127.0.0.1:4178/?sync-test');unlock(second);navigate(second,'active')
            expect(second.locator('#wgScanReportStamp')).to_contain_text('Agent · Windows',timeout=20000)
            second.locator('[data-wg-tab=rows]').click();expect(second.locator('#wgScanRows tbody')).to_contain_text('4178')
            print('PASS: sonde TCP reelle en boucle locale, progression puis resultat identique sur un second navigateur avec le code')
            second.set_viewport_size({'width':390,'height':844});assert second.evaluate('document.documentElement.scrollWidth<=innerWidth')
            second.screenshot(path=str(ROOT/'.cache/agent-active-mobile.png'),full_page=True)
            navigate(first,'map');first.locator('#scanTarget').fill('127.0.0.1')
            expect(first.locator('#wgAgentLaunch')).to_be_enabled(timeout=15000);first.locator('#wgAgentLaunch').click()
            expect(first.locator('#wgAgentProgress span')).to_contain_text('Scan termin',timeout=30000)
            expect(first.locator('[data-map-address]')).to_have_count(1)
            navigate(first,'vulnerability');expect(first.locator('#wgAgentLaunch')).to_be_enabled(timeout=15000)
            first.locator('#wgAgentLaunch').click();expect(first.locator('#wgAgentProgress span')).to_contain_text('Scan termin',timeout=30000)
            expect(first.locator('.wgscan-audit-item[data-audit-status=issue]')).to_have_count(1)
            expect(first.locator('.wgscan-audit-item[data-audit-status=notchecked]')).not_to_have_count(0)
            navigate(second,'vulnerability');expect(second.locator('.wgscan-audit-item[data-audit-status=issue]')).to_have_count(1,timeout=20000)
            navigate(first,'passive');expect(first.locator('#wgScanReportStamp')).to_contain_text('Agent · Windows',timeout=20000)
            first.locator('[data-wg-tab=rows]').click();expect(first.locator('#wgScanRows tbody tr')).to_have_count(2)
            print('PASS: four independent agent histories, loopback map and injected Windows audit on two browsers')
            # The same encrypted selection is reused by every section and reload.
            extra=[]
            for platform,name in [('linux','Poste Linux'),('darwin','Poste macOS')]:
                ticket=first.evaluate("async()=>await WolfGuardCloud.agentRequest('agents/pair',{})")
                response=a.request.post(backend+'/api/agent/enroll',data={'code':ticket['code'],'name':name,'platform':platform})
                assert response.status==200
                enrolled=response.json();extra.append(enrolled)
                a.request.post(backend+'/api/agent/poll',headers={'Authorization':'Agent '+enrolled['token']},data={'capabilities':['security-audit-v1']})
                first.locator('#wgAgentSettings').click()
                expect(first.locator('#wgAgentSelect option[value="'+enrolled['id']+'"]')).to_have_count(1,timeout=15000)
                first.locator('[data-agent-use="'+enrolled['id']+'"]').focus()
                first.keyboard.press('Enter')
                expect(first.locator('#wgAgentSetupStatus')).to_contain_text('Agent commun enregistré')
                expect(first.locator('#wgAgentCurrentTitle')).to_have_text(name)
                expect(first.locator('.agent-manager-machine[data-selected=true]')).to_have_attribute('data-agent-id',enrolled['id'])
                first.locator('#closeSettingsBtn').click()
                for kind in ['active','map','vulnerability','passive']:
                    navigate(first,kind);expect(first.locator('#wgAgentName')).to_contain_text(name,timeout=15000)
                    expect(first.locator('#wgAgentSelect,#wgAgentPair,#wgAgentManage')).to_have_count(0)
            first.reload();expect(first.locator('#app')).to_be_visible(timeout=30000);navigate(first,'active')
            expect(first.locator('#wgAgentName')).to_contain_text('Poste macOS',timeout=15000)
            first.locator('#wgAgentSettings').click()
            first.locator('#wgAgentSelect').select_option(windows_id)
            expect(first.locator('#wgAgentSetupStatus')).to_contain_text('Agent commun enregistré')
            for width in [1440,900,390,320]:
                first.set_viewport_size({'width':width,'height':900})
                first.locator('.settings-main').evaluate('el=>el.scrollTop=0')
                assert first.evaluate('document.documentElement.scrollWidth<=innerWidth')
                assert first.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1')
                assert first.locator('#settings-agents').evaluate('el=>el.scrollWidth<=el.clientWidth+1')
                if width==1440:
                    # The selected host and all three rows fit in the panel without scrolling.
                    assert first.locator('.agent-manager-machine').last.evaluate('el=>el.getBoundingClientRect().bottom<=document.querySelector(".settings-main").getBoundingClientRect().bottom')
                first.screenshot(path=str(ROOT/f'.cache/agents-management-{width}.png'),animations='disabled')
            first.set_viewport_size({'width':1440,'height':1000})
            first.locator('[data-agent-details="'+windows_id+'"]').click()
            expect(first.locator('#wgAgentInfo-'+windows_id)).to_be_visible()
            expect(first.locator('#wgAgentInfo-'+windows_id)).to_contain_text('Pris en charge')
            first.locator('[data-agent-details="'+windows_id+'"]').click()
            first.locator('#wgAgentTab-fleet').focus();first.keyboard.press('ArrowRight')
            expect(first.locator('#wgAgentAdd')).to_be_focused()
            expect(first.locator('#wgAgentConnect')).to_be_visible()
            first.keyboard.press('Home');expect(first.locator('#wgAgentFleetPanel')).to_be_visible()
            first.locator('#wgAgentAdd').click()
            first.locator('#wgAgentPair').click();expect(first.locator('#wgAgentPairCode')).to_be_visible()
            first.evaluate('window.__agentRealNow=Date.now;Date.now=()=>window.__agentRealNow()+301000')
            try:
                expect(first.locator('#wgAgentPairCode')).to_be_hidden(timeout=10000)
                expect(first.locator('#wgAgentPairCode code')).to_have_text('')
                expect(first.locator('#wgAgentSetupStatus')).to_contain_text('expiré')
            finally:first.evaluate('Date.now=window.__agentRealNow;delete window.__agentRealNow')
            first.route(API+'/api/agents',lambda route:route.fulfill(status=503,json={'error':'Service temporairement indisponible'}))
            expect(first.locator('#wgAgentSettingsPresence')).to_have_attribute('data-state','unknown',timeout=10000)
            expect(first.locator('#wgAgentConnectionNotice')).to_be_visible()
            expect(first.locator('#wgAgentFleetSummary')).to_contain_text('État indisponible')
            first.locator('#wgAgentTab-fleet').click()
            assert all(value=='unknown' for value in first.locator('.agent-manager-machine-row>.agent-manager-presence').evaluate_all('els=>els.map(el=>el.dataset.state)'))
            first.unroute(API+'/api/agents')
            first.locator('#wgAgentRefresh').click()
            expect(first.locator('#wgAgentConnectionNotice')).to_be_hidden(timeout=10000)
            print('PASS: agent cards support keyboard selection, 320px layout, expired code clearing and truthful offline API feedback')
            print('PASS: Windows/Linux/macOS downloads, pairing in Settings only and one persisted agent selection across all four sections and reload')
            expect(first.locator('[data-agent-revoke]')).to_have_count(3)
            first.locator('[data-agent-details="'+windows_id+'"]').click()
            first.locator('[data-agent-revoke="'+windows_id+'"]').click()
            expect(first.locator('#appDialogMessage')).to_contain_text('Agent integration')
            expect(first.locator('.app-dialog-submit')).to_have_text('Révoquer l’accès')
            first.locator('.app-dialog-cancel').click()
            expect(first.locator('[data-agent-revoke="'+windows_id+'"]')).to_have_count(1)
            first.locator('[data-agent-revoke="'+windows_id+'"]').click();first.locator('.app-dialog-submit').click()
            expect(first.locator('[data-agent-revoke="'+windows_id+'"]')).to_have_count(0,timeout=20000)
            runner.wait(timeout=15000);assert runner.returncode==1
            assert not errors,errors
            print('PASS: poste revocable depuis le web, acces de l agent immediatement refuse et interface mobile sans debordement')
            browser.close()
    finally:
        if runner and runner.poll() is None:runner.terminate();runner.wait(timeout=10)
        backend_process.terminate();backend_process.wait(timeout=10);server.shutdown();server.server_close()

if __name__=='__main__':run()
