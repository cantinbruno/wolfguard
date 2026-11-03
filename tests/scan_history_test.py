"""Settings history: complete pagination, legacy archives, safe exports, outages and session cleanup."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit, parse_qs
import json, os, subprocess, time, zipfile
from playwright.sync_api import sync_playwright, expect
from scan_workspace_test import Quiet, pdf_text

ROOT=Path(__file__).resolve().parents[1]
API='https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'


def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    origin=f'http://127.0.0.1:{server.server_port}'
    env={**os.environ,'WG_TEST_ORIGIN':origin}
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    backend_process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env=env)
    backend='http://127.0.0.1:'+str(json.loads(backend_process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
            context.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+'?'+urlsplit(route.request.url).query)))
            stamp=int(time.time()*1000);kinds=['passive','active','map','vulnerability'];jobs=[]
            for i in range(55):
                jobs.append({'id':f'{i+1:032x}','agentId':'a'*32,'workspace':kinds[i%4],'strategy':'active' if i%4 in [1,2] else 'passive','createdAt':stamp-i*60000,'revision':2,'completed':1,'total':1,'status':'expired' if i==53 else 'failed' if i==8 else 'completed','target':f'192.168.20.{i+1}' if i%4!=3 else '', 'agentName':'<img src=x onerror=alert(1)>' if i==4 else 'Poste Nord' if i%2 else 'Ancien poste','platform':'linux' if i%2 else 'win32','hasReport':i!=53})
            state={'fail_history':False,'fail_result':False,'wrong_result':False,'empty':False,'hold':False};pending=[];history_requests=[]
            def result(job):
                audit=job['workspace']=='vulnerability'
                raw=None if job['status']=='expired' else {'strategy':job['strategy'],'workspace':job['workspace'],'target':job['target'],'startedAt':'2026-11-01T10:00:00Z','warnings':[], 'error':'Collecte interrompue' if job['status']=='failed' else '', 'results':[{'address':job['target'] or '127.0.0.1','port':443 if job['workspace']=='active' else None,'transport':'AUDIT' if audit else 'TCP' if job['workspace']=='active' else 'HOST' if job['workspace']=='map' else 'ARP','status':'issue' if audit else 'open' if job['workspace']=='active' else 'reachable' if job['workspace']=='map' else 'observed','checkId':'firewall' if audit else '', 'title':'Pare-feu du poste' if audit else '', 'severity':'high','detail':'Observation historique','recommendation':'Activer la protection' if audit else '', 'macAddress':'00:11:22:33:44:55'}]}
                return {**job,'spec':{'target':job['target'],'workspace':job['workspace']},'report':raw}
            def scans(route):
                url=urlsplit(route.request.url);query=parse_qs(url.query)
                if url.path=='/api/scans' and query.get('history')==['1']:
                    history_requests.append(query)
                    if state['fail_history']:route.fulfill(status=503,json={'error':'Relais temporairement indisponible'});return
                    available=[] if state['empty'] else jobs
                    start=next((i+1 for i,job in enumerate(available) if job['id']==query.get('beforeId',[''])[0]),0)
                    selected=available[start:start+50];last=selected[-1] if selected else None
                    route.fulfill(json={'jobs':selected,'next':{'beforeAt':last['createdAt'],'beforeId':last['id']} if start+50<len(available) else None});return
                if url.path=='/api/scans/result':
                    job=next(job for job in jobs if job['id']==query['id'][0])
                    if state['hold']:pending.append((route,result(job)));return
                    if state['fail_result']:route.fulfill(status=503,json={'error':'Rapport temporairement indisponible'});return
                    if state['wrong_result']:route.fulfill(json={**result(job),'workspace':'vulnerability' if job['workspace']!='vulnerability' else 'map'});return
                    route.fulfill(json=result(job));return
                route.fallback()
            context.route(API+'/api/scans**',scans)
            page=context.new_page();errors=[];downloads=[]
            page.on('pageerror',lambda error:errors.append(str(error)));page.on('download',lambda download:downloads.append(download))
            page.goto(origin+'/?sync-test');expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            archive={'format':'wolfguard-scan','version':1,'strategy':'passive','workspace':'passive','name':'Relevé sauvegardé avant historique','source':'JSON','target':'192.168.1.1','importedAt':'2026-10-01T08:00:00Z','rows':[{'address':'192.168.1.1','transport':'ARP','status':'observed','macAddress':'AA:BB:CC:DD:EE:FF'}]}
            page.evaluate("""async report=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const result=await c.create({version:2,items:[],folders:[],settings:[{key:'scan-web-passive-reports-v1',value:{version:1,reports:[report]}}],activity:[]},'07942685');await s.write(result.envelope,0)}""",archive)
            page.goto(origin+'/?sync-test&history-test#activate='+('b'*64));expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.keyboard.type('07942685');expect(page.locator('#app')).to_be_visible(timeout=30000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.locator('#settingsBtn').click();page.locator('#settings-tab-history').click()
            expect(page.locator('#wgHistoryExportAll')).to_be_enabled(timeout=15000)
            expect(page.locator('#wgHistoryCount')).to_contain_text('56')
            assert len(history_requests)==2 and 'beforeAt' in history_requests[1]
            expect(page.locator('.scan-history-item')).to_have_count(20)
            expect(page.locator('#wgHistoryPages')).to_contain_text('Page 1 sur 3')
            expect(page.locator('.scan-history-list img,.scan-history-list script')).to_have_count(0)
            page.locator('#wgHistoryNext').click();expect(page.locator('#wgHistoryPages')).to_contain_text('Page 2 sur 3')
            expect(page.locator('#wgHistoryNext')).to_be_focused()
            page.locator('#wgHistoryState').select_option('partial')
            expect(page.locator('.scan-history-item')).to_have_count(2)
            expect(page.locator('#wgHistoryExportAll')).to_contain_text('(2)')
            page.locator('#wgHistoryReset').click()
            expect(page.locator('#wgHistorySearch')).to_be_focused()
            page.locator('#wgHistoryFrom').fill('2026-10-01');page.locator('#wgHistoryTo').fill('2026-10-01')
            expect(page.locator('.scan-history-item')).to_have_count(1)
            expect(page.locator('.scan-history-copy p')).to_have_text('192.168.1.1')
            page.locator('#wgHistoryReset').click()
            page.locator('#wgHistorySort').select_option('oldest')
            expect(page.locator('.scan-history-copy p').first).to_have_text('192.168.1.1')
            page.locator('#wgHistorySort').select_option('recent')
            expect(page.locator('.scan-history-copy p').first).to_have_text('192.168.20.1')
            page.locator('#wgHistorySearch').fill('vulnerabilites')
            expect(page.locator('.scan-history-item')).to_have_count(13)
            page.locator('#wgHistorySearch').fill('192.168.20.55');expect(page.locator('.scan-history-item')).to_have_count(1)
            with page.expect_download() as downloaded:page.locator('[data-history-export]').click()
            assert downloaded.value.suggested_filename.endswith('.pdf')
            html=pdf_text(Path(downloaded.value.path()).read_bytes());assert '192.168.20.55' in html and 'Observation historique' in html
            page.locator('#wgHistorySearch').fill('');page.locator('[data-history-kind=map]').click()
            expect(page.locator('#wgHistoryExportAll')).to_contain_text('(14)')
            page.locator('[data-history-kind=all]').click()
            with page.expect_download(timeout=30000) as downloaded:page.locator('#wgHistoryExportAll').click()
            assert downloaded.value.suggested_filename.endswith('.zip')
            with zipfile.ZipFile(downloaded.value.path()) as bundle:
                assert len(bundle.namelist())==56 and bundle.testzip() is None
                assert all(name.endswith('.pdf') for name in bundle.namelist())
                reports=[pdf_text(bundle.read(name)) for name in bundle.namelist()]
                assert all('WolfGuard' in report and 'Synthèse' in report for report in reports)
                assert any('Relevé sauvegardé avant historique' in report for report in reports)
                assert any('Agent indisponible' in report and 'Aucune observation' in report for report in reports)
                assert any('Activer la protection' in report for report in reports)
                assert any('<img src=x' in report for report in reports)  # Literal report data, never executable markup.
            print('PASS: all 56 scans load across server pages, all four kinds and legacy archives export as valid complete ZIP archives containing real PDF reports')
            assert page.evaluate("async()=>(await get('settings','scan-web-passive-reports-v1')).value.reports[0]")==archive
            for width in [1440,900,640,390,320]:
                page.set_viewport_size({'width':width,'height':1000 if width>640 else 844})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                assert page.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
                assert page.locator('#settings-history').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
                if width<=640:
                    expect(page.locator('#settings-tab-history')).to_be_in_viewport(ratio=.99)
                    assert page.locator('#settings-tab-history').evaluate("el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1}")
                if width in [1440,390]:page.screenshot(path=str(ROOT/f'.cache/history-settings-{width}.png'),animations='disabled')
            page.locator('#settings-tab-history').focus();page.keyboard.press('Home')
            expect(page.locator('#settings-tab-security')).to_have_attribute('aria-selected','true')
            expect(page.locator('#settings-history')).to_be_empty()
            page.locator('#settings-tab-history').click();expect(page.locator('#wgHistoryExportAll')).to_be_enabled()
            state['fail_history']=True;page.locator('#wgHistoryRefresh').click()
            expect(page.locator('#wgHistoryStatus')).to_contain_text('Historique incomplet')
            expect(page.locator('#wgHistoryExportAll')).to_be_disabled()
            expect(page.locator('.scan-history-item')).to_have_count(20)
            expect(page.locator('#wgHistoryCount')).to_contain_text('56')
            state['fail_history']=False;page.locator('#wgHistoryRefresh').click();expect(page.locator('#wgHistoryExportAll')).to_be_enabled()
            page.locator('#wgHistorySearch').fill('192.168.20.1');state['fail_result']=True
            page.locator('[data-history-export]').first.click();expect(page.locator('#wgHistoryStatus')).to_contain_text('Export impossible')
            state['fail_result']=False;page.locator('#wgHistorySearch').fill('192.168.20.55');state['wrong_result']=True
            before=len(downloads);page.locator('[data-history-export]').click()
            expect(page.locator('#wgHistoryStatus')).to_contain_text('ne correspond pas au scan demandé')
            expect(page.locator('#wgHistoryExportAll')).to_be_enabled()
            assert len(downloads)==before
            state['wrong_result']=False;state['hold']=True
            before=len(downloads)
            page.evaluate("""()=>{window.__historyAborted=[];const original=window.fetch.bind(window);window.fetch=(url,options)=>{
              if(String(url).includes('/scans/result?'))options?.signal?.addEventListener('abort',()=>window.__historyAborted.push(String(url)),{once:true});return original(url,options);
            }}""")
            with page.expect_request(lambda request:'/scans/result?' in request.url):page.locator('#wgHistoryExportAll').click()
            expect(page.locator('#wgHistoryExportProgress')).to_be_visible()
            expect(page.locator('#wgHistorySearch')).to_be_disabled()
            page.locator('#wgHistoryCancel').click()
            expect(page.locator('#wgHistoryStatus')).to_contain_text('Export annulé')
            expect(page.locator('#wgHistoryExportAll')).to_be_enabled()
            expect(page.locator('#wgHistoryExportProgress')).to_be_hidden()
            expect(page.locator('#wgHistoryExportAll')).to_be_focused()
            for route,data in pending:route.fulfill(json=data)
            pending.clear()
            assert page.evaluate("window.__historyAborted.some(url=>url.includes('/scans/result?'))")
            assert len(downloads)==before
            with page.expect_request(lambda request:'/scans/result?' in request.url):page.locator('[data-history-export]').click()
            page.evaluate('lockApplication()');expect(page.locator('#lock')).to_be_visible()
            for route,data in pending:route.fulfill(json=data)
            page.wait_for_timeout(150)
            assert len(downloads)==before
            expect(page.locator('#settings-history')).to_have_count(0)
            assert not errors,errors
            print('PASS: accent-insensitive search, state/date filters, sort, keyboard pagination, 320px layout, refresh preserves 56 reports on outage, and explicit cancel/lock abort exports without downloads')
            browser.close()
    finally:
        backend_process.terminate();backend_process.wait(timeout=10);server.shutdown();server.server_close()


if __name__=='__main__':run()
