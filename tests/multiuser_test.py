"""Shared encrypted edits across people and tabs, with protected real drafts."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json,os,subprocess
from playwright.sync_api import sync_playwright,expect
from shared_workspace_test import Quiet,ready,unlock,API,CODE

ROOT=Path(__file__).resolve().parents[1]

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();errors=[]
            contexts=[browser.new_context(reduced_motion='reduce') for _ in range(2)]
            gate={'enabled':False,'routes':[],'conflicts':0}
            def proxy(route):
                path=urlsplit(route.request.url).path
                if gate['enabled'] and path=='/api/vault' and route.request.method=='PUT':
                    gate['routes'].append(route)
                    if len(gate['routes'])<2:return
                    gate['enabled']=False
                    for pending in gate['routes']:
                        response=pending.fetch(url=backend+'/api/vault')
                        if response.status==409:gate['conflicts']+=1
                        pending.fulfill(response=response)
                    return
                route.fulfill(response=route.fetch(url=backend+path+'?'+urlsplit(route.request.url).query))
            for context in contexts:context.route(API+'/**',proxy)
            first=contexts[0].new_page();first.goto(origin+'/?sync-test');ready(first)
            first.evaluate("""async()=>{
              const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const items=['one','two'].map(id=>({id:'personal-'+id,type:'memo',unifiedDocument:true,title:'Fiche '+id,content:'<p>Original '+id+'</p>',tags:[],commandBlocks:[],folderId:null}));
              const settings=[['memo-folder-organization-version',2],['memo-mail-cleanup-version',1],['memo-form-cleanup-version',1],['procedure-technology-organization-version',1],['memo-consolidation-version',1]].map(([key,value])=>({key,value}));
              const result=await c.create({version:2,items,folders:[],settings,activity:[]},'07942685');await s.write(result.envelope,0);
            }""")
            first.reload();ready(first)
            first.goto(origin+'/?sync-test#activate='+('b'*64));unlock(first)
            second=contexts[1].new_page();second.goto(origin+'/?sync-test');unlock(second)
            third=contexts[0].new_page();third.goto(origin+'/?sync-test');ready(third)
            expect(third.locator('#app')).not_to_be_visible();unlock(third)
            for page in [first,second,third]:
                page.on('pageerror',lambda error:errors.append(str(error)))
            print('PASS: two independent profiles and two tabs open together with the same code; new tabs still require the code')

            gate['enabled']=True
            first.evaluate("""()=>{window.pendingEdit=(async()=>{const item=await get('items','personal-one');item.title='Première personne';await put('items',item)})()}""")
            second.evaluate("""async()=>{const item=await get('items','personal-two');item.title='Deuxième personne';await put('items',item)}""")
            first.evaluate('async()=>await window.pendingEdit')
            assert gate['conflicts']==1,'Concurrent saves must exercise a real server version conflict and automatic retry'
            expect(third.locator('#workspaceCatalogItems')).to_contain_text('Première personne',timeout=17000)
            expect(third.locator('#workspaceCatalogItems')).to_contain_text('Deuxième personne')
            print('PASS: concurrent independent edits both reach the real server and another reader updates automatically')

            # Agent choices never become another person's shared settings.
            first.evaluate("async()=>await setSetting('scanAgentId','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')")
            second.evaluate("async()=>await setSetting('scanAgentId','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')")
            third.evaluate("async()=>await setSetting('scanAgentId','cccccccccccccccccccccccccccccccc')")
            assert first.evaluate("async()=>await setting('scanAgentId')")=='a'*32
            assert second.evaluate("async()=>await setting('scanAgentId')")=='b'*32
            assert third.evaluate("async()=>await setting('scanAgentId')")=='c'*32
            third.reload();unlock_resumed(third)
            assert third.evaluate("async()=>await setting('scanAgentId')")=='c'*32
            assert first.evaluate("async()=>await setting('scanAgentId')")=='a'*32
            print('PASS: each person and tab keeps its own agent choice, including after reload')

            first.evaluate("async()=>await editItemById('personal-one')")
            second.evaluate("async()=>await editItemById('personal-one')")
            first.locator('#richEditor').fill('Version enregistrée par la première personne')
            second.locator('#richEditor').fill('Brouillon à conserver de la deuxième personne')
            first.locator('.library-editor-heading').get_by_role('button',name='Enregistrer',exact=True).click()
            first.wait_for_function("()=>state.mode==='view'")
            # A separate operation can already have adopted the remote document;
            # the editor must still compare with its original version.
            second.evaluate("async()=>await setSetting('multiuser-test',true)")
            second.evaluate('async()=>await webWorkspace.refreshShared({manual:true})')
            expect(second.locator('#richEditor')).to_have_text('Brouillon à conserver de la deuxième personne')
            second.locator('.library-editor-heading').get_by_role('button',name='Enregistrer',exact=True).click()
            expect(second.locator('.library-editor-conflict')).to_contain_text('Ton brouillon est conservé')
            expect(second.locator('#richEditor')).to_have_text('Brouillon à conserver de la deuxième personne')
            assert second.evaluate("async()=>!!(await (await import('./browser/storage.js')).recoveries()).find(row=>row.key==='cloud-pending')")
            for width in [1440,390,320]:
                second.set_viewport_size({'width':width,'height':900})
                assert second.evaluate('document.documentElement.scrollWidth<=innerWidth')
                second.screenshot(path=str(ROOT/f'.cache/multiuser-conflict-{width}.png'),animations='disabled')
            second.locator('#saveLibraryDraftCopy').click();second.wait_for_function("()=>state.mode==='view'")
            copy_id=second.evaluate('state.item');assert copy_id!='personal-one'
            assert 'Brouillon à conserver' in second.evaluate("async id=>(await get('items',id)).content",copy_id)
            third.evaluate('async()=>await webWorkspace.refreshShared()')
            assert 'Version enregistrée par la première' in third.evaluate("async()=>(await get('items','personal-one')).content")
            assert 'Brouillon à conserver' in third.evaluate("async id=>(await get('items',id)).content",copy_id)
            print('PASS: conflicting rich-text edits stay open, preserve an encrypted recovery, and save as a separate copy without overwriting the shared original')

            # Delayed tab responses cannot roll the encrypted cache backwards.
            assert third.evaluate("""async()=>{const s=await import('./browser/storage.js'),before=await s.read();await s.cacheShared({...before,iv:'old-test-cache'},1);return (await s.read()).iv===before.iv}""")
            third.evaluate('lockApplication()');expect(third.locator('#lock')).to_be_visible()
            first.evaluate("async()=>await setSetting('still-connected',true)")
            assert first.evaluate("async()=>await setting('still-connected')") is True
            assert not errors,errors
            browser.close()
            print('PASS: encrypted caches never regress and locking one tab leaves the other sessions connected')
    finally:
        server.shutdown();server.server_close();process.terminate();process.wait(timeout=10)

def unlock_resumed(page):
    expect(page.locator('#app')).to_be_visible(timeout=20000)
    page.wait_for_function('()=>!document.querySelector("#app").inert')

if __name__=='__main__':run()
