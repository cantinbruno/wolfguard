"""Normal, old and mistyped URLs must reach the real published PIN screen."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
SITE='https://wolfguard.wavetools.fr/'
API='https://wolfguard-web-cantin.paledove36.chatgpt.site'

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch()
        context=browser.new_context(reduced_motion='reduce')
        calls=[];errors=[]
        def backend(route):
            calls.append(urlsplit(route.request.url).path)
            assert urlsplit(route.request.url).path=='/api/status'
            route.fulfill(status=200,content_type='application/json',body='{"initialized":true}',headers={'Access-Control-Allow-Origin':SITE.rstrip('/')})
        def pages(route):
            relative=unquote(urlsplit(route.request.url).path).lstrip('/') or 'index.html'
            file=(DOCS/relative).resolve()
            if file.is_relative_to(DOCS) and file.is_file():
                types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}
                route.fulfill(status=200,body=file.read_bytes(),content_type=types.get(file.suffix,'application/octet-stream'))
            else:
                route.fulfill(status=404,body=(DOCS/'404.html').read_bytes(),content_type='text/html')
        context.route(SITE+'**',pages)
        context.route(API+'/**',backend)
        page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(SITE)
        expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
        assert page.locator('#app').evaluate('el=>el.classList.contains("hidden")')
        page.evaluate('localStorage.setItem("url-recovery-test","preserved")')
        for suffix in ['#access='+('f'*64),'#access=incorrect','?adresse=ancienne','ancienne-adresse','ancienne/adresse/','inconnue.html?return_to=https://example.invalid/']:
            page.goto(SITE+suffix)
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            if not suffix.startswith(('#','?')):expect(page).to_have_url(SITE)
            assert page.evaluate('localStorage.getItem("url-recovery-test")')=='preserved'
            assert page.locator('#app').evaluate('el=>el.classList.contains("hidden")')
        page.set_viewport_size({'width':390,'height':844})
        page.goto(SITE+'mauvais/chemin')
        expect(page).to_have_url(SITE)
        expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
        page.locator('[data-key="0"]').click()
        expect(page.locator('#pinDots .dot.on')).to_have_count(1)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert calls and all(path=='/api/status' for path in calls)
        assert not errors,errors
        browser.close()
        print('PASS: adresse normale, anciens liens et mauvais chemins ouvrent le clavier sur bureau et mobile; donnees du navigateur conservees, aucune cle URL ni session PIN requise pour afficher le clavier')

if __name__=='__main__':run()
