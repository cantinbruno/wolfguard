"""End-to-end security and persistence checks, using disposable browser profiles."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import tempfile

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
PASSWORD = 'test seulement quatre mots aleatoires 734!'
NEW_PASSWORD = 'autre phrase de test uniquement 682!'


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT / 'docs')))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    with tempfile.TemporaryDirectory(prefix='wolfguard-tests-') as temp, sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        errors, violations, outbound = [], [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: violations.append(message.text) if 'Content Security Policy' in message.text else None)
        page.on('request', lambda request: outbound.append(request.url) if not request.url.startswith(origin) else None)
        page.goto(origin)
        page.locator('#master').fill(PASSWORD)
        page.locator('#master-confirm').fill(PASSWORD)
        page.locator('#auth-submit').click()
        expect(page.locator('#workspace')).to_be_visible()

        page.locator('#new-folder').click()
        page.locator('#folder-name').fill('Procédures')
        page.locator('#folder-form button[type=submit]').click()
        expect(page.locator('#folder-dialog')).not_to_be_visible()
        page.locator('#new-item').click()
        malicious = '<img src=x onerror="window.xss=true">'
        page.locator('#item-title').fill(malicious)
        page.locator('#item-content').fill('Une note confidentielle de test, sans donnée réelle.')
        page.locator('#item-folder').select_option(label='Procédures')
        page.locator('#save-item').click()
        expect(page.locator('.item-card h2')).to_have_text(malicious)
        assert not page.evaluate('Boolean(window.xss)')
        assert page.locator('.item-card img').count() == 0
        print('PASS: création, dossier, mémo, contenu XSS rendu en texte')

        page.locator('[data-section=vault]').click()
        page.locator('#new-item').click()
        page.locator('#item-title').fill('Identifiant de test')
        page.locator('#item-username').fill('test@example.invalid')
        page.locator('#item-password').fill('SECRET-VAULT-EXAMPLE-783!')
        page.locator('#item-url').fill('https://example.invalid')
        page.locator('#save-item').click()
        expect(page.locator('.item-card')).to_have_count(1)
        assert 'SECRET-VAULT' not in page.locator('#items').inner_text()
        envelope = page.evaluate("async () => { const {read}=await import('./storage.js'); return await read(); }")
        serialized = json.dumps(envelope)
        for secret in [PASSWORD, 'Identifiant de test', 'SECRET-VAULT', 'test@example.invalid', 'Procédures', 'note confidentielle']:
            assert secret not in serialized
        print('PASS: stockage persistant entièrement chiffré, titres compris')

        crypto_result = page.evaluate("""async ({password,envelope}) => {
          const c=await import('./crypto.js');
          const opened=await c.open(envelope,password);
          const sealed=await c.seal(opened.payload,opened.key,opened.salt,2);
          let tamperRejected=false, wrongRejected=false;
          const changed=structuredClone(envelope);
          changed.data=(changed.data[0]==='A'?'B':'A')+changed.data.slice(1);
          try{await c.open(changed,password)}catch{tamperRejected=true}
          try{await c.open(envelope,'un autre mot de passe incorrect')}catch{wrongRejected=true}
          return {tamperRejected,wrongRejected,freshIV:sealed.iv!==envelope.iv,extractable:opened.key.extractable};
        }""", {'password': PASSWORD, 'envelope': envelope})
        assert crypto_result == {'tamperRejected': True, 'wrongRejected': True, 'freshIV': True, 'extractable': False}
        print('PASS: mauvais mot de passe, altération, IV frais, clé non extractible')

        page.locator('#settings-button').click()
        with page.expect_download() as download_info:
            page.locator('#export-backup').click()
        backup = Path(temp) / 'backup.wgweb'
        download_info.value.save_as(backup)
        assert json.loads(backup.read_text())['data'] == envelope['data']
        page.locator('[data-close=settings-dialog]').click()
        page.locator('#lock-button').click()
        expect(page.locator('#gate')).to_be_visible()
        assert page.locator('#items').inner_text() == ''
        assert page.locator('#item-password').input_value() == ''
        page.locator('#master').fill('mot de passe incorrect')
        page.locator('#auth-submit').click()
        expect(page.locator('#auth-error')).to_contain_text('incorrect')
        expect(page.locator('#workspace')).not_to_be_visible()
        page.reload()
        page.locator('#master').fill(PASSWORD)
        page.locator('#auth-submit').click()
        expect(page.locator('.item-card')).to_have_count(1)
        print('PASS: export, verrouillage, nettoyage du DOM, réouverture persistante')

        page.locator('#settings-button').click()
        page.locator('#current-password').fill(PASSWORD)
        page.locator('#new-password').fill(NEW_PASSWORD)
        page.locator('#new-password-confirm').fill(NEW_PASSWORD)
        page.locator('#change-password-form button[type=submit]').click()
        expect(page.locator('#notice')).to_contain_text('Mot de passe modifié')
        page.locator('[data-close=settings-dialog]').click()
        page.locator('#lock-button').click()
        page.locator('#master').fill(PASSWORD)
        page.locator('#auth-submit').click()
        expect(page.locator('#auth-error')).to_contain_text('incorrect')
        page.locator('#master').fill(NEW_PASSWORD)
        page.locator('#auth-submit').click()
        expect(page.locator('#workspace')).to_be_visible()
        print('PASS: changement de mot de passe et invalidation de l’ancien')

        # A stale writer cannot overwrite a newer encrypted revision.
        conflict = page.evaluate("""async () => {const s=await import('./storage.js');const e=await s.read();try{await s.write(e,e.revision-1);return false}catch{return true}}""")
        assert conflict
        page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
        # Explicitly exercise hidden-tab lock without waiting five minutes.
        page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
        expect(page.locator('#workspace')).not_to_be_visible()
        page.reload()
        print('PASS: protection contre un enregistrement concurrent, verrouillage onglet masqué')

        restored_context = browser.new_context()
        restored_page = restored_context.new_page()
        restored_page.goto(origin)
        restored_page.locator('#backup-file').set_input_files(backup)
        expect(restored_page.locator('#gate-title')).to_have_text('Ouvrir votre sauvegarde.')
        restored_page.locator('#master').fill(PASSWORD)
        restored_page.locator('#auth-submit').click()
        expect(restored_page.locator('.item-card')).to_have_count(1)
        restored_page.locator('[data-section=vault]').click()
        restored_page.locator('.item-card').click()
        expect(restored_page.locator('#item-password')).to_have_value('SECRET-VAULT-EXAMPLE-783!')
        restored_page.locator('[data-close=editor-dialog]').first.click()
        restored_page.set_viewport_size({'width': 390, 'height': 844})
        assert restored_page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        print('PASS: restauration dans un autre profil et interface mobile')

        # No scripts or event attributes supplied by data can execute under CSP.
        blocked = restored_page.evaluate("""() => {const script=document.createElement('script');script.textContent='window.injected=true';document.head.append(script);const button=document.createElement('button');button.setAttribute('onclick','window.injected=true');document.body.append(button);button.click();script.remove();button.remove();return !window.injected}""")
        assert blocked
        assert not errors, errors
        assert not violations, violations
        assert not outbound, outbound
        print('PASS: politique CSP stricte, aucune erreur JavaScript, aucun appel externe')
        screenshot_dir = ROOT / '.cache'
        screenshot_dir.mkdir(exist_ok=True)
        restored_page.set_viewport_size({'width': 1440, 'height': 960})
        restored_page.screenshot(path=str(screenshot_dir / 'desktop.png'), full_page=True)
        restored_page.set_viewport_size({'width': 390, 'height': 844})
        restored_page.screenshot(path=str(screenshot_dir / 'mobile.png'), full_page=True)
        restored_context.close(); context.close(); browser.close()
    server.shutdown(); server.server_close()


if __name__ == '__main__':
    run()
