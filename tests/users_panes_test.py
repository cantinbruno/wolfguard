"""Cumulative membership drafts survive account-pane navigation."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui,invite,activate

def run():
    with account_ui() as (owner,context,origin,errors):
        url=invite(owner,'navigation@example.test');viewer=context().new_page();activate(viewer,url,'navigation@example.test');owner.locator('#wgUserInvitationClose').click()
        owner.locator('#wgUsersRefresh').click();owner.locator('[data-select-user]').filter(has_text='navigation@example.test').click()
        memo=owner.locator('label',has_text='GG_Acces_Memo_lecture').locator('[data-user-access-group]');vault=owner.locator('label',has_text='GG_Acces_Coffre_fort_ecriture').locator('[data-user-access-group]')
        expect(memo).to_be_visible();memo.check();vault.check()
        for _ in range(12):
            owner.locator('[data-user-pane=account]').click();expect(owner.locator('[data-user-action=edit]')).to_be_visible();owner.locator('[data-user-pane=rights]').click();expect(memo).to_be_checked();expect(vault).to_be_checked()
        owner.locator('#settings-tab-interface').click();expect(owner.locator('.app-dialog')).to_be_visible();owner.locator('.app-dialog-cancel').click();expect(owner.locator('#settings-users')).to_be_visible()
        owner.locator('#wgUserApplyGroup').click();expect(owner.locator('#wgUsersStatus')).to_contain_text('Groupes appliqués');expect(owner.locator('[data-user-access-group]:checked')).to_have_count(2)
        viewer.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(viewer.locator('#keypad button').first).to_be_enabled(timeout=15000);viewer.locator('#lock').focus();viewer.keyboard.type('12345678');expect(viewer.locator('#app')).to_be_visible(timeout=20000)
        assert viewer.evaluate("WolfGuardCloud.currentUser().permissions.accessGroup.ids.length===2&&WolfGuardCloud.can('library.read')&&!WolfGuardCloud.can('library.write')&&WolfGuardCloud.can('vault.edit')&&!WolfGuardCloud.can('agents.read')")
        assert not errors,errors
    print('PASS: cumulative membership draft, repeated navigation, guard, assignment and default invisible access')

if __name__=='__main__':run()
