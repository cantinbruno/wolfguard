"""A scan prepares, visibly runs, and reveals only its terminal report."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json, os, subprocess, time
from playwright.sync_api import sync_playwright, expect
from scan_workspace_test import Quiet, navigate

ROOT=Path(__file__).resolve().parents[1]
API='https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'


def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    agent={'id':'a'*32,'name':'Poste de test','platform':'win32','online':True,'capabilities':['network-target-v1','network-scan-v3','security-audit-v1']}
    jobs=[];held_create=[];held_result=[];result_requests=[];options={'hold_create':True,'hold_result':False,'fail_create':False}

    def report(job):
        kind=job['workspace']
        row={'address':job['target'] or '127.0.0.1','transport':{'passive':'ARP','active':'TCP','map':'HOST','vulnerability':'AUDIT'}[kind],
             'status':{'passive':'observed','active':'open','map':'reachable','vulnerability':'issue'}[kind],
             'macAddress':'00:11:22:33:44:55','interfaceName':'Ethernet','port':443 if kind=='active' else None,
             'service':'https' if kind=='active' else '', 'checkId':'firewall' if kind=='vulnerability' else '',
             'title':'Pare-feu','severity':'high','detail':'Observation de test','recommendation':'Vérifier la configuration'}
        return {**job,'spec':{'workspace':kind,'target':job['target']},'report':{'workspace':kind,'strategy':job['strategy'],'target':job['target'],'results':[] if job['status']=='cancelled' else [row]}}

    def scans(route):
        path=urlsplit(route.request.url).path
        if path=='/api/agents':route.fulfill(json={'agents':[agent]});return
        if path=='/api/scans' and route.request.method=='GET':route.fulfill(json={'jobs':list(reversed(jobs))});return
        if path=='/api/scans' and route.request.method=='POST':
            if options['fail_create']:route.fulfill(status=503,json={'error':'Relais indisponible pour le lancement.'});return
            spec=route.request.post_data_json
            job={'id':f'{len(jobs)+1:032x}','workspace':spec['workspace'],'strategy':spec['strategy'],'target':spec.get('target',''),
                 'createdAt':int(time.time()*1000),'status':'queued','revision':0,'completed':0,'total':0}
            jobs.append(job)
            if options['hold_create']:held_create.append((route,job))
            else:route.fulfill(status=201,json={'id':job['id']})
            return
        if path=='/api/scans/result':
            id=route.request.url.split('id=')[1];job=next(job for job in jobs if job['id']==id);result_requests.append(id)
            if options['hold_result']:held_result.append((route,job))
            else:route.fulfill(json=report(job))
            return
        route.fallback()

    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            context.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+'?'+urlsplit(route.request.url).query)))
            context.route(API+'/api/agents',scans);context.route(API+'/api/scans**',scans)
            page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(origin+'/?sync-test');expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async id=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const result=await c.create({version:2,items:[],folders:[],settings:[{key:'scanAgentId',value:id}],activity:[]},'07942685');await s.write(result.envelope,0)}""",agent['id'])
            page.goto(origin+'/?sync-test&lifecycle-test#activate='+('b'*64));expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.keyboard.type('07942685');expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            for kind in ['passive','active','map','vulnerability']:
                navigate(page,kind)
                expect(page.locator('.wgscan')).to_have_attribute('data-phase','ready')
                expect(page.locator('.wgscan-tabs')).to_be_hidden();expect(page.locator('#wgScanMetrics')).to_be_hidden()
                if kind!='vulnerability':page.locator('#scanTarget').fill('192.168.1.10')
                expect(page.locator('#wgAgentLaunch')).to_be_enabled(timeout=15000)
                with page.expect_request(lambda request:request.method=='POST' and request.url.endswith('/scans')):page.locator('#wgAgentLaunch').click()
                expect(page.locator('.wgscan')).to_have_attribute('data-phase','loading')
                expect(page.locator('#wgScanExecution')).to_be_visible();expect(page.locator('.scan-setup')).to_be_hidden()
                expect(page.locator('#wgScanExecution')).to_be_in_viewport()
                expect(page.locator('#wgScanExecutionTitle')).to_contain_text('Lancement')
                expect(page.locator('.wgscan-tabs')).to_be_hidden()
                assert not page.locator('#wgScanExecutionProgress').evaluate('el=>el.hasAttribute("value")')
                for route,job in held_create:route.fulfill(status=201,json={'id':job['id']})
                held_create.clear();job=jobs[-1]
                expect(page.locator('#wgScanExecutionTitle')).to_contain_text('En attente')
                job.update(status='running',completed=2,total=10,revision=1)
                expect(page.locator('#wgScanExecutionTitle')).to_contain_text('Scan en cours',timeout=10000)
                expect(page.locator('#wgScanExecutionProgress')).to_have_attribute('value','2')
                expect(page.locator('#wgScanExecutionProgress')).to_have_attribute('max','10')
                assert job['id'] not in result_requests
                if kind!='vulnerability':expect(page.locator('#scanTarget')).to_be_disabled()
                # Switching sections never reveals a partial report or another scan's loader.
                if kind=='active':
                    navigate(page,'passive');expect(page.locator('.wgscan')).to_have_attribute('data-phase','results',timeout=10000)
                    navigate(page,'active');expect(page.locator('#wgScanExecution')).to_be_visible()
                for width in [1440,390]:
                    page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(kind,width)
                    if kind=='active':
                        page.locator('#wgScanExecution').scroll_into_view_if_needed()
                        page.screenshot(path=str(ROOT/f'.cache/scan-loading-{width}.png'),animations='disabled')
                options['hold_result']=True;job.update(status='completed',completed=10,revision=2)
                expect(page.locator('#wgScanExecutionTitle')).to_contain_text('Préparation des résultats',timeout=10000)
                expect(page.locator('.wgscan-tabs')).to_be_hidden();expect(page.locator('#wgScanExport')).to_be_disabled()
                for route,finished in held_result:route.fulfill(json=report(finished))
                held_result.clear();options['hold_result']=False
                expect(page.locator('.wgscan')).to_have_attribute('data-phase','results',timeout=10000)
                expect(page.locator('#wgScanExecution')).to_be_hidden();expect(page.locator('.wgscan-tabs')).to_be_visible()
                expect(page.locator('#wgScanMetrics')).to_be_visible();expect(page.locator('#wgScanExport')).to_be_enabled()
                expect(page.locator('.scan-setup')).to_be_hidden();expect(page.locator('#wgScanNew')).to_be_visible()
                page.set_viewport_size({'width':1440,'height':1000})
            # Preparation persists through polling and navigation, preserving the chosen target.
            page.locator('#wgScanNew').click();expect(page.locator('.scan-setup')).to_be_visible()
            navigate(page,'passive');navigate(page,'vulnerability')
            expect(page.locator('.wgscan')).to_have_attribute('data-phase','ready')
            expect(page.locator('.scan-output')).to_be_hidden();page.wait_for_timeout(3300)
            expect(page.locator('.scan-setup')).to_be_visible()
            # A failed new launch hides the previous results and leaves a usable form.
            navigate(page,'active');expect(page.locator('.wgscan')).to_have_attribute('data-phase','results',timeout=10000)
            page.locator('#wgScanNew').click();expect(page.locator('#scanTarget')).to_have_value('192.168.1.10')
            options['fail_create']=True;page.locator('#wgAgentLaunch').click()
            expect(page.locator('.wgscan')).to_have_attribute('data-phase','error')
            expect(page.locator('#wgScanExecutionText')).to_contain_text('Relais indisponible')
            expect(page.locator('.wgscan-tabs')).to_be_hidden();expect(page.locator('#scanTarget')).to_be_enabled()
            options['fail_create']=False;options['hold_create']=False;page.locator('#wgAgentLaunch').click()
            expect(page.locator('.wgscan')).to_have_attribute('data-phase','loading')
            expect(page.locator('#wgScanExecutionTitle')).to_contain_text('En attente',timeout=10000)
            jobs[-1].update(status='cancelled',revision=1)
            expect(page.locator('.wgscan')).to_have_attribute('data-phase','results',timeout=10000)
            expect(page.locator('#wgScanStatus')).to_contain_text('Scan arrêté')
            assert not errors,errors
            browser.close()
            print('PASS: all four scans prepare, show immediate loading with real progress, wait for the complete report, survive navigation and recover from failed/aborted runs without stale results')
    finally:
        server.shutdown();server.server_close();process.terminate();process.wait(timeout=10)


if __name__=='__main__':run()
