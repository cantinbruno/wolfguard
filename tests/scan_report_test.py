"""Exported reports stay complete, safe, readable offline and printable as PDF."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright, expect
from scan_workspace_test import Quiet, navigate, feed_report, export_report, PASSIVE

ROOT=Path(__file__).resolve().parents[1]


def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
            page=context.new_page();errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
              const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            page.reload();expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.keyboard.type('07942685');expect(page.locator('#app')).to_be_visible(timeout=20000)
            page.wait_for_function('()=>!document.querySelector("#app").inert')
            hostile='<img src="https://example.invalid/secret" onerror="alert(1)">'
            scenarios={
                'passive':PASSIVE,
                'active':{'strategy':'active','results':[
                    {'address':'192.0.2.1','port':22,'transport':'TCP','status':'open','service':'ssh','product':'OpenSSH','version':'9.9','detail':'Bannière SSH reçue','hostname':hostile},
                    {'address':'192.0.2.1','port':443,'transport':'TCP','status':'closed','detail':'Connexion refusée'}]},
                'map':{'strategy':'active','results':[{'address':'192.0.2.'+str(i+1),'transport':'HOST','status':'reachable' if i<19 else 'no-response','detail':'Réponse TCP'} for i in range(20)]},
                'vulnerability':{'strategy':'passive','workspace':'vulnerability','results':[
                    {'address':'127.0.0.1','transport':'AUDIT','checkId':'firewall','title':'Pare-feu du poste','status':'issue','severity':'high','detail':'Protection inactive','recommendation':'Activer le pare-feu'},
                    {'address':'127.0.0.1','transport':'AUDIT','checkId':'updates','title':'Correctifs disponibles','status':'notchecked','severity':'info','detail':'Cache indisponible'},
                    {'address':'127.0.0.1','transport':'AUDIT','checkId':'disk','title':'Chiffrement du disque','status':'passed','severity':'info','detail':'Protection active'}]}}
            offline=browser.new_context(viewport={'width':1200,'height':1000},offline=True)
            document=offline.new_page();requests=[];csp=[]
            document.on('pageerror',lambda error:errors.append(str(error)))
            document.on('request',lambda request:requests.append(request.url))
            document.on('console',lambda message:csp.append(message.text) if message.type=='error' else None)
            for kind,payload in scenarios.items():
                navigate(page,kind)
                if kind in ['passive','active']:page.locator('#scanTarget').fill('192.0.2.1')
                feed_report(page,json.dumps(payload),'Agence · '+kind)
                if kind=='active':
                    page.locator('[data-wg-tab=rows]').click();page.locator('#wgScanFilter').select_option('open')
                expect(page.locator('.wgscan-report-actions button')).to_have_count(1)
                expect(page.locator('#wgScanExport')).to_have_text('Exporter')
                html=export_report(page)
                path=ROOT/f'.cache/rapport-{kind}.html';path.write_text(html,encoding='utf-8')
                document.goto(path.as_uri())
                expect(document.locator('h1')).to_have_text({'passive':'Scan passif du réseau','active':'Scan actif du réseau','map':'Cartographie du réseau','vulnerability':'Scan de vulnérabilités'}[kind])
                expect(document.locator('.brand img')).to_have_count(1)
                assert document.locator('.brand img').evaluate('img=>img.complete&&img.naturalWidth>0')
                expect(document.locator('script')).to_have_count(1)
                expect(document.locator('img:not(.brand img),[onerror]')).to_have_count(0)
                if kind=='active':expect(document.locator('tbody tr')).to_have_count(2)
                if kind=='passive':
                    expect(document.locator('tbody tr')).to_have_count(1)
                    assert 'processName' not in html and '198.51.100.20' not in html
                if kind=='map':
                    expect(document.locator('.map .node')).to_have_count(16)
                    expect(document.locator('tbody tr')).to_have_count(20)
                if kind=='vulnerability':
                    expect(document.locator('.finding')).to_have_count(3)
                    expect(document.locator('.finding').first).to_contain_text('Activer le pare-feu')
                document.evaluate('()=>{window.__prints=0;window.print=()=>{window.__prints++}}')
                document.locator('#print-report').click();assert document.evaluate('window.__prints')==1
                for width in [1200,390,320]:
                    document.set_viewport_size({'width':width,'height':1000})
                    assert document.evaluate('document.documentElement.scrollWidth<=innerWidth'),(kind,width)
                    expect(document.locator('.body > .section')).to_have_count(3 if kind=='map' else 2)
                    assert document.locator('.body > .section').first.bounding_box()['width']>=document.locator('.metrics').bounding_box()['width']*.98
                    if width in [1200,390]:document.screenshot(path=str(ROOT/f'.cache/rapport-{kind}-{width}.png'),full_page=True)
                document.set_viewport_size({'width':1200,'height':1000})
                document.emulate_media(media='print')
                expect(document.locator('.toolbar')).not_to_be_visible()
                pdf=document.pdf(path=str(ROOT/f'.cache/rapport-{kind}.pdf'),print_background=True,prefer_css_page_size=True)
                assert pdf.startswith(b'%PDF-') and len(pdf)>10000
                document.emulate_media(media='screen')
            assert not errors,errors
            assert not csp,csp
            assert not any(url.startswith(('http:','https:')) for url in requests),requests
            print('PASS: four complete reports, offline assets, escaped scan data, 320px layout and functional PDF printing')
            browser.close()
    finally:
        server.shutdown();server.server_close()


if __name__=='__main__':run()
