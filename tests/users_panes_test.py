"""Membership and account navigation preserve one pending group assignment."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui,invite,activate

def run():
    with account_ui() as (owner,context,origin,errors):
        url=invite(owner,'navigation@example.test');viewer=context().new_page();activate(viewer,url,'navigation@example.test')
        owner.locator('#wgUserInvitationClose').click()
        owner.evaluate("""async()=>{let s=await WolfGuardCloud.agentRequest('users/groups');s=await WolfGuardCloud.agentRequest('users/groups/create',{name:'Consultation',revision:s.revision});const g=s.groups.find(g=>g.name==='Consultation');await WolfGuardCloud.agentRequest('users/groups/policy',{id:g.id,revision:s.revision,policy:{...WolfGuardPermissions.profilePolicy('observer'),groupLevels:{}}});}""")
        owner.locator('#wgUsersRefresh').click();owner.locator('[data-select-user]').filter(has_text='navigation@example.test').click()
        expect(owner.locator('#wgUserAccessGroup')).to_be_visible()
        owner.locator('#wgUserAccessGroup').select_option(label='Consultation')
        selected=owner.locator('#wgUserAccessGroup').input_value()
        for _ in range(12):
            owner.locator('[data-user-pane=account]').click();expect(owner.locator('[data-user-action=edit]')).to_be_visible()
            owner.locator('[data-user-pane=rights]').click();expect(owner.locator('#wgUserAccessGroup')).to_have_value(selected)
        owner.locator('#settings-tab-interface').click();expect(owner.locator('.app-dialog')).to_be_visible();owner.locator('.app-dialog-cancel').click()
        expect(owner.locator('#settings-users')).to_be_visible()
        owner.locator('#wgUserApplyGroup').click();expect(owner.locator('#wgUsersStatus')).to_contain_text('Groupe attribué')
        expect(owner.locator('#wgUserAccessGroup')).to_have_value(selected)
        viewer.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(viewer.locator('#keypad button').first).to_be_enabled(timeout=15000);viewer.locator('#lock').focus();viewer.keyboard.type('12345678');expect(viewer.locator('#app')).to_be_visible(timeout=20000)
        assert viewer.evaluate("WolfGuardCloud.currentUser().permissions.accessGroup.name==='Consultation'&&WolfGuardCloud.can('library.read')&&!WolfGuardCloud.can('library.write')")
        assert not errors,errors
    print('PASS: membership draft, account panes, repeated navigation, unsaved guard, assignment and inherited read-only access')

if __name__=='__main__':run()
