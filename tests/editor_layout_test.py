"""Editing retains inline commands and metadata; view slides keep the header fixed."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':900})
            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate(r"""async()=>{
              const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const code='sudo tcpdump -ni <INTERFACE> -c 500';
              const memo={id:'layout-memo',type:'memo',title:'Diagnostic réseau',tags:[],content:'<h1>Diagnostic</h1>'+('<p>Préparation de la capture.</p>'.repeat(40))+'<h2>Observer le réseau</h2><pre><code>sudo tcpdump -ni &lt;INTERFACE&gt; -c 500</code></pre><p>Interpréter la capture avant de continuer.</p><h2>Vérification DNS</h2><pre>dig example.invalid\n</pre><h2>Sources</h2><p>Documentation technique</p>',commandBlocks:[{title:'Capture personnalisée',code,context:'Précaution à conserver',example:'Exemple conservé',fromMemo:true,customNote:'metadata'},{title:'Commande complémentaire',code:'Get-NetAdapter',context:'Lecture seule',customNote:'extra'},{title:'Ancien bloc extrait',code:'ipconfig /all',context:'Ancien contexte',fromMemo:true}]};
              const result=await c.create({version:2,items:[memo],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0);
            }""")
            page.reload();expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000);page.keyboard.type('07942685')
            expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.evaluate("openById('layout-memo')");page.wait_for_function('()=>!sectionTransition.active');page.evaluate("setMode('edit')")
            expect(page.locator('#richEditor pre')).to_have_count(2)
            expect(page.locator('.library-command-editor')).to_have_count(2)
            assert page.locator('#richEditor').inner_text().index('sudo tcpdump')<page.locator('#richEditor').inner_text().index('Sources')
            page.locator('#richEditor pre').first.evaluate("pre=>{pre.textContent='sudo tcpdump -ni <INTERFACE> -c 800';pre.dispatchEvent(new Event('input',{bubbles:true}))}")
            page.locator('.library-command-editor [data-command-field=code]').first.fill('Get-NetAdapter\nGet-NetIPConfiguration')
            page.locator('.library-command-editor [data-command-field=context]').first.fill('Contexte complété')
            page.locator('.library-editor-heading').get_by_role('button',name='Enregistrer',exact=True).click()
            saved=page.evaluate("async()=>await get('items','layout-memo')")
            capture=next(block for block in saved['commandBlocks'] if block['code'].startswith('sudo tcpdump'))
            assert capture['code']=='sudo tcpdump -ni <INTERFACE> -c 800'
            assert capture['title']=='Capture personnalisée' and capture['context']=='Précaution à conserver'
            assert capture['example']=='Exemple conservé' and capture['customNote']=='metadata'
            extra=next(block for block in saved['commandBlocks'] if block['code'].startswith('Get-NetAdapter'))
            assert extra['code']=='Get-NetAdapter\nGet-NetIPConfiguration' and extra['customNote']=='extra'
            assert any(block['code']=='ipconfig /all' for block in saved['commandBlocks'])
            assert saved['content'].count('<pre')==2
            page.evaluate("setMode('edit')");expect(page.locator('#richEditor pre')).to_have_count(2)
            expect(page.locator('.library-command-editor')).to_have_count(2)
            print('PASS: commandes en place dans le texte, blocs complémentaires sans doublon et métadonnées conservées après modification')

            # A real focus on the last command followed by an animated switch
            # previously scrolled the entire page horizontally by up to 252 px.
            for width,height in [(1440,900),(900,760),(390,844)]:
                page.set_viewport_size({'width':width,'height':height})
                page.locator('.library-editor-scroll').evaluate('element=>element.scrollTop=element.scrollHeight')
                page.locator('.library-command-editor [data-command-field=context]').last.focus()
                assert page.evaluate("()=>document.querySelector('.library-compose-toolbar').getBoundingClientRect().bottom<=document.querySelector('#libraryCommandsSection').getBoundingClientRect().top+1"),'text toolbar must stop before the command section'
                for destination in ['tools','library']:
                    frames=page.evaluate("""async destination=>{
                      const rows=[];let running=true;function frame(){const bar=document.querySelector('.topbar').getBoundingClientRect();const search=document.querySelector('.topbar .search').getBoundingClientRect();rows.push({x:bar.x,y:bar.y,w:bar.width,h:bar.height,searchX:search.x,scrollX,docw:document.documentElement.scrollWidth,vieww:innerWidth});if(running)requestAnimationFrame(frame);}
                      frame();await switchPrimaryWorkspace(destination);running=false;return rows;
                    }""",destination)
                    for field in ['x','y','w','h','searchX']:
                        assert max(row[field] for row in frames)-min(row[field] for row in frames)<1,(width,destination,field,frames)
                    assert all(row['scrollX']==0 and row['docw']<=row['vieww'] for row in frames),(width,destination,frames)
                expect(page.locator('#richEditor pre')).to_have_count(2)
                assert page.locator('.library-command-editor [data-command-field=code]').first.input_value()=='Get-NetAdapter\nGet-NetIPConfiguration'
            page.screenshot(path=str(ROOT/'.cache/editor-commands-mobile.png'),full_page=True)
            page.set_viewport_size({'width':1440,'height':900});page.screenshot(path=str(ROOT/'.cache/editor-commands-desktop.png'),full_page=True)
            assert not errors,errors
            print('PASS: barre supérieure fixe pendant chaque image des transitions Mémo/Outils en bureau, tablette et mobile')
            browser.close()
    finally:server.shutdown();server.server_close()

if __name__=='__main__':run()
