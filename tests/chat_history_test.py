"""Two real accounts: private history, reload, admin purge and stale generation."""
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
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],env={**os.environ,'WG_TEST_ORIGIN':origin},stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();errors=[]
            def context():
                c=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                c.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+('?' +urlsplit(route.request.url).query if urlsplit(route.request.url).query else ''))))
                c.route('**/js/ai/worker.js*',lambda route:route.fulfill(content_type='text/javascript',body="self.onmessage=({data})=>setTimeout(()=>self.postMessage({id:data.id,type:data.type==='load'?'ready':'complete',content:'Réponse personnelle '+(data.messages?.at(-1)?.content||''),device:'wasm'}),data.type==='load'?30:data.messages.at(-1).content.includes('obsolète')?5000:600);"))
                return c
            owner=context().new_page();owner.on('pageerror',lambda error:errors.append(str(error)))
            owner.goto(origin+'/?sync-test');ready(owner)
            owner.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            owner.goto(origin+'/?sync-test&chat-test#activate='+('b'*64));unlock(owner)
            added=owner.evaluate("async()=>WolfGuardCloud.agentRequest('users/create',{username:'chat-user@example.test'})")
            with urlopen(Request(backend+'/api/account/complete',data=json.dumps({'ticket':added['invitation']['ticket'],'username':'chat-user@example.test','code':'12345678'}).encode(),headers={'Origin':origin,'Content-Type':'application/json'})) as response:assert response.status==200
            owner.evaluate("""async id=>{const policy=WolfGuardPermissions.profilePolicy('none');policy.grants=['ai.use'];await WolfGuardCloud.agentRequest('users/permissions',{id,revision:1,policy});}""",added['user']['id'])
            member=context().new_page();member.on('pageerror',lambda error:errors.append(str(error)));member.goto(origin+'/?sync-test');ready(member);member.locator('#lock').focus();member.keyboard.type('12345678');expect(member.locator('#app')).to_be_visible(timeout=20000)
            def chat(page):
                page.wait_for_function('()=>!document.querySelector("#app").inert')
                if page.evaluate('state.section')!='chatbot':page.locator('[data-section=chatbot]').click()
                try:expect(page.locator('#aiPrepare')).to_have_text('IA prête',timeout=15000)
                except Exception:
                    print('Browser errors:',errors,flush=True);raise
                page.wait_for_function('()=>!sectionTransition.active');expect(page.locator('#aiSend')).to_be_enabled()
                expect(page.locator('#aiMode')).to_have_count(0);assert len(page.workers)==1
            def send(page,text):
                page.locator('#aiPrompt').fill(text);page.locator('#aiSend').click();expect(page.locator('#aiStatus')).to_contain_text('Conversation enregistrée',timeout=15000)
            chat(owner);send(owner,'Question privée administrateur')
            chat(member);expect(member.locator('#aiPurge')).to_be_hidden();expect(member.locator('#aiHistoryList button')).to_have_count(0)
            send(member,'Question privée utilisateur');expect(member.locator('#aiHistoryList')).not_to_contain_text('administrateur')
            member.locator('#aiClear').click();expect(member.locator('.ai-message')).to_have_count(0);expect(member.locator('#aiHistoryList button')).to_have_count(1)
            member.locator('#aiHistoryList button').first.click();expect(member.locator('.ai-message-content').first).to_have_text('Question privée utilisateur')
            member.reload();expect(member.locator('#app')).to_be_visible(timeout=20000);chat(member);expect(member.locator('#aiHistoryList button')).to_have_count(1)
            member.locator('#aiHistoryList button').first.click();expect(member.locator('.ai-message-content').first).to_have_text('Question privée utilisateur')
            send(member,'Deuxième question');expect(member.locator('.ai-message')).to_have_count(4)
            # A pending local generation must not resurrect an admin-deleted history.
            member.locator('#aiPrompt').fill('Réponse devenue obsolète');member.locator('#aiSend').click();expect(member.locator('#aiStop')).to_be_visible()
            owner.locator('#aiPurge').click();expect(owner.locator('.app-dialog')).to_be_visible();owner.locator('.app-dialog-submit').click()
            expect(owner.locator('#aiStatus')).to_contain_text('Tous les historiques ont été supprimés');expect(owner.locator('#aiHistoryList button')).to_have_count(0)
            expect(member.locator('#aiHistoryList button')).to_have_count(0,timeout=20000);expect(member.locator('.ai-message')).to_have_count(0)
            assert member.evaluate('async()=>(await WolfGuardCloud.chatHistory()).conversations.length')==0
            expect(member.locator('#aiPrepare')).to_be_enabled();member.locator('#aiPrepare').click();expect(member.locator('#aiPrepare')).to_have_text('IA prête')
            send(member,'Après suppression');expect(member.locator('#aiHistoryList button')).to_have_count(1)
            for width in [1440,390,320]:
                member.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});assert member.evaluate('document.documentElement.scrollWidth<=innerWidth');member.screenshot(path=str(ROOT/f'.cache/chat-history-{width}.png'))
            member.locator('#aiDelete').click();member.locator('.app-dialog-submit').click();expect(member.locator('#aiHistoryList button')).to_have_count(0)
            assert not errors,errors
            browser.close();print('PASS: single automatically loaded model, private histories for two accounts, reload, continuation, individual deletion, admin purge, stale inference protection and mobile layout')
    finally:process.terminate();process.wait(timeout=10);server.shutdown();server.server_close()

if __name__=='__main__':run()
