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
    agent={'id':'a'*32,'name':'Poste de test','platform':'win32','online':True,'capabilities':['network-target-v1','network-scan-v3','network-auto-map-v1','network-topology-v1','security-audit-v1']}
    jobs=[{'id':f'{100+index:032x}','workspace':kind,'strategy':'active' if kind in ['active','map'] else 'passive',
           'target':'192.168.1.20' if kind!='vulnerability' else '', 'createdAt':int(time.time()*1000)-86400000,
           'status':'completed','revision':2,'completed':1,'total':1}
          for index,kind in enumerate(['passive','active','map','vulnerability'])]
    old_ids={job['workspace']:job['id'] for job in jobs}
    held_create=[];held_result=[];result_requests=[];options={'hold_create':True,'hold_result':False,'fail_create':False}

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
                expect(page.locator('#wgScanExport,#wgScanOverview,.wgscan-tabs,#wgScanHistory')).to_have_count(0)
                if kind in ['passive','active']:page.locator('#scanTarget').fill('192.168.1.10')
                expect(page.locator('#wgAgentLaunch')).to_be_enabled(timeout=15000)
                page.locator('#wgAgentLaunch').click()
                expect(page.locator('.wgscan')).to_have_attribute('data-phase','loading')
                expect(page.locator('#wgScanExecution')).to_be_visible()
                deadline=time.time()+3
                while not held_create and time.time()<deadline:page.wait_for_timeout(20)
                assert held_create,'Scan request was not received'
                for route,job in held_create:route.fulfill(status=201,json={'id':job['id']})
                held_create.clear();job=jobs[-1]
                expect(page.locator('#wgScanExecutionTitle')).to_contain_text('En attente',timeout=10000)
                job.update(status='running',completed=2,total=10,revision=1)
                expect(page.locator('#wgScanExecutionProgress')).to_have_attribute('value','2',timeout=10000)
                expect(page.locator('#wgScanExecutionProgress')).to_have_attribute('max','10')
                expect(page.locator('#wgScanCancel')).to_be_enabled()
                for width in [1440,390,320]:
                    page.set_viewport_size({'width':width,'height':1000})
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                job.update(status='completed',completed=10,revision=2)
                expect(page.locator('.wgscan')).to_have_attribute('data-phase','ready',timeout=10000)
                expect(page.locator('#wgScanStatus')).to_contain_text('historique')
                expect(page.locator('#wgScanExecution')).to_be_hidden()
                expect(page.locator('#wgScanExport,#wgScanOverview,.wgscan-tabs,#wgScanHistory')).to_have_count(0)
                assert not result_requests,'Report contents must be requested only from workstation PDF history'
                page.set_viewport_size({'width':1440,'height':1000})
            options['fail_create']=True;page.locator('#wgAgentLaunch').click()
            expect(page.locator('.wgscan')).to_have_attribute('data-phase','error')
            expect(page.locator('#wgScanExecutionText')).to_contain_text('Relais indisponible')
            assert not errors,errors
            browser.close()
            print('PASS: four scan launchers, real progress, cancellation control, no report preview or direct export, mobile layout and launch failure')
    finally:
        server.shutdown();server.server_close();process.terminate();process.wait(timeout=10)


if __name__=='__main__':run()
