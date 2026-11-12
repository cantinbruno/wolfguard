"""Browser -> authenticated relay -> actual agent -> live web results on two devices."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit,parse_qs,urlencode
import base64,json,os,subprocess,time,zipfile
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
API='https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'
CODE='07942685'
from site_fixture import WolfGuardTestHandler, open_security, open_agent_manager
from scan_workspace_test import pdf_text

class Quiet(WolfGuardTestHandler):
    def log_message(self,*args):pass
def ready(page):expect(page.locator('#keypad button').first).to_be_enabled(timeout=20000)
def unlock(page):
    ready(page);page.locator('#lock').focus();page.keyboard.type(CODE);expect(page.locator('#app')).to_be_visible(timeout=30000)
    page.wait_for_function('()=>!document.querySelector("#app").inert')
def navigate(page,kind):
    open_security(page);page.locator(f'.workspace-section-button[data-section=scan-{kind}]').click();page.wait_for_function('()=>!sectionTransition.active')

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
            open_agent_manager(first)
            with first.expect_download() as linked:first.locator('#wgAgentPair').click()
            assert linked.value.suggested_filename=='Installer-WolfGuard.cmd'
            expect(first.locator('#wgAgentConnectPair')).to_have_attribute('href',__import__('re').compile(r'^wolfguard-agent://pair\?code=[a-f0-9]{32}$'))
            expect(first.locator('#wgAgentConnect')).to_be_visible()
            expect(first.locator('.agent-manager-empty')).to_have_count(1)
            code=first.locator('#wgAgentConnectPair').get_attribute('href').split('code=')[1]
            first.screenshot(path=str(ROOT/'.cache/agent-download-desktop.png'),full_page=True)
            first.set_viewport_size({'width':390,'height':844})
            assert first.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert first.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1')
            first.screenshot(path=str(ROOT/'.cache/agent-download-mobile.png'),full_page=True)
            first.set_viewport_size({'width':1280,'height':900})
            spare_pair_codes=[]
            for platform,filename in [('linux','WolfGuard-Agent-Linux.zip'),('darwin','WolfGuard-Agent-macOS.zip'),('win32','WolfGuard-Agent-Windows.exe')]:
                first.locator('[data-agent-platform="'+platform+'"]').click();first.locator('#wgAgentDownload').evaluate('el=>el.closest("details").open=true')
                expect(first.locator('[data-agent-platform="'+platform+'"]')).to_have_attribute('aria-pressed','true')
                with first.expect_download() as download:first.locator('#wgAgentDownload').click()
                assert download.value.suggested_filename==filename
                assert Path(download.value.path()).read_bytes()==(ROOT/'app/downloads'/filename).read_bytes()
                expect(first.locator('#wgAgentShareLink')).to_be_hidden()
                first.locator('#wgAgentShare').click();expect(first.locator('#wgAgentShareLink')).to_be_visible()
                shared_url=first.locator('#wgAgentShareURL').input_value();parts=urlsplit(shared_url);ticket=parse_qs(parts.fragment)
                assert parts.path=='/agent-download.html' and set(parse_qs(parts.query))=={'v'}
                assert set(ticket)=={'code','platform','expires'} and ticket['platform']==[platform]
                assert len(ticket['code'][0])==32 and CODE not in shared_url and 'b'*64 not in shared_url
                # Capture clipboard writes in the page, leaving the user's clipboard untouched.
                first.evaluate("copyText=async value=>{window.copiedAgentLink=value;return true}")
                first.locator('#wgAgentShareCopy').click();expect(first.locator('#wgAgentSetupStatus')).to_contain_text('copié')
                assert first.evaluate('window.copiedAgentLink')==shared_url
                public=b.new_page();public.on('pageerror',lambda error:errors.append(str(error)));public_requests=[]
                public.on('request',lambda request:public_requests.append(request.url))
                public.goto(shared_url);expect(public.locator('#agentDownloadButton')).to_be_enabled()
                expect(public.locator('#agentDownloadDescription')).to_contain_text({'win32':'Windows','linux':'Linux','darwin':'macOS'}[platform])
                public.set_viewport_size({'width':320,'height':720});assert public.evaluate('document.documentElement.scrollWidth<=innerWidth')
                with public.expect_download() as shared_download:public.locator('#agentDownloadButton').click()
                assert shared_download.value.suggested_filename==('Installer-WolfGuard.cmd' if platform=='win32' else 'Installer-WolfGuard.sh')
                installer_text=Path(shared_download.value.path()).read_text()
                if platform=='win32':installer_text=base64.b64decode(installer_text.split('-EncodedCommand ')[1].strip()).decode('utf-16-le')
                expected_hash=json.loads((ROOT/'app/downloads/agent-integrity.json').read_text())[filename]
                assert ticket['code'][0] in installer_text and expected_hash in installer_text and '--pair-code' in installer_text
                assert not any('/api/' in url or ticket['code'][0] in urlsplit(url).query for url in public_requests),public_requests
                public.close();code=ticket['code'][0]
                if runner is None:
                    # Consume this shared invitation before creating another;
                    # the API deliberately caps unconsumed invitations at three.
                    runner=subprocess.Popen([str(node),str(ROOT/'tests/agent-runner.mjs')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
                    runner.stdin.write(json.dumps({'backend':backend,'code':code}));runner.stdin.close();assert runner.stdout.readline().strip()=='ready'
                else:spare_pair_codes.append(code)
                for width in [320,390,1440]:
                    first.set_viewport_size({'width':width,'height':1000})
                    assert first.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1')
            rejected=b.new_page();rejected.goto(shared_url.split('#')[0]+'#'+urlencode({'code':'invalid','platform':'win32','expires':ticket['expires'][0]}))
            expect(rejected.locator('#agentDownloadButton')).to_be_disabled();expect(rejected.locator('#agentDownloadStatus')).to_contain_text('Lien invalide')
            rejected.goto(shared_url.split('#')[0]+'#'+urlencode({'code':code,'platform':'win32','expires':int(time.time()*1000)-1}))
            expect(rejected.locator('#agentDownloadButton')).to_be_disabled();expect(rejected.locator('#agentDownloadExpiry')).to_have_text('Lien expiré');rejected.close()
            print('PASS: shareable Windows/Linux/macOS installers without private application access, clipboard, pinned checksums, expiry, invalid links and 320px layout')
            assert download.value.suggested_filename=='WolfGuard-Agent-Windows.exe'
            installer=Path(download.value.path()).read_bytes()
            assert installer==(ROOT/'app/downloads/WolfGuard-Agent-Windows.exe').read_bytes()
            assert installer[:2]==b'MZ'
            expect(first.locator('#settings-agents')).to_contain_text('Le poste utilisé pour les scans et la prise en main.')
            expect(first.locator('#wgAgentSelect')).to_be_enabled(timeout=20000)
            windows_id=first.locator('#wgAgentSelect').input_value()
            first.locator('#wgAgentSelect').select_option(windows_id)
            expect(first.locator('#wgAgentSetupStatus')).to_contain_text('Agent commun enregistré')
            expect(first.locator('#wgAgentCurrentTitle')).to_contain_text('Agent integration')
            expect(first.locator('.agent-manager-machine[data-selected=true]')).to_have_count(1)
            expect(first.locator('#wgAgentNewPost')).to_be_visible(timeout=15000)
            first.locator('#wgAgentViewPosts').click()
            expect(first.locator('#wgAgentFleetPanel')).to_be_visible()
            first.locator('#closeSettingsBtn,#closeAgentsBtn').click();navigate(first,'passive');expect(first.locator('#wgAgentLaunch')).to_be_disabled();first.locator('#scanTarget').fill('192.168.10.1');expect(first.locator('#wgAgentLaunch')).to_be_enabled(timeout=20000)
            expect(first.locator('#wgAgentSelect,#wgAgentPair,#wgAgentManage,#wgAgentSettings,[data-passive-settings]')).to_have_count(0)
            first.locator('#wgAgentLaunch').click();expect(first.locator('#wgAgentProgress span')).to_contain_text('Scan terminé',timeout=30000)
            expect(first.locator('#wgScanReportStamp')).to_contain_text('Agent · Windows')
            first.locator('[data-wg-tab=rows]').click();expect(first.locator('#wgScanRows tbody tr')).to_have_count(1)
            expect(first.locator('#wgScanRows tbody')).to_contain_text('192.168.10.1')
            print('PASS: association unique depuis le web, vrai agent independant, collecte automatique et resultat sans import')
            expect(first.locator('#wgPassiveScope,[data-passive-process],.wgscan-local-socket')).to_have_count(0)
            first.set_viewport_size({'width':390,'height':844})
            expect(first.locator('#wgScanNew')).to_be_enabled(timeout=15000)
            first.locator('#wgScanNew').click();expect(first.locator('.scan-setup')).to_be_visible()
            with first.expect_response(lambda response:response.request.method=='POST' and response.url.endswith('/scans')) as created:
                first.locator('#wgAgentLaunch').click()
            job=created.value.json()
            first.wait_for_function("async value=>(await WolfGuardCloud.agentRequest('scans?agentId='+value.agent)).jobs.some(job=>job.id===value.id&&job.status==='completed')",arg={'id':job['id'],'agent':windows_id},polling=250,timeout=30000)
            expect(first.locator('#wgScanRows tbody tr')).to_have_count(1,timeout=30000)
            first.set_viewport_size({'width':1280,'height':900})
            print('PASS: passive collection filters by target and mobile can return to preparation for a new scan')
            navigate(first,'active');first.locator('#scanTarget').fill('localhost');first.locator('[data-wg-profile=custom]').click();first.locator('#wgScanPorts').fill('4178')
            expect(first.locator('#wgAgentLaunch')).to_be_enabled(timeout=15000);first.locator('#wgAgentLaunch').click()
            expect(first.locator('#wgAgentProgress span')).to_contain_text('Scan terminé',timeout=30000)
            first.locator('[data-wg-tab=rows]').click();expect(first.locator('#wgScanRows tbody')).to_contain_text('Ouvert')
            expect(first.locator('#wgScanRows tbody')).to_contain_text('4178');expect(first.locator('#wgScanRows tbody tr')).to_have_count(1)
            first.screenshot(path=str(ROOT/'.cache/agent-active-desktop.png'),full_page=True)
            second=b.new_page();second.on('pageerror',lambda error:errors.append(str(error)));second.goto('http://127.0.0.1:4178/?sync-test');unlock(second);navigate(second,'active')
            expect(second.locator('.wgscan')).to_have_attribute('data-phase','ready')
            expect(second.locator('#wgAgentHistory option')).to_have_count(2,timeout=20000)
            second.locator('.wgscan-agent-history summary').click()
            second.locator('#wgAgentHistory').select_option(index=1)
            expect(second.locator('#wgScanReportStamp')).to_contain_text('Agent · Windows',timeout=20000)
            second.locator('[data-wg-tab=rows]').click();expect(second.locator('#wgScanRows tbody')).to_contain_text('4178')
            print('PASS: sonde TCP reelle en boucle locale, progression puis resultat identique sur un second navigateur avec le code')
            second.set_viewport_size({'width':390,'height':844});assert second.evaluate('document.documentElement.scrollWidth<=innerWidth')
            second.screenshot(path=str(ROOT/'.cache/agent-active-mobile.png'),full_page=True)
            navigate(first,'map');expect(first.locator('#scanTarget')).to_have_value('auto')
            expect(first.locator('#wgAgentLaunch')).to_be_enabled(timeout=15000);first.locator('#wgAgentLaunch').click()
            expect(first.locator('#wgAgentProgress span')).to_contain_text('Scan termin',timeout=30000)
            expect(first.locator('[data-map-address]')).to_have_count(1)
            navigate(first,'vulnerability');expect(first.locator('#wgAgentLaunch')).to_be_enabled(timeout=15000)
            first.locator('#wgAgentLaunch').click();expect(first.locator('#wgAgentProgress span')).to_contain_text('Scan termin',timeout=30000)
            expect(first.locator('.wgscan-audit-item[data-audit-status=issue]')).to_have_count(1)
            expect(first.locator('.wgscan-audit-item[data-audit-status=notchecked]')).not_to_have_count(0)
            navigate(second,'vulnerability');expect(second.locator('#wgAgentHistory option')).to_have_count(2,timeout=20000)
            second.locator('.wgscan-agent-history summary').click();second.locator('#wgAgentHistory').select_option(index=1)
            expect(second.locator('.wgscan-audit-item[data-audit-status=issue]')).to_have_count(1,timeout=20000)
            navigate(first,'passive');expect(first.locator('#wgScanReportStamp')).to_contain_text('Agent · Windows',timeout=20000)
            first.locator('[data-wg-tab=rows]').click();expect(first.locator('#wgScanRows tbody tr')).to_have_count(1)
            print('PASS: four independent agent histories, loopback map and injected Windows audit on two browsers')
            # A shared host must not expose another workspace's Stop action.
            snapshot=first.evaluate("async id=>await WolfGuardCloud.agentRequest('scans?agentId='+id)",windows_id)
            active=next(job for job in snapshot['jobs'] if job['workspace']=='active')
            active_result=first.evaluate("async id=>await WolfGuardCloud.agentRequest('scans/result?id='+id)",active['id'])
            fake_id='f'*32;cancelled=[]
            fake={**active,'id':fake_id,'status':'running','revision':999,'total':100,'completed':2}
            list_url=API+'/api/scans?agentId='+windows_id
            result_url=API+'/api/scans/result?id='+fake_id
            first.route(list_url,lambda route:route.fulfill(json={**snapshot,'jobs':[fake,*[job for job in snapshot['jobs'] if job['workspace']!='active']]}))
            first.route(result_url,lambda route:route.fulfill(json={**active_result,**fake}))
            def cancel_fake(route):
                cancelled.append(route.request.post_data_json);fake['status']='cancelled';route.fulfill(json={'ok':True})
            first.route(API+'/api/scans/cancel',cancel_fake)
            navigate(first,'map');navigate(first,'passive')
            expect(first.locator('#wgAgentPresence')).to_contain_text('Occupé')
            expect(first.locator('#wgAgentStop')).to_be_disabled()
            first.locator('#wgAgentStop').evaluate('el=>{el.disabled=false;el.click()}')
            first.wait_for_timeout(100);assert cancelled==[]
            navigate(first,'active');expect(first.locator('#wgAgentStop')).to_be_enabled(timeout=10000)
            first.locator('#wgScanCancel').click()
            expect(first.locator('#wgAgentStop')).to_be_disabled()
            assert cancelled==[{'id':fake_id}]
            fake.update({'status':'failed','revision':1000,'report':None})
            expect(first.locator('#wgAgentStatus')).to_contain_text('Collecte en échec',timeout=10000)
            expect(first.locator('#wgScanMetrics strong').first).to_have_text('0')
            expect(first.locator('.wgscan-service-card')).to_have_count(0)
            first.unroute(list_url);first.unroute(result_url);first.unroute(API+'/api/scans/cancel')
            navigate(first,'passive')
            expect(first.locator('#scanTarget')).to_have_value('192.168.10.1')
            expect(first.locator('#wgScanReportStamp')).to_contain_text('Agent · Windows')
            print('PASS: a scan cannot stop another workspace, even via a forced click; only its own running job can be cancelled')
            first.locator('#wgScanShowHistory').click();first.evaluate("webScanHistory.mount(document.querySelector('#wgScanHistory'))")
            expect(first.locator('#wgHistoryExportAll')).to_be_enabled(timeout=15000)
            assert first.locator('.scan-history-item').count()>=5
            for kind in ['passive','active','map','vulnerability']:
                assert first.locator('[data-history-kind='+kind+'] span').inner_text()!='0'
            with first.expect_download() as downloaded:first.locator('#wgHistoryExportAll').click()
            with zipfile.ZipFile(downloaded.value.path()) as bundle:
                assert len(bundle.namelist())>=5 and bundle.testzip() is None
                assert all(name.endswith('.pdf') for name in bundle.namelist())
                reports=[pdf_text(bundle.read(name)) for name in bundle.namelist()]
                assert all('Agent integration' in report and 'Agent · Windows' in report for report in reports)
                assert any('Cartographie du réseau' in report for report in reports)
                assert any('Scan de vulnérabilités' in report for report in reports)
            first.locator('#wgScanNew').click()
            print('PASS: Settings history exports actual agent results from all four scan workspaces as one valid ZIP')
            # This tab's agent selection is reused by every section and reload.
            extra=[]
            for platform,name in [('linux','Poste Linux'),('darwin','Poste macOS')]:
                ticket={'code':spare_pair_codes.pop()}
                response=a.request.post(backend+'/api/agent/enroll',data={'code':ticket['code'],'name':name,'platform':platform})
                assert response.status==200
                enrolled=response.json();extra.append(enrolled)
                a.request.post(backend+'/api/agent/poll',headers={'Authorization':'Agent '+enrolled['token']},data={'capabilities':['security-audit-v1']})
                open_agent_manager(first)
                expect(first.locator('#wgAgentSelect option[value="'+enrolled['id']+'"]')).to_have_count(1,timeout=15000)
                first.locator('[data-agent-use="'+enrolled['id']+'"]').focus()
                first.keyboard.press('Enter')
                expect(first.locator('#wgAgentSetupStatus')).to_contain_text('Agent commun enregistré')
                expect(first.locator('#wgAgentCurrentTitle')).to_have_text(name)
                expect(first.locator('.agent-manager-machine[data-selected=true]')).to_have_attribute('data-agent-id',enrolled['id'])
                first.locator('#closeSettingsBtn,#closeAgentsBtn').click()
                for kind in ['active','map','vulnerability','passive']:
                    navigate(first,kind);expect(first.locator('#wgAgentName')).to_contain_text(name,timeout=15000)
                    expect(first.locator('#wgAgentSelect,#wgAgentPair,#wgAgentManage,#wgAgentSettings,[data-passive-settings]')).to_have_count(0)
            first.reload();expect(first.locator('#app')).to_be_visible(timeout=30000);navigate(first,'active')
            expect(first.locator('#wgAgentName')).to_contain_text('Poste macOS',timeout=15000)
            open_agent_manager(first)
            first.locator('#wgAgentSelect').select_option(windows_id)
            expect(first.locator('#wgAgentSetupStatus')).to_contain_text('Agent commun enregistré')
            for width in [1440,900,390,320]:
                first.set_viewport_size({'width':width,'height':900})
                first.locator('.agents-dialog-content').evaluate('el=>el.scrollTop=0')
                assert first.evaluate('document.documentElement.scrollWidth<=innerWidth')
                assert first.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1')
                first.screenshot(path=str(ROOT/f'.cache/agents-layout-debug-{width}.png'),animations='disabled')
                assert first.locator('#settings-agents').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),(width,first.locator('#settings-agents').evaluate('el=>({width:el.clientWidth,scroll:el.scrollWidth,overflow:[...el.querySelectorAll("*")].filter(x=>x.getBoundingClientRect().right>el.getBoundingClientRect().right+1).map(x=>[x.tagName,x.id,x.className,x.getBoundingClientRect().width])})'))
                if width==1440:
                    # The selected host and all three rows fit in the panel without scrolling.
                    assert first.locator('.agent-manager-machine').last.evaluate('el=>el.getBoundingClientRect().bottom<=document.querySelector(".agents-dialog-content").getBoundingClientRect().bottom')
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
            first.evaluate('window.__agentRealNow=Date.now;Date.now=()=>window.__agentRealNow()+601000')
            try:
                expect(first.locator('#wgAgentPairCode')).to_be_hidden(timeout=10000)
                expect(first.locator('#wgAgentConnectPair')).not_to_have_attribute('href',__import__('re').compile('.+'))
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
            print('PASS: Windows/Linux/macOS downloads, pairing in the dedicated Agents interface and one persisted agent selection across all four sections and reload')
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
