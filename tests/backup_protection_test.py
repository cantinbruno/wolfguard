"""Restore real protected/legacy backups with disposable data in headless browsers."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
import json
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
        with sync_playwright() as p, TemporaryDirectory(prefix='protected-backup-', dir=ROOT/'.cache') as output:
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
            page.locator('#settingsBtn').click()
            page.locator('[data-settings-tab=data]').click()
            downloads = []
            page.on('download', lambda download: downloads.append(download))
            page.locator('#exp').click()
            expect(page.locator('.app-dialog-input')).to_have_attribute('readonly', '')
            page.locator('.app-dialog-cancel').click()
            expect(page.locator('.app-dialog')).to_have_count(0)
            assert not downloads
            with page.expect_download() as event:
                page.locator('#exp').click()
                key = page.locator('.app-dialog-input').input_value()
                assert len(key) == 64
                for width in [1440,390]:
                    page.set_viewport_size({'width':width,'height':950})
                    assert page.locator('.app-dialog').evaluate('el=>el.getBoundingClientRect().width <= innerWidth'), width
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
                page.locator('.app-dialog-submit').click()
            target = Path(output)/'protected.wgweb'
            event.value.save_as(target)
            exported = json.loads(target.read_text(encoding='utf8'))
            assert exported['format'] == 'wolfguard-backup'
            for secret in [key, CODE, 'PRIVATE-RESTORED-SECRET', 'Document conserve']:
                assert secret not in target.read_text(encoding='utf8')
            persisted = page.evaluate("""async () => {
                const s=await import('./browser/storage.js'),db=await s.connect();
                const records=await new Promise((resolve,reject)=>{const tx=db.transaction('encrypted','readonly'),r=tx.objectStore('encrypted').getAll();tx.oncomplete=()=>resolve(r.result);tx.onerror=reject;});
                return JSON.stringify({local:{...localStorage},session:{...sessionStorage},records});
            }""")
            assert key not in persisted
            legacy = Path(output)/'legacy.wgweb'
            legacy.write_text(page.evaluate("async()=>JSON.stringify(await (await import('./browser/storage.js')).read())"), encoding='utf8')
            page.locator('#exp').click()
            expect(page.locator('.app-dialog')).to_be_visible()
            page.evaluate('lockApplication()')
            expect(page.locator('.app-dialog')).to_have_count(0)
            assert len(downloads) == 1
            restored_context = browser.new_context()
            restored = restored_context.new_page()
            restored.on('pageerror', lambda error: errors.append(str(error)))
            restored.goto(url)
            ready(restored)
            restored.locator('#webBackupFile').set_input_files(target)
            restored.locator('.app-dialog-input').fill('0'*64)
            restored.locator('.app-dialog-submit').click()
            expect(restored.locator('.app-notices')).to_contain_text('Clé de sauvegarde incorrecte')
            assert restored.evaluate('state.vaultKey===null')
            assert restored.evaluate("async()=>await (await import('./browser/storage.js')).read()") is None
            restored.locator('#webBackupFile').set_input_files(target)
            restored.locator('.app-dialog-input').fill(key)
            restored.locator('.app-dialog-submit').click()
            expect(restored.locator('#lock .access-heading h2')).to_have_text('Ouvrir une sauvegarde')
            unlock(restored)
            assert restored.evaluate("async()=>(await get('items','backup-note')).title") == 'Document conserve'
            assert restored.evaluate("async()=>(await vaultData(await get('items','backup-vault'))).password") == 'PRIVATE-RESTORED-SECRET'
            old_context = browser.new_context()
            old = old_context.new_page()
            old.goto(url)
            ready(old)
            old.locator('#webBackupFile').set_input_files(legacy)
            expect(old.locator('#lock .access-heading h2')).to_have_text('Ouvrir une sauvegarde')
            expect(old.locator('.app-dialog')).to_have_count(0)
            unlock(old)
            assert old.evaluate("async()=>(await vaultData(await get('items','backup-vault'))).password") == 'PRIVATE-RESTORED-SECRET'
            assert not errors, errors
            browser.close()
            print('PASS: export annule ou verrouille sans telechargement, cle non persistee, mauvais secret sans modification, restauration complete du coffre et compatibilite des anciennes sauvegardes.')
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    run()
