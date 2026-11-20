"""Security section caps and shared group grants enforced by the real API."""
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

        allowed, excluded, reserved, reader = [enroll(name) for name in ['Poste atelier', 'Poste direction', 'Poste administrateur', 'Poste consultation']]
        owner.evaluate("id => WolfGuardCloud.agentRequest('agents/restricted', {id, restricted:true})", reserved)
        owner.evaluate('async()=>{await WolfGuardFleetGroups.create().load()}')
        group_ids={}
        for index,agent_id in enumerate([allowed,excluded,reserved,reader]):
            group_ids[agent_id]=owner.evaluate('''async ({id,index})=>{let state=await WolfGuardCloud.agentRequest('agents/groups');state=await WolfGuardCloud.agentRequest('agents/groups/create',{name:'Groupe '+index,ids:[id],revision:state.revision});return state.assignments[id]}''',{'id':agent_id,'index':index})
        invitation = invite(owner, 'security-rights@example.test')
        guest_context = context()
        guest = guest_context.new_page()
        activate(guest, invitation, 'security-rights@example.test')
        owner.locator('#wgUserInvitationClose').click()
        owner.locator('#wgUsersRefresh').click()
        owner.locator('[data-select-user]').filter(has_text='security-rights@example.test').click()
        owner.locator('[data-user-pane=posts]').click()
        expect(owner.locator('#wgSecurityRightsTitle')).to_have_text('Sécurité des postes')
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()

        owner.locator('[data-security-level=write]').click()
        owner.locator('[data-group-right-id="' + group_ids[allowed] + '"][data-group-level=write]').click()
        owner.locator('[data-group-right-id="' + group_ids[reader] + '"][data-group-level=read]').click()
        owner.locator('[data-user-pane=rights]').click()
        owner.locator('#wgPermissionCustomization > summary').click()
        owner.locator('[data-section=library][data-level=read]').click()
        owner.locator('[data-user-pane=posts]').click()
        expect(owner.locator('[data-group-right-id="' + group_ids[allowed] + '"][data-group-level=write]')).to_have_attribute('aria-pressed','true')
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionHost')).to_contain_text('Droits enregistrés')

        def policy():
            return owner.evaluate("async () => (await WolfGuardCloud.agentRequest('users')).users.find(u => u.username==='security-rights@example.test').permissions")

        saved = policy()
        assert all(saved['sections'][section] == 'write' for section in SECURITY)
        assert saved['agents'] is None and 'agentLevels' not in saved
        assert saved['groupLevels'][group_ids[reader]] == 'read' and saved['groupLevels'][group_ids[allowed]] == 'write'
        assert saved['sections']['library'] == 'read' and saved['admin'] is False
        owner.locator('[data-user-pane=rights]').click()
        owner.locator('[data-permission-bulk]').select_option('read')
        owner.locator('[data-user-pane=posts]').click()
        expect(owner.locator('[data-group-right-id="' + group_ids[reader] + '"][data-group-level=read]')).to_have_attribute('aria-pressed','true')
        expect(owner.locator('[data-group-right-id="' + group_ids[allowed] + '"][data-group-level=write]')).to_have_attribute('aria-pressed','true')
        owner.locator('[data-close-permissions]').click()
        expect(owner.locator('[data-security-level=write]')).to_have_attribute('aria-pressed','true')

        def reconnect():
            guest.evaluate('async () => {try {await WolfGuardCloud.touch()} catch {}}')
            expect(guest.locator('#lock')).to_be_visible()
            expect(guest.locator('#keypad button').first).to_be_enabled(timeout=15000)
            guest.locator('#lock').focus()
            guest.keyboard.type('12345678')
            expect(guest.locator('#app')).to_be_visible(timeout=20000)
            guest.wait_for_function('() => !document.querySelector("#app").inert')

        reconnect()
        assert set(guest.evaluate("async () => (await WolfGuardCloud.agentRequest('agents')).agents.map(a => a.id)")) == {allowed, reader}
        assert guest.evaluate("id => WolfGuardAccess.canAgent(id,'agents.read') && !WolfGuardAccess.canAgent(id,'remote.write') && !WolfGuardAccess.canAgent(id,'scan.active.write')", reader)
        assert guest.evaluate("id => WolfGuardAccess.canAgent(id,'remote.write')", allowed)
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
        for endpoint, data in [('remote/start', {'agentId': reader, 'mode': 'terminal'}), ('scans', {'agentId': reader, 'workspace': 'active', 'strategy': 'active', 'target': '192.0.2.1'}), ('agents/revoke', {'id': reader}), ('edr/command', {'agentId': reader, 'action': 'refresh'})]:
            assert guest.evaluate("async ({endpoint,data}) => {try {await WolfGuardCloud.agentRequest(endpoint,data);return false} catch {return true}}", {'endpoint': endpoint, 'data': data})
        assert guest.evaluate("async id => !!await WolfGuardCloud.agentRequest('edr/events?agentId='+id)", reader)

        owner.locator('[data-security-level=read]').click()
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        assert all(policy()['sections'][section] == 'read' for section in SECURITY)
        reconnect()
        assert guest.evaluate("WolfGuardCloud.can('agents.read') && !WolfGuardCloud.can('agents.write') && !WolfGuardCloud.can('remote.write') && !WolfGuardCloud.can('scan.active.run')")
        assert set(guest.evaluate("async () => (await WolfGuardCloud.agentRequest('agents')).agents.map(a => a.id)")) == {allowed, reader}

        # Viewing and changing another section must not flatten existing mixed rights.
        owner.evaluate("""async () => {
            const user=(await WolfGuardCloud.agentRequest('users')).users.find(u=>u.username==='security-rights@example.test');
            user.permissions.sections.remote='deny';
            await WolfGuardCloud.agentRequest('users/permissions',{id:user.id,revision:user.permission_revision,policy:user.permissions});
        }""")
        owner.locator('#settings-tab-security').click()
        owner.locator('#settings-tab-users').click()
        owner.locator('[data-select-user]').filter(has_text='security-rights@example.test').click()
        owner.locator('[data-user-pane=posts]').click()
        expect(owner.locator('.permission-security-badge')).to_have_text('Personnalisé')
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        owner.locator('[data-user-pane=rights]').click()
        owner.locator('#wgPermissionCustomization > summary').click()
        owner.locator('[data-section=library][data-level=write]').click()
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        assert policy()['sections']['remote'] == 'deny'
        assert policy()['groupLevels'][group_ids[allowed]] == 'write'

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
        owner.locator('[data-user-pane=posts]').click()
        owner.locator('[data-security-level=write]').click()
        owner.locator('#wgPermissionSave').click()
        expect(owner.locator('#wgPermissionSave')).to_be_disabled()
        after = policy()
        assert after['scopes'] == before['scopes']
        assert after['groupLevels'] == before['groupLevels']
        assert sorted(key for key in after['legacyGrants'] if key.startswith('library.')) == sorted(key for key in before['legacyGrants'] if key.startswith('library.'))

        # Unavailable groups stop the editor from submitting a partial grant list.
        from shared_workspace_test import API
        owner.route(API+'/api/agents/groups',lambda route:route.fulfill(status=503,json={'error':'Groups unavailable'}))
        owner.locator('#settings-tab-security').click();owner.locator('#settings-tab-users').click()
        owner.locator('[data-select-user]').filter(has_text='security-rights@example.test').click()
        expect(owner.locator('#wgPermissionHost')).to_contain_text('Groups unavailable')
        expect(owner.locator('#wgPermissionSave')).to_have_count(0)
        owner.unroute(API+'/api/agents/groups')
        owner.locator('#settings-tab-security').click();owner.locator('#settings-tab-users').click()
        owner.locator('[data-select-user]').filter(has_text='security-rights@example.test').click()
        expect(owner.locator('[data-permission-profile=admin]')).to_be_visible()
        owner.locator('[data-permission-profile=admin]').click()
        owner.locator('[data-user-pane=posts]').click()
        expect(owner.locator('[data-security-level=write]')).to_be_disabled()
        expect(owner.locator('.permission-agent-scope')).to_contain_text('accès à tous les groupes')
        owner.locator('[data-user-pane=rights]').click()
        owner.locator('[data-permission-profile=editor]').click()
        owner.locator('[data-user-pane=posts]').click()
        expect(owner.locator('[data-group-right-id="' + group_ids[allowed] + '"][data-group-level=write]')).to_have_attribute('aria-pressed','true')
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
