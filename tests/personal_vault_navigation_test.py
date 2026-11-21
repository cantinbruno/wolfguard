"""The personal vault container stays hidden across navigation and root writes."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui,invite,activate


def open_vault(page):
    page.evaluate("()=>openSection('vault')")
    page.wait_for_function("()=>state.section==='vault'&&!sectionTransition.active")


def check_root(page):
    home=page.evaluate('WolfGuardCloud.currentUser().vaultHome')
    expect(page.locator('[data-tree-folder="'+home['id']+'"]')).to_have_count(0)
    expect(page.locator('#unifiedTree')).not_to_contain_text(home['name'])
    assert page.evaluate('state.folder===WolfGuardCloud.currentUser().vaultHome.id')
    expect(page.locator('.catalog-vault h2')).to_have_text('Coffre-fort')
    expect(page.locator('.tree-overview-row')).to_have_class('tree-row tree-overview-row active')
    return home


def drop(page,kind,record_id,target=None):
    page.evaluate("""({kind,id,target})=>{
      const data=new DataTransfer();data.setData('application/x-itw-drag',JSON.stringify({kind,id}));
      const element=target?document.querySelector('[data-tree-folder="'+target+'"]'):document.querySelector('.tree-root-drop');
      element.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data}));
    }""",{'kind':kind,'id':record_id,'target':target})


def exercise(page):
    open_vault(page);home=check_root(page)
    assert page.evaluate("async id=>(await get('folders',id)).systemVaultHome",home['id'])
    page.get_by_role('button',name='Nouveau dossier',exact=True).click()
    expect(page.locator('#folderParent option')).not_to_contain_text([home['name']])
    page.locator('#folderName').fill('Services');page.locator('#saveFolder').click();expect(page.locator('#modalRoot')).to_be_empty()
    first=page.evaluate("async()=>(await all('folders')).find(f=>f.section==='vault'&&f.name==='Services')")
    assert first['parentId']==home['id']
    expect(page.locator('[data-tree-folder="'+first['id']+'"]')).to_be_visible()
    page.evaluate('(id)=>newFolder(id)',first['id']);page.locator('#folderName').fill('Archives');page.locator('#saveFolder').click();expect(page.locator('#modalRoot')).to_be_empty()
    child=page.evaluate("async()=>(await all('folders')).find(f=>f.section==='vault'&&f.name==='Archives')")
    assert child['parentId']==first['id']
    page.evaluate('(id)=>selectFolder(id)',child['id'])
    page.get_by_role('button',name='Nouvel accès',exact=True).click();expect(page.locator('#fTitle')).to_be_visible()
    assert home['name'] not in page.locator('#fFolder').inner_text()
    assert page.locator('#fFolder').input_value()==child['id']
    page.locator('#fFolder').select_option('');page.locator('#fTitle').fill('Accès racine');page.locator('#fPass').fill('TEST-VAULT-PASSWORD')
    page.locator('.vault-edit-footer .primary').click();expect(page.locator('#passMask')).to_be_visible()
    record=page.evaluate("async()=>(await all('items')).find(item=>item.type==='vault'&&item.title==='Accès racine')")
    assert record['folderId']==home['id']
    expect(page.locator('.breadcrumb')).not_to_contain_text(home['name'])
    page.locator('#globalSearch').fill('Accès racine')
    expect(page.locator('#searchResults .search-result')).to_have_count(1)
    expect(page.locator('#searchResults')).not_to_contain_text(home['name'])
    page.locator('#globalSearch').fill('');page.locator('#globalSearch').press('Escape')
    page.locator('#workspaceBack').click();page.locator('.tree-overview-row').click();check_root(page)
    page.evaluate('(id)=>folderMenu(id)',child['id']);assert home['name'] not in page.locator('#folderParentEdit').inner_text()
    page.locator('#folderParentEdit').select_option('');page.locator('#ren').click();expect(page.locator('#modalRoot')).to_be_empty()
    assert page.evaluate("async id=>(await get('folders',id)).parentId",child['id'])==home['id']
    drop(page,'folder',child['id'],first['id'])
    page.wait_for_function("async({id,parent})=>(await get('folders',id)).parentId===parent",arg={'id':child['id'],'parent':first['id']})
    drop(page,'folder',child['id'])
    page.wait_for_function("async({id,parent})=>(await get('folders',id)).parentId===parent",arg={'id':child['id'],'parent':home['id']})
    drop(page,'item',record['id'],first['id'])
    page.wait_for_function("async({id,parent})=>(await get('items',id)).folderId===parent",arg={'id':record['id'],'parent':first['id']})
    drop(page,'item',record['id'])
    page.wait_for_function("async({id,parent})=>(await get('items',id)).folderId===parent",arg={'id':record['id'],'parent':home['id']})
    page.wait_for_function("()=>!!document.querySelector('.catalog-vault')")
    check_root(page)
    page.reload();expect(page.locator('#app')).to_be_visible(timeout=20000);page.wait_for_function('()=>!document.querySelector("#app").inert')
    open_vault(page);check_root(page)
    for width in [1440,390,320]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        expect(page.locator('[data-tree-folder="'+home['id']+'"]')).to_have_count(0)


def run():
    with account_ui() as (owner,context,origin,errors):
        invitation=invite(owner,'personal-vault@example.test')
        owner.evaluate("""async()=>{
          const state=await workspaceGroups.ensure(new AbortController().signal);
          const users=await WolfGuardCloud.agentRequest('users');
          const user=users.users.find(user=>user.username==='personal-vault@example.test');
          await WolfGuardCloud.agentRequest('users/groups/memberships',{userId:user.id,groupIds:[state.groups.find(group=>group.name==='GG_Acces_Coffre_fort_ecriture').id],revision:state.revision});
        }""")
        owner.locator('#wgUserInvitationClose').click();owner.locator('.settings-close').click()
        member=context().new_page();activate(member,invitation,'personal-vault@example.test')
        exercise(owner);exercise(member)
        assert not errors,errors
    print('PASS: owner/member vault roots hidden in tree, title, breadcrumbs and editors; root folder/item moves, reload and mobile')


if __name__=='__main__':run()
