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
            report={'collectedAt':now,'platform':'win32','provider':'Microsoft Defender','supported':True,'canEnforce':True,'antivirus':'enabled','realtime':'enabled','firewall':'enabled','signatures':'enabled','activeThreats':0,'events':[event]}
            agent_api('edr/report',report,enrolled['token'])
            edr_calls=[];page.on('request',lambda request:edr_calls.append(urlsplit(request.url).path))
            open_security(page);open_security_tool(page,'edr');expect(page.locator('#edrPosts')).to_contain_text('Poste EDR test')
            expect(page.locator('#edrPostDetail')).to_contain_text('Accès malveillant bloqué')
            expect(page.locator('#edrProtectionState')).to_contain_text('Protégé')
            expect(page.locator('#edrPosts')).to_contain_text('1 blocage(s)')
            page.locator('summary').filter(has_text='Preuve et détails').click();expect(page.get_by_text('Action native confirmée',exact=True)).to_be_visible()
            page.locator('[data-edr-ack]').click();expect(page.locator('#edrEvents')).to_contain_text('Acquitté')
            page.locator('#edrCollect').click();expect(page.locator('#edrCommandHistory')).to_contain_text('En attente du poste')
            command=agent_api('edr/report',report,enrolled['token'])['command'];assert command['action']=='refresh'
            agent_api('edr/result',{'id':command['id'],'lease':command['lease'],'ok':True,'message':'Collecte confirmée'},enrolled['token'])
            expect(page.locator('#edrRefresh')).to_be_enabled();page.locator('#edrRefresh').click();expect(page.locator('#edrCommandHistory')).to_contain_text('Confirmée par le poste')
            page.locator('#edrPolicyMode').select_option('observe');page.locator('#edrPolicySave').click()
            expect(page.locator('#edrPolicySave')).to_be_disabled()
            assert not any(path.startswith('/api/scans') for path in edr_calls),edr_calls
            expect(page.locator('[data-section=chatbot],#aiConfig,#aiPrompt')).to_have_count(0)
            assert not page.evaluate('workspaceModules.allows("chatbot")')
            assert page.evaluate('async()=>await openSection("chatbot")') is False
            expect(page.locator('#edrPostDetail')).to_be_visible()
            palette={'library':'#ffc078','scan-passive':'#8fd5ff','scan-active':'#d1b5ff','scan-map':'#79ead0','scan-vulnerability':'#ff9b9b','tools':'#ffaddb','remote':'#9eafff','vault':'#91edbd','edr':'#f3dc78'}
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
            page.evaluate('lockApplication()');ready(page);unlock(page);open_security(page);open_security_tool(page,'edr');expect(page.locator('#edrPostDetail')).to_be_visible();expect(page.locator('[data-section=chatbot]')).to_have_count(0);assert not chat_calls
            assert not errors,errors
            browser.contexts[0].unroute_all(behavior='ignoreErrors');browser.close();print('PASS: EDR native protection, confirmed block, acknowledgment, policy and command lifecycle, nine distinct section colours without EDR leakage, chatbot removed, no AI calls, mobile layout, lock and reload')
    finally:process.terminate();process.wait(timeout=5);server.shutdown()

if __name__=='__main__':run()
