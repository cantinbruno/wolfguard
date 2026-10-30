"""Operation counts and behavioral checks for the optimized catalogue and scans.

Optional --baseline / --compare also check exact DOM and screenshot equivalence.
All data is synthetic and all browser state is disposable.
"""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import sys
from playwright.sync_api import sync_playwright, expect
from site_fixture import WolfGuardTestHandler
from scan_workspace_test import navigate, paste

ROOT = Path(__file__).resolve().parents[1]


class Quiet(WolfGuardTestHandler):
    def log_message(self, *_args):
        pass


def run():
    baseline = '--baseline' in sys.argv
    compare = '--compare' in sys.argv
    output = ROOT / '.cache' / ('optimization-baseline' if baseline else 'optimization-after')
    output.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever, daemon=True).start()
    snapshots = {}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
            errors = []; page.on('pageerror', lambda error: errors.append(str(error)))
            page.clock.set_fixed_time('2026-10-30T10:00:00Z')
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async () => {
              const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const folders=Array.from({length:40},(_,i)=>({id:'perf-folder-'+i,name:'Dossier '+String(i).padStart(2,'0'),section:'library',parentId:null}));
              const items=Array.from({length:800},(_,i)=>({id:'perf-item-'+i,type:'memo',unifiedDocument:true,title:'Fiche '+String(799-i).padStart(3,'0'),content:'<p>Contenu de recherche '+i+'</p>',tags:[],folderId:folders[i%40].id,commandBlocks:[],createdAt:'2026-10-01T10:00:00Z',updatedAt:'2026-10-'+String(1+i%28).padStart(2,'0')+'T10:00:00Z'}));
              const result=await c.create({version:2,items,folders,settings:[],activity:[]},'07942685');await s.write(result.envelope,0);
            }""")
            page.reload(); expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.keyboard.type('07942685'); expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.wait_for_function("()=>!document.querySelector('#app').inert")

            def capture(name, selector):
                snapshots[name] = page.locator(selector).evaluate('el=>el.outerHTML')
                page.screenshot(path=str(output/(name+'.png')), animations='disabled')

            capture('library-desktop', '.library-catalog')
            metrics = page.evaluate("""() => {
              const compare=String.prototype.localeCompare;let calls=0;
              String.prototype.localeCompare=function(...args){calls++;return compare.apply(this,args)};
              const input=document.getElementById('workspaceLocalSearch'),start=performance.now();
              try{for(const query of ['fiche','fiche 0','fiche 01','fiche 1','']){input.value=query;input.dispatchEvent(new Event('input',{bubbles:true}));}}
              finally{String.prototype.localeCompare=compare;}
              return {catalog_comparisons:calls,catalog_ms:performance.now()-start};
            }""")
            page.locator('#workspaceCatalogSort').select_option('recent')
            recent = page.locator('.workspace-item-title').all_text_contents()
            page.locator('#workspaceLocalSearch').fill('fiche 01')
            matched = page.locator('.workspace-item-title').all_text_contents()
            assert matched and len(matched) < len(recent)
            page.locator('#workspaceLocalSearch').fill('')
            assert page.locator('.workspace-item-title').all_text_contents() == recent
            page.locator('#workspaceCatalogSort').select_option('title')
            capture('library-sorted', '.library-catalog')
            tree = page.evaluate("""() => {
              const input=document.getElementById('treeFilter'),root=document.getElementById('unifiedTree');
              input.value='fiche';input.dispatchEvent(new Event('input',{bubbles:true}));
              const observer=new MutationObserver(()=>{});observer.observe(root,{subtree:true,childList:true});
              for(let i=0;i<4;i++)input.dispatchEvent(new Event('input',{bubbles:true}));
              const changes=observer.takeRecords().filter(r=>r.target.classList?.contains('tree-icon')).length;
              observer.disconnect();return changes;
            }""")
            metrics['repeated_tree_icon_replacements'] = tree
            capture('library-tree', '.library-navigation')
            page.locator('#treeFilter').fill('')
            page.set_viewport_size({'width':390,'height':844})
            capture('library-mobile', '.library-catalog')
            page.set_viewport_size({'width':1440,'height':1000})
            navigate(page, 'passive')
            rows = [{'address':f'192.168.{i//250}.{i%250+1}' if i%2 else 'fd00::'+format(i+1,'x'),'transport':'ARP' if i%2 else 'NDP','status':'observed','interfaceName':'eth'+str(i%3),'macAddress':'00:11:22:33:44:55','detail':'Entrée du cache '+str(i)} for i in range(1000)]
            paste(page, json.dumps({'strategy':'passive','results':rows}), 'Relevé de performance')
            expect(page.locator('#wgScanReportStamp')).to_contain_text('Relevé de performance')
            capture('scan-passive', '.wgscan')
            page.locator('[data-passive-category=ARP]').click()
            page.locator('[data-wg-tab=rows]').click()
            capture('scan-filtered', '.wgscan')
            with page.expect_download() as download:
                page.locator('#wgScanExport').click()
            snapshots['filtered-csv'] = Path(download.value.path()).read_text(encoding='utf-8-sig')
            assert len(snapshots['filtered-csv'].splitlines()) == 501
            navigate(page, 'vulnerability')
            audit=[{'address':'127.0.0.1','transport':'AUDIT','checkId':'control-'+str(i),'title':'Contrôle '+str(i),'status':'issue' if i%2 else 'passed','severity':'high','detail':'Observation '+str(i),'recommendation':'Vérifier le réglage'} for i in range(150)]
            paste(page,json.dumps({'strategy':'passive','workspace':'vulnerability','results':audit}),'Audit de performance')
            capture('scan-audit', '.wgscan')
            page.set_viewport_size({'width':390,'height':844})
            capture('scan-audit-mobile', '.wgscan')
            page.evaluate("""() => {
              window.armCount=0;const schedule=window.setTimeout;
              window.setTimeout=function(...args){if(new Error().stack.includes('armSessionTimer'))window.armCount++;return schedule.apply(window,args)};
            }""")
            for i in range(40):
                page.mouse.move(20+i*2, 180+i)
            metrics['activity_timer_schedules'] = page.evaluate('window.armCount')
            assert not errors, errors
            if not baseline:
                assert metrics['catalog_comparisons'] == 0, metrics
                assert metrics['repeated_tree_icon_replacements'] == 0, metrics
                assert metrics['activity_timer_schedules'] <= 1, metrics
            (output/'snapshots.json').write_text(json.dumps(snapshots,ensure_ascii=False),encoding='utf8')
            (output/'metrics.json').write_text(json.dumps(metrics),encoding='utf8')
            if compare:
                reference=ROOT/'.cache/optimization-baseline'
                assert snapshots == json.loads((reference/'snapshots.json').read_text(encoding='utf8')), 'Rendered HTML or exported observations changed'
                from PIL import Image, ImageChops
                for screenshot in reference.glob('*.png'):
                    before=Image.open(screenshot).convert('RGB');after=Image.open(output/screenshot.name).convert('RGB')
                    assert before.size == after.size and ImageChops.difference(before,after).getbbox() is None, screenshot.name
                print('PASS: identical HTML, CSV exports and pixels in all eight desktop/mobile screenshots')
            # The earlier timer must recheck and rearm, without locking an
            # active user early or postponing the exact inactivity deadline.
            page.evaluate('lockApplication()')
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.clock.install()
            page.keyboard.type('07942685')
            expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.wait_for_function("()=>!document.querySelector('#app').inert")
            page.clock.fast_forward(14*60000)
            page.keyboard.press('Shift')
            page.clock.fast_forward(2*60000)
            expect(page.locator('#app')).to_be_visible()
            page.clock.fast_forward(12*60000)
            expect(page.locator('#app')).to_be_visible()
            page.clock.fast_forward(61000)
            expect(page.locator('#app')).not_to_be_visible()
            assert page.evaluate("state.vaultKey===null && !sessionStorage.getItem('wolfguard-tab-session-v1')")
            assert not errors, errors
            print('PASS: the timer still locks exactly after inactivity and clears the reload ticket')
            print(json.dumps(metrics))
            browser.close()
    finally:
        server.shutdown();server.server_close()


if __name__ == '__main__':
    run()
