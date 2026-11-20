"""Headless fleet scrolling and bulk commands against synthetic machines only."""
import time
from playwright.sync_api import expect
from account_ui_fixture import account_ui, ROOT
from shared_workspace_test import API
from site_fixture import open_security


def run():
    with account_ui() as (page, context, origin, errors):
        agents=[{'id':f'{i+1:032x}','name':f'Poste {i+1:02d}','platform':'win32','online':i!=2,'lastSeen':int(time.time()*1000),'version':'0'*64,'capabilities':['auto-update-v1','remote-terminal-v1'],'restricted':False} for i in range(60)]
        agents[0]['name']='=SUM(1;2)'
        state={'count':60,'fail':False}
        commands=[]
        def fleet(route):
            if state['fail']:route.fulfill(status=503,json={'error':'Service indisponible'})
            else:route.fulfill(json={'agents':agents[:state['count']]})
        def restrict(route):
            body=route.request.post_data_json;commands.append(body)
            if body['id']==agents[1]['id']:route.fulfill(status=503,json={'error':'Refus de test'})
            else:
                agent=next(a for a in agents if a['id']==body['id']);agent['restricted']=body['restricted']
                route.fulfill(json={'restricted':body['restricted']})
        page.route(API+'/api/agents',fleet)
        page.route(API+'/api/agents/restricted',restrict)
        page.route(API+'/api/edr',lambda route:route.fulfill(json={'endpoints':[],'serverTime':int(time.time()*1000)}))
        open_security(page)
        expect(page.locator('[data-fleet-check]')).to_have_count(60)
        expect(page.locator('#agentsRefresh')).to_be_enabled()
        scroller=page.locator('.agents-table-scroll')
        height=scroller.evaluate('el=>el.clientHeight')
        console_height=page.locator('.agents-console').evaluate('el=>el.getBoundingClientRect().height')
        assert height>200,height
        header_top=page.locator('.agents-table thead th').first.evaluate('el=>el.getBoundingClientRect().top')
        scroller.hover();page.mouse.wheel(0,700)
        page.wait_for_function("()=>document.querySelector('.agents-table-scroll').scrollTop>0")
        assert abs(page.locator('.agents-table thead th').first.evaluate('el=>el.getBoundingClientRect().top')-header_top)<2
        assert page.locator('#content').evaluate('el=>el.scrollTop')==0
        state['count']=1;page.locator('#agentsRefresh').click()
        expect(page.locator('[data-fleet-check]')).to_have_count(1)
        assert abs(page.locator('.agents-console').evaluate('el=>el.getBoundingClientRect().height')-console_height)<2
        state['count']=60;page.locator('#agentsRefresh').click()
        expect(page.locator('[data-fleet-check]')).to_have_count(60)
        page.locator('[data-fleet-check]').nth(0).check()
        page.locator('[data-fleet-check]').nth(4).click(modifiers=['Shift'])
        expect(page.locator('[data-fleet-check]:checked')).to_have_count(5)
        assert page.locator('#agentsSelectAll').evaluate('el=>el.indeterminate')
        expect(page.locator('#agentDetailsPanel')).to_be_hidden()
        page.locator('#agentsClearSelection').click()
        page.locator('[data-fleet-agent]').nth(0).click(modifiers=['Control'])
        expect(page.locator('[data-fleet-check]:checked')).to_have_count(1)
        page.locator('#agentsSearch').fill('Poste 02')
        expect(page.locator('#agentsSelectionCount')).to_contain_text('hors filtre')
        page.locator('#agentsSelectAll').check()
        expect(page.locator('#agentsSelectionCount')).to_contain_text('2 sélectionnés')
        page.locator('#agentsBulkCommand').select_option('export')
        with page.expect_download() as event:page.locator('#agentsBulkRun').click()
        csv=event.value.path().read_text(encoding='utf-8-sig')
        assert '"\'=SUM(1;2)"' in csv and 'Poste 02' in csv,csv
        page.locator('#agentsSearch').fill('')
        page.locator('#agentsBulkCommand').select_option('restrict')
        page.locator('#agentsBulkRun').click()
        expect(page.locator('#appDialogMessage')).to_contain_text('2 poste(s) sélectionné(s)')
        page.locator('.app-dialog-cancel').click();assert not commands
        page.locator('#agentsBulkRun').click();page.locator('.app-dialog-submit').click()
        expect(page.locator('#agentsBulkStatus')).to_contain_text('1 réussi(s) · 1 erreur(s)')
        assert len(commands)==2,commands
        page.locator('#agentsBulkResults summary').click()
        expect(page.locator('#agentsBulkResults [data-result=error]')).to_contain_text('Refus de test')
        page.evaluate("""()=>{
          window.__bulkStarts=[];window.__bulkStates={};
          const original=WolfGuardAgentUpdates;
          window.WolfGuardAgentUpdates={...original,state:id=>window.__bulkStates[id]||original.state(id),start:async(agent,{onChange}={})=>{
            window.__bulkStarts.push(agent.id);window.__bulkStates[agent.id]={status:'running',running:true,message:'Test de mise à jour'};
            onChange?.(window.__bulkStates[agent.id]);
            if(window.__bulkHold)await new Promise(resolve=>window.__bulkResolve=resolve);
            window.__bulkStates[agent.id]={status:'completed',running:false,message:'Terminé'};
          }};
        }""")
        page.locator('#agentsClearSelection').click()
        page.locator('[data-fleet-check]').nth(0).check()
        page.locator('[data-fleet-check]').nth(2).check()
        page.locator('#agentsBulkCommand').select_option('update')
        page.locator('#agentsBulkRun').click();page.locator('.app-dialog-submit').click()
        expect(page.locator('#agentsBulkStatus')).to_contain_text('1 réussi(s) · 0 erreur(s) · 1 ignoré(s)')
        assert page.evaluate('window.__bulkStarts.length')==1
        expect(page.locator('#agentsBulkResults [data-result=skip]')).to_contain_text('connecté')
        # Permission caps apply per machine, including while global rights allow writes.
        page.evaluate("""()=>{const access=window.WolfGuardAccess;window.__bulkAccess=access;window.WolfGuardAccess={...access,canAgent:(id,right)=>id==='00000000000000000000000000000001'&&right.endsWith('.write')?false:access.canAgent(id,right)};}""")
        page.locator('#agentsBulkCommand').select_option('export')
        assert page.locator('#agentsBulkCommand option[value=update]').is_disabled()
        page.evaluate('window.WolfGuardAccess=window.__bulkAccess')
        # A stopped queue finishes its current command and never sends the rest.
        page.locator('#agentsClearSelection').click()
        for index in [0,3,4]:page.locator('[data-fleet-check]').nth(index).check()
        page.evaluate('window.__bulkHold=true;window.__bulkStarts=[]')
        page.locator('#agentsBulkCommand').select_option('update')
        page.locator('#agentsBulkRun').click();page.locator('.app-dialog-submit').click()
        expect(page.locator('#agentsBulkCancel')).to_be_visible()
        page.wait_for_function('()=>!!window.__bulkResolve')
        page.locator('#agentsBulkCancel').click();page.evaluate('window.__bulkResolve()')
        expect(page.locator('#agentsBulkStatus')).to_contain_text('2 non traité(s)')
        assert page.evaluate('window.__bulkStarts.length')==1
        # Uninstallation uses its separate secure launcher, never revocation.
        page.evaluate("""()=>{const removal=WolfGuardAgentRemoval;window.__bulkUninstalls=[];window.WolfGuardAgentRemoval={...removal,start:async agent=>{window.__bulkUninstalls.push(agent.id);return {status:'launched',message:'Lancée'};}};}""")
        page.locator('#agentsBulkCommand').select_option('uninstall')
        page.locator('#agentsBulkRun').click();page.locator('.app-dialog-cancel').click()
        assert page.evaluate('window.__bulkUninstalls.length')==0
        page.locator('#agentsBulkRun').click();page.locator('.app-dialog-submit').click()
        expect(page.locator('#agentsBulkStatus')).to_contain_text('3 réussi(s)')
        assert page.evaluate('window.__bulkUninstalls.length')==3
        for width,height in [(1440,900),(1024,700),(640,800),(390,844),(320,700)]:
            page.set_viewport_size({'width':width,'height':height})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,height)
            bounds=page.locator('.agents-console').bounding_box()
            content=page.locator('#content').bounding_box()
            assert bounds['y']+bounds['height']<=content['y']+content['height']+2,(width,height,bounds,content)
            assert scroller.evaluate('el=>el.clientHeight')>=80,(width,height)
            if width in [1440,390]:page.screenshot(path=str(ROOT/f'.cache/fleet-bulk-{width}.png'),animations='disabled')
        page.locator('#agentsClearSelection').click()
        for width,height in [(390,844),(320,700)]:
            page.set_viewport_size({'width':width,'height':height})
            assert page.locator('#content').evaluate('el=>el.scrollHeight<=el.clientHeight+2'),(width,height)
        page.set_viewport_size({'width':1440,'height':900})
        page.locator('#agentsSearch').fill('Poste 60')
        scroller.focus();page.keyboard.press('Control+a')
        expect(page.locator('[data-fleet-check]:checked')).to_have_count(1)
        page.keyboard.press('Escape')
        expect(page.locator('[data-fleet-check]:checked')).to_have_count(0)
        page.locator('#agentsSelectAll').check()
        state['fail']=True;page.locator('#agentsRefresh').click()
        expect(page.locator('#agentsStatus')).to_contain_text('plus confirmée')
        expect(page.locator('#agentsBulkCommand option[value=uninstall]')).to_be_disabled()
        state['fail']=False
        state['count']=1;page.locator('#agentsRefresh').click()
        expect(page.locator('#agentsSelectionActions')).to_be_hidden()
        state['count']=60;page.locator('#agentsSearch').fill('');page.locator('#agentsRefresh').click()
        expect(page.locator('[data-fleet-check]')).to_have_count(60)
        for index in [0,3]:page.locator('[data-fleet-check]').nth(index).check()
        page.evaluate('window.__bulkResolve=null;window.__bulkStarts=[]')
        page.locator('#agentsBulkCommand').select_option('update')
        page.locator('#agentsBulkRun').click();page.locator('.app-dialog-submit').click()
        page.wait_for_function('()=>!!window.__bulkResolve')
        page.evaluate('lockApplication();window.__bulkResolve()')
        expect(page.locator('#app')).to_be_hidden()
        assert page.evaluate('window.__bulkStarts.length')==1
        assert not errors,errors
        print('PASS: fixed viewport table, wheel/sticky header, ranges, filters, CSV safety, bulk confirmations, partial failures, per-post rights, cancellation, uninstall and mobile layouts')

if __name__=='__main__':run()
