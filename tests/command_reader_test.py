"""Commands must be readable and copyable outside edit mode, at every viewport."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from pathlib import Path
import json
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':950})
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            item=next(row for file in (ROOT/'app/data').glob('technical-library*.json') for row in json.loads(file.read_text(encoding='utf-8'))['items'] if row['id']=='tech-basic-command-captures-tshark-fields')
            page.goto(f'http://127.0.0.1:{server.server_port}/');expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async item=>{
              const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const long={id:'long-command-note',type:'memo',title:'Longue fiche avec commande',content:'<p>Préparer les contrôles.</p>'.repeat(100),commandBlocks:[{title:'Contrôle réseau',code:'Get-NetTCPConnection',context:'Lecture locale'}],tags:[]};
              const r=await c.create({version:2,items:[{...item,folderId:null},long],folders:[],settings:[],activity:[]},'07942685');await s.write(r.envelope,0);
            }""",item)
            page.reload();expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000);page.keyboard.type('07942685')
            expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.evaluate("copyText=async value=>{window.copiedCommand=value;return true}")
            for width,height in [(1440,950),(900,900),(390,844)]:
                page.set_viewport_size({'width':width,'height':height})
                for id,code in [(item['id'],item['content']),('long-command-note','Get-NetTCPConnection')]:
                    page.evaluate('id=>openById(id)',id);page.wait_for_function('()=>!sectionTransition.active')
                    expect(page.locator('.reader-article .reader-rich-content .library-command-panel')).to_be_visible()
                    expect(page.locator('.library-command-panel pre')).to_have_text(code)
                    expect(page.locator('.library-command-jump')).to_have_text('1 commande ↓')
                    page.locator('.library-command-jump').click()
                    expect(page.locator('.library-command-panel pre')).to_be_in_viewport(timeout=10000)
                    page.locator('.library-command-panel .reader-code button').click();assert page.evaluate('window.copiedCommand')==code
                    assert page.evaluate("()=>{const command=document.querySelector('.library-command-panel'),extras=document.querySelector('.reader-extras');return command.compareDocumentPosition(extras)&Node.DOCUMENT_POSITION_FOLLOWING}"),'commands must precede sources and attachments'
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,id)
                page.evaluate('id=>openById(id)',item['id']);page.wait_for_function('()=>!sectionTransition.active')
                page.evaluate("setMode('edit')")
                expect(page.locator('[data-reference-field=description]')).to_have_value(item['description'])
                expect(page.locator('[data-reference-field=context]')).to_have_value(item['context'])
                expect(page.locator('.library-command-editor textarea[data-command-field=code]')).to_have_value(item['content'])
                page.locator('.library-editor-heading').get_by_role('button',name='Enregistrer',exact=True).click()
                expect(page.locator('.library-command-panel pre')).to_have_text(item['content'])
                assert page.evaluate("async id=>(await get('items',id)).commandBlocks[0].code",item['id'])==item['content']
            page.evaluate("setMode('edit')")
            page.locator('[data-reference-field=description]').fill('Description de la fiche complétée')
            page.locator('[data-reference-field=context]').fill('Contexte de diagnostic complété')
            page.locator('.library-editor-heading').get_by_role('button',name='Enregistrer',exact=True).click()
            expect(page.locator('[data-library-part=reference]')).to_contain_text('Description de la fiche complétée')
            expect(page.locator('[data-library-part=memo]')).to_contain_text('Contexte de diagnostic complété')
            saved=page.evaluate("async id=>await get('items',id)",item['id'])
            for field in ['platform','vendor','sources','example','tags']:assert saved[field]==item[field],field
            assert saved['commandBlocks'][0]['code']==item['content']
            page.locator('.library-command-jump').click();page.screenshot(path=str(ROOT/'.cache/command-reader-mobile.png'),full_page=True)
            page.set_viewport_size({'width':1440,'height':950});page.screenshot(path=str(ROOT/'.cache/command-reader-desktop.png'),full_page=True)
            assert not errors,errors
            print('PASS: commande TShark visible et copiable en lecture, avant les references, bureau/tablette/mobile et apres enregistrement')
            print('PASS: acces direct aux commandes des longues fiches sans passer en modification, aucune perte de code')
            print('PASS: description, contexte et reperes accessibles en modification, changements conserves sans alteration des commandes ni sources')
            browser.close()
    finally:server.shutdown();server.server_close()

if __name__=='__main__':run()
