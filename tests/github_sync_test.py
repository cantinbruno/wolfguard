"""Two independent browser devices sharing a simulated private GitHub repository."""
import base64
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
CODE='07942685'
TOKEN='_'.join(['github','pat','fixture'])+'A'*40
BASE='https://api.github.com/repos/cantinbruno/wolfguard-data'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def unlocked(page):
    expect(page.locator('#keypad')).to_be_visible()
    expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
    page.keyboard.type(CODE)
    expect(page.locator('#app')).to_be_visible(timeout=20000)
    page.wait_for_function("()=>!document.querySelector('#app').inert")
def settings(page):
    page.locator('#settingsBtn').click()
    page.locator('[data-settings-tab=data]').click()
def note(page):return page.evaluate("async()=>(await get('items','memo')).content")

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/'
    state={'file':None,'sha':'a'*40,'serial':1,'offline':False,'private':True,'puts':0,'requests':[],'drop_ack':False}
    def handler(route,device):
        request=route.request
        assert request.url.startswith(BASE),request.url
        assert request.headers.get('authorization')=='Bearer '+TOKEN
        state['requests'].append((request.method,request.url,request.post_data or ''))
        if state['offline'] and device=='B':return route.abort('internetdisconnected')
        def answer(value,status=200):route.fulfill(status=status,content_type='application/json',body=json.dumps(value))
        if request.url==BASE:return answer({'private':state['private'],'full_name':'cantinbruno/wolfguard-data'})
        if '/contents/?' in request.url:return answer({'entries':[{'type':'file','name':'README.md'}]})
        if request.method=='PUT':
            body=request.post_data_json
            if (state['file'] and body.get('sha')!=state['sha']) or (not state['file'] and body.get('sha')):return answer({},409)
            state['file']=json.loads(base64.b64decode(body['content']))
            state['serial']+=1;state['sha']=f"{state['serial']:040x}";state['puts']+=1
            if state['drop_ack']:
                state['drop_ack']=False
                return route.abort('failed')
            return answer({'content':{'sha':state['sha']}})
        if '/git/blobs/' in request.url:return answer(state['file'])
        if not state['file']:return answer({},404)
        return answer({'type':'file','sha':state['sha'],'size':len(json.dumps(state['file'])),'encoding':'none','download_url':'https://untrusted.invalid/no'})
    try:
        with sync_playwright() as p:
            first=p.chromium.launch();second=p.chromium.launch()
            a_context=first.new_context();b_context=second.new_context()
            a_context.route('https://api.github.com/**',lambda route:handler(route,'A'))
            b_context.route('https://api.github.com/**',lambda route:handler(route,'B'))
            a=a_context.new_page();b=b_context.new_page();b.clock.install()
            errors=[]
            a.on('pageerror',lambda error:errors.append(str(error)));b.on('pageerror',lambda error:errors.append(str(error)))
            a.goto(url)
            expect(a.locator('#githubConnectForm')).to_be_visible()
            (ROOT/'.cache').mkdir(exist_ok=True)
            a.screenshot(path=str(ROOT/'.cache/github-connect-desktop.png'))
            a.set_viewport_size({'width':390,'height':844})
            assert a.evaluate('document.documentElement.scrollWidth<=innerWidth')
            a.screenshot(path=str(ROOT/'.cache/github-connect-mobile.png'))
            a.set_viewport_size({'width':1280,'height':900})
            a.locator('#githubAccess').fill(TOKEN)
            a.locator('#githubConnectForm button[type=submit]').click()
            expect(a.locator('.app-dialog')).to_contain_text('ne contient pas encore de coffre')
            a.locator('.app-dialog-cancel').click()
            expect(a.locator('#githubConnectError')).to_contain_text('appareil qui contient tes données')
            expect(a.locator('#keypad')).not_to_be_visible()
            assert state['puts']==0
            a.evaluate("""async code=>{
              const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const payload={version:2,items:[{id:'memo',type:'memo',title:'NOTE-PRIVEE-943',content:'Version initiale',unifiedDocument:true,commandBlocks:[],attachments:[],tags:[],folderId:null}],folders:[],settings:[],activity:[]};
              const result=await c.create(payload,code);
              payload.items.push({id:'vault',type:'vault',title:'ACCES-PRIVE-943',tags:[],vaultBlobEnc:await encryptBlobWithKey(JSON.stringify({username:'synthetic@example.invalid',password:'SECRET-PRIVE-943!',notes:'',custom:[]}),result.key)});
              await s.write(await c.seal(payload,result.key,result.salt,1),0);
            }""",CODE)
            a.reload();unlocked(a)
            settings(a);a.locator('#githubConnectBtn').click()
            a.locator('#githubAccess').fill(TOKEN)
            a.locator('#githubConnectForm button[type=submit]').click()
            expect(a.locator('#githubConnectForm')).to_have_count(0)
            expect(a.locator('#webSaveState')).to_contain_text('Synchronisé',timeout=15000)
            assert state['file'] and state['puts']>=1
            assert not any(secret in json.dumps(state['file']) for secret in ['NOTE-PRIVEE','ACCES-PRIVE','SECRET-PRIVE',TOKEN])
            print('PASS: connexion au depot prive et sauvegarde automatique de la copie existante, entierement chiffree')

            b.goto(url)
            expect(b.locator('#githubConnectForm')).to_be_visible()
            b.locator('#githubAccess').fill(TOKEN)
            b.locator('#githubConnectForm button[type=submit]').click()
            expect(b.locator('#keypad')).to_be_visible(timeout=15000)
            expect(b.locator('#lock .access-heading h2')).to_have_text('')
            unlocked(b)
            assert note(b)=='Version initiale'
            assert b.evaluate("async()=>(await vaultData(await get('items','vault'))).password")=='SECRET-PRIVE-943!'
            assert b.evaluate("async()=>{const d=await (await import('./browser/storage.js')).connect();return await new Promise(r=>{const t=d.transaction('encrypted','readonly'),q=t.objectStore('encrypted').getAll();t.oncomplete=()=>r(JSON.stringify(q.result))})}").find(TOKEN)==-1
            assert TOKEN not in b.evaluate('JSON.stringify({...localStorage,...sessionStorage})')
            print('PASS: deuxieme appareil, meme coffre et meme code sans nouvelle creation, aucune autorisation stockee en clair')

            state['drop_ack']=True
            a.evaluate("async()=>await updateItemRecord('memo',item=>{item.content='Envoi sans accuse';item.updatedAt=now()})")
            expect(a.locator('#webSaveState')).to_contain_text('inaccessible')
            puts_before=state['puts']
            settings(a);a.locator('#githubSyncNow').click()
            expect(a.locator('#githubSyncStatus')).to_contain_text('Synchronisé',timeout=15000)
            assert state['puts']==puts_before
            a.locator('#closeSettingsBtn').click()
            print('PASS: accuse de reception perdu puis confirmation de la copie deja presente, sans ecriture en double')
            a.evaluate("async()=>await updateItemRecord('memo',item=>{item.content='Version depuis A';item.updatedAt=now()})")
            b.clock.fast_forward(30100)
            expect(b.locator('#app')).not_to_be_visible(timeout=15000)
            unlocked(b)
            assert note(b)=='Version depuis A'
            recovery=b.evaluate("async()=>{const s=await import('./browser/storage.js'),c=await import('./browser/crypto.js');return (await c.open(await s.readRecovery(),'07942685')).payload.items.find(i=>i.id==='memo').content}")
            assert recovery=='Version initiale'
            print('PASS: mise a jour distante detectee automatiquement, ancien espace conserve en secours avant remplacement')

            state['offline']=True
            b.evaluate("async()=>await updateItemRecord('memo',item=>{item.content='Copie B hors ligne';item.updatedAt=now()})")
            assert note(b)=='Copie B hors ligne'
            a.evaluate("async()=>await updateItemRecord('memo',item=>{item.content='Copie A en ligne';item.updatedAt=now()})")
            remote_before=json.dumps(state['file']);puts_before=state['puts'];state['offline']=False
            settings(b);b.locator('#githubSyncNow').click()
            expect(b.locator('#githubSyncStatus')).to_contain_text('autre appareil',timeout=15000)
            assert json.dumps(state['file'])==remote_before and state['puts']==puts_before
            assert note(b)=='Copie B hors ligne'
            b.locator('#githubPublishLocal').click();b.locator('.app-dialog-submit').click()
            expect(b.locator('#githubSyncStatus')).to_contain_text('Synchronisé',timeout=15000)
            recovered=b.evaluate("async()=>{const s=await import('./browser/storage.js'),c=await import('./browser/crypto.js');return (await c.open(await s.readRecovery(),'07942685')).payload.items.find(i=>i.id==='memo').content}")
            assert recovered=='Copie A en ligne'
            print('PASS: coupure reseau sans perte, conflit sans ecrasement puis choix explicite avec secours chiffre')
            state['private']=False;puts_before=state['puts']
            b.evaluate("async()=>await updateItemRecord('memo',item=>{item.content='Reste prive localement';item.updatedAt=now()})")
            expect(b.locator('#webSaveState')).to_contain_text('dépôt privé')
            assert state['puts']==puts_before
            b.reload()
            expect(b.locator('#githubConnectForm')).to_be_visible()
            expect(b.locator('#githubAccess')).to_have_value('')
            b.locator('#githubLocalOnly').click();unlocked(b)
            assert note(b)=='Reste prive localement'
            assert not errors,errors
            b_context.close();a_context.close();second.close();first.close()
            print('PASS: aucun envoi si le depot devient public, interface et secrets preserves')
    finally:
        server.shutdown();server.server_close()

if __name__=='__main__':run()
