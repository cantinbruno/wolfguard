"""Headless cumulative section groups, membership, sizing and personal vault landing."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui,invite,activate,ROOT


def run():
    with account_ui() as (owner,context,origin,errors):
        invitation=invite(owner,'team-member@example.test');viewer=context().new_page();activate(viewer,invitation,'team-member@example.test')
        owner.locator('#wgUserInvitationClose').click();owner.locator('#settings-tab-groups').click()
        expect(owner.locator('#wgGroupCategory')).to_have_value('custom')
        expect(owner.locator('#wgGroupsCount')).to_contain_text('automatique')
        expect(owner.locator('#wgGroupsList')).not_to_contain_text('GG_Acces_Application_administrateur')
        owner.locator('#wgGroupCategory').select_option('all')
        for name in ['GG_Acces_Application_administrateur','GG_Acces_Memo_lecture','GG_Acces_Memo_ecriture','GG_Acces_Coffre_fort_ecriture','GG_Acces_Sans_section_lecture']:
            expect(owner.locator('#wgGroupsList')).to_contain_text(name)
        for name in ['GG_Acces_Memo_lecture','GG_Acces_Coffre_fort_ecriture']:
            owner.locator('[data-access-group]').filter(has_text=name).click()
            expect(owner.locator('#wgGroupPermissionHost')).to_contain_text('Groupe automatique')
            if owner.locator('#wgGroupMembers').get_attribute('open') is None:owner.locator('#wgGroupMembers > summary').click()
            owner.locator('#wgGroupAddMember').select_option(label='team-member@example.test');owner.locator('#wgGroupAssign').click()
            expect(owner.locator('#wgGroupMemberList')).to_contain_text('team-member@example.test')
        owner.locator('#wgGroupsAudit').click();expect(owner.locator('#wgGroupPermissionHost')).to_contain_text('Ajout de membres');owner.locator('[data-close-audit]').click()
        viewer.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}');expect(viewer.locator('#keypad button').first).to_be_enabled(timeout=15000)
        viewer.locator('#lock').focus();viewer.keyboard.type('12345678');expect(viewer.locator('#app')).to_be_visible(timeout=20000);viewer.wait_for_function('()=>!document.querySelector("#app").inert')
        assert viewer.evaluate("WolfGuardCloud.currentUser().permissions.accessGroup.names.includes('GG_Acces_Memo_lecture')&&WolfGuardCloud.currentUser().permissions.accessGroup.names.includes('GG_Acces_Coffre_fort_ecriture')&&WolfGuardCloud.can('library.read')&&!WolfGuardCloud.can('library.write')&&WolfGuardCloud.can('vault.edit')&&!WolfGuardCloud.can('agents.read')")
        viewer.evaluate("()=>openSection('vault')");viewer.wait_for_function("()=>state.section==='vault'&&!sectionTransition.active")
        assert viewer.evaluate('state.folder===WolfGuardCloud.currentUser().vaultHome.id')
        expect(viewer.locator('.catalog-vault h2')).to_have_text('Coffre-fort')
        expect(viewer.locator('#unifiedTree')).not_to_contain_text('team-member@example.test')
        expect(viewer.locator('[data-tree-folder^="vault-user-"]')).to_have_count(0)
        expect(viewer.locator('.tree-overview-row')).to_have_class('tree-row tree-overview-row active')
        viewer.evaluate('()=>selectFolder(null)');assert viewer.evaluate('state.folder===WolfGuardCloud.currentUser().vaultHome.id')
        owner.locator('#settings-tab-users').click();owner.locator('[data-select-user]').filter(has_text='team-member@example.test').click();expect(owner.locator('[data-user-access-group]:checked')).to_have_count(2)
        # Roles: a simple choice on top of the groups; the original combination stays "Personnalisé".
        expect(owner.locator('[data-user-role=custom]')).to_be_checked()
        saved=owner.evaluate("[...document.querySelectorAll('[data-user-access-group]:checked')].map(box=>box.dataset.userAccessGroup)")
        owner.locator('.user-role-option',has_text='Observateur').click();expect(owner.locator('[data-user-role=observer]')).to_be_checked();expect(owner.locator('#wgUserApplyGroup')).to_be_enabled()
        owner.locator('.user-role-option',has_text='Administrateur').click();expect(owner.locator('[data-user-access-group]:checked')).to_have_count(1);expect(owner.locator('label',has_text='GG_Acces_Application_administrateur').locator('input')).to_be_checked()
        owner.evaluate("(ids)=>{document.querySelectorAll('[data-user-access-group]').forEach(box=>{box.checked=ids.includes(box.dataset.userAccessGroup)});document.querySelector('#wgPermissionHost').dispatchEvent(new Event('change'))}",saved)
        expect(owner.locator('[data-user-role=custom]')).to_be_checked();expect(owner.locator('#wgUserApplyGroup')).to_be_disabled()
        expect(owner.locator('#settings-users [data-permission-profile],#settings-users [data-section],#settings-users [data-group-right-id]')).to_have_count(0)
        draft=owner.locator('label',has_text='GG_Acces_Memo_ecriture').locator('input');draft.check();owner.locator('#settings-tab-interface').click();expect(owner.locator('.app-dialog')).to_be_visible();owner.locator('.app-dialog-cancel').click();expect(owner.locator('#settings-users')).to_be_visible();draft.uncheck()
        owner.set_viewport_size({'width':1920,'height':1080});box=owner.locator('.settings-modal').bounding_box();assert box['width']<=1281 and box['height']<=821,box
        owner.screenshot(path=str(ROOT/'.cache/access-groups-desktop.png'),animations='disabled');owner.locator('.settings-close').click()
        ticket=owner.evaluate("WolfGuardCloud.agentRequest('agents/pair',{})");response=owner.request.post(context.backend+'/api/agent/enroll',data={'code':ticket['code'],'name':'Poste test','platform':'win32'});assert response.status==200
        from site_fixture import open_security
        open_security(owner);owner.locator('[data-fleet-agent]').first.click();expect(owner.locator('#agentDetailsPanel')).to_be_visible();box=owner.locator('#agentDetailsPanel').bounding_box();assert box['width']<=1281 and box['height']<=821,box
        owner.locator('#agentDetailsClose').click();owner.locator('#settingsBtn').click();owner.locator('#settings-tab-groups').click()
        for width in [1440,850,390,320]:
            owner.set_viewport_size({'width':width,'height':900});assert owner.evaluate('document.documentElement.scrollWidth<=innerWidth'),width;assert owner.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
        owner.screenshot(path=str(ROOT/'.cache/access-groups-mobile.png'),animations='disabled');assert not errors,errors
    print('PASS: cumulative section groups, default invisible access, membership, responsive dialogs and personal vault')


if __name__=='__main__':run()
