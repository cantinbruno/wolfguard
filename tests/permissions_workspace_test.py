"""Role selection, protected owner, private machines and real API enforcement."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui, invite, activate, users, ROOT
from site_fixture import open_security
from shared_workspace_test import API


def run():
    with account_ui() as (owner, context, origin, errors):
        url = invite(owner, 'rights@example.test')
        guest = context().new_page()
        activate(guest, url, 'rights@example.test')
        owner.locator('#wgUserInvitationClose').click()
        owner.locator('#wgUsersRefresh').click()
        owner.locator('[data-select-user]').filter(has_text='rights@example.test').click()
        expect(owner.locator('[data-permission-profile]')).to_have_count(4)
        expect(owner.locator('[data-permission-profile=guest]')).to_have_attribute('aria-pressed', 'true')
        expect(owner.locator('.permission-save-bar')).not_to_be_visible()
        expect(owner.locator('[data-section=library][data-level=read]')).not_to_be_visible()
        assert not guest.evaluate("WolfGuardCloud.can('library.read')")

        def reconnect():
            guest.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}')
            expect(guest.locator('#lock')).to_be_visible()
            expect(guest.locator('#keypad button').first).to_be_enabled(timeout=15000)
            guest.locator('#lock').focus()
            guest.keyboard.type('12345678')
            expect(guest.locator('#app')).to_be_visible(timeout=20000)
            guest.wait_for_function('()=>!document.querySelector("#app").inert')

        owner.locator('[data-permission-profile=observer]').click()
        expect(owner.locator('#wgPermissionSave')).to_be_enabled()
        expect(owner.locator('.permission-save-bar')).to_be_visible()
        owner.locator('#settings-tab-interface').click()
        expect(owner.locator('.app-dialog')).to_be_visible()
        owner.locator('.app-dialog-cancel').click()
        owner.locator('#wgPermissionCustomization > summary').click()
        owner.locator('.permission-advanced > summary').click()
        owner.locator('#wgPermissionReason').fill('Attribution du rôle observateur')
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        expect(owner.locator('.permission-save-bar')).not_to_be_visible()
        expect(owner.locator('#wgUserOverview')).to_contain_text('Observateur')
        reconnect()
        assert guest.evaluate("async()=>!!await get('items','team-note')")
        assert guest.evaluate("WolfGuardCloud.can('users.read')&&WolfGuardCloud.can('access.read')&&!WolfGuardCloud.can('users.manage')&&!WolfGuardCloud.can('library.create')")

        owner.locator('[data-permission-profile=editor]').click()
        owner.route(API+'/api/users/permissions', lambda route: route.fulfill(status=503, json={'error':'Test sauvegarde indisponible'}))
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('[data-permission-error]')).to_contain_text('Test sauvegarde indisponible')
        expect(owner.locator('#wgPermissionSave')).to_be_enabled()
        owner.unroute(API+'/api/users/permissions')
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        reconnect()
        assert guest.evaluate("WolfGuardCloud.can('library.create')&&WolfGuardCloud.can('remote.write')&&!WolfGuardCloud.can('users.permissions')&&!WolfGuardCloud.can('users.manage')")

        pair = owner.evaluate("()=>WolfGuardCloud.agentRequest('agents/pair',{})")
        response = owner.request.post(context.backend+'/api/agent/enroll', data={'code':pair['code'],'name':'Poste confidentiel','platform':'win32'})
        assert response.status == 200
        agent_id = response.json()['id']
        owner.evaluate("async id=>{const s=await WolfGuardCloud.agentRequest('agents/groups');await WolfGuardCloud.agentRequest('agents/groups/create',{name:'Confidentiel',ids:[id],revision:s.revision});}",agent_id)
        owner.locator('.settings-close').click()
        open_security(owner)
        owner.locator('[data-fleet-agent="'+agent_id+'"]').click()
        expect(owner.locator('[data-record-restricted]')).to_have_count(0)
        assert guest.evaluate("async()=>!(await WolfGuardCloud.agentRequest('agents')).agents.length")
        for width in [1440, 850, 390, 320]:
            owner.set_viewport_size({'width':width,'height':1000 if width>640 else 844})
            assert owner.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
            assert owner.locator('#agentDetailsPanel').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), width
        owner.screenshot(path=str(ROOT/'.cache/role-private-machine-mobile.png'), animations='disabled')
        owner.locator('#agentDetailsClose').click()
        users(owner)
        owner.locator('[data-select-user]').filter(has_text='rights@example.test').click()
        owner.locator('[data-permission-profile=admin]').click()
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        reconnect()
        assert guest.evaluate("async()=> (await WolfGuardCloud.agentRequest('agents')).agents.length===1")
        for width in [1440, 850, 390, 320]:
            owner.set_viewport_size({'width':width,'height':1000 if width>640 else 844})
            assert owner.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
            assert owner.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), width
            assert owner.locator('#wgPermissionHost').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), width
            if width in [1440, 390]:
                owner.locator('.permission-role-heading').scroll_into_view_if_needed()
                owner.screenshot(path=str(ROOT/f'.cache/roles-{width}.png'), animations='disabled')
        owner.locator('[data-select-user]').filter(has_text='cantin.bruno@gmx.fr').click()
        expect(owner.locator('#wgUserOverview')).to_contain_text('Propriétaire')
        expect(owner.locator('[data-permission-profile]')).to_have_count(0)
        expect(owner.locator('.permission-owner')).to_be_visible()
        assert not errors, errors
    print('PASS: four assignable roles, protected owner, safe guest default, retryable saves, group visibility, API filtering and 320px layout')


if __name__ == '__main__':
    run()
    from security_permissions_test import run as run_security_permissions
    run_security_permissions()
