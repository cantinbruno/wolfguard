"""Real authenticated relay and legacy agent protocol; synthetic install, headless UI."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json,os,subprocess
from playwright.sync_api import sync_playwright,expect
from session_resume_test import Quiet,ready,seed,unlocked,CODE,API
from site_fixture import open_security

ROOT=Path(__file__).resolve().parents[1]

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    backend_process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin})
    backend='http://127.0.0.1:'+str(json.loads(backend_process.stdout.readline())['port']);runners=[]
    release=json.loads((ROOT/'docs/downloads/agent-release.json').read_text())
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1000});errors=[]
            context.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+'?'+urlsplit(route.request.url).query)))
            page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(origin+'/');ready(page);seed(page)
            page.goto(origin+'/?sync-test#activate='+('b'*64));ready(page);page.keyboard.type(CODE);unlocked(page)
            agents=[]
            for fail,name in [(False,'Ancien agent'),(True,'Agent empreinte refusee')]:
                ticket=page.evaluate("async()=>await WolfGuardCloud.agentRequest('agents/pair',{})")
                runner=subprocess.Popen([str(node),str(ROOT/'tests/agent-update-runner.mjs')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
                runner.stdin.write(json.dumps({'backend':backend,'code':ticket['code'],'name':name,'fail':fail,'version':release['version'],'hash':release['files']['WolfGuard-Agent-Windows.exe']}));runner.stdin.close()
                agents.append(json.loads(runner.stdout.readline())['id']);runners.append(runner)
            page.evaluate("""()=>{window.__updateAccess=WolfGuardAccess;window.WolfGuardAccess={...WolfGuardAccess,can:right=>right==='agents.write'?false:window.__updateAccess.can(right)}}""")
            open_security(page)
            expect(page.locator('[data-fleet-agent]')).to_have_count(2,timeout=15000)
            success,failure=agents
            button=page.locator('[data-agent-install-update="'+success+'"]')
            expect(button).to_be_disabled()
            page.evaluate('async()=>{window.WolfGuardAccess=window.__updateAccess;await agentsWorkspace.render()}')
            # Refreshing the inventory automatically upgrades both eligible old agents.
            # No install button is clicked; the runner never executes an installer.
            page.locator('#agentsRefresh').click()
            expect(page.locator('#agentActions')).to_have_count(0)
            status=page.locator('[data-agent-update-status="'+success+'"]');expect(status).to_have_attribute('data-state','completed',timeout=30000)
            expect(button).to_have_text('À jour',timeout=10000)
            expect(page.locator('[data-agent-row="'+success+'"] code')).to_have_text(release['version'][:8])
            # Return to the screen: only the version reported by this same agent confirms success.
            page.locator('.workspace-section-button[data-section="library"]').click()
            page.wait_for_function('()=>!sectionTransition.active');open_security(page)
            expect(page.locator('[data-agent-install-update="'+success+'"]')).to_be_disabled()
            failed=page.locator('[data-agent-update-status="'+failure+'"]');expect(failed).to_have_attribute('data-state','failed',timeout=15000);expect(failed).to_contain_text('Empreinte')
            current=page.evaluate("async()=>await WolfGuardCloud.agentRequest('agents')")['agents']
            assert next(item for item in current if item['id']==failure)['version']=='0'*64
            assert next(item for item in current if item['id']==success)['version']==release['version']
            for width in [320,390,1440]:
                page.set_viewport_size({'width':width,'height':1000})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert not errors,errors
            browser.close()
            print('PASS: automatic legacy upgrades without install clicks, real encrypted relay, same association, confirmed version, checksum failure, permissions and mobile UI; no installer executed')
    finally:
        for runner in runners:runner.terminate();runner.wait(timeout=5)
        backend_process.terminate();backend_process.wait(timeout=5);server.shutdown();server.server_close()

if __name__=='__main__':run()
