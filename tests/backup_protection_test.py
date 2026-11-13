"""Ensure backup controls are absent while existing encrypted data is preserved."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect
from site_fixture import WolfGuardTestHandler

ROOT = Path(__file__).resolve().parents[1]
CODE = '01234567'


class Quiet(WolfGuardTestHandler):
    def log_message(self, *_args):
        pass


def ready(page):
    expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)


def unlock(page):
    ready(page)
    page.keyboard.type(CODE)
    expect(page.locator('#app')).to_be_visible(timeout=30000)
    page.wait_for_function("() => !document.querySelector('#app').inert")


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT/'docs')))
    Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}/'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(accept_downloads=True)
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url)
            ready(page)
            page.evaluate("""async code => {
                const c=await import('./browser/crypto.js'),s=await import('./browser/storage.js');
                const payload={version:2,items:[{id:'backup-note',type:'memo',title:'Document conserve',content:'<p>Confidentiel</p>',tags:[],folderId:null},{id:'backup-vault',type:'vault',title:'Acces conserve',tags:[],folderId:null}],folders:[],settings:[],activity:[]};
                const result=await c.create(payload,code),iv=crypto.getRandomValues(new Uint8Array(12));
                const secret={username:'test@example.invalid',password:'PRIVATE-RESTORED-SECRET',custom:[]};
                const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},result.key,new TextEncoder().encode(JSON.stringify(secret)));
                payload.items[1].vaultBlobEnc={iv:[...iv],data:[...new Uint8Array(data)]};payload.items[1].encryptionVersion=2;
                await s.write(await c.seal(payload,result.key,result.salt,1),0);
            }""", CODE)
            page.reload()
            unlock(page)
            stored = page.evaluate("async()=>JSON.stringify(await (await import('./browser/storage.js')).read())")
            page.evaluate("async()=>{const s=await import('./browser/storage.js');await s.preserve(await s.read(),true);}")
            recovery = page.evaluate("async()=>JSON.stringify(await (await import('./browser/storage.js')).readRecovery())")
            downloads = []
            page.on('download', lambda download: downloads.append(download))
            page.locator('#settingsBtn').click()
            page.locator('[data-settings-tab=data]').click()
            expect(page.locator('#exp,#imp,#impFile,#webBackupFile,#exportRecovery,#changeBaseBtn')).to_have_count(0)
            expect(page.locator('#settings-data')).not_to_contain_text('sauvegarde')
            page.locator('#saveBaseBtn').click()
            expect(page.locator('.app-notices')).to_contain_text('enregistr')
            assert page.evaluate("async()=>{for(const fn of [exportDB,importDB]){try{await fn([]);return false;}catch{}}return true;}")
            page.locator('#closeSettingsBtn').click()
            page.evaluate('lockApplication()')
            expect(page.locator('#webBackupFile,#webCancelRestore')).to_have_count(0)
            unlock(page)
            page.reload()
            expect(page.locator('#app')).to_be_visible(timeout=30000)
            page.wait_for_function("() => !document.querySelector('#app').inert")
            assert page.evaluate("async()=>(await get('items','backup-note')).title") == 'Document conserve'
            assert page.evaluate("async()=>(await vaultData(await get('items','backup-vault'))).password") == 'PRIVATE-RESTORED-SECRET'
            assert page.evaluate("async()=>JSON.stringify(await (await import('./browser/storage.js')).read())") == stored
            assert page.evaluate("async()=>JSON.stringify(await (await import('./browser/storage.js')).readRecovery())") == recovery
            assert not downloads
            assert not errors, errors
            browser.close()
            print('PASS: no backup controls or downloads; encrypted workspace, vault and existing recovery preserved across lock and reload.')
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    run()
