"""Direct PDF exports, complete archives and settings dimensions across every tab."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
from io import BytesIO
from pypdf import PdfReader
import pypdfium2 as pdfium
from playwright.sync_api import sync_playwright, expect
from scan_workspace_test import Quiet, navigate, feed_report, download_report, pdf_text, PASSIVE

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
            requests=[];page.on('request',lambda request:requests.append(request.url))
            assert not any('pdfmake' in url for url in requests)
            for kind,payload in scenarios.items():
                navigate(page,kind)
                if kind in ['passive','active']:page.locator('#scanTarget').fill('192.0.2.1')
                payload={**payload,'startedAt':'2026-11-03T10:00:00Z','finishedAt':'2026-11-03T10:00:02.500Z','agentName':'Poste bureau','platform':'win32'}
                feed_report(page,json.dumps(payload),'Agence · '+kind)
                expect(page.locator('.scan-report-state')).to_have_text('Terminé')
                expect(page.locator('.scan-report-meta')).to_contain_text('2,5 s')
                page.locator('#wgScanDossier summary').click()
                expect(page.locator('#wgScanDossier')).to_contain_text('Poste bureau')
                expect(page.locator('#wgScanDossier')).to_contain_text('Méthode')
                expect(page.locator('#wgScanDossier img,#wgScanBrief img,#wgScanReportStamp img')).to_have_count(0)
                page.screenshot(path=str(ROOT/f'.cache/report-screen-{kind}-1440.png'),animations='disabled')
                page.set_viewport_size({'width':390,'height':844})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),kind
                page.screenshot(path=str(ROOT/f'.cache/report-screen-{kind}-390.png'),animations='disabled')
                page.set_viewport_size({'width':1440,'height':1000})
                page.locator('#wgScanDossier summary').click()
                if kind=='active':
                    page.locator('[data-report-filter=open]').click()
                    expect(page.locator('#wgScanFilter')).to_have_value('open')
                    expect(page.locator('#wgScanRows tbody tr')).to_have_count(1)
                expect(page.locator('.wgscan-report-actions button')).to_have_count(1)
                expect(page.locator('#wgScanExport')).to_have_text('Exporter PDF')
                data=download_report(page);reader=PdfReader(BytesIO(data));text=pdf_text(data)
                (ROOT/f'.cache/rapport-{kind}.pdf').write_bytes(data)
                assert len(reader.pages)>=1 and len(data)>10000
                assert reader.metadata.title.startswith('WolfGuard')
                for sheet in reader.pages:
                    assert abs(float(sheet.mediabox.width)-595.28)<1
                    assert abs(float(sheet.mediabox.height)-841.89)<1
                    assert not sheet.get('/AA') and not sheet.get('/Annots')
                assert not reader.root_object.get('/OpenAction')
                assert not reader.root_object.get('/Names',{}).get('/JavaScript')
                assert 'Agence · '+kind in text and 'Synthèse' in text
                assert 'INFORMATIONS DU SCAN' in text and 'Poste bureau' in text and '2,5 s' in text
                if kind=='active':assert all(value in text for value in ['OpenSSH','Connexion refusée','Fermé'])
                if kind=='passive':assert '198.51.100.20' not in text and 'processName' not in text
                if kind=='map':assert all('192.0.2.'+str(i+1) in text for i in range(20))
                if kind=='vulnerability':assert all(value in text for value in ['Activer le pare-feu','Cache indisponible','Protection active'])
                rendered=pdfium.PdfDocument(data)
                try:
                    rendered[0].render(scale=1.4).to_pil().save(ROOT/f'.cache/rapport-{kind}-page1.png')
                    if len(rendered)>1:rendered[len(rendered)-1].render(scale=1.4).to_pil().save(ROOT/f'.cache/rapport-{kind}-last.png')
                finally:rendered.close()
            assert sum('/vendor/pdfmake-0.3.13.min.js' in url for url in requests)==1
            assert sum('/vendor/pdfmake-roboto-3.014.js' in url for url in requests)==1
            assert not any(url.startswith(('http:','https:')) and not url.startswith(f'http://127.0.0.1:{server.server_port}/') for url in requests),requests
            # All rows, the final observation and repeated table headers survive pagination.
            navigate(page,'active');page.locator('#wgScanNew').click();page.locator('#scanTarget').fill('192.0.2.1')
            many={'strategy':'active','results':[{'address':'192.0.2.1','port':i+1,'transport':'TCP','status':'open','service':'test','detail':'preuve-complete-'+str(i)} for i in range(180)]}
            feed_report(page,json.dumps(many),'Rapport long')
            data=download_report(page);reader=PdfReader(BytesIO(data));text=pdf_text(data)
            assert len(reader.pages)>=4 and all('preuve-complete-'+str(i) in text for i in range(180))
            assert text.count('Adresse / port')>=4
            (ROOT/'.cache/rapport-pagination.pdf').write_bytes(data)
            print('PASS: genuine A4 PDFs, selectable French text, embedded fonts, complete pagination, safe scan data and local-only generation')
            # Every Settings tab must keep the same outer size for a given viewport.
            for width,height in [(1440,1000),(1100,900),(900,900),(640,900),(390,844),(320,720)]:
                page.set_viewport_size({'width':width,'height':height})
                page.evaluate("openSettings('security')")
                expect(page.locator('#settings-tab-security')).to_have_attribute('aria-selected','true')
                page.locator('.settings-modal').evaluate('async el=>{await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{})))}')
                baseline=page.locator('.settings-modal').bounding_box()
                for tab in ['security','data','interface','agents','access','history']:
                    page.locator('#settings-tab-'+tab).click()
                    expect(page.locator('#settings-tab-'+tab)).to_have_attribute('aria-selected','true')
                    box=page.locator('.settings-modal').bounding_box()
                    assert abs(box['width']-baseline['width'])<.5 and abs(box['height']-baseline['height'])<.5,(width,tab,baseline,box)
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,tab)
                    assert page.locator('.settings-main').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),(width,tab)
                    if width in [1440,390] and tab in ['security','agents','history']:
                        page.screenshot(path=str(ROOT/f'.cache/settings-fixed-{tab}-{width}.png'),animations='disabled')
                page.locator('#closeSettingsBtn').click()
            assert not errors,errors
            print('PASS: all six Settings tabs keep identical dimensions from 320px mobile to 1440px desktop')
            browser.close()
    finally:
        server.shutdown();server.server_close()


if __name__=='__main__':run()
