'use strict';

const workspaceUsers=(()=>{
  let generation=0,timer=0,controller=null,canLeave=async()=>true;
  function unmount(){generation++;clearTimeout(timer);controller?.abort();controller=null;canLeave=async()=>true;}
  function mount(root){
    unmount();const token=generation,key=state.vaultKey;controller=new AbortController();const signal=controller.signal;
    const live=()=>generation===token&&root.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    const cloud=()=>typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud;
    const available=()=>cloud()?.enabled&&cloud().hasSession()&&(cloud().isAdmin()||cloud().can?.('users.read'));
    const manage=(action='manage')=>cloud()?.can?.('users.'+({edit:'edit',toggle:'disable',reset:'reset','reset-otp':'mfa',disconnect:'sessions',delete:'delete',create:'create'}[action]||action)),rights=()=>cloud()?.can?.('users.permissions');
    const request=(path,value)=>cloud().agentRequest('users'+path,value,{signal});
    const find=selector=>root.querySelector(selector),permissionEditor=()=>window.WolfGuardPermissionEditor;
    const date=value=>value?new Date(value).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Jamais';
    const profile=user=>user.role==='admin'?'Propriétaire':user.permissions?.accessGroup?.names?.includes('GG_Acces_Application_administrateur')?'Administrateur':user.permissions?.accessGroup?.names?.length?(user.permissions.accessGroup.names.length+' groupe(s)'):'Aucun groupe';
    const accountState=user=>user.disabled?'Désactivé':user.credentialPending?'À activer':'Actif';
    let users=[],invitations=[],selected=null,filter='all',search='',busy=false,stale=true,editing=null,refreshing=null,detailController=null,detailRevision=null,confirming=false;
    root.classList.add('users-manager');
    root.innerHTML=`<header class="settings-panel-head users-manager-heading"><div><div class="settings-heading">${settingsIcon('users')}<h3>Utilisateurs et droits</h3></div><p>Chaque compte cumule les droits de ses groupes. Sans groupe pour une section, elle reste invisible.</p></div><div class="actions"><button type="button" class="settings-btn settings-btn-icon" id="wgUsersRefresh" aria-label="Actualiser les utilisateurs">${settingsIcon('refresh-cw')}</button><button type="button" class="settings-btn primary" id="wgUserAdd">${settingsIcon('plus')}Nouvel utilisateur</button></div></header>
      <p id="wgUsersError" class="access-error" role="alert"></p><p id="wgUsersStatus" class="access-feedback" role="status"></p>
      <section id="wgUserInvitation" class="users-invitation" aria-labelledby="wgUserInvitationTitle" hidden><header><div><span class="users-eyebrow">INVITATION · 24 H · USAGE UNIQUE</span><h4 id="wgUserInvitationTitle">Lien prêt à partager</h4></div><button type="button" class="settings-btn" id="wgUserInvitationClose">Fermer</button></header><p id="wgUserInvitationHelp"></p><textarea id="wgUserInvitationLink" rows="2" readonly aria-label="Lien personnel de connexion"></textarea><div class="actions"><button type="button" class="settings-btn primary" id="wgUserInvitationCopy">Copier le lien</button><a class="settings-btn" id="wgUserInvitationEmail">Préparer l’e-mail</a></div></section>
      <form id="wgUserForm" class="users-form" hidden><h4 id="wgUserFormTitle"></h4><p class="users-new-account-help" id="wgUserGuestHelp">Accès initial : <strong>aucun groupe</strong> · Toutes les sections restent invisibles jusqu’à une attribution.</p><label>E-mail<input id="wgUserName" type="email" inputmode="email" maxlength="254" autocomplete="off" required></label><p id="wgUserFormError" class="access-error" role="alert"></p><div class="actions"><button type="submit" class="settings-btn primary" id="wgUserSave">Créer</button><button type="button" class="settings-btn" id="wgUserCancel">Annuler</button></div></form>
      <div class="users-management-layout"><aside class="users-directory" aria-label="Choisir un utilisateur"><label class="users-search">${settingsIcon('search')}<input id="wgUsersSearch" type="search" placeholder="Compte ou groupe…" aria-label="Rechercher un utilisateur ou un groupe"></label><label class="users-filter-label">Afficher<select id="wgUsersFilter"><option value="all">Tous</option><option value="active">Actifs</option><option value="pending">À activer</option><option value="disabled">Désactivés</option></select></label><div id="wgUsersList" class="users-account-list"><p>Chargement…</p></div></aside>
      <section id="wgUserDetail" class="users-detail" aria-label="Compte sélectionné"><div id="wgUserOverview"></div><div class="users-detail-tabs" role="tablist" aria-label="Réglages du compte"><button type="button" role="tab" id="wgUserTabRights" data-user-pane="rights" aria-controls="wgPermissionHost">Groupes et droits</button><button type="button" role="tab" id="wgUserTabAccount" data-user-pane="account" aria-controls="wgUserAccountActions">Compte</button></div><p id="wgUserStale" class="users-stale" role="status" hidden>Ce compte a changé. <button type="button" class="settings-btn" id="wgUserReloadRights">Recharger</button></p><div id="wgPermissionHost" role="tabpanel" tabindex="0"></div><div id="wgUserAccountActions" role="tabpanel" tabindex="0" aria-labelledby="wgUserTabAccount" hidden></div></section></div>`;
    const feedback=(message,error=false)=>{if(live())find(error?'#wgUsersError':'#wgUsersStatus').textContent=message;};
    const protectedAdmin=user=>user?.role==='admin';
    const draft=()=>find('#wgUserForm').dataset.dirty==='true'||permissionEditor()?.isDirty(root);
    canLeave=async()=>{
      if(busy||permissionEditor()?.isSaving(root)){feedback('Enregistrement en cours.',true);return false;}
      if(!draft())return true;if(confirming)return false;confirming=true;
      try{return await appConfirm('Quitter les modifications non enregistrées de ce compte ?', {title:'Modifications en cours',confirmLabel:'Quitter sans enregistrer'});}finally{confirming=false;}
    };
    function clearEditor(){detailController?.abort();detailController=null;permissionEditor()?.reset(root);detailRevision=null;}
    function showInvitation(invitation,username){
      const url=new URL(location.href);url.hash='account='+invitation.ticket;find('#wgUserInvitationLink').value=url.href;invitation.ticket='';
      find('#wgUserInvitationEmail').href='mailto:'+encodeURIComponent(username||'')+'?subject='+encodeURIComponent('Votre accès WolfGuard')+'&body='+encodeURIComponent('Voici votre lien personnel WolfGuard :\n'+url.href+'\nValable 24 h, une seule utilisation.\n');
      find('#wgUserInvitationHelp').textContent='Valable jusqu’au '+date(invitation.expiresAt)+'.';
      find('#wgUserInvitation').dataset.invitationId=invitation.id||'';find('#wgUserInvitation').hidden=false;find('#wgUserInvitation').scrollIntoView({block:'nearest'});find('#wgUserInvitationCopy').focus();
    }
    function setPane(pane,scroll=true){
      if(pane==='posts')pane='rights';
      if(!rights())pane='account';
      const detail=find('#wgUserDetail'),hasUser=users.some(user=>user.id===selected);
      detail.dataset.pane=pane;find('.users-detail-tabs').hidden=!hasUser;
      findAllTabs().forEach(tab=>{const active=tab.dataset.userPane===pane;tab.hidden=tab.dataset.userPane==='posts'||!rights()&&tab.dataset.userPane!=='account';tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
      const host=find('#wgPermissionHost');host.hidden=pane==='account';host.setAttribute('aria-labelledby','wgUserTab'+(pane==='posts'?'Posts':'Rights'));
      find('#wgUserAccountActions').hidden=pane!=='account';permissionEditor()?.setView(root,pane==='posts'?'posts':'rights');
      if(scroll){detail.scrollTop=0;if(matchMedia('(max-width:850px)').matches)detail.scrollIntoView({block:'start'});}
    }
    function findAllTabs(){return [...root.querySelectorAll('[data-user-pane]')];}
    find('.users-detail-tabs').addEventListener('click',event=>{const tab=event.target.closest('[data-user-pane]');if(tab)setPane(tab.dataset.userPane);},{signal});
    find('.users-detail-tabs').addEventListener('keydown',event=>{
      const tabs=findAllTabs().filter(tab=>!tab.hidden),index=tabs.indexOf(event.target);if(index<0)return;
      const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
      if(next===null)return;event.preventDefault();setPane(tabs[next].dataset.userPane);tabs[next].focus({preventScroll:true});
    },{signal});
    function renderOverview(){
      const user=users.find(row=>row.id===selected);if(!user){find('#wgUserOverview').innerHTML='<div class="users-detail-placeholder">'+settingsIcon('users')+'<p>Sélectionne un utilisateur dans la liste.</p></div>';find('#wgUserAccountActions').innerHTML='';return;}
      const disabled=busy||stale,mfa=user.mfa?.complete;
      find('#wgUserOverview').innerHTML='<header class="users-detail-heading"><span class="user-avatar" aria-hidden="true">'+esc(user.username.slice(0,2).toUpperCase())+'</span><div><span class="users-eyebrow">'+(user.current?'MON COMPTE':'COMPTE')+'</span><h4>'+esc(user.username)+'</h4><div class="users-account-badges"><span class="access-badge">'+esc(profile(user))+'</span>'+'<span class="users-account-state" data-state="'+(user.disabled?'disabled':user.credentialPending?'pending':'active')+'">'+accountState(user)+'</span></div></div></header>';
      find('#wgUserAccountActions').innerHTML='<dl class="users-account-facts"><div><dt>MFA</dt><dd data-mfa-state="'+(mfa?'complete':'missing')+'">'+(mfa?'Activée':'À configurer')+'</dd></div><div><dt>Sessions</dt><dd>'+user.sessions+'</dd></div><div><dt>Dernière connexion</dt><dd>'+esc(date(user.lastLogin))+'</dd></div></dl><div class="users-account-rename"><button type="button" class="settings-btn" data-user-action="edit" data-user-id="'+esc(user.id)+'" '+(disabled||!manage('edit')?'disabled':'')+'>Renommer</button></div><section class="users-account-security" aria-labelledby="wgUserActionsTitle"><h5 id="wgUserActionsTitle">Actions du compte</h5><div class="access-actions">'+(user.current?'<button type="button" class="settings-btn" data-user-action="security" data-user-id="'+esc(user.id)+'">'+(mfa?'Gérer ma MFA':'Configurer ma MFA')+'</button>':'')+[['disconnect','Déconnecter les sessions'],['toggle',user.disabled?'Activer':'Désactiver'],['reset',user.credentialPending?'Nouveau lien':'Réinitialiser le code'],...(!protectedAdmin(user)?[['reset-otp','Réinitialiser Authenticator']]:[]),['delete','Supprimer']].map(([action,label])=>'<button type="button" class="settings-btn'+(action==='delete'?' access-danger':'')+'" data-user-action="'+action+'" data-user-id="'+esc(user.id)+'" '+(disabled||!manage(action)||user.current&&action==='reset'||protectedAdmin(user)&&['toggle','delete','restricted'].includes(action)?'disabled':'')+'>'+label+'</button>').join('')+'</div></section>';
    }
    async function loadPermissions(){
      clearEditor();const user=users.find(row=>row.id===selected);if(!user)return;
      find('#wgUserStale').hidden=true;detailRevision=user.permission_revision;
      if(!rights()){find('#wgPermissionHost').innerHTML='';return;}
      detailController=new AbortController();const current=detailController;
      try{
        const groups=await workspaceGroups.ensure(current.signal);if(current.signal.aborted||!live()||selected!==user.id)return;
        const membership=new Set(groups.groups.filter(group=>group.memberIds.includes(user.id)).map(group=>group.id));
        const groupLabel=group=>group.presetKind==='admin'?'Administration complète':group.presetKind==='action'?group.actionLabel||group.permissionKey||'Autorisation précise':group.preset?'Accès '+(group.level==='write'?'en écriture':'en lecture'):'Groupe métier';
        find('#wgPermissionHost').innerHTML=user.role==='admin'?'<div class="group-owner-note">'+settingsIcon('shield-check')+'<div><h5>Propriétaire protégé</h5><p>Tous les droits de l’application sont actifs.</p></div></div>':'<fieldset class="user-roles"><legend>Rôle</legend><p>Choisis le niveau d’accès du compte. « Personnaliser » permet d’ajuster section par section avec les groupes.</p><div class="user-role-options">'+USER_ROLES.map(role=>'<label class="user-role-option"><input type="radio" name="wgUserRole" data-user-role="'+role.id+'"><span><strong>'+role.name+'</strong><small>'+role.description+'</small></span></label>').join('')+'<label class="user-role-option"><input type="radio" name="wgUserRole" data-user-role="custom" disabled><span><strong>Personnalisé</strong><small>Combinaison de groupes différente des rôles ci-dessus.</small></span></label></div></fieldset><details class="user-advanced-groups"><summary>Personnaliser avec les groupes</summary>'+'<fieldset class="user-access-groups"><legend>Attribuer des groupes</legend><p>Recherchez un groupe puis cochez-le. Les autorisations s’additionnent ; les refus restent prioritaires.</p><label class="users-search">'+settingsIcon('search')+'<input type="search" id="wgUserGroupSearch" placeholder="Rechercher un groupe ou une autorisation" aria-label="Rechercher un groupe à attribuer"></label><div class="group-assignment-toolbar"><span id="wgUserGroupCount" role="status"></span><label><input type="checkbox" id="wgUserAssignedOnly"> Groupes attribués uniquement</label></div><div class="user-access-group-list">'+groups.groups.map(group=>'<label data-group-search="'+esc((group.name+' '+groupLabel(group)).toLocaleLowerCase())+'"><input type="checkbox" data-user-access-group="'+esc(group.id)+'" '+(membership.has(group.id)?'checked':'')+'><span><strong>'+esc(group.name)+'</strong><small>'+esc(groupLabel(group))+'</small></span></label>').join('')+'</div><p id="wgUserGroupEmpty" hidden>Aucun groupe ne correspond.</p></fieldset></details><div class="group-assignment-actions"><button type="button" class="settings-btn primary" id="wgUserApplyGroup">Enregistrer les appartenances</button><button type="button" class="settings-btn" id="wgUserManageGroups">Gérer les groupes</button></div>';
        find('#wgPermissionHost').insertAdjacentHTML('beforeend','<section class="user-effective-summary"><h5>Droits effectifs</h5><p id="wgUserEffectiveStatus" role="status">Chargement des autorisations…</p><div id="wgUserEffectiveRights"></div></section>');
        const refreshEffective=async()=>{
          try{const result=await WolfGuardCloud.agentRequest('users/groups/effective?userId='+encodeURIComponent(user.id),undefined,{signal:current.signal});if(!live()||current.signal.aborted||selected!==user.id)return;
            find('#wgUserEffectiveStatus').textContent=result.owner?'Accès complet du propriétaire.':'Droits enregistrés, y compris les groupes hérités. Les changements cochés prennent effet après enregistrement.';
            const sections=[...new Set(result.actions.map(action=>action.section))];
            find('#wgUserEffectiveRights').innerHTML=sections.map(section=>{const actions=result.actions.filter(action=>action.section===section),allowed=actions.filter(action=>action.allowed),denied=actions.filter(action=>action.denied);return '<details class="effective-section"><summary><strong>'+esc(actions[0].sectionLabel)+'</strong><span>'+allowed.length+' / '+actions.length+' autorisé(s)'+(denied.length?' · '+denied.length+' refus':'')+'</span></summary>'+actions.map(action=>'<div class="effective-right" data-user-effective-action="'+esc(action.key)+'" data-allowed="'+action.allowed+'"><span>'+esc(action.label)+'<small>'+esc(action.sources.map(source=>source.name+(source.effect==='deny'?' (refus)':'')).join(', ')||'Aucun groupe')+'</small></span><b>'+(action.denied?'Refus explicite':action.allowed?'Autorisé':'Non accordé')+'</b></div>').join('')+'</details>';}).join('');
          }catch(error){if(live()&&!current.signal.aborted)find('#wgUserEffectiveStatus').textContent=error.message;}
        };refreshEffective();

        const inherited=groups.groups.filter(group=>(group.effectiveMemberIds||[]).includes(user.id)&&!membership.has(group.id));
        if(inherited.length)find('#wgPermissionHost').insertAdjacentHTML('beforeend','<details class="user-inherited-groups"><summary>Groupes hérités ('+inherited.length+')</summary>'+inherited.map(group=>'<p>'+esc(group.name)+'</p>').join('')+'</details>');
        const apply=find('#wgUserApplyGroup');if(!apply)return;
        const filterGroups=()=>{
          const query=find('#wgUserGroupSearch').value.trim().toLocaleLowerCase(),only=find('#wgUserAssignedOnly').checked;
          const rows=[...root.querySelectorAll('[data-group-search]')];let visible=0,count=0;
          for(const row of rows){const checked=row.querySelector('input').checked;if(checked)count++;row.hidden=!!(query&&!row.dataset.groupSearch.includes(query)||only&&!checked);if(!row.hidden)visible++;}
          find('#wgUserGroupCount').textContent=count+' groupe(s) attribué(s) · '+visible+' résultat(s)';find('#wgUserGroupEmpty').hidden=visible>0;
        };
        find('#wgUserGroupSearch').oninput=filterGroups;find('#wgUserAssignedOnly').onchange=filterGroups;filterGroups();
        find('#wgUserManageGroups').onclick=()=>setSettingsTab('groups',true);
        const syncRole=()=>{const ids=[...root.querySelectorAll('[data-user-access-group]:checked')].map(input=>input.dataset.userAccessGroup),role=detectUserRole(ids,groups.groups);root.querySelectorAll('[data-user-role]').forEach(input=>{input.checked=input.dataset.userRole===role;});root.querySelector('.user-advanced-groups').open=role==='custom'||root.querySelector('.user-advanced-groups').open;};
        syncRole();
        root.querySelectorAll('[data-user-role]').forEach(input=>input.addEventListener('change',()=>{if(!input.checked||input.dataset.userRole==='custom')return;const ids=applyUserRole(input.dataset.userRole,[...root.querySelectorAll('[data-user-access-group]:checked')].map(box=>box.dataset.userAccessGroup),groups.groups);root.querySelectorAll('[data-user-access-group]').forEach(box=>{box.checked=ids.includes(box.dataset.userAccessGroup);});find('#wgPermissionHost').dispatchEvent(new Event('change'));}));
        const selectedGroups=()=>[...root.querySelectorAll('[data-user-access-group]:checked')].map(input=>input.dataset.userAccessGroup),changed=()=>{const ids=selectedGroups();return ids.length!==membership.size||ids.some(id=>!membership.has(id));};
        apply.disabled=true;find('#wgPermissionHost').onchange=()=>{syncRole();filterGroups();const dirty=changed();find('#wgPermissionHost').dataset.dirty=String(dirty);apply.disabled=!dirty;};
        apply.onclick=async()=>{if(busy)return;busy=true;apply.disabled=true;try{const result=await WolfGuardCloud.agentRequest('users/groups/memberships',{userId:user.id,groupIds:selectedGroups(),revision:groups.revision},{signal:current.signal});if(result.reconnect){await lockApplication();return;}feedback('Groupes appliqués. Les sessions du compte ont été déconnectées.');find('#wgPermissionHost').dataset.dirty='false';busy=false;await refresh();await loadPermissions();}catch(error){feedback(error.message,true);}finally{busy=false;if(live())apply.disabled=false;}};
      }catch(error){if(!current.signal.aborted&&live())find('#wgPermissionHost').textContent=error.message;}
    }
    function visibleUsers(){return users.filter(user=>(!search||[user.username,...(user.permissions?.accessGroup?.names||[])].some(value=>value.toLocaleLowerCase().includes(search)))&&(filter==='all'||filter==='disabled'&&user.disabled||filter==='pending'&&!user.disabled&&user.credentialPending||filter==='active'&&!user.disabled&&!user.credentialPending));}
    function render(){
      if(!live())return;const disabled=busy||stale||!available()||!manage('create');find('#wgUserAdd').disabled=disabled;
      find('#wgUsersSearch').value=search?find('#wgUsersSearch').value:'';
      const visible=visibleUsers();
      const focused=document.activeElement?.dataset.selectUser;
      find('#wgUsersList').innerHTML=visible.map(user=>'<button type="button" class="user-card users-account-row" data-user-id="'+esc(user.id)+'" data-select-user="'+esc(user.id)+'" aria-pressed="'+(user.id===selected)+'"><span class="user-avatar" aria-hidden="true">'+esc(user.username.slice(0,2).toUpperCase())+'</span><span class="users-account-copy"><strong>'+esc(user.username)+'</strong><small>'+esc(profile(user))+' \u00b7 '+esc(accountState(user))+(user.current?' · Moi':'')+'</small></span><span class="users-account-arrow" aria-hidden="true">›</span></button>').join('')||'<p class="access-empty">Aucun compte.</p>';
      if(focused)find('[data-select-user="'+focused+'"]')?.focus({preventScroll:true});
      renderOverview();setPane(find('#wgUserDetail').dataset.pane||'rights',false);const fieldset=find('#wgPermissionHost fieldset');if(fieldset)fieldset.disabled=busy||stale||permissionEditor()?.isSaving(root);
    }
    async function refresh({reloadGroups=false}={}){
      if(!live()||busy)return;if(refreshing)return refreshing;
      if(!available()){find('#wgUsersList').textContent='Gestion réservée aux comptes autorisés.';return;}
      find('#wgUsersRefresh').disabled=true;
      refreshing=(async()=>{try{
        const recovered=stale,result=await request('');if(!live())return;users=result.users;invitations=result.invitations||[];stale=false;
        const user=users.find(row=>row.id===selected);let replace=false;
        if(!user){selected=users[0]?.id||null;replace=true;}
        render();
        if(replace||reloadGroups&&!draft())await loadPermissions();
        else if(user&&user.permission_revision!==detailRevision&&!find('#wgPermissionHost [data-close-audit]'))find('#wgUserStale').hidden=false;
        if(recovered)feedback('',true);
      }catch(error){stale=true;feedback(error.message,true);render();}finally{if(live())find('#wgUsersRefresh').disabled=false;}})();
      try{await refreshing;}finally{refreshing=null;}
    }
    async function selectUser(id){
      if(id===selected&&!find('#wgPermissionHost [data-close-audit]'))return;
      if(!await canLeave()||!live())return;
      find('#wgUserForm').hidden=true;find('#wgUserForm').dataset.dirty='false';editing=null;selected=id;render();await loadPermissions();if(live())find('#wgUserDetail').scrollIntoView({block:matchMedia('(max-width:850px)').matches?'start':'nearest'});
    }
    function editor(user=null){
      editing=user;find('#wgUserGuestHelp').hidden=!!user;const form=find('#wgUserForm');form.hidden=false;form.reset();form.dataset.dirty='false';find('#wgUserFormError').textContent='';find('#wgUserFormTitle').textContent=user?'Renommer le compte':'Nouvel utilisateur';find('#wgUserName').value=user?.username||'';find('#wgUserName').readOnly=!!user&&protectedAdmin(user);find('#wgUserName').focus();form.scrollIntoView({block:'nearest'});
    }
    find('#wgUserForm').oninput=()=>{find('#wgUserForm').dataset.dirty='true';};
    find('#wgUsersSearch').oninput=event=>{search=event.target.value.trim().toLowerCase();render();};find('#wgUsersFilter').onchange=event=>{filter=event.target.value;render();};
    find('#wgUserInvitationCopy').onclick=async()=>{const copied=await copyText(find('#wgUserInvitationLink').value);feedback(copied?'Lien copié.':'Copie impossible.',!copied);};
    find('#wgUserInvitationClose').onclick=()=>{find('#wgUserInvitationLink').value='';find('#wgUserInvitationEmail').removeAttribute('href');find('#wgUserInvitation').hidden=true;};
    find('#wgUserReloadRights').onclick=async()=>{if(await canLeave()&&live())await loadPermissions();};
    find('#wgUserForm').onsubmit=async event=>{
      event.preventDefault();if(busy||stale||!live()||!manage(editing?'edit':'create')||permissionEditor()?.isSaving(root))return;
      const target=editing,value={username:find('#wgUserName').value.trim(),role:target?.role||'member'};if(target){value.id=target.id;value.disabled=target.disabled;}
      if(!live())return;busy=true;find('#wgUserSave').disabled=true;render();
      try{const result=await request(target?'/update':'/create',value);if(!live())return;find('#wgUserForm').reset();find('#wgUserForm').hidden=true;find('#wgUserForm').dataset.dirty='false';if(result.reconnect){await lockApplication();return;}selected=result.user?.id||selected;feedback(target?'Compte modifié.':'Compte créé. Transmets le lien personnel à la personne.');if(result.invitation)showInvitation(result.invitation,value.username);feedback('',true);}
      catch(error){if(live())find('#wgUserFormError').textContent=error.message;}
      finally{busy=false;if(live()){find('#wgUserSave').disabled=false;await refresh();if(selected!==target?.id)await loadPermissions();}}
    };
    find('#wgUserCancel').onclick=()=>{find('#wgUserForm').reset();find('#wgUserForm').hidden=true;find('#wgUserForm').dataset.dirty='false';editing=null;};
    find('#wgUserAdd').onclick=async()=>{if(await canLeave()&&live())editor();};find('#wgUsersRefresh').onclick=()=>refresh({reloadGroups:true});
    root.addEventListener('click',async event=>{
      const row=event.target.closest('[data-select-user]');if(row&&!row.disabled){await selectUser(row.dataset.selectUser);return;}
      const button=event.target.closest('[data-user-action]');if(!button||button.disabled||busy||stale)return;const user=users.find(row=>row.id===button.dataset.userId);if(!user)return;
      const action=button.dataset.userAction;
      if(action==='edit'){if(!permissionEditor()?.isSaving(root))editor(user);return;}if(action==='security'&&user.current){if(await canLeave()&&live())window.openAccountMFA?.();return;}
      if(!manage(action)||!await canLeave()||!live())return;
      const labels={disconnect:'Déconnecter toutes les sessions',toggle:user.disabled?'Activer':'Désactiver',reset:'Réinitialiser le code','reset-otp':'Réinitialiser Authenticator',delete:'Supprimer définitivement'};
      if(!labels[action]||!await appConfirm(labels[action]+' de « '+user.username+' » ?',{title:'Gestion de '+user.username,confirmLabel:labels[action],danger:action==='delete'||action==='toggle'&&!user.disabled})||!live()||busy)return;
      busy=true;render();feedback('');feedback('',true);
      try{
        let path=action==='reset'?'reset-code':action==='toggle'?'update':action,value=action==='toggle'?{id:user.id,username:user.username,role:user.role,disabled:!user.disabled}:{id:user.id};

        const result=await request('/'+path,value);if(!live())return;if(result.reconnect){await lockApplication();return;}
        feedback(action==='reset'?'Nouveau lien créé.':'Action effectuée pour '+user.username+'.');
        if(result.invitation)showInvitation(result.invitation,user.username);
        if(action==='delete'&&result.purgeVaultHome)feedback('Coffre-fort personnel de '+user.username+' supprimé avec le compte.');
      }
      catch(error){feedback(error.message,true);}finally{busy=false;if(live())await refresh();}
    },{signal});
    signal.addEventListener('abort',()=>detailController?.abort(),{once:true});
    async function poll(){try{await refresh();}finally{if(live())timer=setTimeout(poll,20000);}}poll();
  }
  return {mount,unmount,beforeLeave:()=>canLeave()};
})();
