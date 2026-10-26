"""Check visible unlock and workspace animations with the Windows motion preference."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

TRACE="""(() => {
  window.motionTrace={phases:[],fragments:0,workspace:[],warnings:[]};
  const warning=console.warn.bind(console);
  console.warn=(...args)=>{window.motionTrace.warnings.push(String(args[0]));warning(...args)};
  new MutationObserver(()=>{
    const overlay=document.getElementById('unlockTransition');
    if(overlay){
      const phase=overlay.dataset.phase;
      if(window.motionTrace.phases.at(-1)!==phase)window.motionTrace.phases.push(phase);
      window.motionTrace.fragments=Math.max(window.motionTrace.fragments,overlay.querySelectorAll('.unlock-fragment').length);
    }
    const root=document.documentElement;
    if(root?.dataset.sectionTransition==='active'){
      const direction=root.dataset.sectionDirection;
      if(window.motionTrace.workspace.at(-1)!==direction)window.motionTrace.workspace.push(direction);
    }
  }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-phase','data-section-transition','data-section-direction']});
})();"""

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            # Windows disabled system animations must not remove WolfGuard's intro.
            context=browser.new_context(reduced_motion='reduce',viewport={'width':1280,'height':900})
            context.add_init_script(TRACE)
            page=context.new_page()
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            page.evaluate("""async()=>{
              const c=await import('./browser/crypto.js');const s=await import('./browser/storage.js');
              const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'01234567');
              await s.write(result.envelope,0);
            }""")
            page.reload()
            expect(page.locator('#keypad')).to_be_visible()
            page.keyboard.type('01234567')
            page.wait_for_function("()=>window.motionTrace.phases.includes('burst')",timeout=10000)
            assert page.evaluate('window.motionTrace.fragments')>1
            assert page.evaluate("window.motionTrace.phases.includes('grow')")
            cache=ROOT/'.cache';cache.mkdir(exist_ok=True)
            page.screenshot(path=str(cache/'unlock-animation.png'))
            expect(page.locator('#unlockTransition')).to_have_count(0,timeout=10000)
            expect(page.locator('#app')).to_be_visible()
            page.wait_for_function("()=>!document.querySelector('#app').inert")
            print('PASS: agrandissement puis eclatement du loup, meme avec animations Windows reduites')

            page.locator('.workspace-section-button[data-section=tools]').click()
            page.wait_for_function("()=>!sectionTransition.active")
            assert 'forward' in page.evaluate('window.motionTrace.workspace')
            page.locator('.workspace-section-button[data-section=library]').click()
            page.wait_for_function("()=>!sectionTransition.active")
            assert 'backward' in page.evaluate('window.motionTrace.workspace')
            print('PASS: transitions entre sections dans les deux sens')

            page.locator('#settingsBtn').click()
            expect(page.locator('.settings-modal')).to_be_visible()
            assert page.locator('.settings-modal').evaluate("el=>getComputedStyle(el).animationName")=='settings-enter'
            page.locator('#closeSettingsBtn').click()

            # Re-locking during the intro must stop it and keep the app closed.
            page.evaluate("""()=>{const play=unlockTransition.play;unlockTransition.play=function(){window.lastUnlock=play.call(this);return window.lastUnlock}}""")
            page.evaluate('lockApplication()')
            expect(page.locator('#lock')).to_have_attribute('aria-busy','false')
            page.keyboard.type('01234567')
            page.wait_for_function("()=>document.querySelector('#unlockTransition')?.dataset.phase==='grow'",timeout=10000)
            page.evaluate('lockApplication()')
            assert page.evaluate('async()=>await window.lastUnlock') is False
            expect(page.locator('#app')).not_to_be_visible()
            expect(page.locator('#unlockTransition')).to_have_count(0)
            assert not page.evaluate("window.motionTrace.warnings.some(value=>value.includes('Unlock animation failed'))")
            print('PASS: ouverture animee des parametres et annulation sure au verrouillage')
            context.close();browser.close()
    finally:
        server.shutdown();server.server_close()

if __name__=='__main__':run()
