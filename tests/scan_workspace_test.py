"""Real scan reports: parsing, comparison, encrypted persistence and browser layout."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
CODE='07942685'
PASSIVE={'neighbors':[{'IPAddress':'192.0.2.1','LinkLayerAddress':'00-11-22-33-44-55','InterfaceAlias':'Ethernet','State':'Reachable'}], 'connections':[
    {'LocalAddress':'0.0.0.0','LocalPort':22,'State':'Listen','OwningProcess':42},
    {'LocalAddress':'192.0.2.10','LocalPort':51000,'RemoteAddress':'198.51.100.20','RemotePort':443,'State':'Established','OwningProcess':88}],
    'udp':[{'LocalAddress':'0.0.0.0','LocalPort':5353,'OwningProcess':42}]}
XML='''<?xml version="1.0"?><!DOCTYPE nmaprun><nmaprun startstr="Wed Oct 28 08:00:00 2026"><host><status state="up" reason="echo-reply"/><address addr="192.0.2.50" addrtype="ipv4"/><hostnames><hostname name="&lt;img src=x onerror=alert(1)&gt;"/></hostnames><ports><extraports state="closed" count="997"/><port protocol="tcp" portid="22"><state state="open" reason="syn-ack"/><service name="ssh" product="OpenSSH" version="9.9"/><script id="ssh-hostkey" output="&lt;script&gt;alert(1)&lt;/script&gt;"/></port><port protocol="tcp" portid="23"><state state="closed" reason="reset"/><service name="telnet"/></port><port protocol="udp" portid="53"><state state="open|filtered"/><service name="domain"/></port></ports></host><host><status state="down" reason="no-response"/><address addr="192.0.2.51" addrtype="ipv4"/></host></nmaprun>'''

from site_fixture import WolfGuardTestHandler

class Quiet(WolfGuardTestHandler):
    def log_message(self,*args):pass

def navigate(page,kind):
    page.locator(f'.workspace-section-button[data-section=scan-{kind}]').click()
    page.wait_for_function('()=>!sectionTransition.active')
    expect(page.locator('.wgscan')).to_have_attribute('data-kind',kind)

def paste(page,content,name):
    page.locator('#wgScanPaste').click();page.locator('#wgScanPasteName').fill(name)
    page.locator('#wgScanPasteText').fill(content);page.locator('#wgScanAnalyze').click()

def save(page,name):
    page.locator('#wgScanSave').click();page.locator('.app-dialog-input').fill(name)
    page.locator('.app-dialog-submit').click()
    expect(page.locator('#wgScanStatus')).to_contain_text('Relevé enregistré dans',timeout=20000)

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
            page=context.new_page();errors=[];requests=[]
            page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda request:requests.append(request.url))
            page.goto(url);expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            page.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            page.reload();expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000);page.keyboard.type(CODE)
            expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            navigate(page,'passive');expect(page.locator('#scanStart')).to_have_count(0)
            expect(page.locator('#wgScanMetrics strong').first).to_have_text('—')
            page.screenshot(path=str(ROOT/'.cache/scan-passive-empty.png'),full_page=True)
            paste(page,json.dumps(PASSIVE),'Agence passive')
            expect(page.locator('#wgScanImportDialog')).not_to_be_visible()
            expect(page.locator('#wgScanReportStamp')).to_contain_text('Agence passive')
            assert page.locator('#wgScanMetrics strong').all_text_contents()==['3','1','1','2']
            page.locator('[data-wg-tab=rows]').click();expect(page.locator('#wgScanRows tbody tr')).to_have_count(4)
            page.locator('#wgScanFilter').select_option('listening');expect(page.locator('#wgScanRows tbody tr')).to_have_count(1)
            page.locator('#wgScanFilter').select_option('all');page.locator('#wgScanSearch').fill('198.51.100.20');expect(page.locator('#wgScanRows tbody tr')).to_have_count(1)
            page.locator('.wgscan-row-detail').click();expect(page.locator('#wgScanDetailBody')).to_contain_text('198.51.100.20:443')
            page.locator('#wgScanDetail [data-wg-close]').click();save(page,'Agence passive enregistrée')
            stored=page.evaluate("async()=>(await get('settings','scan-web-passive-reports-v1')).value")
            assert len(stored['reports'])==1 and len(stored['reports'][0]['rows'])==4
            encrypted=page.evaluate("async()=>await (await import('./browser/storage.js')).read()")
            assert 'Agence passive' not in json.dumps(encrypted) and '198.51.100.20' not in json.dumps(encrypted)
            page.locator('[data-wg-tab=changes]').click();page.locator('#wgScanReference').click()
            changed=json.loads(json.dumps(PASSIVE));changed['neighbors'][0]['LinkLayerAddress']='AA-BB-CC-DD-EE-FF';changed['connections'].pop();changed['connections'].append({'LocalAddress':'127.0.0.1','LocalPort':8080,'State':'Listen','OwningProcess':77})
            paste(page,json.dumps(changed),'Agence après modification');page.locator('[data-wg-tab=changes]').click()
            assert page.locator('.wgscan-change-counts b').all_text_contents()==['1','1','1']
            paste(page,'{"broken":','Import invalide');expect(page.locator('#wgScanImportError')).to_contain_text('JSON')
            page.locator('#wgScanImportDialog header [data-wg-close]').click();expect(page.locator('#wgScanReportStamp')).to_contain_text('Agence après modification')
            print('PASS: observations reelles, filtres, detail, sauvegarde chiffree et comparaison sans perte sur import invalide')

            # Additional parser fixtures cover platform formats, delimiters and limits.
            parsed=page.evaluate(r'''()=>{
              const parse=text=>webScanModel.parse(text,'passive').rows;
              const arp=parse('Interface : 192.0.2.10 --- 0x1\n  192.0.2.1  00-11-22-33-44-55 dynamique');
              const neigh=parse('2001:db8::1 dev eth0 lladdr 00:11:22:33:44:55 REACHABLE');
              const net=parse('TCP  0.0.0.0:22  0.0.0.0:0  LISTENING  42\nUDP  [::]:5353  *:*  42');
              const ss=parse('tcp ESTAB 0 0 192.0.2.10:51000 198.51.100.20:443 users:(("browser",pid=88,fd=1))');
              const csv=parse('"LocalAddress";"LocalPort";"State";"processName"\r\n"127.0.0.1";"8080";"Listen";"name; with ""quotes"""');
              let rejected=0;for(const input of ['x'.repeat(2097153),JSON.stringify(Array.from({length:5001},()=>({address:'192.0.2.1'})))])try{parse(input)}catch{rejected++;}
              return {arp:arp[0].macAddress,neigh:neigh[0].address,net:net.map(r=>r.status),ss:ss[0].pid,csv:csv[0].processName,rejected};
            }''')
            assert parsed=={'arp':'00-11-22-33-44-55','neigh':'2001:db8::1','net':['listening','bound'],'ss':88,'csv':'name; with "quotes"','rejected':2},parsed
            navigate(page,'active');page.locator('#scanTarget').fill('192.0.2.0/24')
            page.locator('[data-wg-profile=web]').click();expect(page.locator('#wgScanCommand')).to_contain_text('-p 80,443,8000,8080,8443')
            expect(page.locator('#wgScanCommand')).to_contain_text('-oX wolfguard-actif.xml 192.0.2.0/24')
            page.locator('#scanTarget').fill('192.0.2.1; curl invalid');expect(page.locator('#wgScanCopyCommand')).to_be_disabled()
            page.locator('#scanTarget').fill('-iL secret');expect(page.locator('#wgScanCopyCommand')).to_be_disabled()
            page.locator('#scanTarget').fill('192.0.2.50')
            page.locator('#wgScanFile').set_input_files({'name':'rapport-nmap.xml','mimeType':'application/xml','buffer':XML.encode()})
            expect(page.locator('#wgScanReportStamp')).to_contain_text('rapport-nmap.xml')
            assert page.locator('#wgScanMetrics strong').all_text_contents()==['2','1','1','3']
            expect(page.locator('.wgscan-warning')).to_contain_text('997')
            page.locator('[data-wg-tab=rows]').click();page.locator('#wgScanFilter').select_option('open')
            expect(page.locator('#wgScanRows tbody tr')).to_have_count(1)
            page.locator('.wgscan-row-detail').click();expect(page.locator('#wgScanDetailBody')).to_contain_text('OpenSSH 9.9')
            expect(page.locator('#wgScanDetailBody script,#wgScanDetailBody img')).to_have_count(0)
            page.locator('#wgScanDetail [data-wg-close]').click()
            with page.expect_download() as download:page.locator('#wgScanExport').click()
            csv=Path(download.value.path()).read_text(encoding='utf-8-sig')
            assert '192.0.2.50' in csv and 'OpenSSH' in csv and '192.0.2.51' not in csv
            assert page.evaluate("csv=>webScanModel.parse(csv,'active').rows.length",csv)==1
            rejected=page.evaluate('''()=>{let count=0;for(const xml of ['<!DOCTYPE nmaprun [<!ENTITY x SYSTEM "https://example.invalid/xxe">]><nmaprun/>','<nmaprun><host>','<html/>'])try{webScanModel.parse(xml,'active')}catch{count++;}return count;}''')
            assert rejected==3
            save(page,'Rapport actif enregistré');page.locator('[data-wg-tab=overview]').click()
            page.screenshot(path=str(ROOT/'.cache/scan-active-report.png'),full_page=True)
            print('PASS: XML Nmap complet, etats ambigus conserves, detail sans XSS, exports filtres et commandes validees')

            for width,height in [(1440,1000),(900,900),(390,844)]:
                page.set_viewport_size({'width':width,'height':height})
                for kind in ['passive','active']:
                    navigate(page,kind)
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,kind)
                    assert page.locator('#wgScanImport').is_visible()
                    if width==390:page.screenshot(path=str(ROOT/f'.cache/scan-{kind}-mobile.png'),full_page=True)
            page.evaluate('lockApplication()');expect(page.locator('#lock')).to_be_visible()
            assert page.evaluate("document.querySelectorAll('.wgscan').length")==0
            expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000);page.keyboard.type(CODE)
            expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            navigate(page,'active');page.locator('#wgScanSaved').select_option('0')
            expect(page.locator('#wgScanReportStamp')).to_contain_text('Rapport actif enregistré')
            navigate(page,'passive');page.locator('#wgScanSaved').select_option('0')
            expect(page.locator('#wgScanReportStamp')).to_contain_text('Agence passive enregistrée')
            assert not errors,errors
            assert not any('192.0.2.' in request or '198.51.100.' in request or 'example.invalid' in request for request in requests),requests
            print('PASS: deux espaces independants, bureau et mobile sans debordement, purge au verrouillage et restauration chiffree')
            browser.close()
    finally:server.shutdown();server.server_close()

if __name__=='__main__':run()
