"""Shared groups, drag/drop and Settings access, with headless synthetic machines."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui, invite, activate, ROOT
from shared_workspace_test import API
from site_fixture import open_security


def run():
    with account_ui() as (page, context, origin, errors):
        for index in range(6):
            ticket=page.evaluate("WolfGuardCloud.agentRequest('agents/pair',{})")
            response=page.request.post(context.backend+'/api/agent/enroll',data={'code':ticket['code'],'name':f'Poste {index+1:02d}','platform':'win32'},headers={'Origin':'https://wolfguard.wavetools.fr'})
            assert response.status==200,response.text()

        open_security(page)
        expect(page.locator('[data-fleet-check]')).to_have_count(6)
        expect(page.locator('#agentsGroupCreate')).to_be_enabled()
        page.locator('#agentsGroupCreate').click()
        page.locator('.app-dialog-input').fill('Atelier')
        page.locator('.app-dialog-submit').click()
        atelier=page.locator('[data-agent-group]').filter(has_text='Atelier')
        expect(atelier).to_be_visible();group_id=atelier.get_attribute('data-agent-group')
        selected_ids=page.locator('[data-agent-row]').evaluate_all('rows=>rows.slice(0,2).map(row=>row.dataset.agentRow)')
        for agent_id in selected_ids:page.locator(f'[data-fleet-check="{agent_id}"]').check()
        page.locator(f'[data-agent-row="{selected_ids[0]}"] .agents-endpoint').drag_to(atelier)
        expect(page.locator(f'[data-agent-group-id="{group_id}"]')).to_have_count(2)
        expect(page.locator('#agentsStatus')).to_contain_text('Droits de la section appliqués')
        expect(page.locator('[data-fleet-check]:checked')).to_have_count(2)
        page.locator('#agentsGroupsCollapse').click();expect(page.locator('[data-agent-row]')).to_have_count(0)
        page.locator('#agentsGroupsExpand').click();expect(page.locator('[data-agent-row]')).to_have_count(6)
        page.locator(f'[data-group-duplicate="{group_id}"]').click()
        page.locator('.app-dialog-input').fill('Serveurs');page.locator('.app-dialog-submit').click()
        expect(page.locator('[data-agent-group]').filter(has_text='Serveurs')).to_be_visible()
        servers=page.locator('[data-agent-group]').filter(has_text='Serveurs').get_attribute('data-agent-group')
        page.locator(f'[data-fleet-agent="{selected_ids[0]}"]').click(button='right')
        expect(page.locator('#agentActions h2')).to_have_text('2 postes sélectionnés')
        expect(page.locator('[data-fleet-action="bulk:restrict"]')).to_have_count(0)
        page.locator('[data-fleet-action="groups"]').click();page.locator(f'[data-fleet-action="group:{servers}"]').click()
        expect(page.locator(f'[data-agent-group-id="{servers}"]')).to_have_count(2)
        page.locator('#agentsClearSelection').click();page.locator('[data-fleet-agent]').first.click()
        expect(page.locator('#agentDetailsPanel')).to_be_visible();expect(page.locator('[data-record-restricted]')).to_have_count(0)
        page.locator('#agentDetailsClose').click()
        def fail(route):route.fulfill(status=503,json={'error':'Synthetic group write failure'})
        page.route(API+'/api/agents/groups/rename',fail)
        page.locator(f'[data-group-rename="{group_id}"]').click();page.locator('.app-dialog-input').fill('Non enregistré');page.locator('.app-dialog-submit').click()
        expect(page.locator('#agentsStatus')).to_contain_text('Modification non enregistrée');expect(atelier).to_be_visible()
        page.unroute(API+'/api/agents/groups/rename',fail)
        page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000);open_security(page)
        expect(page.locator(f'[data-agent-group-id="{servers}"]')).to_have_count(2)
        for width in [1440,850,390,320]:
            page.set_viewport_size({'width':width,'height':900})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            assert page.locator('.agents-console').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
        page.set_viewport_size({'width':1440,'height':1000})
        expect(page.locator('#agentsGroupsRights')).to_have_count(0)
        expect(page.locator('[data-section-rights]')).to_have_count(0)
        page.locator('#settingsBtn').click();page.locator('#settings-tab-groups').click()
        expect(page.locator('#settings-groups')).to_be_visible()
        expect(page.locator('#settings-groups .settings-panel-head')).to_contain_text('Chaque section possède')
        url=invite(page,'group-ui@example.test');guest=context().new_page();activate(guest,url,'group-ui@example.test')
        page.locator('#wgUserInvitationClose').click();page.locator('#wgUsersRefresh').click()
        page.locator('#settings-tab-groups').click()
        for name in ['GG_Acces_Application_administrateur','GG_Acces_Atelier_lecture','GG_Acces_Atelier_ecriture','GG_Acces_Serveurs_lecture','GG_Acces_Serveurs_ecriture']:
            expect(page.locator('#wgGroupsList')).to_contain_text(name)
        for name in ['GG_Acces_Memo_lecture','GG_Acces_Serveurs_ecriture']:
            page.locator('[data-access-group]').filter(has_text=name).click()
            if page.locator('#wgGroupMembers').get_attribute('open') is None:page.locator('#wgGroupMembers > summary').click()
            page.locator('#wgGroupAddMember').select_option(label='group-ui@example.test');page.locator('#wgGroupAssign').click()
            expect(page.locator('#wgGroupMemberList')).to_contain_text('group-ui@example.test')
        saved=page.evaluate("async()=>{const s=await WolfGuardCloud.agentRequest('users/groups');return s.groups.filter(g=>g.memberIds.length).map(g=>g.name)}")
        assert 'GG_Acces_Memo_lecture' in saved and 'GG_Acces_Serveurs_ecriture' in saved,saved
        page.locator('.settings-close').click()
        expect(page.locator('#agentsGroupCreate')).to_have_text('Nouvelle section')
        expect(page.locator('[data-agent-group=ungrouped]')).to_contain_text('Sans section')
        expect(page.locator('#agentsGroupsRights')).to_have_count(0)
        expect(page.locator('[data-section-rights]')).to_have_count(0)
        page.locator('#settingsBtn').click();page.locator('#settings-tab-groups').click()
        assert len(page.evaluate("async()=>(await WolfGuardCloud.agentRequest('users/groups')).groups"))==33
        for width in [1440,850,390,320]:
            page.set_viewport_size({'width':width,'height':900})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        page.screenshot(path=str(ROOT/'.cache/settings-groups.png'),animations='disabled')
        assert not errors,errors
    print('PASS: shared groups prepared from existing access, Settings-only rights, drag/drop, persistence and responsive layout')


if __name__=='__main__':run()
