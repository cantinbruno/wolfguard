"""Real server SSE through a same-origin test proxy, no external AI calls."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from urllib.request import Request,urlopen
from urllib.error import HTTPError
import json,os,subprocess
from playwright.sync_api import sync_playwright,expect
from shared_workspace_test import Quiet,ready,unlock,API

ROOT=Path(__file__).resolve().parents[1]

class Proxy(Quiet):
    backend=''
    def do_POST(self):
        assert self.path=='/api/chat/completions'
        data=self.rfile.read(int(self.headers['Content-Length']))
        try:response=urlopen(Request(self.backend+self.path,data=data,headers={'Origin':self.headers.get('Origin',''),'Authorization':self.headers['Authorization'],'Content-Type':'application/json'}))
        except HTTPError as error:response=error
        self.send_response(response.status);self.send_header('Content-Type',response.headers['Content-Type']);self.end_headers()
        try:
            with response:
                while True:
                    chunk=response.read1(512)
                    if not chunk:break
                    self.wfile.write(chunk);self.wfile.flush()
        except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Proxy,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],env={**os.environ,'WG_TEST_ORIGIN':origin,'WG_TEST_CHAT_API':'1'},stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
    Proxy.backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');errors=[];calls=[]
            context.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=Proxy.backend+urlsplit(route.request.url).path+('?' +urlsplit(route.request.url).query if urlsplit(route.request.url).query else ''))))
            context.add_init_script("""const originalFetch=window.fetch;window.fetch=(input,options)=>originalFetch(typeof input==='string'&&input.endsWith('/api/chat/completions')?location.origin+'/api/chat/completions':input,options);""")
            context.on('request',lambda request:calls.append(request.url))
            page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(origin+'/?sync-test');ready(page)
            page.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            page.goto(origin+'/?sync-test&api-chat#activate='+('b'*64));unlock(page)
            page.locator('[data-section=chatbot]').click();page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('#aiConfig')).to_be_visible();expect(page.locator('#aiSend')).to_be_disabled()
            expect(page.locator('#aiPrepare,#aiDownload,#aiModel,#aiAgent')).to_have_count(0)
            page.locator('#aiApiKey').fill('gsk_invalid_fixture_key_123456789');page.locator('#aiConfigSave').click();expect(page.locator('#aiConfigStatus')).to_contain_text('refusée');expect(page.locator('#aiSend')).to_be_disabled()
            page.locator('#aiApiKey').fill('gsk_test_fixture_key_not_real_12345');page.locator('#aiConfigSave').click();expect(page.locator('#aiConfigStatus')).to_contain_text('Connexion vérifiée');expect(page.locator('#aiApiKey')).to_have_value('');expect(page.locator('#aiSend')).to_be_enabled()
            page.evaluate("""()=>{window.streamObservations=[];new MutationObserver(()=>{const answer=document.querySelector('[data-streaming] .ai-message-content');if(answer)streamObservations.push({text:answer.textContent,running:!document.querySelector('#aiStop').hidden});}).observe(document.querySelector('#aiMessages'),{subtree:true,childList:true,characterData:true});}""")
            page.locator('#aiPrompt').fill('Explique le DNS');page.locator('#aiSend').click()
            expect(page.locator('#aiStatus')).to_contain_text('Conversation enregistrée',timeout=15000)
            assert page.evaluate("streamObservations.some(item=>item.running&&item.text==='Réponse pers')"),page.evaluate('streamObservations')
            assert not page.evaluate('window.injected===true');assert not page.workers
            page.locator('#aiClear').click();page.locator('#aiPrompt').fill('À annuler');page.locator('#aiSend').click();expect(page.locator('#aiStop')).to_be_visible();page.locator('#aiStop').click();expect(page.locator('#aiSend')).to_be_enabled();expect(page.locator('#aiPrompt')).to_have_value('À annuler')
            # Let the fixture observe the cancelled upstream before another request.
            page.wait_for_timeout(3500)
            page.locator('#aiPrompt').fill('QUOTA');page.locator('#aiSend').click();expect(page.locator('#aiStatus')).to_contain_text('quota');expect(page.locator('#aiPrompt')).to_have_value('QUOTA');expect(page.locator('#aiSend')).to_be_enabled()
            for width in [1440,390,320]:
                page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(ROOT/f'.cache/api-chat-{width}.png'))
            assert not [url for url in calls if '/api/ai' in url or '/api/agents' in url or 'huggingface' in url or 'wllama' in url or '/js/ai/worker' in url]
            page.evaluate('lockApplication()');ready(page);assert not page.workers
            assert not errors,errors
            browser.close();print('PASS: real API streaming before completion, encrypted admin configuration, rejected key, quota, cancellation, escaped replies, no agent/model downloads, mobile 320px')
    finally:process.terminate();process.wait(timeout=10);server.shutdown();server.server_close()

if __name__=='__main__':run()
