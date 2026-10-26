"""Progressive code timeout: persistence, concurrent tabs and reset on success."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def state(page):
    return page.evaluate("""async()=>{const s=await import('./browser/storage.js');const scope=(await s.read()).salt;const state=await s.readAttempts(scope);return {...state,remaining:state.blockedUntil-Date.now()}}""")

def wrong(page):
    page.keyboard.type('99999999')
    expect(page.locator('#lockError')).to_contain_text('Code incorrect')
    expect(page.locator('#keypad button:disabled')).to_have_count(12)

def ready(page):
    expect(page.locator('#keypad')).to_be_visible()
    expect(page.locator('#lock')).to_have_attribute('aria-busy','false',timeout=15000)

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            context=browser.new_context(reduced_motion='reduce')
            page=context.new_page()
            page.clock.install()
            url=f'http://127.0.0.1:{server.server_port}/'
            page.goto(url);ready(page)
            page.evaluate("""async()=>{const c=await import('./browser/crypto.js');const s=await import('./browser/storage.js');const r=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'01234567');await s.write(r.envelope,0)}""")
            page.reload();ready(page)
            wrong(page)
            first=state(page)
            assert first['failures']==1 and 3500<first['remaining']<=5000,first
            page.keyboard.type('01234567')
            assert state(page)['blockedUntil']==first['blockedUntil']
            expect(page.locator('#app')).not_to_be_visible()
            print('PASS: premier echec, cinq secondes et aucune tentative acceptee pendant le delai')

            page.clock.fast_forward(5100)
            expect(page.locator('#keypad button').first).to_be_enabled()
            wrong(page)
            second=state(page)
            assert second['failures']==2 and 8500<second['remaining']<=10000,second
            other=context.new_page();other.goto(url);ready(other)
            assert state(other)['blockedUntil']==second['blockedUntil']
            expect(other.locator('#keypad button').first).to_be_disabled()
            other.reload();ready(other)
            assert state(other)['failures']==2
            assert state(other)['blockedUntil']==second['blockedUntil']
            print('PASS: deuxieme echec, dix secondes conservees apres rechargement et dans un autre onglet')

            page.clock.fast_forward(10100)
            expect(other.locator('#keypad button').first).to_be_enabled()
            wrong(other)
            third=state(other)
            assert third['failures']==3 and 13500<third['remaining']<=15000,third
            expect(page.locator('#keypad button').first).to_be_disabled()
            assert state(page)['failures']==3
            print('PASS: troisieme echec, quinze secondes et mise a jour des autres onglets')

            page.clock.fast_forward(15100)
            expect(other.locator('#keypad button').first).to_be_enabled()
            other.keyboard.type('01234567')
            expect(other.locator('#app')).to_be_visible(timeout=15000)
            other.wait_for_function("()=>!document.querySelector('#app').inert")
            assert state(other)['failures']==0
            other.evaluate('lockApplication()');ready(other)
            wrong(other)
            assert state(other)['failures']==1 and state(other)['remaining']<=5000
            print('PASS: code correct, remise a zero puis nouveau delai de cinq secondes')
            context.close();browser.close()
    finally:
        server.shutdown();server.server_close()

if __name__=='__main__':run()
