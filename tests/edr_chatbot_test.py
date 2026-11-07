"""Real EDR relay and standalone browser chat: lifecycle, mobile and lock cleanup."""
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
            context.route('**/js/ai/worker.js*',lambda route:route.fulfill(content_type='text/javascript',body="self.onmessage=({data})=>setTimeout(()=>self.postMessage({id:data.id,type:'complete',content:'Réponse intégrée <script>window.injected=true</script>',device:'wasm'}),500);"))
            chat_calls=[];context.on('request',lambda request:chat_calls.append(request.url) if '/api/ai' in request.url else None)
            page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto('http://127.0.0.1:4178/?sync-test');ready(page)
            page.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            page.goto('http://127.0.0.1:4178/?sync-test&edr-test#activate='+('b'*64));unlock(page)
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            ticket=page.evaluate("async()=>await WolfGuardCloud.agentRequest('agents/pair',{})")
            enrolled=agent_api('enroll',{'code':ticket['code'],'name':'Poste EDR test','platform':'win32'},'')
            agent_api('poll',{'capabilities':['ai-chat-v1','security-audit-v1']},enrolled['token'])
            page.locator('[data-section=edr]').click();expect(page.locator('#edrPosts')).to_contain_text('Poste EDR test');expect(page.locator('#edrPosts')).to_contain_text('Aucun audit disponible')
            with page.expect_response(lambda response:urlsplit(response.url).path=='/api/scans' and response.request.method=='POST') as created:
                page.locator('[data-edr-audit]').click()
            assert created.value.status==201;created.value.finished()
            job=agent_api('poll',{'capabilities':['ai-chat-v1','security-audit-v1']},enrolled['token'])['job']
            assert job['spec']['workspace']=='vulnerability'
            agent_api('update',{'id':job['id'],'lease':job['lease'],'revision':job['revision']+1,'status':'completed','completed':2,'total':2,'report':{'strategy':'passive','workspace':'vulnerability','results':[{'transport':'AUDIT','checkId':'firewall','title':'Pare-feu désactivé','status':'issue','severity':'high','detail':'Enabled = false','recommendation':'Vérifier la politique du pare-feu.'},{'transport':'AUDIT','checkId':'updates','title':'Mises à jour','status':'notchecked','detail':'Lecture indisponible.'}]}},enrolled['token'])
            expect(page.locator('#edrRefresh')).to_be_enabled();page.locator('#edrRefresh').click();expect(page.locator('#edrPosts')).to_contain_text('1 alerte(s) relevée(s)');expect(page.locator('#edrPosts')).to_contain_text('1 non vérifiés')
            page.locator('summary').filter(has_text='Pare-feu désactivé').click();expect(page.get_by_text('Enabled = false',exact=True)).to_be_visible()
            # A new queued audit must keep the last known alert visible.
            with page.expect_response(lambda response:urlsplit(response.url).path=='/api/scans' and response.request.method=='POST') as retry:
                page.locator('[data-edr-audit]').click()
            pending=retry.value.json();expect(page.locator('#edrPosts')).to_contain_text('Audit en cours');expect(page.locator('#edrMetrics article').filter(has_text='Alertes relevées').locator('strong')).to_have_text('1')
            page.evaluate("async id=>await WolfGuardCloud.agentRequest('scans/cancel',{id})",pending['id'])
            page.locator('[data-section=chatbot]').click();expect(page.locator('#aiSend')).to_be_enabled();page.wait_for_function('()=>!sectionTransition.active');page.locator('#aiPrompt').fill('Question test');expect(page.locator('#aiPrompt')).to_have_value('Question test')
            page.locator('#aiSend').click();expect(page.locator('#aiStop')).to_be_visible()
            expect(page.locator('.ai-message[data-role=assistant]')).to_contain_text('Réponse intégrée');assert not page.evaluate('window.injected===true');assert not chat_calls
            page.locator('#aiPrompt').fill('À annuler');page.locator('#aiSend').click();expect(page.locator('#aiStop')).to_be_visible();page.locator('#aiStop').click();expect(page.locator('#aiSend')).to_be_enabled(timeout=10000);expect(page.locator('#aiPrompt')).to_have_value('À annuler')
            for section in ['edr','chatbot']:
                page.locator('[data-section='+section+']').click();page.set_viewport_size({'width':390,'height':844});page.wait_for_function('()=>!sectionTransition.active');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(ROOT/'.cache'/(section+'-mobile.png')));page.set_viewport_size({'width':1440,'height':1000})
            page.evaluate('lockApplication()');ready(page);unlock(page);page.locator('[data-section=chatbot]').click();expect(page.locator('.ai-message')).to_have_count(0)
            assert not errors,errors
            browser.close();print('PASS: EDR real audit and alert proof, standalone browser chat, escaped replies, cancellation, mobile layout, lock clears conversation')
    finally:process.terminate();process.wait(timeout=5);server.shutdown()

if __name__=='__main__':run()
