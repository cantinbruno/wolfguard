'use strict';

const workspaceUsers=(()=>{
  let generation=0,timer=0,controller=null,canLeave=async()=>true;
  function unmount(){generation++;clearTimeout(timer);controller?.abort();controller=null;canLeave=async()=>true;}
  function mount(root){
    unmount();const token=generation,key=state.vaultKey;controller=new AbortController();const signal=controller.signal;
    const live=()=>generation===token&&root.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    const cloud=()=>typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud;
    const available=()=>cloud()?.enabled&&cloud().hasSession()&&(cloud().isAdmin()||cloud().can?.('users.read'));
    const manage=()=>cloud()?.can?.('users.manage'),rights=()=>cloud()?.can?.('users.permissions');
    const request=(path,value)=>cloud().agentRequest('users'+path,value,{signal});
    const find=selector=>root.querySelector(selector),permissionEditor=()=>window.WolfGuardPermissionEditor;
    const date=value=>value?new Date(value).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Jamais';
    const profile=user=>user.role==='admin'?'Administrateur':user.permissions?.admin?'Administrateur':user.permissions?'Personnalisé':'Lecture seule';
    const accountState=user=>user.disabled?'Désactivé':user.credentialPending?'À activer':'Actif';
    let users=[],invitations=[],selected=null,filter='all',search='',busy=false,stale=true,editing=null,refreshing=null,detailController=null,detailRevision=null,confirming=false;
    root.classList.add('users-manager');
    root.innerHTML=`<header class="settings-panel-head users-manager-heading"><div><div class="settings-heading">${settingsIcon('users')}<h3>Utilisateurs et droits</h3></div><p>Clique un compte pour ouvrir ses informations et ses droits.</p></div><div class="actions"><button type="button" class="settings-btn settings-btn-icon" id="wgUsersRefresh" aria-label="Actualiser les utilisateurs">${settingsIcon('refresh-cw')}</button><button type="button" class="settings-btn primary" id="wgUserAdd">${settingsIcon('plus')}Nouvel utilisateur</button></div></header>
      <p id="wgUsersError" class="access-error" role="alert"></p><p id="wgUsersStatus" class="access-feedback" role="status"></p>
      <section id="wgUserInvitation" class="users-invitation" aria-labelledby="wgUserInvitationTitle" hidden><header><div><span class="users-eyebrow">INVITATION · 24 H · USAGE UNIQUE</span><h4 id="wgUserInvitationTitle">Lien prêt à partager</h4></div><button type="button" class="settings-btn" id="wgUserInvitationClose">Fermer</button></header><p id="wgUserInvitationHelp"></p><textarea id="wgUserInvitationLink" rows="2" readonly aria-label="Lien personnel de connexion"></textarea><div class="actions"><button type="button" class="settings-btn primary" id="wgUserInvitationCopy">Copier le lien</button><a class="settings-btn" id="wgUserInvitationEmail">Préparer l’e-mail</a></div></section>
      <form id="wgUserForm" class="users-form" hidden><h4 id="wgUserFormTitle"></h4><label>E-mail<input id="wgUserName" type="email" inputmode="email" maxlength="254" autocomplete="off" required></label><p id="wgUserFormError" class="access-error" role="alert"></p><div class="actions"><button type="submit" class="settings-btn primary" id="wgUserSave">Créer</button><button type="button" class="settings-btn" id="wgUserCancel">Annuler</button></div></form>
      <div class="users-management-layout"><aside class="users-directory" aria-label="Choisir un utilisateur"><label class="users-search">${settingsIcon('search')}<input id="wgUsersSearch" type="search" placeholder="Rechercher" aria-label="Rechercher un utilisateur"></label><label class="users-filter-label">Afficher<select id="wgUsersFilter"><option value="all">Tous</option><option value="active">Actifs</option><option value="pending">À activer</option><option value="disabled">Désactivés</option></select></label><div id="wgUsersList" class="users-account-list"><p>Chargement…</p></div></aside>
      <section id="wgUserDetail" class="users-detail" aria-label="Compte sélectionné"><div id="wgUserOverview"></div><p id="wgUserStale" class="users-stale" role="status" hidden>Ce compte a changé. <button type="button" class="settings-btn" id="wgUserReloadRights">Recharger</button></p><div id="wgPermissionHost"></div><div id="wgUserAccountActions"></div></section></div>`;
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
    function renderOverview(){
      const user=users.find(row=>row.id===selected);if(!user){find('#wgUserOverview').innerHTML='<div class="users-detail-placeholder">'+settingsIcon('users')+'<p>Sélectionne un utilisateur dans la liste.</p></div>';find('#wgUserAccountActions').innerHTML='';return;}
      const disabled=busy||stale||!manage(),mfa=user.mfa?.complete,expanded=!!find('.users-account-security')?.open;
      find('#wgUserOverview').innerHTML='<header class="users-detail-heading"><span class="user-avatar" aria-hidden="true">'+esc(user.username.slice(0,2).toUpperCase())+'</span><div><span class="users-eyebrow">'+(user.current?'MON COMPTE':'COMPTE')+'</span><h4>'+esc(user.username)+'</h4><div class="users-account-badges"><span class="access-badge">'+esc(profile(user))+'</span>'+'<span class="users-account-state" data-state="'+(user.disabled?'disabled':user.credentialPending?'pending':'active')+'">'+accountState(user)+'</span></div></div><button type="button" class="settings-btn" data-user-action="edit" data-user-id="'+esc(user.id)+'" '+(disabled?'disabled':'')+'>Renommer</button></header><dl class="users-account-facts"><div><dt>MFA</dt><dd data-mfa-state="'+(mfa?'complete':'missing')+'">'+(mfa?'Activée':'À configurer')+'</dd></div><div><dt>Sessions</dt><dd>'+user.sessions+'</dd></div><div><dt>Dernière connexion</dt><dd>'+esc(date(user.lastLogin))+'</dd></div></dl>';
      find('#wgUserAccountActions').innerHTML='<details class="users-account-security" '+(expanded?'open':'')+'><summary>Actions du compte</summary><div class="access-actions">'+(user.current?'<button type="button" class="settings-btn" data-user-action="security" data-user-id="'+esc(user.id)+'">'+(mfa?'Gérer ma MFA':'Configurer ma MFA')+'</button>':'')+[['disconnect','Déconnecter les sessions'],['toggle',user.disabled?'Activer':'Désactiver'],['reset',user.credentialPending?'Nouveau lien':'Réinitialiser le code'],...(!protectedAdmin(user)?[['reset-otp','Réinitialiser Authenticator']]:[]),['delete','Supprimer']].map(([action,label])=>'<button type="button" class="settings-btn'+(action==='delete'?' access-danger':'')+'" data-user-action="'+action+'" data-user-id="'+esc(user.id)+'" '+(disabled||user.current&&action==='reset'||protectedAdmin(user)&&['toggle','delete','restricted'].includes(action)?'disabled':'')+'>'+label+'</button>').join('')+'</div><p class="access-help">'+'</p></details>';
    }
    async function loadPermissions(){
      clearEditor();const user=users.find(row=>row.id===selected);if(!user)return;
      find('#wgUserStale').hidden=true;detailRevision=user.permission_revision;
      if(!rights()){find('#wgPermissionHost').innerHTML='';return;}
      detailController=new AbortController();const current=detailController;
      const abort=()=>current.abort();signal.addEventListener('abort',abort,{once:true});
      try{await permissionEditor().open(root,user,{signal:current.signal,embedded:true,onSaved:async saved=>{detailRevision=saved.revision;feedback('Droits enregistrés pour '+user.username+'.');await refresh();}});}
      finally{signal.removeEventListener('abort',abort);}
    }
    function visibleUsers(){return users.filter(user=>(!search||user.username.toLowerCase().includes(search))&&(filter==='all'||filter==='disabled'&&user.disabled||filter==='pending'&&!user.disabled&&user.credentialPending||filter==='active'&&!user.disabled&&!user.credentialPending));}
    function render(){
      if(!live())return;const disabled=busy||stale||!available()||!manage();find('#wgUserAdd').disabled=disabled;
      find('#wgUsersSearch').value=search?find('#wgUsersSearch').value:'';
      const visible=visibleUsers();
      const focused=document.activeElement?.dataset.selectUser;
      find('#wgUsersList').innerHTML=visible.map(user=>'<button type="button" class="user-card users-account-row" data-user-id="'+esc(user.id)+'" data-select-user="'+esc(user.id)+'" aria-pressed="'+(user.id===selected)+'"><span class="user-avatar" aria-hidden="true">'+esc(user.username.slice(0,2).toUpperCase())+'</span><span class="users-account-copy"><strong>'+esc(user.username)+'</strong><small>'+esc(accountState(user))+(user.current?' · Moi':'')+'</small></span><span class="users-account-arrow" aria-hidden="true">›</span></button>').join('')||'<p class="access-empty">Aucun compte.</p>';
      if(focused)find('[data-select-user="'+focused+'"]')?.focus({preventScroll:true});
      renderOverview();const fieldset=find('#wgPermissionHost fieldset');if(fieldset)fieldset.disabled=busy||stale||permissionEditor().isSaving(root);
    }
    async function refresh(){
      if(!live()||busy)return;if(refreshing)return refreshing;
      if(!available()){find('#wgUsersList').textContent='Gestion réservée aux comptes autorisés.';return;}
      find('#wgUsersRefresh').disabled=true;
      refreshing=(async()=>{try{
        const recovered=stale,result=await request('');if(!live())return;users=result.users;invitations=result.invitations||[];stale=false;
        const user=users.find(row=>row.id===selected);let replace=false;
        if(!user){selected=users[0]?.id||null;replace=true;}
        render();
        if(replace)await loadPermissions();
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
      editing=user;const form=find('#wgUserForm');form.hidden=false;form.reset();form.dataset.dirty='false';find('#wgUserFormError').textContent='';find('#wgUserFormTitle').textContent=user?'Renommer le compte':'Nouvel utilisateur';find('#wgUserName').value=user?.username||'';find('#wgUserName').readOnly=!!user&&protectedAdmin(user);find('#wgUserName').focus();form.scrollIntoView({block:'nearest'});
    }
    find('#wgUserForm').oninput=()=>{find('#wgUserForm').dataset.dirty='true';};
    find('#wgUsersSearch').oninput=event=>{search=event.target.value.trim().toLowerCase();render();};find('#wgUsersFilter').onchange=event=>{filter=event.target.value;render();};
    find('#wgUserInvitationCopy').onclick=async()=>{const copied=await copyText(find('#wgUserInvitationLink').value);feedback(copied?'Lien copié.':'Copie impossible.',!copied);};
    find('#wgUserInvitationClose').onclick=()=>{find('#wgUserInvitationLink').value='';find('#wgUserInvitationEmail').removeAttribute('href');find('#wgUserInvitation').hidden=true;};
    find('#wgUserReloadRights').onclick=async()=>{if(await canLeave()&&live())await loadPermissions();};
    find('#wgUserForm').onsubmit=async event=>{
      event.preventDefault();if(busy||stale||!live()||!manage()||permissionEditor()?.isSaving(root))return;
      const target=editing,value={username:find('#wgUserName').value.trim(),role:target?.role||'member'};if(target){value.id=target.id;value.disabled=target.disabled;}
      if(!live())return;busy=true;find('#wgUserSave').disabled=true;render();
      try{const result=await request(target?'/update':'/create',value);if(!live())return;find('#wgUserForm').reset();find('#wgUserForm').hidden=true;find('#wgUserForm').dataset.dirty='false';if(result.reconnect){await lockApplication();return;}selected=result.user?.id||selected;feedback(target?'Compte modifié.':'Compte créé. Transmets le lien personnel à la personne.');if(result.invitation)showInvitation(result.invitation,value.username);feedback('',true);}
      catch(error){if(live())find('#wgUserFormError').textContent=error.message;}
      finally{busy=false;if(live()){find('#wgUserSave').disabled=false;await refresh();if(selected!==target?.id)await loadPermissions();}}
    };
    find('#wgUserCancel').onclick=()=>{find('#wgUserForm').reset();find('#wgUserForm').hidden=true;find('#wgUserForm').dataset.dirty='false';editing=null;};
    find('#wgUserAdd').onclick=async()=>{if(await canLeave()&&live())editor();};find('#wgUsersRefresh').onclick=refresh;
    root.addEventListener('click',async event=>{
      const row=event.target.closest('[data-select-user]');if(row&&!row.disabled){await selectUser(row.dataset.selectUser);return;}
      const button=event.target.closest('[data-user-action]');if(!button||button.disabled||busy||stale)return;const user=users.find(row=>row.id===button.dataset.userId);if(!user)return;
      const action=button.dataset.userAction;
      if(action==='edit'){if(!permissionEditor()?.isSaving(root))editor(user);return;}if(action==='security'&&user.current){if(await canLeave()&&live())window.openAccountMFA?.();return;}
      if(!manage()||!await canLeave()||!live())return;
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
