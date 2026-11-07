"""Browser inference with no agent or relay; optional real public model download."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json,os,time
from playwright.sync_api import sync_playwright,expect
from session_resume_test import Quiet,ready,seed,CODE,unlocked

ROOT=Path(__file__).resolve().parents[1]

def run():
    real=os.environ.get('WG_TEST_REAL_BROWSER_AI')=='1'
    server=ThreadingHTTPServer(('127.0.0.1',4177),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            context=p.chromium.launch_persistent_context(str(ROOT/'.cache/browser-ai-profile') if real else '',headless=True,viewport={'width':1440,'height':1000},reduced_motion='reduce')
            # Exercise the CPU fallback used by browsers without WebGPU.
            context.add_init_script("Object.defineProperty(Navigator.prototype,'gpu',{get:()=>undefined,configurable:true})")
            calls=[];errors=[]
            context.on('request',lambda request:calls.append((request.method,request.url,request.post_data)))
            if not real:
                context.route('**/js/ai/worker.js*',lambda route:route.fulfill(content_type='text/javascript',body="""self.onmessage=({data})=>{self.postMessage({id:data.id,type:'generating'});setTimeout(()=>self.postMessage({id:data.id,type:data.type==='load'?'ready':'complete',content:'Réponse intégrée <script>window.injected=true</script>',device:'wasm'}),200);};"""))
            page=context.pages[0] if context.pages else context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto('http://127.0.0.1:4177/');ready(page)
            if page.locator('#app').is_hidden():
                if page.evaluate("async()=>!(await (await import('./browser/storage.js')).read())"):seed(page);page.reload();ready(page)
                page.locator('#lock').focus();page.keyboard.type(CODE);unlocked(page)
            else:page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.locator('[data-section=chatbot]').click();page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('#aiAgent,#aiModel,#aiAgents')).to_have_count(0);expect(page.locator('#aiSend')).to_be_enabled()
            if not real:
                page.locator('#aiPrepare').click();expect(page.locator('#aiPrepare')).to_have_text('IA prête');expect(page.locator('#aiStatus')).to_contain_text('IA prête')
            page.locator('#aiPrompt').fill('Réponds en une phrase : à quoi sert le DNS ?');started=time.monotonic();page.locator('#aiSend').click()
            if real:
                for _ in range(180):
                    if page.locator('#aiSend').is_enabled():break
                    page.wait_for_timeout(2000)
                    if int(time.monotonic()-started)%20<2:print(page.locator('#aiStatus').inner_text(),page.locator('#aiDownloadLabel').inner_text(),flush=True)
            expect(page.locator('.ai-message[data-role=assistant]')).to_be_visible(timeout=20000)
            answer=page.locator('.ai-message[data-role=assistant] .ai-message-content').inner_text();assert len(answer)>10
            assert not page.evaluate('window.injected===true')
            assert not [url for _,url,_ in calls if '/api/agents' in url or '/api/ai' in url]
            assert not [body for method,_,body in calls if method=='POST' and body and 'à quoi sert le DNS' in body]
            if real:
                assert ('dns' in answer.lower() or 'domaine' in answer.lower()) and ('adresse' in answer.lower() or 'ip' in answer.lower()),answer
                print(json.dumps({'realBrowserAnswer':answer,'seconds':round(time.monotonic()-started,1)}),flush=True)
                # With the model warm, inference must work with all remote downloads blocked.
                context.route('https://**',lambda route:route.abort())
                page.locator('#aiClear').click();page.locator('#aiPrompt').fill('Réponds en français : combien font deux plus deux ?');page.locator('#aiSend').click()
                expect(page.locator('.ai-message[data-role=assistant]')).to_be_visible(timeout=90000)
            page.locator('#aiPrompt').fill('Une autre question');page.locator('#aiSend').click();expect(page.locator('#aiStop')).to_be_visible();page.locator('#aiStop').click();expect(page.locator('#aiSend')).to_be_enabled(timeout=10000)
            for width in [390,320]:
                page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.screenshot(path=str(ROOT/'.cache/browser-ai-mobile.png'))
            page.evaluate('lockApplication()');ready(page);page.locator('#lock').focus();page.keyboard.type(CODE);unlocked(page);page.locator('[data-section=chatbot]').click();page.wait_for_function('()=>!sectionTransition.active');expect(page.locator('.ai-message')).to_have_count(0)
            assert page.evaluate('WolfGuardBrowserAI.ready===false')
            for _ in range(20):
                if not page.workers:break
                page.wait_for_timeout(100)
            assert not page.workers,'Model workers must stop on lock'
            if real:
                page.locator('#aiPrepare').click();expect(page.locator('#aiPrepare')).to_have_text('IA prête',timeout=90000)
                assert not [url for _,url,_ in calls if '/api/agents' in url or '/api/ai' in url]
            assert not errors,errors
            context.close();print('PASS: chatbot without any agent or AI relay, escaped replies, cancellation, 320px layout and worker cleanup on lock'+(' (real WASM inference)' if real else ''))
    finally:server.shutdown();server.server_close()

if __name__=='__main__':run()
