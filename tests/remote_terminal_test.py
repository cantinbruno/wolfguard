"""Headless terminal UI: mode, streaming, cancellation, escaping and lifecycle."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json,os,subprocess,time
from playwright.sync_api import sync_playwright,expect
from scan_workspace_test import Quiet

ROOT=Path(__file__).resolve().parents[1]
API='https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    agent={'id':'a'*32,'name':'Poste terminal','platform':'win32','online':True,'capabilities':['remote-desktop-v1','remote-terminal-v1']}
    control={'status':'requested','commands':[],'id':'1'*32,'sequence':0};started=[];stopped=[];cancelled=[]
    def route_api(route):
        path=urlsplit(route.request.url).path
        if path=='/api/agents':route.fulfill(json={'agents':[agent]});return
        if path=='/api/remote/start':started.append(route.request.post_data_json);route.fulfill(status=201,json={'id':control['id'],'status':'requested','expiresAt':int(time.time()*1000)+1200000});return
        if path=='/api/remote/session':route.fulfill(json={**control,'mode':'terminal','info':{'shell':'PowerShell','cwd':'C:\\Synthetic'},'message':''});return
        if path=='/api/remote/terminal/command':
            value=route.request.post_data_json;control['sequence']=value['seq'];control['commands'].append({'seq':value['seq'],'command':value['command'],'status':'running','stdout':'','stderr':'','exitCode':None,'revision':1});route.fulfill(status=201,json={'accepted':True});return
        if path=='/api/remote/terminal/cancel':cancelled.append(route.request.post_data_json);control['commands'][-1].update(status='cancelled',revision=3);route.fulfill(json={'ok':True});return
        if path=='/api/remote/stop':stopped.append(route.request.post_data_json);route.fulfill(json={'ok':True});return
        route.fallback()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            context.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+'?'+urlsplit(route.request.url).query)))
            context.route(API+'/api/agents',route_api);context.route(API+'/api/remote/**',route_api)
            page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(origin+'/?sync-test');expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async id=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const result=await c.create({version:2,items:[],folders:[],settings:[{key:'scanAgentId',value:id}],activity:[]},'07942685');await s.write(result.envelope,0)}""",agent['id'])
            page.goto(origin+'/?sync-test&terminal-test#activate='+('b'*64));expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.keyboard.type('07942685');expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            def navigate(section):page.locator(f'.workspace-section-button[data-section={section}]').click();page.wait_for_function('()=>!sectionTransition.active')
            navigate('remote');expect(page.locator('#wgRemoteAgent')).to_contain_text('Poste terminal',timeout=15000)
            page.locator('#wgRemoteModeTerminal').click();expect(page.locator('#wgRemoteHint')).to_contain_text('PowerShell')
            page.locator('#wgRemoteConnect').click();expect(page.locator('#wgRemoteTerminal')).to_be_visible();expect(page.locator('#wgTerminalCommand')).to_be_disabled()
            assert started==[{'agentId':agent['id'],'mode':'terminal'}]
            expect(page.locator('#wgRemoteModeDesktop')).to_be_disabled();expect(page.locator('#wgRemoteViewport')).to_be_hidden();expect(page.locator('#wgRemoteTextForm')).to_be_hidden()
            control['status']='active';expect(page.locator('#wgTerminalCommand')).to_be_enabled(timeout=10000)
            page.locator('#wgTerminalCommand').fill('Write-Output "<img src=x onerror=alert(1)>"');page.locator('#wgTerminalCommand').press('Enter')
            expect(page.locator('#wgTerminalCommand')).to_be_disabled();expect(page.locator('#wgTerminalCancel')).to_be_enabled()
            control['commands'][0].update(stdout='<script>window.terminalInjection=true</script>\nRésultat reçu é ✓',revision=2)
            expect(page.locator('#wgTerminalOutput')).to_contain_text('Résultat reçu é ✓',timeout=10000)
            assert page.locator('#wgTerminalOutput script,#wgTerminalOutput img').count()==0
            assert page.evaluate('window.terminalInjection===undefined')
            for width in [1440,390,320]:
                page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                page.screenshot(path=str(ROOT/f'.cache/remote-terminal-{width}.png'),animations='disabled')
            page.locator('#wgTerminalCancel').click();expect(page.locator('#wgTerminalCommand')).to_be_enabled(timeout=10000)
            assert cancelled==[{'id':control['id'],'seq':1}]
            page.locator('#wgTerminalCommand').press('ArrowUp');expect(page.locator('#wgTerminalCommand')).to_have_value(control['commands'][0]['command'])
            page.locator('#wgRemoteDisconnect').click();expect(page.locator('#wgRemoteSession')).to_be_hidden();assert len(stopped)==1
            agent['capabilities']=['remote-desktop-v1'];page.locator('#wgRemoteModeDesktop').click();expect(page.locator('#wgRemoteConnect')).to_be_enabled()
            page.locator('#wgRemoteModeTerminal').click();expect(page.locator('#wgRemoteConnect')).to_be_disabled();expect(page.locator('#wgRemoteHint')).to_contain_text('nouvel agent')
            agent['capabilities'].append('remote-terminal-v1');page.locator('#wgRemoteModeDesktop').click();page.locator('#wgRemoteModeTerminal').click();expect(page.locator('#wgRemoteConnect')).to_be_enabled()
            control['status']='requested';control['commands']=[];control['sequence']=0;page.locator('#wgRemoteConnect').click();expect(page.locator('#wgRemoteSession')).to_be_visible();navigate('library');page.wait_for_timeout(500);assert len(stopped)==2
            assert not errors,errors
            browser.close()
    finally:process.terminate();process.wait(timeout=10);server.shutdown();server.server_close()
    print('PASS: headless terminal modes, output streaming, HTML escaping, cancel, history, mobile layouts, old agents and section teardown')

if __name__=='__main__':run()
