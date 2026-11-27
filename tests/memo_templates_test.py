"""Headless: the Modèles folder offers memo templates; using one creates an ordinary memo in edit mode."""
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
            page.wait_for_function("async()=>(await all('items')).filter(item=>item.memoTemplateId).length===6",timeout=20000)
            folder=page.evaluate("async()=>(await all('folders')).find(folder=>folder.id==='memo-templates')")
            assert folder['name']=='Modèles' and folder['parentId'] is None
            template=page.evaluate("async()=>(await all('items')).find(item=>item.memoTemplateId==='incident').id")
            page.evaluate(f"openItem('{template}')");expect(page.get_by_role('button',name='Utiliser ce modèle',exact=True)).to_be_visible(timeout=10000)
            before=page.evaluate("async()=>(await all('items')).length")
            page.get_by_role('button',name='Utiliser ce modèle',exact=True).click()
            page.wait_for_function(f"async()=>(await all('items')).length==={before+1}")
            copy=page.evaluate("async()=>(await all('items')).find(item=>item.title==='Incident du jour')")
            assert copy and copy['folderId'] is None and 'memoTemplateId' not in copy and 'Modèle' not in copy.get('tags',[]),copy
            assert page.evaluate('state.mode')=='edit' and page.evaluate('state.item')==copy['id']
            original=page.evaluate(f"async()=>(await get('items','{template}'))")
            assert original['memoTemplateId']=='incident' and original['folderId']=='memo-templates','the template itself is unchanged'
            page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000)
            assert page.evaluate("async()=>(await all('items')).filter(item=>item.memoTemplateId).length")==6,'templates are not added twice'
            assert not errors,errors
            browser.close()
    finally:server.shutdown();server.server_close()
    print('PASS: six memo templates in a Modèles folder, "Utiliser ce modèle" creates an editable memo at the root, templates unchanged and added once')

if __name__=='__main__':run()
