"""Browser -> authenticated relay -> actual agent -> live web results on two devices."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json,os,subprocess
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
API='https://wolfguard-web-cantin.paledove36.chatgpt.site'
CODE='07942685'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
def ready(page):expect(page.locator('#keypad button').first).to_be_enabled(timeout=20000)
def unlock(page):
    ready(page);page.keyboard.type(CODE);expect(page.locator('#app')).to_be_visible(timeout=30000)
    page.wait_for_function('()=>!document.querySelector("#app").inert')
def navigate(page,kind):
    page.locator(f'.workspace-section-button[data-section=scan-{kind}]').click();page.wait_for_function('()=>!sectionTransition.active')

def run():
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    backend_process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
    backend='http://127.0.0.1:'+str(json.loads(backend_process.stdout.readline())['port'])
    server=ThreadingHTTPServer(('127.0.0.1',4178),partial(Quiet,directory=str(ROOT/'docs')));Thread(target=server.serve_forever,daemon=True).start()
    runner=None
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();a=browser.new_context(viewport={'width':1440,'height':1000});b=browser.new_context();errors=[]
            for context in [a,b]:
                context.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+'?'+urlsplit(route.request.url).query)))
            first=a.new_page();first.on('pageerror',lambda error:errors.append(str(error)))
            first.goto('http://127.0.0.1:4178/?sync-test');ready(first)
            first.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            first.goto('http://127.0.0.1:4178/?sync-test&agent-test#activate='+('b'*64));unlock(first)
            navigate(first,'passive');first.locator('#wgAgentSetup').click();first.locator('#wgAgentPair').click()
            expect(first.locator('#wgAgentPairCode code')).to_have_text(__import__('re').compile(r'^[a-f0-9]{32}$'))
            code=first.locator('#wgAgentPairCode code').inner_text()
            with first.expect_download() as download:first.locator('.wgscan-agent-download').click()
            assert download.value.suggested_filename=='WolfGuard-Agent-Windows.zip'
            runner=subprocess.Popen([str(node),str(ROOT/'tests/agent-runner.mjs')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
            runner.stdin.write(json.dumps({'backend':backend,'code':code}));runner.stdin.close();assert runner.stdout.readline().strip()=='ready'
            first.locator('#wgAgentCloseSetup').click();expect(first.locator('#wgAgentLaunch')).to_be_enabled(timeout=20000)
            first.locator('#wgAgentLaunch').click();expect(first.locator('#wgAgentProgress span')).to_contain_text('Scan terminé',timeout=30000)
            expect(first.locator('#wgScanReportStamp')).to_contain_text('Agent Windows')
            first.locator('[data-wg-tab=rows]').click();expect(first.locator('#wgScanRows tbody tr')).to_have_count(2)
            expect(first.locator('#wgScanRows tbody')).to_contain_text('192.168.10.1')
            print('PASS: association unique depuis le web, vrai agent independant, collecte automatique et resultat sans import')
            navigate(first,'active');first.locator('#scanTarget').fill('127.0.0.1');first.locator('[data-wg-profile=custom]').click();first.locator('#wgScanPorts').fill('4178')
            expect(first.locator('#wgAgentLaunch')).to_be_enabled(timeout=15000);first.locator('#wgAgentLaunch').click()
            expect(first.locator('#wgAgentProgress span')).to_contain_text('Scan terminé',timeout=30000)
            first.locator('[data-wg-tab=rows]').click();expect(first.locator('#wgScanRows tbody')).to_contain_text('Ouvert')
            expect(first.locator('#wgScanRows tbody')).to_contain_text('4178')
            first.screenshot(path=str(ROOT/'.cache/agent-active-desktop.png'),full_page=True)
            second=b.new_page();second.on('pageerror',lambda error:errors.append(str(error)));second.goto('http://127.0.0.1:4178/?sync-test');unlock(second);navigate(second,'active')
            expect(second.locator('#wgScanReportStamp')).to_contain_text('Agent Windows',timeout=20000)
            second.locator('[data-wg-tab=rows]').click();expect(second.locator('#wgScanRows tbody')).to_contain_text('4178')
            print('PASS: sonde TCP reelle en boucle locale, progression puis resultat identique sur un second navigateur avec le code')
            second.set_viewport_size({'width':390,'height':844});assert second.evaluate('document.documentElement.scrollWidth<=innerWidth')
            second.screenshot(path=str(ROOT/'.cache/agent-active-mobile.png'),full_page=True)
            first.locator('#wgAgentSetup').click();expect(first.locator('[data-agent-revoke]')).to_have_count(1)
            first.locator('[data-agent-revoke]').click();first.locator('.app-dialog-submit').click()
            expect(first.locator('#wgAgentManage')).to_contain_text('Aucun agent',timeout=20000)
            runner.wait(timeout=15000);assert runner.returncode==1
            assert not errors,errors
            print('PASS: poste revocable depuis le web, acces de l agent immediatement refuse et interface mobile sans debordement')
            browser.close()
    finally:
        if runner and runner.poll() is None:runner.terminate();runner.wait(timeout=10)
        backend_process.terminate();backend_process.wait(timeout=10);server.shutdown();server.server_close()

if __name__=='__main__':run()
