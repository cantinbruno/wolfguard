"""Account task navigation retains one permission draft without extra fetches."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui, invite, activate, users, ROOT
from shared_workspace_test import API


def run():
    with account_ui() as (owner, context, origin, errors):
        ticket = owner.evaluate("()=>WolfGuardCloud.agentRequest('agents/pair',{})")
        response = owner.request.post(context.backend + '/api/agent/enroll', data={
            'code': ticket['code'], 'name': 'Poste atelier', 'platform': 'win32'})
        assert response.status == 200
        agent_id = response.json()['id']
        url = invite(owner, 'navigation@example.test')
        viewer = context().new_page()
        activate(viewer, url, 'navigation@example.test')
        owner.locator('#wgUserInvitationClose').click()
        owner.locator('#wgUsersRefresh').click()
        owner.locator('[data-select-user]').filter(has_text='navigation@example.test').click()
        expect(owner.locator('[data-permission-profile=guest]')).to_be_visible()
        owner.locator('[data-permission-profile=editor]').click()
        owner.locator('#wgPermissionCustomization > summary').click()
        owner.locator('.permission-advanced > summary').click()
        owner.locator('#wgPermissionReason').fill('Intervention atelier')
        owner.locator('[data-section=library][data-level=read]').click()
        owner.locator('[data-user-pane=posts]').click()
        expect(owner.locator('[data-agent-scope=selected]')).to_be_visible()
        owner.locator('[data-agent-scope=selected]').check()
        owner.locator(f'[data-agent-right-id="{agent_id}"][data-agent-level=read]').click()
        requests = []
        owner.on('request', lambda request: requests.append(request.url)
                 if request.method == 'GET' and request.url in [API+'/api/agents', API+'/api/users/permissions'] else None)
        for _ in range(12):
            owner.locator('[data-user-pane=account]').click()
            expect(owner.locator('#wgPermissionHost')).not_to_be_visible()
            expect(owner.locator('[data-user-action=edit]')).to_be_visible()
            owner.locator('[data-user-pane=rights]').click()
            expect(owner.locator('#wgPermissionReason')).to_have_value('Intervention atelier')
            expect(owner.locator('[data-section=library][data-level=read]')).to_have_attribute('aria-pressed', 'true')
            owner.locator('[data-user-pane=posts]').click()
            expect(owner.locator(f'[data-agent-right-id="{agent_id}"][data-agent-level=read]')).to_have_attribute('aria-pressed', 'true')
        assert not requests, requests
        owner.locator('[data-user-pane=account]').click()
        owner.locator('#wgUsersRefresh').click()
        expect(owner.locator('#wgPermissionHost')).to_have_attribute('data-dirty', 'true')
        owner.locator('[data-user-pane=account]').press('Home')
        expect(owner.locator('[data-user-pane=rights]')).to_be_focused()
        expect(owner.locator('[data-user-pane=rights]')).to_have_attribute('aria-selected', 'true')
        owner.locator('[data-select-user]').filter(has_text='cantin.bruno@gmx.fr').click()
        expect(owner.locator('.app-dialog')).to_be_visible()
        owner.locator('.app-dialog-cancel').click()
        owner.locator('[data-user-pane=posts]').click()
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionHost')).to_have_attribute('data-dirty', 'false')
        saved = owner.evaluate("async()=> (await WolfGuardCloud.agentRequest('users')).users.find(u=>u.username==='navigation@example.test').permissions")
        assert saved['sections']['library'] == 'read'
        assert saved['agents'] == [agent_id] and saved['agentLevels'][agent_id] == 'read'
        owner.locator('[data-user-pane=rights]').click()
        owner.locator('[data-permission-profile=observer]').click()
        owner.locator('#wgPermissionReason').fill('Motif à annuler')
        owner.locator('[data-user-pane=posts]').click()
        owner.locator('[data-close-permissions]').click()
        expect(owner.locator('#wgPermissionHost')).to_have_attribute('data-dirty', 'false')
        expect(owner.locator('[data-security-level=write]')).to_have_attribute('aria-pressed', 'true')
        owner.locator('[data-user-pane=rights]').click()
        expect(owner.locator('#wgPermissionReason')).to_have_value('')
        viewer.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}')
        expect(viewer.locator('#keypad button').first).to_be_enabled(timeout=15000)
        viewer.locator('#lock').focus()
        viewer.keyboard.type('12345678')
        expect(viewer.locator('#app')).to_be_visible(timeout=20000)
        viewer.wait_for_function('()=>!document.querySelector("#app").inert')
        users(viewer)
        expect(viewer.locator('[data-user-pane=account]')).to_have_attribute('aria-selected', 'true')
        expect(viewer.locator('[data-user-pane=rights]')).not_to_be_visible()
        expect(viewer.locator('.users-account-facts')).to_be_visible()
        for width in [1260, 900, 390, 320]:
            owner.set_viewport_size({'width': width, 'height': 850})
            for pane in ['rights', 'posts', 'account']:
                owner.locator(f'[data-user-pane={pane}]').click()
                assert owner.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, pane)
                assert owner.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), (width, pane)
                assert owner.locator('#wgUserDetail').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), (width, pane)
                if width in [1260, 390]:
                    owner.screenshot(path=str(ROOT/f'.cache/users-{pane}-{width}.png'), animations='disabled')
        assert not errors, errors
    print('PASS: three account views, 36 switches without reloading or losing drafts, keyboard, refresh, save/discard, unsaved guard and 320px layout')


if __name__ == '__main__':
    run()
