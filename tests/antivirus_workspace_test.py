"""Headless synthetic-agent checks; never installs or scans the user's machine."""
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from pathlib import Path
import json, os, subprocess, time
from playwright.sync_api import sync_playwright, expect
from shared_workspace_test import Quiet, ready, unlock, API
from site_fixture import open_security, open_security_tool

ROOT = Path(__file__).resolve().parents[1]

def run():
    server = ThreadingHTTPServer(('127.0.0.1', 4178), partial(Quiet, directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever, daemon=True).start()
    node = Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process = subprocess.Popen([str(node), str(ROOT/'tests/server-fixture.mjs')], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    backend = 'http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    def agent_api(route, data, token):
        if route=='edr/report': data['collectedAt']=max(data['collectedAt']+1,int(time.time()*1000))
        with urlopen(Request(backend+'/api/agent/'+route, data=json.dumps(data).encode(), headers={'Content-Type':'application/json', 'Authorization':'Agent '+token})) as response:
            return json.load(response)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            context = browser.new_context(viewport={'width':1280, 'height':900}, reduced_motion='reduce')
            context.route(API+'/**', lambda route: route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+('?' + urlsplit(route.request.url).query if urlsplit(route.request.url).query else ''))))
            page = context.new_page(); errors=[]
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto('http://127.0.0.1:4178/?sync-test'); ready(page)
            page.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            page.goto('http://127.0.0.1:4178/?sync-test&antivirus-test#activate='+('b'*64)); unlock(page)
            page.reload(); expect(page.locator('#app')).to_be_visible(timeout=20000)
            ticket=page.evaluate("async()=>await WolfGuardCloud.agentRequest('agents/pair',{})")
            enrolled=agent_api('enroll', {'code':ticket['code'],'name':'Antivirus fixture','platform':'win32'}, '')
            token=enrolled['token']; now=int(time.time()*1000)
            agent_api('poll', {'capabilities':['endpoint-protection-v1']}, token)
            report={'collectedAt':now,'platform':'win32','provider':'Microsoft Defender','supported':True,'canEnforce':True,'antivirus':'enabled','realtime':'enabled','firewall':'enabled','signatures':'enabled','activeThreats':0,'events':[]}
            agent_api('edr/report', report, token)
            open_security(page); open_security_tool(page, 'edr')
            panel=page.locator('#edrWolfGuardAV')
            expect(panel).to_contain_text('Agent à mettre à jour')
            expect(panel.locator('[data-av-action]')).to_have_count(0)
            own={'version':1,'capable':True,'installed':False,'enabled':False,'state':'missing','signatureAt':0,'scope':['C:/Synthetic/Downloads'],'quarantine':[]}
            report['wolfguardAntivirus']=own
            agent_api('edr/report', report, token); page.locator('#edrRefresh').click()
            install=panel.locator('[data-av-action="av-install"]'); expect(install).to_be_enabled()
            install.click(); page.get_by_role('button', name='Confirmer', exact=True).click()
            expect(page.locator('#edrCommandHistory')).to_contain_text('Installer WolfGuard Antivirus')
            expect(install).to_be_disabled()
            command=agent_api('edr/report', report, token)['command']; assert command['action']=='av-install'
            agent_api('edr/result', {'id':command['id'],'lease':command['lease'],'ok':True,'message':'Synthetic installation only'}, token)
            own.update(installed=True, enabled=True, state='ready', engineVersion='ClamAV fixture', signatureVersion='123', signatureAt=now, quarantine=[{'id':'a'*32,'status':'quarantined','path':'C:/Synthetic/<img src=x onerror=alert(1)>.txt','threat':'Fixture.Test','size':10,'detectedAt':now}])
            agent_api('edr/report', report, token); page.locator('#edrRefresh').click()
            expect(panel).to_contain_text('ClamAV fixture'); expect(panel).to_contain_text('Surveillance réactive')
            expect(panel.locator('img')).to_have_count(0)
            expect(panel).to_contain_text('<img src=x onerror=alert(1)>')
            for width in [1280,390,320]:
                page.set_viewport_size({'width':width,'height':900})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
            restore=panel.locator('[data-av-action="av-restore:'+('a'*32)+'"]')
            expect(restore).to_be_enabled(); restore.click()
            page.get_by_role('button',name='Confirmer',exact=True).click()
            expect(page.locator('#edrCommandHistory')).to_contain_text('Restaurer un fichier')
            command=agent_api('edr/report',report,token)['command']; assert command['action']=='av-restore:'+('a'*32)
            agent_api('edr/result',{'id':command['id'],'lease':command['lease'],'ok':True,'message':'Synthetic restoration only'},token)
            own.update(state='scanning'); agent_api('edr/report',report,token); page.locator('#edrRefresh').click()
            expect(panel.locator('[data-av-action="av-scan"]')).to_be_disabled()
            expect(panel.locator('[data-av-action="av-pause"]')).to_be_enabled()
            # A stale report must not leave interactive antivirus controls enabled.
            def offline(route):
                response=route.fetch(url=backend+'/api/edr'); body=response.json()
                for row in body['endpoints']: row['online']=False
                route.fulfill(response=response,json=body)
            page.route(API+'/api/edr',offline); page.locator('#edrRefresh').click()
            expect(panel.locator('[data-av-action="av-pause"]')).to_be_disabled()
            assert not errors, errors
            context.unroute_all(behavior='ignoreErrors'); browser.close()
            print('PASS: integrated AV status, old-agent compatibility, confirmed install/restore commands, escaped paths, busy/pause states and 320px layout')
    finally:
        process.terminate(); process.wait(timeout=5); server.shutdown()

if __name__=='__main__': run()
