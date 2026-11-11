"""Browser desktop sessions use the configured agent and explicit consent states."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from io import BytesIO
import base64,json,os,subprocess,time
from PIL import Image,ImageDraw
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
    pixels=Image.new('RGB',(800,480),'#152638');ImageDraw.Draw(pixels).text((30,30),'Bureau distant - fixture de test',fill='white')
    encoded=BytesIO();pixels.save(encoded,format='JPEG');frame={'width':800,'height':480,'jpeg':base64.b64encode(encoded.getvalue()).decode()}
    agent={'id':'a'*32,'name':'Poste de test','platform':'win32','online':True,'capabilities':['remote-desktop-v1']}
    control={'status':'requested','id':'','revision':1,'message':'','outage':False};started=[];stopped=[];inputs=[]
    def route_api(route):
        path=urlsplit(route.request.url).path
        if path=='/api/agents':
            if control['outage']:route.fulfill(status=503,json={'error':'Relais indisponible'});return
            route.fulfill(json={'agents':[agent]});return
        if path=='/api/remote/start':
            started.append(route.request.post_data_json);control['id']=f'{len(started):032x}'
            route.fulfill(status=201,json={'id':control['id'],'status':'requested','expiresAt':int(time.time()*1000)+1200000});return
        if path=='/api/remote/session':
            if control['outage']:route.fulfill(status=503,json={'error':'Relais indisponible'});return
            route.fulfill(json={'id':control['id'],'status':control['status'],'revision':control['revision'],'frame':frame if control['status']=='active' else None,'message':control['message']});return
        if path=='/api/remote/input':inputs.extend(route.request.post_data_json['events']);route.fulfill(json={'ok':True});return
        if path=='/api/remote/stop':stopped.append(route.request.post_data_json);route.fulfill(json={'ok':True});return
        route.fallback()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            context.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+'?'+urlsplit(route.request.url).query)))
            context.route(API+'/api/agents',route_api);context.route(API+'/api/remote/**',route_api)
            page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(origin+'/?sync-test');expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async id=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const result=await c.create({version:2,items:[],folders:[],settings:[{key:'scanAgentId',value:id}],activity:[]},'07942685');await s.write(result.envelope,0)}""",agent['id'])
            page.goto(origin+'/?sync-test&remote-test#activate='+('b'*64));expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.keyboard.type('07942685');expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            def navigate(section):
                page.locator(f'.workspace-section-button[data-section={section}]').click();page.wait_for_function('()=>!sectionTransition.active')
            navigate('remote');expect(page.locator('#wgRemoteAgent')).to_contain_text('Poste de test',timeout=15000)
            expect(page.locator('#wgRemoteConnect')).to_be_enabled()
            expect(page.locator('#wgAgentSelect')).to_have_count(0);expect(page.locator('#wgRemoteSession')).to_be_hidden()
            for width in [1440,390,320]:
                page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                page.screenshot(path=str(ROOT/f'.cache/remote-ready-{width}.png'),animations='disabled')
            page.set_viewport_size({'width':1440,'height':1000})
            page.locator('#wgRemoteConnect').click();expect(page.locator('#wgRemoteSession')).to_be_visible()
            assert started==[{'agentId':agent['id']}];expect(page.locator('#wgRemoteCanvas')).to_be_hidden();assert inputs==[]
            expect(page.locator('#wgRemoteWaiting')).to_contain_text('Connexion au poste')
            control['status']='preparing';expect(page.locator('#wgRemoteSessionState')).to_contain_text('Préparation',timeout=10000)
            expect(page.locator('#wgRemoteCanvas')).to_be_hidden();control['status']='active'
            expect(page.locator('#wgRemoteCanvas')).to_be_visible(timeout=10000)
            expect(page.locator('#wgRemoteStatus')).to_contain_text('Connexion établie')
            page.evaluate("""async()=>{const c=await import('./browser/crypto.js'),snapshot=await WolfGuardCloud.load(),identity=await WolfGuardCloud.me(true),material=await c.importWorkspaceMaterial(identity.workspace),opened=await c.openWithKey(snapshot,material.key,material.salt);opened.payload.items.push({id:'multiuser-remote-note',type:'memo',title:'Autre personne',content:'Test partagé'});await WolfGuardCloud.save(await c.seal(opened.payload,opened.key,opened.salt,snapshot.revision+1));await webWorkspace.refreshShared();}""")
            expect(page.locator('#wgRemoteCanvas')).to_be_visible();assert stopped==[]
            page.locator('#wgRemoteCanvas').click(position={'x':100,'y':80});page.keyboard.type('abc');page.keyboard.press('Control+c')
            page.wait_for_timeout(300)
            assert any(value['type']=='button' and value['down'] for value in inputs),inputs
            assert any('a' in value.get('text','') for value in inputs),inputs
            assert any(value.get('key')=='KeyC' for value in inputs),inputs
            page.keyboard.down('Control')
            page.locator('#wgRemoteCanvas').dispatch_event('keydown',{'key':'z','code':'KeyW','ctrlKey':True})
            page.locator('#wgRemoteCanvas').dispatch_event('keyup',{'key':'z','code':'KeyW','ctrlKey':True})
            page.keyboard.up('Control');page.wait_for_timeout(200)
            assert any(value.get('key')=='KeyZ' for value in inputs),inputs
            assert not any(value.get('key')=='KeyW' for value in inputs),inputs

            before=len(inputs)
            page.evaluate('''()=>{const canvas=document.querySelector('#wgRemoteCanvas');window.remoteTyping=setInterval(()=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'x',code:'KeyX',bubbles:true})),5);}''')
            try:
                page.wait_for_timeout(140)
                assert any('x' in value.get('text','') for value in inputs[before:]),'Continuous typing must be sent before the typing stops'
            finally:page.evaluate('clearInterval(window.remoteTyping)')
            before=len(inputs)
            page.locator('#wgRemoteCanvas').click(button='right',position={'x':80,'y':60})
            page.wait_for_timeout(100)
            assert any(value.get('button')==2 and value.get('down') for value in inputs[before:]),inputs[before:]

            assert all(0<=value['x']<=1 and 0<=value['y']<=1 for value in inputs if value['type'] in ['move','button','wheel'])
            page.locator('#wgRemoteText').fill('Texte de test é\nseconde ligne');page.locator('#wgRemoteSendText').click();page.wait_for_timeout(200)
            assert any(value.get('text')=='Texte de test é\nseconde ligne' for value in inputs)
            page.locator('#wgRemoteControl').click();expect(page.locator('#wgRemoteText')).to_be_disabled()
            control['revision']+=1;page.wait_for_timeout(1000);expect(page.locator('#wgRemoteText')).to_be_disabled()
            page.locator('#wgRemoteControl').click();page.locator('#wgRemoteCanvas').focus();page.keyboard.press('Control+Alt+Escape')
            expect(page.locator('#wgRemoteDisconnect')).to_be_focused()
            page.locator('#wgRemoteFullscreen').click();page.wait_for_function('()=>!!document.fullscreenElement');page.evaluate('document.exitFullscreen()')
            for width in [1440,390,320]:
                page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                page.screenshot(path=str(ROOT/f'.cache/remote-active-{width}.png'),animations='disabled')
            page.evaluate('''()=>{document.querySelector('#wgRemoteCanvas').dispatchEvent(new KeyboardEvent('keydown',{key:'y',code:'KeyY',bubbles:true}));document.querySelector('#wgRemoteDisconnect').click();}''');expect(page.locator('#wgRemoteSession')).to_be_hidden()
            assert len(stopped)==1
            control.update(status='denied',message='La demande a été refusée sur le poste.')
            page.locator('#wgRemoteConnect').click();expect(page.locator('#wgRemoteStatus')).to_contain_text('refusée',timeout=10000)
            expect(page.locator('#wgRemoteSession')).to_be_hidden();expect(page.locator('#wgRemoteConnect')).to_be_enabled()
            control.update(status='active',message='',revision=2)
            page.locator('#wgRemoteConnect').click();expect(page.locator('#wgRemoteCanvas')).to_be_visible(timeout=10000)
            before_input=len(inputs);page.locator('#wgRemoteCanvas').focus();page.keyboard.type('r');page.wait_for_timeout(100)
            assert any('r' in value.get('text','') for value in inputs[before_input:]),'Reconnecting must restore input after a cancelled input timer'
            before=len(stopped);navigate('library');page.wait_for_timeout(300);assert len(stopped)==before+1
            navigate('remote');expect(page.locator('#wgRemoteSession')).to_be_hidden()
            for platform in ['linux','darwin','win32']:
                agent['platform']=platform;page.wait_for_timeout(3600)
                expect(page.locator('#wgRemoteAgent')).to_contain_text({'linux':'Linux','darwin':'macOS','win32':'Windows'}[platform])
            agent['capabilities']=[];page.wait_for_timeout(3600);expect(page.locator('#wgRemoteConnect')).to_be_disabled()
            expect(page.locator('#wgRemoteHint')).to_contain_text('Mets à jour')
            agent['capabilities']=['remote-desktop-v1'];page.wait_for_timeout(3600)
            page.locator('#wgRemoteConnect').click();expect(page.locator('#wgRemoteCanvas')).to_be_visible(timeout=10000)
            control['outage']=True;expect(page.locator('#wgRemoteSession')).to_be_hidden(timeout=15000)
            expect(page.locator('#wgRemoteStatus')).to_contain_text('interrompue')
            control['outage']=False
            page.locator('#wgRemoteConnect').click();expect(page.locator('#wgRemoteCanvas')).to_be_visible(timeout=10000)
            before=len(stopped);page.evaluate('lockApplication()');expect(page.locator('#keypad')).to_be_visible(timeout=10000)
            page.wait_for_timeout(200);assert len(stopped)==before+1
            assert not errors,errors
            browser.close()
            print('PASS: explicit consent states, configured agent, desktop frames, normalized mouse, keyboard and text, read-only mode, keyboard escape, fullscreen, refusal, navigation cleanup, outage handling and 320px layout')
    finally:
        server.shutdown();server.server_close();process.terminate();process.wait(timeout=10)

if __name__=='__main__':run()
