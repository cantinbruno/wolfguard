"""Browser -> authenticated scan -> CERT-FR match -> safe links and PDF."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json,os,subprocess
from playwright.sync_api import sync_playwright,expect
from shared_workspace_test import Quiet,ready,unlock,API
from session_resume_test import seed
from scan_workspace_test import navigate,pdf_text

ROOT=Path(__file__).resolve().parents[1]

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')));Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin,'WG_TEST_CERTFR':'1'})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True,reduced_motion='reduce')
            context.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+'?'+urlsplit(route.request.url).query)))
            page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(origin+'/');ready(page);seed(page);page.goto(origin+'/?sync-test#activate='+('b'*64));unlock(page)
            token=page.evaluate('WolfGuardCloud.sessionState().token')
            def api(path,data,auth='Bearer '+token):
                r=context.request.post(backend+'/api/'+path,headers={'Authorization':auth},data=data);assert r.ok,r.text();return r.json()
            ticket=api('agents/pair',{})
            agent=api('agent/enroll',{'code':ticket['code'],'name':'Poste CERT-FR','platform':'win32'},'')
            auth='Agent '+agent['token'];api('agent/poll',{'capabilities':['network-scan-v3','network-target-v1','security-audit-v1']},auth)
            created=api('scans',{'agentId':agent['id'],'workspace':'active','strategy':'active','target':'192.0.2.1','mode':'tcp','ports':'22','identifyServices':True})
            job=api('agent/poll',{},auth)['job']
            api('agent/update',{'id':job['id'],'lease':job['lease'],'revision':job['revision']+1,'status':'completed','completed':1,'total':1,'report':{'strategy':'active','workspace':'active','results':[{'address':'192.0.2.1','port':22,'transport':'TCP','status':'open','product':'OpenSSH','version':'9.7p1','detail':'SSH-2.0-OpenSSH_9.7p1'}],'warnings':[]}},auth)
            page.locator('#agentsBtn').click();expect(page.locator('#wgAgentCurrentTitle')).to_have_text('Poste CERT-FR');page.locator('#closeAgentsBtn').click()
            navigate(page,'active');page.locator('.wgscan-agent-history summary').click();expect(page.locator('#wgAgentHistory option')).to_have_count(2,timeout=15000);page.locator('#wgAgentHistory').select_option(created['id'])
            panel=page.locator('#wgScanIntelligence');expect(panel).to_contain_text('CVE-2024-6387',timeout=20000);expect(panel).to_contain_text('Version dans la plage publiée')
            source=panel.locator('a[href="https://cert.cyber.gouv.fr/avis/CERTFR-2026-AVI-0001/"]');expect(source).to_have_count(1);expect(source).to_have_attribute('rel','noopener noreferrer')
            for width in [1440,390,320]:
                page.set_viewport_size({'width':width,'height':900});assert panel.evaluate('(e)=>e.scrollWidth<=e.clientWidth&&e.getBoundingClientRect().right<=innerWidth')
            page.set_viewport_size({'width':1440,'height':1000});page.screenshot(path=str(ROOT/'.cache/certfr-results.png'),animations='disabled')
            with page.expect_download() as download:page.locator('#wgScanExport').click()
            text=pdf_text(Path(download.value.path()).read_bytes())
            for value in ['CERT-FR','CVE-2024-6387','CERTFR-2026-AVI-0001','9.7p1']:assert value in text,value
            # A second device retrieves the same saved, encrypted analysis.
            result=context.request.get(backend+'/api/scans/result?id='+job['id'],headers={'Authorization':'Bearer '+token});assert result.ok;assert result.json()['intelligence']['findings'][0]['reference']=='CERTFR-2026-AVI-0001'
            assert not errors,errors
            browser.close();print('PASS: automatic CERT-FR lookup, version evidence, safe advisory/CVE links, 320px layout and PDF references')
    finally:
        process.terminate();process.wait(timeout=5);server.shutdown()

if __name__=='__main__':run()
