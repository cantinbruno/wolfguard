"""Migrate an existing encrypted workspace, fail safely, then sync two devices."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json, os, subprocess
from playwright.sync_api import sync_playwright, expect
from site_fixture import WolfGuardTestHandler

ROOT=Path(__file__).resolve().parents[1]
API='https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'
CODE='01234567'

class Quiet(WolfGuardTestHandler):
    def log_message(self,*args):pass

def unlock(page):
    expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
    page.keyboard.type(CODE)
    expect(page.locator('#app')).to_be_visible(timeout=20000)
    page.wait_for_function('()=>!document.querySelector("#app").inert')

def run():
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    server=ThreadingHTTPServer(('127.0.0.1',4178),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    url='http://127.0.0.1:4178/'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            a=browser.new_context(reduced_motion='reduce');b=browser.new_context(reduced_motion='reduce')
            errors=[]
            for context in [a,b]:
                def proxy(route):route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path))
                context.route(API+'/**',proxy)
            page=a.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(url)
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            before=page.evaluate('''async code=>{
              const payload={version:2,folders:[
                {id:'tech-folder-win',name:'Windows',section:'library',parentId:null},
                {id:'tech-folder-eset',name:'ESET',section:'library',parentId:null},
                {id:'mine',name:'Mes clients',section:'library',parentId:null}
              ],settings:[{key:'memo-folder-organization-version',value:2},{key:'memo-mail-cleanup-version',value:1},{key:'memo-form-cleanup-version',value:1}],activity:[],items:[
                {id:'ad',type:'procedure',title:'Active Directory - Créer un utilisateur',folderId:'tech-folder-win',content:'<p>Texte original AD</p>',attachments:[],linkedItemIds:['ad-command','shared'],tags:['identité']},
                {id:'eset',type:'procedure',title:'ESET - Déployer par GPO',folderId:'tech-folder-eset',content:'<p>Texte original ESET</p>',linkedItemIds:['shared']},
                {id:'ad-command',type:'command',title:'Commande AD',folderId:'tech-folder-win',content:'Get-ADUser -Filter *'},
                {id:'shared',type:'command',title:'Diagnostic partagé',folderId:'tech-folder-win',content:'Get-Date'},
                {id:'personal',type:'procedure',title:'Windows - Procédure client',folderId:'mine',content:'<p>Classement personnel</p>'}
              ]};
              payload.items=payload.items.map(item=>normalizeLibraryItem(item));
              const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const created=await c.create(payload,code);
              await s.write(created.envelope,0);await s.preserveOrganization(created.envelope,3);
              return {payload,envelope:created.envelope};
            }''',CODE)
            page.goto(url+'?sync-test#activate='+('b'*64))
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate('''()=>{
              const original=IDBObjectStore.prototype.put;let fail=true;
                IDBObjectStore.prototype.put=function(value,key){const result=Reflect.apply(original,this,arguments);if(key==='memo-consolidation-before-v1'&&fail){fail=false;this.transaction.abort();}return result;};
            }''')
            page.keyboard.type(CODE)
            expect(page.locator('#lockError')).to_contain_text('Conservation',timeout=20000)
            assert page.evaluate('''async code=>{
              const s=await import('./browser/storage.js'),c=await import('./browser/crypto.js');
              return (await c.open(await s.read(),code)).payload.items.find(item=>item.id==='ad').folderId;
            }''',CODE)=='tech-folder-win'
            unlock(page)
            expect(page.locator('#webSaveState')).to_contain_text('Synchronisé')
            saved=page.evaluate('async()=>({items:await all("items"),folders:await all("folders"),settings:await all("settings")})')
            folders={folder['id']:folder for folder in saved['folders']}
            items={item['id']:item for item in saved['items']}
            def path(id):
                folder=folders[id]
                return (path(folder['parentId'])+' / ' if folder.get('parentId') else '')+folder['name']
            assert path(items['ad']['folderId'])=='00 · Procédures par technologie / Windows / Active Directory'
            assert path(items['eset']['folderId'])=='00 · Procédures par technologie / ESET'
            assert items['ad-command']['folderId']==items['ad']['folderId']
            assert items['shared']['folderId']=='tech-folder-win'
            assert items['personal']['folderId']=='mine'
            ad_guide=items[items['ad']['consolidatedInto']]
            eset_guide=items[items['eset']['consolidatedInto']]
            assert items['ad-command']['consolidatedInto']==ad_guide['id']
            assert 'Get-ADUser -Filter *' in ad_guide['content']
            assert '<p>Texte original AD</p>' in ad_guide['content']
            assert eset_guide['title']=='ESET'
            assert 'consolidatedInto' not in items['personal']
            assert page.evaluate('async()=>(await explorerData()).items.length')==4
            for original in before['payload']['items']:
                restored={key:value for key,value in items[original['id']].items() if key!='consolidatedInto'}
                assert {**restored,'folderId':original['folderId']}==original
            recoveries=page.evaluate('''async code=>{
              const s=await import('./browser/storage.js'),c=await import('./browser/crypto.js');
              return Promise.all((await s.recoveries()).filter(row=>['memo-consolidation-before-v1','procedure-technology-before-v1','memo-form-cleanup-before-v3'].includes(row.key)).map(async row=>({key:row.key,data:row.envelope.data,payload:(await c.open(row.envelope,code)).payload})));
            }''',CODE)
            assert len(recoveries)==3
            assert all(copy['payload']==before['payload'] for copy in recoveries)
            assert all(copy['data']==before['envelope']['data'] for copy in recoveries)
            page.evaluate('openSettings()')
            page.locator('[data-settings-tab="data"]').click()
            expect(page.get_by_role('button',name='Exporter avant le classement des procédures',exact=True)).to_be_visible()
            expect(page.get_by_role('button',name='Exporter avant le regroupement des fiches',exact=True)).to_be_visible()
            second=b.new_page();second.on('pageerror',lambda error:errors.append(str(error)))
            second.goto(url+'?sync-test');unlock(second)
            assert second.evaluate('async()=>({items:await all("items"),folders:await all("folders")})')=={'items':saved['items'],'folders':saved['folders']}
            # A later manual choice must not be undone on the next unlock.
            second.evaluate('''async()=>{const source=await get('items','ad'),item=await get('items',source.consolidatedInto);await put('items',{...item,folderId:'mine'});}''')
            second.reload();unlock(second)
            assert second.evaluate('async()=>{const source=await get("items","ad");return (await get("items",source.consolidatedInto)).folderId}')=='mine'
            page.reload();unlock(page)
            assert page.evaluate('async()=>{const source=await get("items","ad");return (await get("items",source.consolidatedInto)).folderId}')=='mine'
            page.set_viewport_size({'width':390,'height':844})
            page.evaluate('id=>openById(id)','ad')
            expect(page.locator('.reader-article')).to_contain_text('Texte original AD')
            expect(page.locator('.reader-rich-content pre')).to_have_text('Get-ADUser -Filter *')
            expect(page.locator('.reader-outline')).to_be_visible()
            page.evaluate("copyText=async value=>{window.copiedCommand=value;return true}")
            page.locator('.reader-code button').click()
            assert page.evaluate('window.copiedCommand')=='Get-ADUser -Filter *'
            # A source link across two guides still opens its original chapter.
            page.locator('[data-guide-link="shared"]').click()
            expect(page.locator('.reader-rich-content')).to_contain_text('Get-Date')
            page.evaluate('id=>openById(id)','eset')
            expect(page.locator('.reader-article')).to_contain_text('Texte original ESET')
            page.evaluate("setMode('edit')")
            page.get_by_role('button',name='+ Ajouter une commande',exact=True).click()
            page.locator('.library-command-editor [data-command-field="title"]').fill('Contrôle ajouté au guide')
            page.locator('.library-command-editor [data-command-field="code"]').fill('Get-Service ESET')
            page.locator('.library-editor-heading').get_by_role('button',name='Enregistrer',exact=True).click()
            expect(page.locator('.reader-rich-content')).to_contain_text('Get-Service ESET')
            expect(page.locator('.reader-rich-content')).to_contain_text('Texte original ESET')
            page.screenshot(path=str(ROOT/'.cache/consolidated-guides-mobile.png'),full_page=True)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert not errors,errors
            browser.close()
            print('PASS: classement systeme/technologie, commandes liees, refus si sauvegarde impossible, sauvegardes chiffrees distinctes, synchronisation et choix manuels preserves sur deux navigateurs')
    finally:
        server.shutdown();server.server_close();process.terminate();process.wait(timeout=10)

if __name__=='__main__':run()
