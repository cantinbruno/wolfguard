"""Headless group permissions, membership, dialog sizing and personal vault landing."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui,invite,activate,ROOT


def run():
    with account_ui() as (owner,context,origin,errors):
        invitation=invite(owner,'team-member@example.test');viewer=context().new_page();activate(viewer,invitation,'team-member@example.test')
        owner.locator('#wgUserInvitationClose').click();owner.locator('#settings-tab-groups').click()
        expect(owner.locator('#wgGroupsList')).to_contain_text('Invités')
        owner.locator('#wgGroupCreate').click();owner.locator('.app-dialog-input').fill('Équipe');owner.locator('.app-dialog-submit').click()
        expect(owner.locator('#wgGroupName')).to_have_text('Équipe')
        expect(owner.locator('[data-permission-profile]')).to_have_count(4)
        owner.locator('[data-permission-profile=editor]').click()
        owner.locator('[data-group-right-id=ungrouped][data-group-level=read]').click()
        owner.locator('#wgPermissionSave').click();expect(owner.locator('[data-permission-save-notice]')).to_contain_text('Droits enregistrés')
        owner.locator('#wgGroupsAudit').click();expect(owner.locator('#wgGroupPermissionHost')).to_contain_text('Modification des droits');owner.locator('[data-close-audit]').click();expect(owner.locator('[data-permission-profile=editor]')).to_be_visible()
        owner.locator('#wgGroupMembers > summary').click()
        owner.locator('#wgGroupAddMember').select_option(label='team-member@example.test');owner.locator('#wgGroupAssign').click()
        expect(owner.locator('#wgGroupMemberList')).to_contain_text('team-member@example.test')
        viewer.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(viewer.locator('#keypad button').first).to_be_enabled(timeout=15000)
        viewer.locator('#lock').focus();viewer.keyboard.type('12345678');expect(viewer.locator('#app')).to_be_visible(timeout=20000)
        viewer.wait_for_function('()=>!document.querySelector("#app").inert')
        assert viewer.evaluate("WolfGuardCloud.currentUser().permissions.accessGroup.name==='Équipe'")
        viewer.evaluate("()=>openSection('vault')")
        viewer.wait_for_function("()=>state.section==='vault'&&!sectionTransition.active")
        assert viewer.evaluate('state.folder===WolfGuardCloud.currentUser().vaultHome.id')
        assert viewer.locator('#content').inner_text().find('team-member@example.test')>=0
        viewer.evaluate('()=>selectFolder(null)');assert viewer.evaluate('state.folder===WolfGuardCloud.currentUser().vaultHome.id')
        owner.locator('#settings-tab-users').click();owner.locator('[data-select-user]').filter(has_text='team-member@example.test').click()
        expect(owner.locator('#wgUserAccessGroup')).to_have_value(viewer.evaluate('WolfGuardCloud.currentUser().permissions.accessGroup.id'))
        expect(owner.locator('#settings-users [data-permission-profile],#settings-users [data-section],#settings-users [data-group-right-id]')).to_have_count(0)
        owner.locator('#settings-tab-groups').click();owner.locator('[data-access-group]').filter(has_text='Équipe').click()
        owner.locator('[data-section=library][data-level=read]').click();owner.locator('#settings-tab-interface').click()
        expect(owner.locator('.app-dialog')).to_be_visible();owner.locator('.app-dialog-cancel').click()
        expect(owner.locator('#settings-groups')).to_be_visible()
        owner.locator('[data-close-permissions]').click()
        owner.set_viewport_size({'width':1920,'height':1080})
        box=owner.locator('.settings-modal').bounding_box();assert box['width']<=1281 and box['height']<=821,box
        owner.screenshot(path=str(ROOT/'.cache/access-groups-desktop.png'),animations='disabled')
        owner.locator('.settings-close').click()
        ticket=owner.evaluate("WolfGuardCloud.agentRequest('agents/pair',{})")
        response=owner.request.post(context.backend+'/api/agent/enroll',data={'code':ticket['code'],'name':'Poste test','platform':'win32'});assert response.status==200
        from site_fixture import open_security
        open_security(owner);owner.locator('[data-fleet-agent]').first.click();expect(owner.locator('#agentDetailsPanel')).to_be_visible()
        box=owner.locator('#agentDetailsPanel').bounding_box();assert box['width']<=1281 and box['height']<=821,box
        owner.locator('#agentDetailsClose').click();owner.locator('#settingsBtn').click();owner.locator('#settings-tab-groups').click()
        for width in [1440,850,390,320]:
            owner.set_viewport_size({'width':width,'height':900})
            assert owner.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            assert owner.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
        owner.screenshot(path=str(ROOT/'.cache/access-groups-mobile.png'),animations='disabled')
        assert not errors,errors
    print('PASS: shared authorization groups, members, no individual editor, unsaved guard, compact dialogs, responsive layout and vault home landing')


if __name__=='__main__':run()
