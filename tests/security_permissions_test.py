"""One security level and one agent scope, enforced by the real API fixture."""
from urllib.parse import urlsplit
from playwright.sync_api import expect
from account_ui_fixture import account_ui, invite, activate, ROOT

SECURITY = ['agents', 'scan.passive', 'scan.active', 'scan.map', 'scan.vulnerability', 'edr', 'remote']


def run():
    with account_ui() as (owner, context, origin, errors):
        def enroll(name):
            ticket = owner.evaluate("() => WolfGuardCloud.agentRequest('agents/pair', {})")
            response = owner.request.post(context.backend + '/api/agent/enroll', data={
                'code': ticket['code'], 'name': name, 'platform': 'win32'})
            assert response.status == 200
            return response.json()['id']

        allowed, excluded, reserved = [enroll(name) for name in ['Poste atelier', 'Poste direction', 'Poste administrateur']]
        owner.evaluate("id => WolfGuardCloud.agentRequest('agents/restricted', {id, restricted:true})", reserved)
        invitation = invite(owner, 'security-rights@example.test')
        guest_context = context()
        guest = guest_context.new_page()
        activate(guest, invitation, 'security-rights@example.test')
        owner.locator('#wgUserInvitationClose').click()
        owner.locator('#wgUsersRefresh').click()
        owner.locator('[data-select-user]').filter(has_text='security-rights@example.test').click()
        expect(owner.locator('#wgSecurityRightsTitle')).to_have_text('Sécurité des postes')
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()

        owner.locator('[data-security-level=write]').click()
        owner.locator('[data-agent-scope=selected]').check()
        expect(owner.locator('.permission-agent-scope > small')).to_contain_text('0 poste')
        owner.locator('[data-permission-agent="' + allowed + '"]').check()
        owner.locator('[data-permission-agent="' + reserved + '"]').check()
        owner.locator('[data-section=library][data-level=read]').click()
        expect(owner.locator('[data-permission-agent="' + allowed + '"]')).to_be_checked()
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionHost')).to_contain_text('Droits enregistrés')

        def policy():
            return owner.evaluate("async () => (await WolfGuardCloud.agentRequest('users')).users.find(u => u.username==='security-rights@example.test').permissions")

        saved = policy()
        assert all(saved['sections'][section] == 'write' for section in SECURITY)
        assert set(saved['agents']) == {allowed, reserved}
        assert saved['sections']['library'] == 'read' and saved['admin'] is False

        def reconnect():
            guest.evaluate('async () => {try {await WolfGuardCloud.touch()} catch {}}')
            expect(guest.locator('#lock')).to_be_visible()
            expect(guest.locator('#keypad button').first).to_be_enabled(timeout=15000)
            guest.locator('#lock').focus()
            guest.keyboard.type('12345678')
            expect(guest.locator('#app')).to_be_visible(timeout=20000)
            guest.wait_for_function('() => !document.querySelector("#app").inert')

        reconnect()
        assert guest.evaluate("async () => (await WolfGuardCloud.agentRequest('agents')).agents.map(a => a.id)") == [allowed]
        responses = []
        guest.on('response', lambda response: responses.append((urlsplit(response.url).path, response.status)))
        for agent_id in [excluded, reserved, enroll('Nouveau poste')]:
            for endpoint, data in [
                ('scans', {'agentId': agent_id, 'workspace': 'active', 'strategy': 'active', 'target': '192.0.2.1', 'ports': '443'}),
                ('remote/start', {'agentId': agent_id, 'mode': 'desktop'}),
                ('edr/events?agentId=' + agent_id, None)
            ]:
                result = guest.evaluate("async ({endpoint,data}) => {try {await WolfGuardCloud.agentRequest(endpoint,data===null?undefined:data);return false} catch {return true}}", {'endpoint': endpoint, 'data': data})
                assert result, endpoint
        denials = [status for path, status in responses if path in ['/api/scans', '/api/remote/start', '/api/edr/events']]
        assert len(denials) >= 9 and all(status == 403 for status in denials), responses

        owner.locator('[data-security-level=read]').click()
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        assert all(policy()['sections'][section] == 'read' for section in SECURITY)
        reconnect()
        assert guest.evaluate("WolfGuardCloud.can('agents.read') && !WolfGuardCloud.can('agents.write') && !WolfGuardCloud.can('remote.write') && !WolfGuardCloud.can('scan.active.run')")
        assert guest.evaluate("async () => (await WolfGuardCloud.agentRequest('agents')).agents.map(a => a.id)") == [allowed]

        # Viewing and changing another section must not flatten existing mixed rights.
        owner.evaluate("""async () => {
            const user=(await WolfGuardCloud.agentRequest('users')).users.find(u=>u.username==='security-rights@example.test');
            user.permissions.sections.remote='deny';
            await WolfGuardCloud.agentRequest('users/permissions',{id:user.id,revision:user.permission_revision,policy:user.permissions});
        }""")
        owner.locator('#settings-tab-security').click()
        owner.locator('#settings-tab-users').click()
        owner.locator('[data-select-user]').filter(has_text='security-rights@example.test').click()
        expect(owner.locator('.permission-security-badge')).to_have_text('Personnalisé')
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        owner.locator('[data-section=library][data-level=write]').click()
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        assert policy()['sections']['remote'] == 'deny'
        assert set(policy()['agents']) == {allowed, reserved}

        # Harmonising security must preserve legacy restrictions on unrelated data.
        owner.evaluate("""async () => {
            const user=(await WolfGuardCloud.agentRequest('users')).users.find(u=>u.username==='security-rights@example.test');
            user.permissions.legacyGrants=WolfGuardPermissions.grantsOf(user.permissions);
            user.permissions.scopes={library:{mode:'selected',folders:{},items:{'team-note':'read'}},vault:{mode:'all',folders:{},items:{}}};
            await WolfGuardCloud.agentRequest('users/permissions',{id:user.id,revision:user.permission_revision,policy:user.permissions});
        }""")
        before = policy()
        owner.locator('#settings-tab-security').click()
        owner.locator('#settings-tab-users').click()
        owner.locator('[data-select-user]').filter(has_text='security-rights@example.test').click()
        owner.locator('[data-security-level=write]').click()
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        after = policy()
        assert after['scopes'] == before['scopes']
        assert set(after['agents']) == set(before['agents'])
        assert sorted(key for key in after['legacyGrants'] if key.startswith('library.')) == sorted(key for key in before['legacyGrants'] if key.startswith('library.'))

        # An unavailable fleet must not turn a selected scope into unrestricted access.
        from shared_workspace_test import API
        owner.route(API + '/api/agents', lambda route: route.fulfill(status=503, json={'error': 'Fleet unavailable'}))
        owner.locator('#settings-tab-security').click()
        owner.locator('#settings-tab-users').click()
        owner.locator('[data-select-user]').filter(has_text='security-rights@example.test').click()
        expect(owner.locator('[data-agent-scope=all]')).to_be_disabled()
        expect(owner.locator('.permission-agent-scope')).to_contain_text('Le périmètre actuel est conservé')
        owner.locator('[data-section=tools][data-level=read]').click()
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        assert set(policy()['agents']) == {allowed, reserved}
        owner.unroute(API + '/api/agents')
        owner.locator('#wgPermissionAdmin').check()
        expect(owner.locator('[data-agent-scope=all]')).to_be_checked()
        expect(owner.locator('[data-security-level=write]')).to_be_disabled()
        expect(owner.locator('.permission-agent-scope')).to_contain_text('y compris ceux réservés aux administrateurs')
        owner.locator('#wgPermissionAdmin').uncheck()
        expect(owner.locator('[data-agent-scope=selected]')).to_be_checked()
        expect(owner.locator('[data-permission-agent="' + allowed + '"]')).to_be_checked()
        owner.locator('.permission-security').scroll_into_view_if_needed()
        owner.screenshot(path=str(ROOT / '.cache/security-rights-desktop.png'), animations='disabled')
        for width in [1440, 850, 390, 320]:
            owner.set_viewport_size({'width': width, 'height': 1000})
            assert owner.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
            assert owner.locator('.settings-main').evaluate('el => el.scrollWidth <= el.clientWidth'), width
        owner.set_viewport_size({'width': 390, 'height': 1000})
        owner.locator('.permission-security').scroll_into_view_if_needed()
        owner.screenshot(path=str(ROOT / '.cache/security-rights-mobile.png'), animations='disabled')
        assert not errors, errors
    print('PASS: unified security level; shared agent scope enforced on fleet, scans, remote and EDR; reserved/new agents excluded; mixed rights preserved; session revocation and mobile layout.')


if __name__ == '__main__':
    run()
