"""Global group rights and fleet group levels are enforced together."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui,invite,activate

def run():
    with account_ui() as (owner,context,origin,errors):
        agents=[]
        for name in ['Atelier','Direction']:
            ticket=owner.evaluate("WolfGuardCloud.agentRequest('agents/pair',{})")
            response=owner.request.post(context.backend+'/api/agent/enroll',data={'code':ticket['code'],'name':name,'platform':'win32'});assert response.status==200;agents.append(response.json()['id'])
        invitation=invite(owner,'security-group@example.test');viewer=context().new_page();activate(viewer,invitation,'security-group@example.test');owner.locator('#wgUserInvitationClose').click()
        machine_group=owner.evaluate("""async id=>{let s=await WolfGuardCloud.agentRequest('agents/groups');s=await WolfGuardCloud.agentRequest('agents/groups/create',{name:'Atelier',ids:[id],revision:s.revision});return s.assignments[id]}""",agents[0])
        owner.locator('#settings-tab-groups').click();owner.locator('#wgGroupCreate').click();owner.locator('.app-dialog-input').fill('Techniciens');owner.locator('.app-dialog-submit').click()
        expect(owner.locator('#wgGroupName')).to_have_text('Techniciens');owner.locator('[data-permission-profile=editor]').click()
        owner.locator(f'[data-group-right-id="{machine_group}"][data-group-level=read]').click();owner.locator('#wgPermissionSave').click();expect(owner.locator('[data-permission-save-notice]')).to_contain_text('Droits enregistrés')
        owner.locator('#wgGroupMembers > summary').click();owner.locator('#wgGroupAddMember').select_option(label='security-group@example.test');owner.locator('#wgGroupAssign').click();expect(owner.locator('#wgGroupMemberList')).to_contain_text('security-group@example.test')
        def reconnect():
            viewer.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(viewer.locator('#keypad button').first).to_be_enabled(timeout=15000);viewer.locator('#lock').focus();viewer.keyboard.type('12345678');expect(viewer.locator('#app')).to_be_visible(timeout=20000);viewer.wait_for_function('()=>!document.querySelector("#app").inert')
        reconnect()
        assert viewer.evaluate("async()=> (await WolfGuardCloud.agentRequest('agents')).agents.map(a=>a.id)")==[agents[0]]
        assert viewer.evaluate("id=>WolfGuardAccess.canAgent(id)&&!WolfGuardAccess.canAgent(id,'remote.write')",agents[0])
        for endpoint,data in [('scans',{'agentId':agents[0],'strategy':'active','target':'192.0.2.1'}),('remote/start',{'agentId':agents[1],'mode':'terminal'}),('edr/events?agentId='+agents[1],None)]:
            assert viewer.evaluate("async({endpoint,data})=>{try{await WolfGuardCloud.agentRequest(endpoint,data===null?undefined:data);return false}catch{return true}}",{'endpoint':endpoint,'data':data})
        owner.locator('[data-security-level=read]').click();owner.locator('#wgPermissionSave').click();expect(owner.locator('[data-permission-save-notice]')).to_contain_text('Droits enregistrés');reconnect()
        assert viewer.evaluate("WolfGuardCloud.can('agents.read')&&!WolfGuardCloud.can('remote.write')&&!WolfGuardCloud.can('scan.active.run')")
        assert not errors,errors
    print('PASS: shared group section caps, fleet restrictions, hidden machine API denials, read-only operations and session revocation')

if __name__=='__main__':run()
