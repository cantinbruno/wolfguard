"""Headless: saving a memo keeps its previous versions; one can be restored from "Historique"."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright,expect
from original_app_test import Quiet,enter_code

ROOT=Path(__file__).resolve().parents[1]
CODE='01234567'

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'docs')));Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(origin+'/');enter_code(page,CODE,creating=True);expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
            page.wait_for_function("async()=>(await all('items')).some(item=>item.memoTemplateId==='procedure')",timeout=20000)
            template=page.evaluate("async()=>(await all('items')).find(item=>item.memoTemplateId==='procedure').id")
            page.evaluate(f"openItem('{template}')");page.get_by_role('button',name='Utiliser ce modèle',exact=True).click()
            expect(page.locator('#richEditor')).to_be_visible(timeout=10000)
            memo=page.evaluate('state.item')
            def save(text):
                page.locator('#richEditor').evaluate('(node,text)=>{node.innerHTML="<p>"+text+"</p>";node.dispatchEvent(new Event("input",{bubbles:true}))}',text)
                page.get_by_role('button',name='Enregistrer',exact=True).click();page.wait_for_function("()=>state.mode==='view'",timeout=10000)
            save('PREMIERE-VERSION')
            page.locator('[data-item-action=edit]').first.click();expect(page.locator('#richEditor')).to_be_visible();save('DEUXIEME-VERSION')
            item=page.evaluate(f"async()=>await get('items','{memo}')")
            assert 'DEUXIEME-VERSION' in item['content'] and len(item['history'])==2,[entry['content'][:40] for entry in item.get('history',[])]
            assert 'PREMIERE-VERSION' in item['history'][0]['content']
            history=page.get_by_role('button',name='Historique (2)',exact=True);expect(history).to_be_visible();history.click()
            expect(page.locator('.memo-version')).to_have_count(2);expect(page.locator('.memo-version').first).to_contain_text('PREMIERE-VERSION')
            page.locator('[data-memo-restore="0"]').click();page.locator('.app-dialog-confirm,.app-dialog-submit').first.click()
            check=f"""async()=>{{const x=await get('items','{memo}');return x.content.includes('PREMIERE-VERSION')&&x.history.some(e=>e.content.includes('DEUXIEME-VERSION'))&&!x.history.some(e=>e.content.includes('PREMIERE-VERSION'))}}"""
            page.wait_for_function(check,timeout=10000)
            page.wait_for_timeout(1500);assert page.evaluate(check),'restored state is stable: replaced version kept, restored one not listed twice'
            assert not errors,errors
            browser.close()
    finally:server.shutdown();server.server_close()
    print('PASS: memo saves keep previous versions, Historique lists them and restoring keeps the replaced version')

if __name__=='__main__':run()
