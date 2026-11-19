"""Delayed and interrupted section changes keep a usable view and memo drafts."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect
from site_fixture import WolfGuardTestHandler

ROOT = Path(__file__).resolve().parents[1]


class Quiet(WolfGuardTestHandler):
    def log_message(self, *_args):
        pass


def visible_content(page):
    assert page.locator('#content').evaluate("""element => {
      const box=element.getBoundingClientRect(), style=getComputedStyle(element);
      return element.childElementCount>0 && Number(style.opacity)>0.9 &&
        box.left<innerWidth/2 && box.right>innerWidth/2;
    }"""), 'The section must remain visible while its replacement loads'


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1280, 'height': 900})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async()=>{
              const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const memo={id:'navigation-memo',type:'memo',title:'Note conservée',content:'<p>Texte initial</p>',tags:[],commandBlocks:[]};
              const result=await c.create({version:2,items:[memo],folders:[],settings:[],activity:[]},'01234567');
              await s.write(result.envelope,0);
            }""")
            page.reload();expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.keyboard.type('01234567')
            expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.evaluate("async()=>{await openById('navigation-memo');await setMode('edit')}")
            expect(page.locator('#richEditor')).to_be_visible()
            page.locator('#richEditor').fill('Brouillon à préserver')
            page.evaluate('window.navigationEditor=document.querySelector("#richEditor")')

            # A queued save or migration can hold this preparation for seconds.
            page.evaluate("""()=>{
              const original=flattenRedundantSectionRoots;
              flattenRedundantSectionRoots=async()=>{window.navigationWaiting=true;await new Promise(resolve=>window.releaseNavigation=resolve);return original()};
              window.restorePreparation=()=>flattenRedundantSectionRoots=original;
              window.navigationJob=switchPrimaryWorkspace('vault');
            }""")
            page.wait_for_function('()=>window.navigationWaiting')
            page.wait_for_timeout(650)
            visible_content(page)
            expect(page.locator('#richEditor')).to_have_text('Brouillon à préserver')
            page.evaluate('async()=>{restorePreparation();releaseNavigation();await navigationJob}')
            expect(page.locator('.catalog-vault')).to_be_visible()
            print('PASS: préparation lente sans page vide')

            page.evaluate("switchPrimaryWorkspace('library')")
            assert page.evaluate('navigationEditor===document.querySelector("#richEditor")')
            page.evaluate("""()=>{
              const original=renderVaultWorkspace;
              renderVaultWorkspace=async()=>{window.navigationRendering=true;await new Promise(resolve=>window.releaseRender=resolve);return original()};
              window.restoreRenderer=()=>renderVaultWorkspace=original;
              window.navigationJob=switchPrimaryWorkspace('vault');
            }""")
            page.wait_for_function('()=>window.navigationRendering')
            page.wait_for_timeout(650)
            visible_content(page)
            expect(page.locator('#richEditor')).to_have_text('Brouillon à préserver')
            page.evaluate('async()=>{restoreRenderer();releaseRender();await navigationJob}')
            page.evaluate("switchPrimaryWorkspace('library')")
            assert page.evaluate('navigationEditor===document.querySelector("#richEditor")')
            print('PASS: rendu lent sans détacher le mémo ni perdre son brouillon')

            # A render failure must be visible and retryable from the same tab.
            page.evaluate("""async()=>{
              const original=renderVaultWorkspace;
              renderVaultWorkspace=async()=>{throw new Error('Lecture temporairement indisponible')};
              try{await switchPrimaryWorkspace('vault')}catch{}
              finally{renderVaultWorkspace=original}
            }""")
            expect(page.locator('.section-load-error')).to_be_visible()
            page.get_by_role('button', name='Réessayer', exact=True).click()
            page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('.catalog-vault')).to_be_visible()
            page.evaluate("switchPrimaryWorkspace('library')")
            assert page.evaluate('navigationEditor===document.querySelector("#richEditor")')
            expect(page.locator('#richEditor')).to_have_text('Brouillon à préserver')
            print('PASS: erreur de chargement récupérable, brouillon intact après nouvel essai')

            page.evaluate("""async()=>{
              const original=flattenRedundantSectionRoots;
              flattenRedundantSectionRoots=async()=>{throw new Error('Préparation interrompue')};
              try{await switchPrimaryWorkspace('vault')}catch{}
              finally{flattenRedundantSectionRoots=original}
            }""")
            assert page.evaluate('state.section==="library" && navigationEditor===document.querySelector("#richEditor")')
            visible_content(page)
            print('PASS: échec avant le changement, éditeur précédent toujours accessible')

            for delay in [0, 10, 240, 300, 550]:
                page.evaluate("""async delay=>{
                  const jobs=['tools','vault','library'].map((section,index)=>new Promise(resolve=>setTimeout(()=>resolve(switchPrimaryWorkspace(section)),index*delay)));
                  await Promise.all(jobs);
                }""", delay)
                page.wait_for_function('()=>!sectionTransition.active')
                visible_content(page)
                expect(page.locator('#richEditor')).to_have_text('Brouillon à préserver')
                assert page.evaluate('!document.querySelector("#content").inert')

            page.evaluate("""async()=>{
              const original=renderVaultWorkspace;
              renderVaultWorkspace=async()=>{throw new Error('Lecture temporairement indisponible')};
              try{await switchPrimaryWorkspace('vault')}catch{}
              finally{renderVaultWorkspace=original}
            }""")
            page.locator('.workspace-section-button[data-section=vault]').click()
            page.wait_for_function('()=>!sectionTransition.active')
            expect(page.locator('.catalog-vault')).to_be_visible()
            page.evaluate("switchPrimaryWorkspace('library')")
            expect(page.locator('#richEditor')).to_have_text('Brouillon à préserver')
            assert not errors, errors
            print('PASS: clics rapprochés, nouvel essai depuis l’onglet courant et brouillon conservé')
            browser.close()
    finally:
        server.shutdown();server.server_close()


if __name__ == '__main__':
    run()
