"""Real access management: IP visibility, disconnect, block and unblock."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json,os,subprocess
from playwright.sync_api import sync_playwright,expect
from shared_workspace_test import Quiet,ready,unlock,API,CODE

ROOT=Path(__file__).resolve().parents[1]

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
    process=subprocess.Popen([str(node),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch();errors=[];outage={'active':False}
            def context(ip):
                result=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                def proxy(route):
                    path=urlsplit(route.request.url).path
                    if ip=='198.51.100.1' and path=='/api/access' and outage['active']:
                        route.fulfill(status=503,json={'error':'Test service indisponible'});return
                    route.fulfill(response=route.fetch(url=backend+path+'?'+urlsplit(route.request.url).query,headers={**route.request.headers,'cf-connecting-ip':ip}))
                result.route(API+'/**',proxy);return result
            owner=context('198.51.100.1');guest=context('192.0.2.5');other=context('2001:db8::6')
            first=owner.new_page();first.goto(origin+'/?sync-test');ready(first)
            first.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');await s.write(result.envelope,0)}""")
            first.goto(origin+'/?sync-test&access-test#activate='+('b'*64));unlock(first)
            first.evaluate("""async()=>{for(const [username,code]of [['access-second@example.test','12345678'],['access-third@example.test','23456789']]){const added=await WolfGuardCloud.agentRequest('users/create',{username});await fetch(WolfGuardCloud.API_ORIGIN+'/api/account/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,code,ticket:added.invitation.ticket})});}}""")
            second=guest.new_page();second.goto(origin+'/?sync-test');unlock(second,'12345678')
            third=other.new_page();third.goto(origin+'/?sync-test');unlock(third,'23456789')
            for page in [first,second,third]:page.on('pageerror',lambda error:errors.append(str(error)))
            first.locator('#settingsBtn').click();first.locator('#settings-tab-access').click()
            expect(first.locator('#wgAccessCount')).to_have_text('3 sessions')
            expect(first.locator('#wgAccessConnections')).to_contain_text('192.0.2.5')
            expect(first.locator('#wgAccessConnections')).to_contain_text('2001:db8::6')
            expect(first.locator('#wgAccessIP')).to_contain_text('198.51.100.1')
            token=first.evaluate('WolfGuardCloud.sessionState().token')
            assert token not in first.locator('#settings-access').inner_html()
            self_row=first.locator('[data-access-session]').filter(has=first.get_by_text('Cet onglet',exact=True))
            expect(self_row.get_by_role('button',name='Bloquer l’IP',exact=True)).to_be_disabled()
            for width in [1440,900,640,390,320]:
                first.set_viewport_size({'width':width,'height':1000 if width>640 else 844})
                assert first.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                assert first.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
                assert first.locator('#settings-access').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
                if width in [1440,390,320]:first.screenshot(path=str(ROOT/f'.cache/access-settings-{width}.png'),animations='disabled')
            first.set_viewport_size({'width':1440,'height':1000})
            print('PASS: live IPv4/IPv6 sessions, device labels, current tab, no exposed token, same settings dimensions and 320px layout')

            def target(ip):return first.locator('[data-access-session]').filter(has=first.locator('code').get_by_text(ip,exact=True))
            target('192.0.2.5').get_by_role('button',name='Déconnecter',exact=True).click()
            first.locator('.app-dialog-cancel').click()
            expect(target('192.0.2.5')).to_have_count(1)
            target('192.0.2.5').get_by_role('button',name='Déconnecter',exact=True).click();first.locator('.app-dialog-submit').click()
            expect(target('192.0.2.5')).to_have_count(0)
            second.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}')
            expect(second.locator('#lock')).to_be_visible();unlock(second,'12345678')
            first.locator('#wgAccessRefresh').click();expect(target('192.0.2.5')).to_have_count(1)
            print('PASS: confirmation can cancel, disconnect locks the remote browser and reconnecting with the code works')

            target('192.0.2.5').get_by_role('button',name='Bloquer l’IP',exact=True).click();first.locator('.app-dialog-submit').click()
            blocked=first.locator('#wgAccessBlocks .access-card').filter(has_text='192.0.2.5')
            expect(blocked).to_have_count(1)
            second.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(second.locator('#lock')).to_be_visible()
            ready(second);second.keyboard.type('12345678');expect(second.locator('#lockError')).to_contain_text('IP est bloquée')
            blocked.get_by_role('button',name='Débloquer').click();first.locator('.app-dialog-submit').click()
            expect(blocked).to_have_count(0);unlock(second,'12345678')
            expect(third.locator('#app')).to_be_visible()
            print('PASS: IP blocking cuts sessions, rejects the right code, and explicit unblocking permits a new session without affecting other IPs')

            first.locator('#wgAccessBlockIP').fill('2001:db8::99');first.locator('#wgAccessBlockSubmit').click();first.locator('.app-dialog-submit').click()
            manual=first.locator('#wgAccessBlocks .access-card').filter(has_text='2001:db8::99');expect(manual).to_have_count(1)
            first.locator('#wgAccessBlockIP').fill('198.51.100.1');first.locator('#wgAccessBlockSubmit').click();first.locator('.app-dialog-submit').click()
            expect(first.locator('#wgAccessError')).to_contain_text('propre adresse IP')
            # A server error cannot clear the known connection list or leave actions enabled.
            outage['active']=True;first.locator('#wgAccessRefresh').click()
            expect(first.locator('#wgAccessError')).to_contain_text('actualisés')
            expect(first.locator('#wgAccessConnections')).to_contain_text('198.51.100.1')
            expect(first.locator('#wgAccessConnections [data-access-action=disconnect]').first).to_be_disabled()
            outage['active']=False;first.locator('#wgAccessRefresh').click();expect(first.locator('#wgAccessError')).to_be_empty()
            first.locator('#settings-tab-security').click();first.locator('#settings-tab-access').click();expect(manual).to_have_count(1)
            print('PASS: persistent manual IPv6 blocks, self-block prevention, truthful outage handling and settings navigation cleanup')
            self_row.get_by_role('button',name='Déconnecter cet onglet').click();first.locator('.app-dialog-submit').click()
            expect(first.locator('#lock')).to_be_visible()
            assert third.evaluate('async()=>{await WolfGuardCloud.touch();return true}')
            assert not errors,errors
            browser.close()
    finally:
        server.shutdown();server.server_close();process.terminate();process.wait(timeout=10)

if __name__=='__main__':run()
