"""Ports move from Tools into one editable, persistent Memo reference."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect
from scan_workspace_test import Quiet

ROOT=Path(__file__).resolve().parents[1]


def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/');expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const result=await c.create({version:2,items:[{id:'personal-note',type:'memo',title:'Note personnelle',content:'<p>À conserver.</p>',tags:[]}],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            page.reload();expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000);page.keyboard.type('07942685')
            expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            reference=page.evaluate('async()=>(await all("items")).find(item=>item.referenceCatalogId==="ports-services")')
            assert reference and page.evaluate('async id=>(await get("folders",id)).name',reference['folderId'])=='Référentiels'
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert page.evaluate('async id=>get("items",id)',reference['id'])==reference
            assert page.evaluate('async()=>(await get("items","personal-note")).content')=='<p>À conserver.</p>'
            page.locator('.workspace-section-button[data-section=tools]').click();page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('[data-toolbox-nav]')).to_have_count(3)
            expect(page.locator('[data-toolbox-nav=ports]')).to_have_count(0)
            for tool in ['text','hash','ip']:
                page.locator(f'[data-toolbox-nav={tool}]').click();page.wait_for_function('()=>!sectionTransition.active')
                expect(page.locator(f'[data-toolbox-nav={tool}]')).to_have_attribute('aria-current','page')
            # Old shortcuts now open the Memo reference, with no standalone ports tool.
            page.evaluate("openSection('protocol')");page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('.reader-document-heading h1')).to_have_text('Ports et services')
            assert page.evaluate('state.section')=='library'
            expect(page.locator('.protocol-content')).to_have_count(0)
            table=page.locator('.reader-rich-content table');expect(table).to_have_count(1)
            assert table.locator('th').all_text_contents()==['Port','Service','Description']
            assert table.locator('tbody tr').count()==293
            expect(table).to_contain_text('SSH');expect(table).to_contain_text('3389')
            for width in [1440,640,390,320]:
                page.set_viewport_size({'width':width,'height':1000 if width>640 else 844})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                expect(page.locator('.reader-table-scroll')).to_have_count(1)
                if width in [1440,390]:page.screenshot(path=str(ROOT/f'.cache/memo-port-reference-{width}.png'),animations='disabled')
            # The generated note is an ordinary editable note and is never overwritten.
            page.evaluate('''async id=>{const item=await get('items',id);await put('items',{...item,content:item.content+'<p>Repère interne ajouté.</p>'});}''',reference['id'])
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert page.evaluate('async()=>(await all("items")).filter(item=>item.referenceCatalogId==="ports-services").length')==1
            assert 'Repère interne ajouté.' in page.evaluate('async id=>(await get("items",id)).content',reference['id'])
            page.evaluate('async id=>del("items",id)',reference['id'])
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert page.evaluate('async()=>(await all("items")).filter(item=>item.referenceCatalogId==="ports-services").length')==0
            # Locking while a catalogue is loading cannot write an old migration into another session.
            page.evaluate('''async()=>{await del('settings','memo-references-version');const catalog=await loadProtocolReference();
              loadProtocolReference=()=>new Promise(resolve=>window.releaseReferences=()=>resolve(catalog));
              window.referenceMigration=ensureUnifiedLibrary().catch(error=>window.referenceMigrationError=error.message);}''')
            page.wait_for_function('()=>typeof window.releaseReferences==="function"')
            page.evaluate('lockApplication()');expect(page.locator('#lock')).to_be_visible()
            page.evaluate('async()=>{releaseReferences();await referenceMigration;}')
            assert 'Session modifiée' in page.evaluate('window.referenceMigrationError')
            assert page.evaluate('''async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              return (await c.open(await s.read(),'07942685')).payload.items.some(item=>item.referenceCatalogId==='ports-services');}''') is False
            assert not errors,errors
            browser.close()
            print('PASS: three tools, one Memo reference with all 293 port/service descriptions, legacy navigation redirected, 320px layout, personal data/edits/deletions preserved after reload')
    finally:
        server.shutdown();server.server_close()


if __name__=='__main__':run()
