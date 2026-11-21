'use strict';

const workspaceGroups=(()=>{
  let controller=null,leave=async()=>true;
  const request=(path='',value,signal)=>WolfGuardCloud.agentRequest('users/groups'+path,value,{signal});
  async function ensure(signal){
    await WolfGuardFleetGroups.create().load();
    let state=await request('',undefined,signal);
    if(!state.initialized&&WolfGuardCloud.isAdmin())state=await request('/bootstrap',{},signal);
    if(state.initialized&&!state.prepared&&WolfGuardCloud.isAdmin())state=await request('/prepare',{revision:state.revision},signal);
    if(!state.initialized)throw new Error('Le propriétaire doit ouvrir les paramètres Groupes pour initialiser les autorisations.');
    return state;
  }
  function unmount(){controller?.abort();controller=null;leave=async()=>true;}
  async function mount(root){
    unmount();controller=new AbortController();const signal=controller.signal;
    let state=null,users=[],selected=null,busy=false;
    const live=()=>!signal.aborted&&root.isConnected,find=selector=>root.querySelector(selector),editor=()=>window.WolfGuardPermissionEditor;
    root.classList.add('users-manager');
    root.innerHTML=`<header class="settings-panel-head"><div><div class="settings-heading">${settingsIcon('users')}<h3>Groupes</h3></div><p>Utilisateurs → groupes métier → groupes d’accès → autorisations. Imbrique les groupes, règle les actions et vérifie les accès effectifs. Sans autorisation, l’accès est refusé.</p></div><div class="actions"><button type="button" class="settings-btn" id="wgGroupsAudit">Journal des droits</button><button type="button" class="settings-btn" id="wgGroupsRefresh">Actualiser</button><button type="button" class="settings-btn primary" id="wgGroupCreate">Nouveau groupe</button></div></header><p id="wgGroupsMessage" role="status"></p><div class="users-management-layout access-groups-workspace"><aside class="users-directory"><label>Rechercher un groupe<input type="search" id="wgGroupsSearch" placeholder="Nom du groupe"></label><label>Catégorie<select id="wgGroupCategory"><option value="all">Tous les groupes</option><option value="action">Autorisations par action</option><option value="section">Sections de l’application</option><option value="fleet">Sections de postes</option><option value="custom">Groupes métier et personnalisés</option><option value="admin">Administrateurs</option></select></label><div id="wgGroupsList" class="users-account-list"></div></aside><section class="users-detail" id="wgAccessGroupDetail"><header class="access-group-heading"><h4 id="wgGroupName"></h4><div class="actions"><button type="button" class="settings-btn" id="wgGroupRename">Renommer</button><button type="button" class="settings-btn" id="wgGroupDuplicate">Dupliquer</button><button type="button" class="settings-btn" id="wgGroupRemove">Supprimer</button></div></header><details class="access-group-members" id="wgGroupMembers"><summary>Membres du groupe</summary><p>Un utilisateur peut appartenir à plusieurs groupes. Chaque changement déconnecte ses sessions.</p><div id="wgGroupMemberList"></div><div class="actions"><select id="wgGroupAddMember" aria-label="Ajouter un membre"></select><button type="button" class="settings-btn" id="wgGroupAssign">Ajouter au groupe</button></div></details><details class="access-group-members" id="wgGroupNesting"><summary>Groupes membres et appartenance</summary><p>Les membres d’un groupe inclus reçoivent les autorisations du groupe qui le contient.</p><h5>Groupes membres</h5><div id="wgGroupNestedList"></div><div class="actions"><select id="wgGroupAddNested" aria-label="Inclure un groupe"></select><button type="button" class="settings-btn" id="wgGroupNest">Inclure</button></div><h5>Membre de</h5><div id="wgGroupParentList"></div><div class="actions"><select id="wgGroupAddParent" aria-label="Ajouter à un groupe d’accès"></select><button type="button" class="settings-btn" id="wgGroupJoin">Ajouter à ce groupe</button></div></details><details class="access-group-members" id="wgGroupEffective"><summary>Accès effectifs d’un utilisateur</summary><div class="actions"><select id="wgGroupEffectiveUser" aria-label="Utilisateur à vérifier"></select><button type="button" class="settings-btn" id="wgGroupCheckEffective">Vérifier les accès</button></div><div id="wgGroupEffectiveResult" aria-live="polite"></div></details><div id="wgGroupPermissionHost" data-permission-host></div></section></div>`;
    const message=(value,error=false)=>{if(live()){find('#wgGroupsMessage').textContent=value;find('#wgGroupsMessage').className=error?'access-error':'access-feedback';}};
    leave=async()=>{if(busy||editor()?.isSaving(root))return false;return !editor()?.isDirty(root)||await appConfirm('Quitter les modifications non enregistrées du groupe ?', {title:'Modifications en cours',confirmLabel:'Quitter sans enregistrer'});};
    function list(){
      const query=find('#wgGroupsSearch').value.trim().toLocaleLowerCase();
      find('#wgGroupsList').innerHTML=state.groups.filter(group=>group.name.toLocaleLowerCase().includes(query)&&(find('#wgGroupCategory').value==='all'||(group.presetKind||'custom')===find('#wgGroupCategory').value)).map(group=>'<button type="button" class="user-card users-account-row" data-access-group="'+esc(group.id)+'" aria-pressed="'+(selected===group.id)+'"><span class="users-account-copy"><strong>'+esc(group.name)+'</strong><small>'+group.memberIds.length+' membre(s) direct(s) · '+(group.effectiveMemberIds||group.memberIds).length+' effectif(s)</small></span></button>').join('');
    }
    async function select(id){
      if(!live()||busy||!await leave())return;
      const group=state.groups.find(group=>group.id===id);if(!group)return;
      selected=id;editor().reset(root);list();find('#wgGroupName').textContent=group.name;
      for(const name of ['Rename','Remove'])find('#wgGroup'+name).disabled=!!group.preset;
      find('#wgGroupMemberList').innerHTML=users.filter(user=>group.memberIds.includes(user.id)).map(user=>'<div class="access-group-member"><span>'+esc(user.username)+'</span><button type="button" class="settings-btn" data-remove-group-member="'+esc(user.id)+'">Retirer</button></div>').join('')||'<p>Aucun membre.</p>';
      find('#wgGroupAddMember').innerHTML='<option value="">Choisir un utilisateur…</option>'+users.filter(user=>user.role!=='admin'&&!group.memberIds.includes(user.id)).map(user=>'<option value="'+esc(user.id)+'">'+esc(user.username)+'</option>').join('');
      find('#wgGroupAssign').disabled=find('#wgGroupAddMember').options.length<2;
      const names=ids=>state.groups.filter(row=>ids.includes(row.id));
      find('#wgGroupNestedList').innerHTML=names(group.includedGroupIds||[]).map(row=>'<div class="access-group-member"><span>'+esc(row.name)+'</span><button type="button" class="settings-btn" data-remove-nested="'+esc(row.id)+'">Retirer</button></div>').join('')||'<p>Aucun groupe inclus.</p>';
      find('#wgGroupParentList').innerHTML=names(group.parentGroupIds||[]).map(row=>'<div class="access-group-member"><span>'+esc(row.name)+'</span><button type="button" class="settings-btn" data-remove-parent="'+esc(row.id)+'">Retirer l’appartenance</button></div>').join('')||'<p>Aucune appartenance.</p>';
      function options(selector,ids){find(selector).innerHTML='<option value="">Choisir un groupe…</option>'+state.groups.filter(row=>row.id!==group.id&&!ids.includes(row.id)).map(row=>'<option value="'+esc(row.id)+'">'+esc(row.name)+'</option>').join('');}
      options('#wgGroupAddNested',group.includedGroupIds||[]);options('#wgGroupAddParent',group.parentGroupIds||[]);
      find('#wgGroupEffectiveUser').innerHTML='<option value="">Choisir un utilisateur…</option>'+users.map(user=>'<option value="'+esc(user.id)+'">'+esc(user.username)+'</option>').join('');
      find('#wgGroupEffectiveResult').replaceChildren();
      const inherited=users.filter(user=>(group.effectiveMemberIds||[]).includes(user.id)&&!group.memberIds.includes(user.id));
      if(inherited.length)find('#wgGroupMemberList').insertAdjacentHTML('beforeend','<h5>Membres par imbrication</h5>'+inherited.map(user=>'<p>'+esc(user.username)+' <small>· hérité des groupes membres</small></p>').join(''));

      if(group.preset){find('#wgGroupPermissionHost').innerHTML='<section class="access-group-preset"><h5>Groupe automatique</h5><p>'+(group.presetKind==='admin'?'Accès administrateur complet à l’application.':group.presetKind==='action'?'Autorisation : '+esc(group.actionLabel)+'. La consultation de la section est incluse.':group.presetKind==='fleet'?'Accès '+(group.level==='write'?'en écriture':'en lecture')+' à la section de postes correspondante.':'Accès '+(group.level==='write'?'en écriture':'en lecture')+' à cette section de l’application.')+'</p><small>Son nom et ses droits suivent automatiquement la section. Gère ses membres et ses groupes inclus.</small></section>';return;}
      await editor().open(root,{id:group.id,username:group.name,role:'member',permissions:group.policy,permission_revision:state.revision},{signal,group:true,onSaved:async result=>{state=result;list();message('Droits du groupe enregistrés pour tous ses membres.');}});
    }
    async function refresh(){
      if(busy||!await leave())return;
      try{const values=await Promise.all([ensure(signal),WolfGuardCloud.agentRequest('users',undefined,{signal})]);if(!live())return;state=values[0];users=values[1].users;const id=state.groups.some(group=>group.id===selected)?selected:state.groups[0]?.id;if(id)await select(id);message('');}catch(error){message(error.message,true);}
    }
    async function change(operation,value,success){
      if(busy||!state||!await leave())return;busy=true;const controls=new Map([...root.querySelectorAll('button,input,select')].map(element=>[element,element.disabled]));for(const element of controls.keys())element.disabled=true;find('#wgAccessGroupDetail').setAttribute('aria-busy','true');
      try{const result=await request('/'+operation,{...value,revision:state.revision},signal);if(result.reconnect){await lockApplication();return;}if(['create','duplicate'].includes(operation))selected=result.groups.find(group=>!state.groups.some(old=>old.id===group.id))?.id||selected;state=result;editor().reset(root);busy=false;await select(state.groups.some(group=>group.id===selected)?selected:state.groups[0]?.id);message(success);}catch(error){message(error.message,true);}finally{busy=false;for(const [element,disabled]of controls)if(element.isConnected)element.disabled=disabled;if(live())find('#wgAccessGroupDetail').removeAttribute('aria-busy');}
    }
    find('#wgGroupNest').onclick=()=>{const id=find('#wgGroupAddNested').value;if(id)change('nest',{id:selected,groupIds:[id]},'Groupe inclus. Les membres héritent des autorisations.');};
    find('#wgGroupJoin').onclick=()=>{const id=find('#wgGroupAddParent').value;if(id)change('nest',{id,groupIds:[selected]},'Appartenance ajoutée au groupe d’accès.');};
    find('#wgGroupNestedList').onclick=event=>{const button=event.target.closest('[data-remove-nested]');if(button)change('unnest',{id:selected,groupIds:[button.dataset.removeNested]},'Groupe retiré.');};
    find('#wgGroupParentList').onclick=event=>{const button=event.target.closest('[data-remove-parent]');if(button)change('unnest',{id:button.dataset.removeParent,groupIds:[selected]},'Appartenance retirée.');};
    find('#wgGroupCheckEffective').onclick=async()=>{
      const userId=find('#wgGroupEffectiveUser').value;if(!userId||busy)return;const button=find('#wgGroupCheckEffective');button.disabled=true;
      try{const result=await request('/effective?userId='+encodeURIComponent(userId),undefined,signal);if(!live()||find('#wgGroupEffectiveUser').value!==userId)return;
        find('#wgGroupEffectiveResult').innerHTML=(result.owner?'<p>Propriétaire protégé · tous les droits.</p>':'<p>'+result.groups.map(group=>esc(group.name)+' <small>('+(group.expired?'expiré':group.direct?'direct':'hérité')+')</small>').join(', ')+'</p>')+'<div class="permission-action-list">'+result.actions.map(action=>'<div class="permission-action-row" data-effective-action="'+esc(action.key)+'" data-allowed="'+action.allowed+'"><span><strong>'+esc(action.sectionLabel)+' · '+esc(action.label)+'</strong><small>'+esc(action.sources.map(source=>source.name+(source.effect==='deny'?' (refus)':'')).join(', ')||'Aucun groupe autorisant cette action')+'</small></span><strong>'+(result.owner?'Autorisé':action.denied?'Refus explicite':action.allowed?'Autorisé':'Non accordé')+'</strong></div>').join('')+'</div><h5>Périmètre des postes</h5>'+result.fleet.map(section=>'<p>'+esc(section.name)+' : '+esc(({read:'Lecture',write:'Écriture',deny:'Aucun accès'})[section.level])+'</p>').join('');
      }catch(error){message(error.message,true);}finally{if(button.isConnected)button.disabled=false;}
    };
    find('#wgGroupCategory').onchange=()=>{if(state)list();};
    find('#wgGroupsSearch').oninput=()=>{if(state)list();};
    find('#wgGroupsList').onclick=event=>{const button=event.target.closest('[data-access-group]');if(button)select(button.dataset.accessGroup);};
    find('#wgGroupsRefresh').onclick=refresh;
    find('#wgGroupsAudit').onclick=async()=>{if(await leave()){editor().reset(root);await editor().audit(root,{signal,onClose:()=>select(selected)});}};
    find('#wgGroupCreate').onclick=async()=>{const name=await appPrompt('Nom du groupe','',{title:'Nouveau groupe',confirmLabel:'Créer'});if(name!==null)await change('create',{name},'Groupe métier créé sans droits. Ajoute ses utilisateurs, puis rends-le membre des groupes d’accès nécessaires.');};
    find('#wgGroupRename').onclick=async()=>{const group=state.groups.find(group=>group.id===selected),name=await appPrompt('Nom du groupe',group.name,{title:'Renommer',confirmLabel:'Enregistrer'});if(name!==null)await change('rename',{id:selected,name},'Groupe renommé.');};
    find('#wgGroupDuplicate').onclick=async()=>{const group=state.groups.find(group=>group.id===selected),name=await appPrompt('Nom de la copie',group.name+' (copie)',{title:'Dupliquer le groupe',confirmLabel:'Créer'});if(name!==null)await change('duplicate',{id:selected,name},'Groupe dupliqué avec ses droits, sans membres.');};
    find('#wgGroupRemove').onclick=async()=>{if(await appConfirm('Supprimer ce groupe vide ?',{title:'Supprimer le groupe',confirmLabel:'Supprimer'}))await change('remove',{id:selected},'Groupe supprimé.');};
    find('#wgGroupAssign').onclick=()=>{const id=find('#wgGroupAddMember').value;if(id)change('assign',{id:selected,userIds:[id]},'Membre ajouté. Ses droits sont hérités du groupe.');};
    find('#wgGroupMemberList').onclick=event=>{const button=event.target.closest('[data-remove-group-member]');if(button)change('unassign',{id:selected,userIds:[button.dataset.removeGroupMember]},'Membre retiré de ce groupe. Ses autres groupes restent actifs.');};
    await refresh();
  }
  return {mount,unmount,ensure,beforeLeave:()=>leave()};
})();
