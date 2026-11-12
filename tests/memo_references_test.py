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
              const citations=[{title:'Documentation à retirer',url:'https://docs.example.invalid/reference'}];
              const items=[{id:'personal-note',type:'memo',title:'Note personnelle',content:'<p>À conserver.</p><h2>Références</h2><ul><li><a href="https://docs.example.invalid/reference">Documentation</a></li></ul>',tags:[],references:citations},
                {id:'citation-origin',type:'memo',title:'Original',content:'<p>Original à conserver.</p>',sources:citations,consolidatedInto:'legacy-guide'},
                {id:'legacy-guide',type:'memo',title:'Guide existant',consolidatedGuideVersion:1,guideSourceIds:['citation-origin'],content:'<section data-guide-chapter="citation-origin"><h2>Diagnostic</h2><pre><code>curl https://console.example.invalid/status</code></pre><p><a href="https://console.example.invalid/">Ouvrir la console de travail</a></p><ul><li><a href="https://docs.example.invalid/reference">Documentation à retirer</a></li></ul></section>',attachments:[{name:'preuve.txt',size:4}],linkedItemIds:['personal-note']}];
              const result=await c.create({version:2,items,folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            page.reload();expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000);page.keyboard.type('07942685')
            expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            reference=page.evaluate('async()=>(await all("items")).find(item=>item.referenceCatalogId==="ports-services")')
            assert reference and page.evaluate('async id=>(await get("folders",id)).name',reference['folderId'])=='Référentiels'
            osi=page.evaluate('async()=>(await all("items")).find(item=>item.referenceCatalogId==="osi-model")')
            assert osi and osi['folderId']==reference['folderId'] and osi['title']=='Modèle OSI'
            cleaned=page.evaluate('async()=>({note:await get("items","personal-note"),origin:await get("items","citation-origin"),guide:await get("items","legacy-guide")})')
            assert 'references' not in cleaned['note'] and 'sources' not in cleaned['origin']
            assert cleaned['note']['content']=='<p>À conserver.</p>'
            assert 'docs.example.invalid/reference' not in cleaned['guide']['content']
            assert 'curl https://console.example.invalid/status' in cleaned['guide']['content']
            assert 'Ouvrir la console de travail' in cleaned['guide']['content']
            assert cleaned['guide']['attachments']==[{'name':'preuve.txt','size':4}]
            assert cleaned['guide']['linkedItemIds']==['personal-note']
            assert page.evaluate('''async()=>{const items=await all('items');return buildMemoCitationCleanup({items}).operations.length}''')==0
            page.evaluate('openById("personal-note")');page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('.reader-sources')).to_have_count(0)
            expect(page.locator('.reader-rich-content')).not_to_contain_text('Références')
            # Bibliography removal must preserve commands, ordinary links,
            # following sections, unrelated records and the original input.
            assert page.evaluate('''()=>{
              const refs=[{title:'Doc',url:'https://docs.example.invalid/ref'}];
              const item={id:'sample',type:'memo',references:refs,sources:refs,content:'<p>Début</p><h2>Références</h2><ul><li>Doc</li></ul><section><h2>Validation</h2><p>GARDER LA VALIDATION</p></section><ul><li><a href="https://docs.example.invalid/ref">Doc</a></li><li>GARDER LA CONSIGNE</li></ul><p><a href="https://console.example.invalid/">GARDER LE LIEN</a></p><pre><code>Sources : curl https://docs.example.invalid/ref</code></pre>',attachments:[{name:'preuve'}]};
              const before=JSON.stringify(item),clean=cleanMemoCitationItem(item),vault={...item,type:'vault'},raw={...item,type:'command',unifiedDocument:false,content:'echo <Sources>'};
              const styled='<p>Garder</p><h2><span><em>R&eacute;f&eacute;rences</em></span></h2><ul><li>Documentation</li></ul>';
              return JSON.stringify(item)===before&&!('references'in clean)&&!('sources'in clean)&&!clean.content.includes('<h2>Références')&&!clean.content.includes('>Doc<')&&clean.content.includes('GARDER LA VALIDATION')&&clean.content.includes('GARDER LA CONSIGNE')&&clean.content.includes('GARDER LE LIEN')&&clean.content.includes('Sources : curl')&&clean.attachments===item.attachments&&cleanMemoCitationItem(clean)===clean&&cleanMemoCitationItem(vault)===vault&&cleanMemoCitationItem(raw).content===raw.content&&cleanMemoCitationHTML(styled)==='<p>Garder</p>';
            }''') is True
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
            page.set_viewport_size({'width':1440,'height':1000})
            page.evaluate('id=>openById(id)',osi['id']);page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('.reader-document-heading h1')).to_have_text('Modèle OSI')
            expect(page.locator('.reader-rich-content table')).to_have_count(2)
            expect(page.locator('.reader-rich-content table').first.locator('tbody tr')).to_have_count(7)
            expect(page.locator('.reader-rich-content')).to_contain_text('Encapsulation')
            expect(page.locator('.reader-rich-content')).to_contain_text('TCP/IP')
            expect(page.locator('.reader-sources')).to_have_count(0)
            for width in [1440,390,320]:
                page.set_viewport_size({'width':width,'height':1000 if width>640 else 844})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                if width in [1440,390]:page.screenshot(path=str(ROOT/f'.cache/memo-osi-{width}.png'),animations='disabled')
            page.evaluate('''async id=>{const item=await get('items',id);await put('items',{...item,content:item.content+'<p>Annotation OSI personnelle.</p>'});}''',osi['id'])
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert 'Annotation OSI personnelle.' in page.evaluate('async id=>(await get("items",id)).content',osi['id'])
            assert page.evaluate('async()=>(await all("items")).filter(item=>item.referenceCatalogId==="osi-model").length')==1
            page.evaluate('async id=>del("items",id)',osi['id'])
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert page.evaluate('async()=>(await all("items")).filter(item=>item.referenceCatalogId==="osi-model").length')==0
            # The generated note is an ordinary editable note and is never overwritten.
            page.evaluate('''async id=>{const item=await get('items',id);await put('items',{...item,content:item.content+'<p>Repère interne ajouté.</p>'});}''',reference['id'])
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert page.evaluate('async()=>(await all("items")).filter(item=>item.referenceCatalogId==="ports-services").length')==1
            assert 'Repère interne ajouté.' in page.evaluate('async id=>(await get("items",id)).content',reference['id'])
            page.evaluate('async id=>del("items",id)',reference['id'])
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert page.evaluate('async()=>(await all("items")).filter(item=>item.referenceCatalogId==="ports-services").length')==0
            # Upgrade an older workspace without touching its edited ports note.
            page.evaluate('''async item=>{await put('items',{...item,content:'<p>Ports adaptés à mon réseau.</p>'});await setSetting('memo-references-version',1);}''',reference)
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert page.evaluate('async id=>(await get("items",id)).content',reference['id'])=='<p>Ports adaptés à mon réseau.</p>'
            upgraded_osi=page.evaluate('async()=>(await all("items")).filter(item=>item.referenceCatalogId==="osi-model")')
            assert len(upgraded_osi)==1 and upgraded_osi[0]['folderId']==reference['folderId']
            assert page.evaluate('setting("memo-references-version",0)')==2
            page.evaluate('async id=>del("items",id)',reference['id'])
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
            print('PASS: citations removed from existing notes and guides, commands/links/attachments retained, OSI and 293 ports in Référentiels, mobile layout, edits/deletions and lock safety')
    finally:
        server.shutdown();server.server_close()


if __name__=='__main__':run()
