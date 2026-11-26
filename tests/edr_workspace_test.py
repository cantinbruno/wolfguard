"""Real EDR relay, retired chatbot, mobile layout and lock lifecycle."""
from site_fixture import open_security_tool
from site_fixture import open_security
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from urllib.request import Request,urlopen
import json,os,subprocess
from playwright.sync_api import sync_playwright,expect
from shared_workspace_test import Quiet,ready,unlock,API,CODE

ROOT=Path(__file__).resolve().parents[1]

def run():
    server=ThreadingHTTPServer(('127.0.0.1',4178),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    def agent_api(path,data,token):
        with urlopen(Request(backend+'/api/agent/'+path,data=json.dumps(data).encode(),headers={'Content-Type':'application/json','Authorization':'Agent '+token})) as response:return json.load(response)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');errors=[]
            context.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+('?' +urlsplit(route.request.url).query if urlsplit(route.request.url).query else ''))))
            chat_calls=[];context.on('request',lambda request:chat_calls.append(request.url) if '/api/chat' in request.url or '/api/ai' in request.url else None)
            page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto('http://127.0.0.1:4178/?sync-test');ready(page)
            page.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            page.goto('http://127.0.0.1:4178/?sync-test&edr-test#activate='+('b'*64));unlock(page)
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            ticket=page.evaluate("async()=>await WolfGuardCloud.agentRequest('agents/pair',{})")
            enrolled=agent_api('enroll',{'code':ticket['code'],'name':'Poste EDR test','platform':'win32'},'')
            import time
            now=int(time.time()*1000)
            agent_api('poll',{'capabilities':['endpoint-protection-v1','security-audit-v1']},enrolled['token'])
            event={'id':'native-block-1','occurredAt':now,'provider':'Microsoft Defender','title':'Accès malveillant bloqué','resource':'C:/synthetic/threat.exe','detail':'Action native confirmée','status':'blocked','severity':'high'}
            report={'collectedAt':now,'platform':'win32','provider':'Microsoft Defender','supported':True,'canEnforce':True,'antivirus':'enabled','realtime':'enabled','firewall':'enabled','signatures':'enabled','activeThreats':0,'events':[event],'wolfguardAntivirus':{'version':1,'capable':True,'installed':True,'enabled':True,'state':'ready','signatureAt':now,'signatureVersion':'fixture','quarantine':[]}}
            agent_api('edr/report',report,enrolled['token'])
            report['inventory']={'username':'fixture-user','agentUser':'SYSTEM','domain':'FIXTURE-DOMAIN','domainJoined':True,'hostname':'fixture-host'}
            report['systemMonitor']={'scope':'system','processes':42,'services':80,'connections':12,'startupEntries':3,'eventLogs':['System','Security'],'limitations':['Observation périodique de test']}
            report['collectedAt']+=1;agent_api('edr/report',report,enrolled['token'])
            edr_calls=[];page.on('request',lambda request:edr_calls.append(urlsplit(request.url).path))
            open_security(page)
            page.locator('[data-fleet-agent="'+enrolled['id']+'"]').click()
            expect(page.locator('#agentRecord-overview')).to_contain_text('fixture-user')
            expect(page.locator('#agentRecord-overview')).to_contain_text('FIXTURE-DOMAIN')
            page.locator('#agentDetailsClose').click()
            open_security_tool(page,'edr');expect(page.locator('#agentDetailsPanel')).to_be_visible()
            expect(page.locator('#edrPostDetail,#edrPosts,[data-record-edr]')).to_have_count(0)
            expect(page.locator('#agentRecord-protection')).to_contain_text('Surveillance active')
            page.locator('[data-protection-disclosure=system] > summary').click()
            expect(page.locator('[data-protection-disclosure=system]')).to_contain_text('42')
            expect(page.locator('[data-protection-disclosure=system]')).to_contain_text('Security')
            expect(page.locator('[data-protection-disclosure=system]')).to_contain_text('Observation périodique de test')
            page.locator('[data-record-tab=journal]').click()
            expect(page.locator('.agent-log-row')).to_contain_text('Accès malveillant bloqué')
            page.locator('.agent-log-row summary').click();expect(page.get_by_text('Action native confirmée',exact=True)).to_be_visible()
            page.locator('[data-journal-ack]').click();expect(page.locator('.agent-log-row')).to_contain_text('Acquitté')
            page.locator('[data-record-tab=protection]').click()
            page.locator('[data-protection-action=refresh]').click();expect(page.locator('.agent-protection-history')).to_contain_text('En attente du poste')
            command=agent_api('edr/report',report,enrolled['token'])['command'];assert command['action']=='refresh'
            agent_api('edr/result',{'id':command['id'],'lease':command['lease'],'ok':True,'message':'Collecte confirmée'},enrolled['token'])
            page.locator('#agentDetailsRefresh').click();expect(page.locator('.agent-protection-history')).to_contain_text('Confirmée par le poste')
            page.locator('[data-protection-field=mode]').select_option('observe')
            page.locator('[data-record-tab=quarantine]').click();expect(page.locator('#agentRecord-quarantine')).to_be_visible()
            page.locator('[data-record-tab=protection]').click();expect(page.locator('[data-protection-field=mode]')).to_have_value('observe')
            page.locator('[data-protection-field=mode]').focus();page.evaluate('document.querySelector("#agentDetailsRefresh").click()')
            expect(page.locator('#agentDetailsRefresh')).to_be_enabled();expect(page.locator('[data-protection-field=mode]')).to_have_value('observe')
            page.locator('#agentDetailsClose').click();expect(page.locator('.app-dialog')).to_be_visible();page.locator('.app-dialog-cancel').click()
            expect(page.locator('#agentDetailsPanel')).to_be_visible();expect(page.locator('[data-protection-field=mode]')).to_have_value('observe')
            page.locator('[data-protection-policy] button[type=submit]').click();page.locator('.app-dialog-submit').click()
            expect(page.locator('[data-protection-policy] button[type=submit]')).to_be_disabled()
            assert not any(path.startswith('/api/scans') for path in edr_calls),edr_calls
            expect(page.locator('[data-section=chatbot],#aiConfig,#aiPrompt')).to_have_count(0)
            assert not page.evaluate('workspaceModules.allows("chatbot")')
            assert page.evaluate('async()=>await openSection("chatbot")') is False
            expect(page.locator('#agentDetailsPanel')).to_be_visible()
            page.locator('#agentDetailsClose').click()
            palette={'library':'#9edcff','scan-passive':'#8fd5ff','scan-active':'#d1b5ff','scan-map':'#79ead0','scan-vulnerability':'#ff9b9b','tools':'#ffaddb','remote':'#9eafff','vault':'#91edbd','edr':'#f3dc78'}
            assert len(set(palette.values()))==len(palette)
            # Return through all sections after EDR: no previous accent may leak.
            for section in ['edr',*palette]:
                if section.startswith('scan-') or section in ['remote','edr']:open_security(page)
                open_security_tool(page,section);page.wait_for_function('()=>!sectionTransition.active')
                primary='security' if section.startswith('scan-') or section in ['edr','remote'] else section
                expected='#f3dc78' if primary=='security' else palette[section]
                colours=page.evaluate("""section=>({app:getComputedStyle(document.querySelector('#app')).getPropertyValue('--workspace-accent').trim(),root:getComputedStyle(document.documentElement).getPropertyValue('--ui-accent').trim(),tab:getComputedStyle(document.querySelector('[data-section="'+section+'"]')).getPropertyValue('--button-accent').trim(),content:getComputedStyle(document.querySelector('#content')).getPropertyValue('--ui-accent').trim(),classes:[...document.querySelector('#content').classList].filter(name=>name.startsWith('section-accent-'))})""",primary)
                assert all(colours[key]==expected for key in ['app','root','tab','content']),(section,colours)
                assert len(colours['classes'])==1,(section,colours)
                page.screenshot(path=str(ROOT/'.cache'/(section+'-desktop.png')))
                for width in [390,320]:
                    page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.screenshot(path=str(ROOT/'.cache'/(section+'-mobile.png')));page.set_viewport_size({'width':1440,'height':1000})
            page.evaluate('lockApplication()');ready(page);unlock(page);open_security(page);open_security_tool(page,'edr');expect(page.locator('#agentRecord-protection')).to_be_visible();expect(page.locator('[data-section=chatbot]')).to_have_count(0);assert not chat_calls
            assert not errors,errors
            browser.contexts[0].unroute_all(behavior='ignoreErrors');browser.close();print('PASS: EDR native protection, confirmed block, acknowledgment, policy and command lifecycle, nine distinct section colours without EDR leakage, chatbot removed, no AI calls, mobile layout, lock and reload')
    finally:process.terminate();process.wait(timeout=5);server.shutdown()

if __name__=='__main__':run()
