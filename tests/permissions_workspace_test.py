"""Section-level permission editing, unsaved changes and server enforcement."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui,invite,activate,users,ROOT

def run():
    with account_ui() as (owner,context,origin,errors):
        url=invite(owner,'rights@example.test');guest_context=context();guest=guest_context.new_page();activate(guest,url,'rights@example.test')
        owner.locator('#wgUserInvitationClose').click();owner.locator('#wgUsersRefresh').click();owner.locator('[data-select-user]').filter(has_text='rights@example.test').click()
        expect(owner.locator('#wgPermissionForm')).to_be_visible();expect(owner.locator('.permission-row')).to_have_count(12)
        owner.locator('[data-section=library][data-level=read]').click();expect(owner.locator('#wgPermissionSave')).to_be_enabled()
        owner.locator('#settings-tab-interface').click();expect(owner.locator('.app-dialog')).to_be_visible();owner.locator('.app-dialog-cancel').click();expect(owner.locator('#settings-tab-users')).to_have_attribute('aria-selected','true')
        owner.locator('#wgPermissionSave').click();expect(owner.locator('#wgPermissionHost')).to_contain_text('Droits enregistrés')
        guest.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(guest.locator('#lock')).to_be_visible();guest.locator('#lock').focus();guest.keyboard.type('12345678');expect(guest.locator('#app')).to_be_visible(timeout=20000);guest.wait_for_function('()=>!document.querySelector("#app").inert')
        assert guest.evaluate("async()=>!!await get('items','team-note')")
        assert guest.evaluate("WolfGuardCloud.can('library.read')&&!WolfGuardCloud.can('library.create')")
        assert not guest.evaluate("WolfGuardCloud.can('remote.desktop')")
        owner.locator('[data-section=library][data-level=write]').click();owner.locator('#wgPermissionAdmin').check();owner.locator('#wgPermissionSave').click();expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        policy=owner.evaluate("async()=>{const list=await WolfGuardCloud.agentRequest('users');return list.users.find(row=>row.username==='rights@example.test').permissions}");assert policy['admin'] is True
        for width in [1440,850,390,320]:
            owner.set_viewport_size({'width':width,'height':1000 if width>640 else 844});assert owner.evaluate('document.documentElement.scrollWidth<=innerWidth');assert owner.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1')
        owner.screenshot(path=str(ROOT/'.cache/current-permissions-mobile.png'),animations='disabled')
        assert not errors,errors
    print('PASS: simple section matrix, admin switch, unsaved changes, session revocation, read-only enforcement and mobile layout')

if __name__=='__main__':run()
