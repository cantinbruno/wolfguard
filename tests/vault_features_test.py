"""Headless vault features: password strength, reuse warning, breach check, live TOTP code and CSV import."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import hashlib,json,re,time
from playwright.sync_api import sync_playwright,expect
from original_app_test import Quiet,enter_code
from otp_workspace_test import otp

ROOT=Path(__file__).resolve().parents[1]
CODE='01234567'
SECRET='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
WEAK='abc12345'

def create_access(page,title,password,totp=''):
    page.get_by_role('button',name='Nouvel accès',exact=True).click();expect(page.locator('#fTitle')).to_be_visible()
    page.locator('#fTitle').fill(title);page.locator('#fUser').fill(title.lower()+'@example.invalid');page.locator('#fPass').fill(password)
    if totp:page.locator('#fTotp').fill(totp)

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')));Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            breach_requests=[]
            suffix=hashlib.sha1(WEAK.encode()).hexdigest().upper()[5:]
            def breach(route):
                breach_requests.append(route.request.url)
                route.fulfill(status=200,content_type='text/plain',body='0000000000000000000000000000000000A:1\r\n'+suffix+':4242\r\n')
            context.route('https://api.pwnedpasswords.com/**',breach)
            page.goto(origin+'/');enter_code(page,CODE,creating=True);expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.locator('.workspace-section-button[data-section=vault]').click();page.wait_for_function('()=>!sectionTransition.active');expect(page.locator('.catalog-vault h2')).to_have_text('Coffre-fort')

            # Live strength while typing, and an invalid TOTP secret keeps the draft open.
            create_access(page,'Premier',WEAK,'pas valide !')
            expect(page.locator('#editStrengthText')).to_contain_text('Très faible')
            page.locator('#fPass').fill('k7#Vq2!mR9zL-Xw4$Tn8');expect(page.locator('#editStrengthText')).to_contain_text('Très fort')
            page.locator('#fPass').fill(WEAK)
            page.locator('.vault-edit-footer .primary').click();expect(page.get_by_text('Le secret TOTP est invalide')).to_be_visible();expect(page.locator('#fTotp')).to_be_visible()
            page.locator('#fTotp').fill(SECRET);page.locator('.vault-edit-footer .primary').click();expect(page.locator('#passMask')).to_be_visible()

            # Live code matches an independent RFC 6238 implementation (one step of tolerance at a boundary).
            expect(page.locator('#totpCode')).to_have_text(re.compile(r'^\d{3} \d{3}$'),timeout=5000)
            shown=page.locator('#totpCode').inner_text().replace(' ','');now=time.time()
            assert shown in {otp(SECRET,now-30),otp(SECRET,now),otp(SECRET,now+30)},shown
            expect(page.locator('#totpTimer')).to_have_text(re.compile(r'^\d+ s$'))
            page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.vaultTestClipboard=text,readText:async()=>window.vaultTestClipboard}})")
            page.locator('#copyTotp').click();page.wait_for_function('()=>/^\\d{6}$/.test(window.vaultTestClipboard||"")')
            stored=page.evaluate("async()=>(await all('items')).find(item=>item.title==='Premier')")
            assert SECRET not in json.dumps(stored) and WEAK not in json.dumps(stored),'secrets stay encrypted'
            expect(page.locator('#strengthText')).to_contain_text('Très faible');expect(page.locator('#strengthMeter')).to_have_attribute('data-score','0')

            # Breach check: one request, five hash characters, the count is shown.
            page.locator('#checkPwned').click();expect(page.locator('#pwnedText')).to_contain_text('4 242'.replace(' ',' '))
            assert len(breach_requests)==1 and breach_requests[0].endswith('/range/'+hashlib.sha1(WEAK.encode()).hexdigest().upper()[:5]),breach_requests
            assert WEAK not in breach_requests[0]

            # A second access with the same password is reported on both entries.
            page.locator('#workspaceBack').click();create_access(page,'Second',WEAK)
            page.locator('.vault-edit-footer .primary').click();expect(page.locator('#reuseText')).to_contain_text('Même mot de passe que : Premier',timeout=5000)

            # CSV import: Bitwarden format, a duplicate of an existing access, a note without credentials and a bad TOTP.
            page.locator('#workspaceBack').click()
            csv=('folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n'
                 'Work,,login,Premier,doublon,,0,,premier@example.invalid,'+WEAK+',\n'
                 'Work,,login,Messagerie,"ligne 1\nligne 2",,0,https://mail.example.invalid,alice@example.invalid,Imp0rt-Secret-77!,'+SECRET+'\n'
                 ',,login,Nas,,,0,nas.example.invalid,admin,Nas-Secret-88!,not-a-secret\n'
                 ',,note,Memo sans accès,texte,,0,,,,\n')
            page.get_by_role('button',name='Importer des accès (CSV)',exact=True).click()
            page.locator('#vaultImportFile').set_input_files({'name':'export.csv','mimeType':'text/csv','buffer':csv.encode()})
            expect(page.locator('#vaultImportPreview')).to_contain_text('2 accès prêts',timeout=10000)
            expect(page.locator('#vaultImportPreview')).to_contain_text('1 déjà présent');expect(page.locator('#vaultImportPreview')).to_contain_text('TOTP invalide')
            assert 'Imp0rt-Secret-77!' not in page.locator('#vaultImportPreview').inner_text(),'preview never shows passwords'
            page.locator('#vaultImportRun').click();expect(page.locator('#modalRoot')).to_be_empty(timeout=15000)
            page.locator('#workspaceLocalSearch').fill('Messagerie');expect(page.locator('#workspaceCatalogItems article')).to_have_count(1)
            imported=page.evaluate("async()=>(await all('items')).filter(item=>item.type==='vault'&&['Messagerie','Nas'].includes(item.title))")
            assert len(imported)==2
            for item in imported:
                assert 'Imp0rt-Secret-77!' not in json.dumps(item) and 'Nas-Secret-88!' not in json.dumps(item) and item['vaultBlobEnc']
            page.locator('.workspace-item-title').click();expect(page.locator('#totpCode')).to_have_text(re.compile(r'^\d{3} \d{3}$'),timeout=5000)
            page.evaluate("async()=>{const item=(await all('items')).find(i=>i.title==='Nas');window.nasData=await vaultData(item,false)}")
            assert page.evaluate('window.nasData.totp')=='','invalid TOTP is not imported'
            for width in [1440,390,320]:
                page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            assert not errors,errors
            browser.close()
    finally:server.shutdown();server.server_close()
    print('PASS: vault password strength, reuse and breach warnings, live TOTP, TOTP validation and CSV import with duplicates, encryption and mobile layout')

if __name__=='__main__':run()
