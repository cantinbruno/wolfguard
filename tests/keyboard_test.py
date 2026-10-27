"""Regression coverage for real keyboard codes, including French AZERTY."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def key(page,label,code,**modifiers):
    page.evaluate("""options=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{...options,bubbles:true,cancelable:true}))""",{'key':label,'code':code,**modifiers})

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            context=browser.new_context(reduced_motion='reduce')
            page=context.new_page()
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            expect(page.locator('#keypad')).to_be_visible()
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=10000)
            # A French top-row key reports a symbol until Shift is pressed.
            key(page,'&','Digit1')
            expect(page.locator('#pinDots .dot.on')).to_have_count(1)
            page.keyboard.press('Escape')
            symbols={'0':'à','1':'&','2':'é','3':'"','4':"'",'5':'(','6':'-','7':'è','8':'_','9':'ç'}
            for digit in '01234567':key(page,symbols[digit],'Digit'+digit)
            expect(page.locator('#lock .access-heading h2')).to_have_text('Confirmer le code')
            for digit in '01234567':page.locator('[data-key="'+digit+'"]').click()
            expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.wait_for_function("()=>!document.querySelector('#app').inert")
            print('PASS: chiffres physiques AZERTY sans Maj, confirmation a la souris')

            page.evaluate('lockApplication()')
            expect(page.locator('#lock')).to_have_attribute('aria-busy','false')
            # The numeric keypad still emits physical Numpad codes with NumLock off.
            keypad={'0':'Insert','1':'End','2':'ArrowDown','3':'PageDown','4':'ArrowLeft','5':'Clear','6':'ArrowRight','7':'Home'}
            for digit in '01234567':key(page,keypad[digit],'Numpad'+digit)
            expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.wait_for_function("()=>!document.querySelector('#app').inert")
            print('PASS: pave numerique physique avec Verr Num desactive')

            page.evaluate('lockApplication()')
            expect(page.locator('#lock')).to_have_attribute('aria-busy','false')
            page.locator('[data-key="3"]').focus()
            page.keyboard.press('Digit1')
            page.keyboard.press('Enter')
            expect(page.locator('#pinDots .dot.on')).to_have_count(1)
            page.keyboard.press('Backspace')
            expect(page.locator('#pinDots .dot.on')).to_have_count(0)
            page.keyboard.press('Digit2')
            page.keyboard.press('Delete')
            expect(page.locator('#pinDots .dot.on')).to_have_count(0)
            key(page,'a','KeyA')
            key(page,'1','Digit1',ctrlKey=True)
            expect(page.locator('#pinDots .dot.on')).to_have_count(0)
            page.keyboard.type('01234567')
            expect(page.locator('#app')).to_be_visible(timeout=20000)
            print('PASS: chiffres standards, retour arriere, effacement et focus sur les boutons')
            context.close();browser.close()
    finally:
        server.shutdown();server.server_close()

if __name__=='__main__':run()
