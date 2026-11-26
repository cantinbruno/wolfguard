"""Headless security group nesting, action ACLs and effective access inspection."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui,invite,activate,ROOT


def run():
    with account_ui() as (owner,context,origin,errors):
        owner.evaluate("()=>{window.groupRuntimeErrors=[];const notify=appNotify;appNotify=(message,options)=>{if(/Cannot read|is not defined/.test(message))groupRuntimeErrors.push(message);return notify(message,options);};}")
        invitation=invite(owner,'ad-team@example.test')
        member=context().new_page();activate(member,invitation,'ad-team@example.test')
        owner.locator('#wgUserInvitationClose').click();owner.locator('#settings-tab-groups').click()
        owner.locator('#wgGroupCreate').click();owner.locator('.app-dialog-input').fill('GG_Equipe_Support');owner.locator('.app-dialog-submit').click()
        expect(owner.locator('#wgGroupName')).to_have_text('GG_Equipe_Support')
        owner.locator('#wgGroupAddMember').select_option(label='ad-team@example.test');owner.locator('#wgGroupAssign').click()
        expect(owner.locator('#wgGroupMemberList')).to_contain_text('ad-team@example.test')
        owner.locator('[data-group-pane=links]').click();owner.locator('#wgGroupAddParent').select_option(label='GG_Acces_Memo_ecriture');owner.locator('#wgGroupJoin').click()
        expect(owner.locator('#wgGroupParentList')).to_contain_text('GG_Acces_Memo_ecriture')
        owner.locator('[data-group-pane=permissions]').click();owner.locator('#wgPermissionActions > summary').click()
        owner.locator('[data-action-rule="library.delete"]').select_option('deny');owner.locator('#wgPermissionSave').click()
        expect(owner.locator('[data-permission-save-notice]')).to_contain_text('Droits enregistrés')
        owner.locator('[data-group-pane=effective]').click();owner.locator('#wgGroupEffectiveUser').select_option(label='ad-team@example.test');owner.locator('#wgGroupCheckEffective').click()
        expect(owner.locator('[data-effective-action="library.delete"]')).to_contain_text('Refus explicite')
        expect(owner.locator('[data-effective-action="library.edit"]')).to_contain_text('Autorisé')
        expect(owner.locator('#wgGroupEffectiveResult')).to_contain_text('GG_Acces_Memo_ecriture')
        owner.locator('[data-group-pane=permissions]').click()
        owner.locator('#wgPermissionActionSearch').fill('Authenticator')
        expect(owner.locator('.permission-action-row:visible select')).to_have_count(1)
        owner.locator('#wgPermissionActionSearch').fill('')
        owner.screenshot(path=str(ROOT/'.cache/ad-groups-desktop.png'),animations='disabled')
        for width in [1440,850,390,320]:
            owner.set_viewport_size({'width':width,'height':900})
            assert owner.locator('.settings-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
            assert owner.locator('#wgGroupNesting').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
            assert owner.locator('#wgPermissionActions').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
        owner.screenshot(path=str(ROOT/'.cache/ad-groups-mobile.png'),animations='disabled')
        owner.set_viewport_size({'width':1440,'height':1000});owner.locator('#settings-tab-users').click()
        owner.locator('[data-select-user]').filter(has_text='ad-team@example.test').click()
        expect(owner.locator('[data-user-access-group]:checked')).to_have_count(1)
        expect(owner.locator('.user-inherited-groups')).to_contain_text('GG_Acces_Memo_ecriture')
        member.evaluate('async()=>{try{await WolfGuardCloud.touch()}catch{}}')
        expect(member.locator('#keypad button').first).to_be_enabled(timeout=15000)
        member.locator('#lock').focus();member.keyboard.type('12345678');expect(member.locator('#app')).to_be_visible(timeout=20000)
        member.wait_for_function('()=>!document.querySelector("#app").inert')
        assert member.evaluate("WolfGuardCloud.can('library.edit')&&!WolfGuardCloud.can('library.delete')")
        assert not owner.evaluate('groupRuntimeErrors'),owner.evaluate('groupRuntimeErrors')
        assert not errors,errors
    print('PASS: nested business groups, action refusals, inherited membership, effective access and responsive settings')


if __name__=='__main__':run()
