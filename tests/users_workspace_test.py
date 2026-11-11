"""Simple user directory, personal activation, rename and account removal."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui,invite,activate,users,ROOT

def run():
    with account_ui() as (owner,context,origin,errors):
        url=invite(owner,'alice@example.test');expect(owner.locator('#wgUserCode')).to_have_count(0)
        guest_context=context();guest=guest_context.new_page();guest.goto(url);expect(guest.locator('#webAccountSetupForm')).to_be_visible();guest.locator('#webAccountCode').fill('abcdefgh');assert not guest.locator('#webAccountCode').evaluate('el=>el.checkValidity()')
        activate(guest,url,'alice@example.test')
        owner.locator('#wgUserInvitationClose').click();owner.locator('#wgUsersRefresh').click();owner.locator('#wgUsersSearch').fill('alice');expect(owner.locator('[data-select-user]')).to_have_count(1)
        owner.locator('[data-select-user]').click();expect(owner.locator('#wgUserOverview')).to_contain_text('alice@example.test');expect(owner.locator('#wgPermissionForm')).to_be_visible()
        owner.locator('[data-user-action=edit]').click();owner.locator('#wgUserName').fill('alice.renamed@example.test');owner.locator('#wgUserSave').click();expect(owner.locator('#wgUserOverview')).to_contain_text('alice.renamed@example.test')
        owner.locator('.users-account-security summary').click();owner.locator('[data-user-action=toggle]').click();owner.locator('.app-dialog-submit').click();expect(owner.locator('#wgUserOverview')).to_contain_text('Désactivé')
        guest.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(guest.locator('#lock')).to_be_visible()
        owner.locator('[data-user-action=toggle]').click();owner.locator('.app-dialog-submit').click();expect(owner.locator('#wgUserOverview')).to_contain_text('Actif')
        for width in [1440,900,390,320]:
            owner.set_viewport_size({'width':width,'height':1000 if width>640 else 844});assert owner.evaluate('document.documentElement.scrollWidth<=innerWidth');assert owner.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1')
        owner.screenshot(path=str(ROOT/'.cache/current-users-mobile.png'),animations='disabled');owner.set_viewport_size({'width':1440,'height':1000})
        owner.locator('[data-user-action=delete]').click();owner.locator('.app-dialog-submit').click();expect(owner.locator('#wgUsersList')).not_to_contain_text('alice.renamed@example.test')
        owner.locator('#wgUsersSearch').fill('');owner.locator('[data-select-user]').filter(has_text='cantin.bruno@gmx.fr').click();owner.locator('.users-account-security summary').click();expect(owner.locator('[data-user-action=delete]')).to_be_disabled()
        assert not errors,errors
    print('PASS: user directory, invitation, exact eight digits, rename, disable, delete, owner protection and mobile layout')

if __name__=='__main__':run()
