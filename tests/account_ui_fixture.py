"""Disposable headless browser and API fixture for account management."""
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json,os,subprocess
from playwright.sync_api import sync_playwright,expect
from shared_workspace_test import Quiet,ready,unlock,API,CODE
ROOT=Path(__file__).resolve().parents[1]

@contextmanager
def account_ui():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    process=subprocess.Popen([str(Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'),str(ROOT/'tests/server-fixture.mjs')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env={**os.environ,'WG_TEST_ORIGIN':origin})
    backend='http://127.0.0.1:'+str(json.loads(process.stdout.readline())['port'])
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);errors=[]
            def context():
                result=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True)
                result.route(API+'/**',lambda route:route.fulfill(response=route.fetch(url=backend+urlsplit(route.request.url).path+('?' +urlsplit(route.request.url).query if urlsplit(route.request.url).query else ''))))
                result.on('page',lambda page:page.on('pageerror',lambda error:errors.append(str(error))))
                return result
            context.backend=backend
            owner=context();page=owner.new_page();page.goto(origin+'/?sync-test');ready(page)
            page.evaluate("""async()=>{const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');const value=await c.create({version:2,items:[{id:'team-note',type:'memo',title:'Note partagée',content:'Contenu conservé',tags:[]}],folders:[],settings:[],activity:[]},'07942685');await s.write(value.envelope,0)}""")
            page.goto(origin+'/?sync-test&account-ui-test#activate='+('b'*64));unlock(page)
            yield page,context,origin,errors
            browser.close()
    finally:
        process.terminate();process.wait(timeout=10);server.shutdown();server.server_close()

def users(page):
    if not page.locator('.settings-modal').is_visible():page.locator('#settingsBtn').click()
    page.locator('#settings-tab-users').click();expect(page.locator('#wgUsersList')).to_contain_text('cantin.bruno@gmx.fr')

def invite(page,email):
    users(page);page.locator('#wgUserAdd').click();page.locator('#wgUserName').fill(email);page.locator('#wgUserSave').click();expect(page.locator('#wgUserInvitation')).to_be_visible()
    return page.locator('#wgUserInvitationLink').input_value()

def activate(page,url,email,code='12345678'):
    page.goto(url);expect(page.locator('#webAccountSetupForm')).to_be_visible();page.locator('#webAccountUsername').fill(email);page.locator('#webAccountCode').fill(code);page.locator('#webAccountConfirm').fill(code);page.locator('#webAccountSetupForm [type=submit]').click();expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
