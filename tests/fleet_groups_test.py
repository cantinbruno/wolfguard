"""Named fleet sections and context actions against synthetic machines."""
import time
from playwright.sync_api import expect
from account_ui_fixture import account_ui, ROOT
from shared_workspace_test import API
from site_fixture import open_security


def run():
    with account_ui() as (page, context, origin, errors):
        agents=[{'id':f'{i+1:032x}','name':f'Poste {i+1:02d}','platform':'win32' if i%2==0 else 'linux',
                 'online':i!=5,'lastSeen':int(time.time()*1000),'version':'0'*64,'restricted':False,
                 'capabilities':['auto-update-v1','remote-terminal-v1','endpoint-protection-v1']} for i in range(6)]
        calls=[]
        page.route(API+'/api/agents',lambda route:route.fulfill(json={'agents':agents}))
        page.route(API+'/api/edr',lambda route:route.fulfill(json={'endpoints':[],'serverTime':int(time.time()*1000)}))
        def restrict(route):
            data=route.request.post_data_json;calls.append(data)
            next(agent for agent in agents if agent['id']==data['id'])['restricted']=data['restricted']
            route.fulfill(json={'restricted':data['restricted']})
        page.route(API+'/api/agents/restricted',restrict)
        open_security(page)
        expect(page.locator('[data-fleet-check]')).to_have_count(6)
        page.locator('#agentsGroupCreate').click()
        page.locator('.app-dialog-input').fill('Atelier')
        page.locator('.app-dialog-submit').click()
        atelier=page.locator('[data-agent-group]').filter(has_text='Atelier')
        expect(atelier).to_be_visible();group_id=atelier.get_attribute('data-agent-group')
        page.locator('[data-fleet-check]').nth(0).check();page.locator('[data-fleet-check]').nth(1).check()
        page.locator('[data-fleet-agent]').first.click(button='right')
        expect(page.locator('#agentActions h2')).to_have_text('2 postes sélectionnés')
        expect(page.locator('[data-fleet-action=terminal]')).to_have_count(0)
        page.locator('[data-fleet-action=groups]').click()
        page.locator(f'[data-fleet-action="group:{group_id}"]').click()
        expect(page.locator(f'[data-agent-group-id="{group_id}"]')).to_have_count(2)
        page.locator('#agentsClearSelection').click()
        page.locator(f'[data-group-check="{group_id}"]').check()
        expect(page.locator('[data-fleet-check]:checked')).to_have_count(2)
        page.locator('[data-fleet-check]').first.uncheck()
        assert page.locator(f'[data-group-check="{group_id}"]').evaluate('el=>el.indeterminate')
        page.locator(f'[data-group-toggle="{group_id}"]').click()
        expect(page.locator(f'[data-group-toggle="{group_id}"]')).to_have_attribute('aria-expanded','false')
        expect(page.locator('[data-fleet-check]')).to_have_count(4)
        expect(page.locator('#agentsSelectionCount')).to_contain_text('1 sélectionné')
        page.locator(f'[data-group-toggle="{group_id}"]').click()
        page.locator(f'[data-group-rename="{group_id}"]').click()
        page.locator('.app-dialog-input').fill('Atelier équipe')
        page.locator('.app-dialog-submit').click()
        expect(atelier).to_contain_text('Atelier équipe')
        page.locator('#agentsGroupCreate').click()
        page.locator('.app-dialog-input').fill('Serveurs <img src=x>')
        page.locator('.app-dialog-submit').click()
        expect(page.locator('.agents-group-heading')).to_contain_text(['Atelier équipe','Serveurs <img src=x>','Sans groupe'])
        expect(page.locator('.agents-group-heading img')).to_have_count(0)
        page.locator('#agentsClearSelection').click()
        page.locator(f'[data-group-check="{group_id}"]').check()
        # Right-clicking an unchecked row targets only that row, retaining the checks.
        page.locator('[data-agent-row="'+agents[2]['id']+'"] [data-fleet-agent]').click(button='right')
        expect(page.locator('#agentActions h2')).to_have_text('Poste 03')
        page.locator('[data-fleet-action="bulk:restrict"]').click()
        expect(page.locator('#appDialogMessage')).to_contain_text('1 poste(s) sélectionné(s)')
        page.locator('.app-dialog-submit').click()
        expect(page.locator('#agentsBulkStatus')).to_contain_text('1 réussi(s)')
        assert [row['id'] for row in calls]==[agents[2]['id']]
        expect(page.locator('[data-fleet-check]:checked')).to_have_count(2)
        # Multi-action rights are checked individually before sending.
        page.evaluate("id=>{const original=window.WolfGuardAccess;window.__groupAccess=original;window.WolfGuardAccess={...original,canAgent:(agent,right)=>agent===id&&right==='agents.write'?false:original.canAgent(agent,right)}}",agents[1]['id'])
        page.locator('[data-agent-row="'+agents[0]['id']+'"] [data-fleet-agent]').click(button='right')
        expect(page.locator('[data-fleet-action="bulk:restrict"]')).to_contain_text('1 / 2 poste(s) éligible(s)')
        page.locator('[data-fleet-action="bulk:restrict"]').click()
        page.locator('.app-dialog-submit').click()
        expect(page.locator('#agentsBulkStatus')).to_contain_text('1 réussi(s) · 0 erreur(s) · 1 ignoré(s)')
        assert [row['id'] for row in calls]==[agents[2]['id'],agents[0]['id']]
        page.evaluate('()=>{window.WolfGuardAccess=window.__groupAccess}')
        page.locator('#agentsClearSelection').click()
        page.locator('[data-fleet-agent]').first.focus();page.keyboard.press('Shift+F10')
        expect(page.locator('#agentActions')).to_be_visible()
        page.keyboard.press('End');expect(page.locator('[data-fleet-action="bulk:uninstall"]')).to_be_focused()
        page.keyboard.press('Escape');expect(page.locator('[data-fleet-agent]').first).to_be_focused()
        # Layout and assignment survive reloading the encrypted workspace.
        page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000);open_security(page)
        expect(page.locator(f'[data-agent-group-id="{group_id}"]')).to_have_count(2)
        expect(page.locator('[data-agent-group]').filter(has_text='Atelier équipe')).to_be_visible()
        page.locator('#agentsView').select_option('flat')
        expect(page.locator('[data-agent-group]')).to_have_count(0)
        expect(page.locator('[data-agent-row]')).to_have_count(6)
        page.locator('#agentsView').select_option('groups')
        expect(page.locator('[data-agent-group]')).to_have_count(3)
        page.locator('#agentsSearch').fill('Poste 01')
        expect(page.locator('[data-agent-group]')).to_have_count(1)
        expect(page.locator('[data-agent-row]')).to_have_count(1)
        page.locator('#agentsSearch').fill('')
        page.evaluate("()=>{window.__groupSetSetting=setSetting;window.setSetting=async(key,value)=>{if(key==='agents-custom-groups')throw new Error('Synthetic save failure');return window.__groupSetSetting(key,value)}}")
        page.locator(f'[data-group-rename="{group_id}"]').click();page.locator('.app-dialog-input').fill('Nom non enregistré');page.locator('.app-dialog-submit').click()
        expect(page.locator('#agentsStatus')).to_contain_text('Modification non enregistrée')
        expect(page.locator('[data-agent-group]').filter(has_text='Atelier équipe')).to_be_visible()
        page.evaluate('()=>{window.setSetting=window.__groupSetSetting}')
        for width in [1440,850,390,320]:
            page.set_viewport_size({'width':width,'height':900})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            assert page.locator('.agents-console').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
            if width in [1440,390]:page.screenshot(path=str(ROOT/f'.cache/groups-{width}.png'),animations='disabled')
            page.locator('[data-fleet-agent]').first.click(button='right')
            bounds=page.locator('#agentActions').bounding_box()
            assert bounds['x']>=0 and bounds['x']+bounds['width']<=width+1,bounds
            assert bounds['y']>=0 and bounds['y']+bounds['height']<=901,bounds
            if width in [1440,390]:page.screenshot(path=str(ROOT/f'.cache/groups-menu-{width}.png'),animations='disabled')
            page.keyboard.press('Escape')
        page.locator(f'[data-group-remove="{group_id}"]').click();page.locator('.app-dialog-cancel').click()
        expect(page.locator(f'[data-group-toggle="{group_id}"]')).to_be_visible()
        page.locator(f'[data-group-remove="{group_id}"]').click();page.locator('.app-dialog-submit').click()
        expect(page.locator(f'[data-group-toggle="{group_id}"]')).to_have_count(0)
        expect(page.locator('[data-agent-row]')).to_have_count(6)
        assert not errors,errors
    print('PASS: named sections, persisted groups, assignment, collapse, group selection, contextual single/multi scope, per-post rights, safe group removal, failed save, keyboard and mobile')


if __name__=='__main__':run()
