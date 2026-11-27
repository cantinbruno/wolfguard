"""Headless, real API: a vault entry is shared through a one-time link opened without any account."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from urllib.request import Request,urlopen
import json,os,subprocess
from playwright.sync_api import sync_playwright,expect
from node_runtime import node_executable
from shared_workspace_test import Quiet,ready,API,CODE

ROOT=Path(__file__).resolve().parents[1]
PASSWORD='SHARED-LINK-SECRET-42!'

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    process=subprocess.Popen([str(node_executable()),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin,'WG_TEST_MANUAL_USERS':'1'})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    def api(path,data,token=None,method='POST',headers=None):
        raw=json.dumps(data).encode();h={'Origin':origin,'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {}),**(headers or {})}
        with urlopen(Request(backend+'/api/'+path,data=raw,headers=h,method=method)) as response:return json.load(response)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);errors=[]
            def context():
                c=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                c.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+('?'+urlsplit(route.request.url).query if urlsplit(route.request.url).query else ''))))
                c.on('page',lambda page:page.on('pageerror',lambda error:errors.append(str(error))))
                return c
            owner=context().new_page();owner.goto(origin+'/?sync-test');ready(owner)
            encrypted=owner.evaluate("""async()=>{const c=await import('./browser/crypto.js');const result=await c.create({version:2,items:[],folders:[],settings:[],activity:[]},'99887766');return {envelope:result.envelope,workspace:await c.workspaceMaterial('99887766',result.salt)}}""")
            setup=api('setup',{'code':'99887766'},headers={'X-WG-Activation':'b'*64})
            serialized=json.dumps(encrypted['envelope']).encode()
            api('vault',encrypted['envelope'],setup['token'],'PUT',{'X-WG-Version':'0','X-WG-Size':str(len(serialized))})
            api('users/initialize',{'username':'cantin.bruno@gmx.fr','code':CODE,'oldCode':'99887766','workspace':encrypted['workspace'],'version':1},setup['token'])
            owner.reload();ready(owner);owner.locator('#lock').focus();owner.keyboard.type(CODE)
            expect(owner.locator('#app')).to_be_visible(timeout=20000);owner.wait_for_function('()=>!document.querySelector("#app").inert')
            owner.locator('.workspace-section-button[data-section=vault]').click();owner.wait_for_function('()=>!sectionTransition.active')
            owner.get_by_role('button',name='Nouvel accès',exact=True).click();expect(owner.locator('#fTitle')).to_be_visible()
            owner.locator('#fTitle').fill('Serveur NAS');owner.locator('#fUser').fill('admin-nas');owner.locator('#fPass').fill(PASSWORD);owner.locator('#fNotes').fill('NOTE-NON-PARTAGEE')
            owner.locator('.vault-edit-footer .primary').click();expect(owner.locator('#passMask')).to_be_visible()

            def create_link():
                owner.locator('#shareVault').click();expect(owner.locator('.share-field[value=password]')).to_be_checked();expect(owner.locator('.share-field[value=notes]')).not_to_be_checked()
                owner.locator('#shareCreate').click();expect(owner.locator('#shareLink')).to_be_visible(timeout=15000)
                return owner.locator('#shareLink').input_value()
            link=create_link()
            assert link.startswith(origin+'/share.html#'),link
            fragment=link.split('#',1)[1]
            assert PASSWORD not in link and 'admin-nas' not in link

            # The recipient has no account and no session: the page shows only the chosen fields, once.
            guest=context().new_page();guest.goto(link)
            expect(guest.locator('#shareOpen')).to_be_visible();expect(guest.locator('#shareFields')).to_be_hidden()
            assert PASSWORD not in guest.locator('body').inner_text(),'nothing is fetched before the click'
            guest.locator('#shareOpen').click();expect(guest.locator('#shareFields')).to_be_visible(timeout=15000)
            expect(guest.locator('h1')).to_have_text('Serveur NAS')
            text=guest.locator('#shareFields').inner_text();assert 'admin-nas' in text and PASSWORD not in text,'the password stays masked until revealed'
            assert 'NOTE-NON-PARTAGEE' not in guest.locator('body').inner_text()
            guest.get_by_role('button',name='Afficher',exact=True).click();expect(guest.locator('#shareFields')).to_contain_text(PASSWORD)
            assert guest.evaluate('location.hash')=='','the key is removed from the address bar'
            expect(guest.locator('#shareNote')).to_be_visible()

            # A second visit with the same link is refused: it worked exactly once.
            second=context().new_page();second.goto(origin+'/share.html#'+fragment)
            second.locator('#shareOpen').click();expect(second.locator('#shareStatus')).to_contain_text('expiré ou a déjà été utilisé',timeout=15000)
            assert PASSWORD not in second.locator('body').inner_text()

            # A broken link is explained, and a link cancelled by its creator stops working.
            broken=context().new_page();broken.goto(origin+'/share.html#abc');expect(broken.locator('#shareStatus')).to_contain_text('invalide')
            owner.get_by_role('button',name='Fermer',exact=True).click();expect(owner.locator('#modalRoot')).to_be_empty()
            link2=create_link()
            owner.locator('#shareRevoke').click();expect(owner.locator('#shareResult')).to_contain_text('Lien annulé')
            revoked=context().new_page();revoked.goto(link2);revoked.locator('#shareOpen').click()
            expect(revoked.locator('#shareStatus')).to_contain_text('expiré ou a déjà été utilisé',timeout=15000)
            for width in [390,320]:
                guest.set_viewport_size({'width':width,'height':844});assert guest.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            assert not errors,errors
            browser.close()
    finally:process.terminate();process.wait(timeout=10);server.shutdown();server.server_close()
    print('PASS: vault entry shared by a one-time encrypted link: only chosen fields, no account needed, key removed after reading, second visit and cancelled links refused')

if __name__=='__main__':run()
