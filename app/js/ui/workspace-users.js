'use strict';

const workspaceUsers=(()=>{
  let generation=0,timer=0,controller=null,canLeave=async()=>true;
  function unmount(){generation++;clearTimeout(timer);controller?.abort();controller=null;canLeave=async()=>true;}
  function mount(root){
    unmount();const token=generation,key=state.vaultKey;controller=new AbortController();const signal=controller.signal;
    const live=()=>generation===token&&root.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    const cloud=()=>typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud;
    const available=()=>cloud()?.enabled&&cloud().hasSession()&&(cloud().isAdmin()||cloud().can?.('users.read'));
    const manage=()=>cloud()?.can?.('users.manage'),rights=()=>cloud()?.isAdmin();
    const request=(path,value)=>cloud().agentRequest('users'+path,value,{signal});
    const find=selector=>root.querySelector(selector),permissionEditor=()=>window.WolfGuardPermissionEditor;
    const date=value=>value?new Date(value).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Jamais';
    const profile=user=>user.role==='admin'?'Propriétaire':WolfGuardPermissions.PERMISSION_PROFILES.find(row=>row.id===user.permissions?.profile)?.name||'Personnalisé';
    const accountState=user=>user.disabled?'Désactivé':user.credentialPending?'À activer':'Actif';
    let users=[],invitations=[],selected=null,filter='all',search='',busy=false,stale=true,editing=null,refreshing=null,detailController=null,detailRevision=null,confirming=false;
    root.classList.add('users-manager');
    root.innerHTML=`<header class="settings-panel-head users-manager-heading"><div><div class="settings-heading">${settingsIcon('users')}<h3>Utilisateurs et droits</h3></div><p>Un compte, son profil et ses accès au même endroit.</p></div><div class="actions"><button type="button" class="settings-btn settings-btn-icon" id="wgUsersRefresh" aria-label="Actualiser les utilisateurs">${settingsIcon('refresh-cw')}</button><button type="button" class="settings-btn primary" id="wgUserInvite">${settingsIcon('plus')}Inviter par lien</button><button type="button" class="settings-btn" id="wgUserAdd">Inviter par e-mail</button></div></header>
      <div class="users-summary" id="wgUsersSummary" aria-label="Résumé des comptes"></div>
      <p id="wgUsersError" class="access-error" role="alert"></p><p id="wgUsersStatus" class="access-feedback" role="status"></p>
      <section id="wgUserInvitation" class="users-invitation" aria-labelledby="wgUserInvitationTitle" hidden><header><div><span class="users-eyebrow">INVITATION PERSONNELLE · 24 H · USAGE UNIQUE</span><h4 id="wgUserInvitationTitle">Le lien est prêt à partager</h4></div><button type="button" class="settings-btn" id="wgUserInvitationClose">Fermer</button></header><p id="wgUserInvitationHelp"></p><textarea id="wgUserInvitationLink" rows="2" readonly aria-label="Lien personnel de connexion"></textarea><div class="actions"><button type="button" class="settings-btn primary" id="wgUserInvitationCopy">Copier le lien</button><a class="settings-btn" id="wgUserInvitationEmail">Préparer l’e-mail</a></div><small>La personne choisit son code personnel à 8 chiffres et configure son application d’authentification. Aucun e-mail n’est envoyé automatiquement.</small></section>
      <form id="wgUserForm" class="users-form" hidden><h4 id="wgUserFormTitle"></h4><label>Adresse e-mail<input id="wgUserName" type="email" inputmode="email" maxlength="254" autocomplete="off" required></label><p class="access-help" id="wgUserRoleInfo"></p><label id="wgUserDisabledRow" class="users-checkbox"><input type="checkbox" id="wgUserDisabled">Compte désactivé</label><p id="wgUserFormError" class="access-error" role="alert"></p><div class="actions"><button type="submit" class="settings-btn primary" id="wgUserSave">Enregistrer</button><button type="button" class="settings-btn" id="wgUserCancel">Annuler</button></div></form>
      <details id="wgPendingInvitations" class="users-pending" hidden><summary>Invitations en attente <span id="wgPendingCount"></span></summary><div id="wgPendingList"></div></details>
      <div class="users-management-layout"><aside class="users-directory" aria-label="Choisir un utilisateur"><div class="users-directory-heading"><h4>Comptes <span id="wgUsersCount"></span></h4><button type="button" class="settings-btn" id="wgPermissionsAudit">Journal des droits</button></div><label class="users-search">${settingsIcon('search')}<input id="wgUsersSearch" type="search" placeholder="Rechercher un compte" aria-label="Rechercher un utilisateur"></label><label class="users-filter-label">Afficher<select id="wgUsersFilter"><option value="all">Tous les comptes</option><option value="active">Actifs</option><option value="pending">À activer</option><option value="disabled">Désactivés</option></select></label><div id="wgUsersList" class="users-account-list"><p>Chargement des utilisateurs…</p></div></aside>
      <section id="wgUserDetail" class="users-detail" aria-label="Compte et droits de l’utilisateur sélectionné"><div id="wgUserOverview"></div><p id="wgUserStale" class="users-stale" role="status" hidden>Ce compte a changé depuis son ouverture. Recharge ses droits avant de poursuivre. <button type="button" class="settings-btn" id="wgUserReloadRights">Recharger les droits</button></p><div id="wgPermissionHost"></div><div id="wgUserAccountActions"></div></section></div>`;
    const feedback=(message,error=false)=>{if(live())find(error?'#wgUsersError':'#wgUsersStatus').textContent=message;};
    const protectedAdmin=user=>user?.role==='admin';
    const draft=()=>find('#wgUserForm').dataset.dirty==='true'||permissionEditor()?.isDirty(root);
    canLeave=async()=>{
      if(busy||permissionEditor()?.isSaving(root)){feedback('Patiente pendant l’enregistrement.',true);return false;}
      if(!draft())return true;if(confirming)return false;confirming=true;
      try{return await appConfirm('Quitter les modifications non enregistrées de ce compte ?', {title:'Modifications en cours',confirmLabel:'Quitter sans enregistrer'});}finally{confirming=false;}
    };
    function clearEditor(){detailController?.abort();detailController=null;permissionEditor()?.reset(root);detailRevision=null;}
    function showInvitation(invitation,username){
      const url=new URL(location.href);url.hash='account='+invitation.ticket;find('#wgUserInvitationLink').value=url.href;invitation.ticket='';
      find('#wgUserInvitationEmail').href='mailto:'+encodeURIComponent(username||'')+'?subject='+encodeURIComponent('Votre accès WolfGuard')+'&body='+encodeURIComponent('Bonjour,\n\nVoici votre lien personnel WolfGuard pour créer votre compte ou réinitialiser votre code :\n'+url.href+'\n\nCe lien est valable 24 heures et utilisable une seule fois. Vous choisirez un code personnel de 8 chiffres, puis configurerez votre application d’authentification. Chaque connexion demandera votre code personnel puis le code MFA à 6 chiffres de cette application.\n');
      find('#wgUserInvitationHelp').textContent=(username?'Transmets ce lien à '+username+'. ':'Partage ce lien avec une seule personne. ')+'Valable jusqu’au '+date(invitation.expiresAt)+'. Le nouveau compte démarre sans accès : sélectionne-le ensuite pour attribuer ses droits.';
      find('#wgUserInvitation').dataset.invitationId=invitation.id||'';find('#wgUserInvitation').hidden=false;find('#wgUserInvitation').scrollIntoView({block:'nearest'});find('#wgUserInvitationCopy').focus();
    }
    function renderOverview(){
      const user=users.find(row=>row.id===selected);if(!user)return;
      const disabled=busy||stale||!manage(),mfa=user.mfa?.complete,expanded=!!find('.users-account-security')?.open;
      find('#wgUserOverview').innerHTML='<header class="users-detail-heading"><span class="user-avatar" aria-hidden="true">'+esc(user.username.slice(0,2).toUpperCase())+'</span><div><span class="users-eyebrow">COMPTE SÉLECTIONNÉ'+(user.current?' · MON COMPTE':'')+'</span><h4>'+esc(user.username)+'</h4><div class="users-account-badges"><span class="access-badge">'+esc(profile(user))+'</span><span class="users-account-state" data-state="'+(user.disabled?'disabled':user.credentialPending?'pending':'active')+'">'+accountState(user)+'</span></div></div><button type="button" class="settings-btn" data-user-action="edit" data-user-id="'+esc(user.id)+'" '+(disabled?'disabled':'')+'>Modifier</button></header><dl class="users-account-facts"><div><dt>Double authentification</dt><dd data-mfa-state="'+(mfa?'complete':'missing')+'">'+(mfa?'MFA activée':'MFA non configurée')+'</dd></div><div><dt>Sessions actives</dt><dd>'+user.sessions+'</dd></div><div><dt>Dernière connexion</dt><dd>'+esc(date(user.lastLogin))+'</dd></div></dl>';
      find('#wgUserAccountActions').innerHTML='<details class="users-account-security" '+(expanded?'open':'')+'><summary>Sécurité et actions du compte</summary><p class="access-help">Application d’authentification : '+(user.mfa?.authenticator?'configurée.':'à configurer.')+(protectedAdmin(user)?' Le propriétaire conserve tous les droits. Suppression et désactivation bloquées.':'')+'</p><div class="access-actions">'+(user.current?'<button type="button" class="settings-btn" data-user-action="security" data-user-id="'+esc(user.id)+'" '+(disabled?'disabled':'')+'>'+(mfa?'Gérer ma MFA':'Configurer ma MFA')+'</button>':'')+[['disconnect','Déconnecter les sessions'],['toggle',user.disabled?'Activer':'Désactiver'],['reset',user.credentialPending?'Nouveau lien personnel':'Réinitialiser le code'],...(!protectedAdmin(user)?[['reset-otp','Réinitialiser Authenticator']]:[]),['delete','Supprimer']].map(([action,label])=>'<button type="button" class="settings-btn'+(action==='delete'?' access-danger':'')+'" data-user-action="'+action+'" data-user-id="'+esc(user.id)+'" '+(disabled||user.current&&action==='reset'||protectedAdmin(user)&&['toggle','delete'].includes(action)?'disabled':'')+'>'+label+'</button>').join('')+'</div></details>';
    }
    async function loadPermissions(){
      clearEditor();const user=users.find(row=>row.id===selected);if(!user)return;
      find('#wgUserStale').hidden=true;detailRevision=user.permission_revision;
      if(!rights()){find('#wgPermissionHost').innerHTML='<p class="access-help">Profil d’accès : '+esc(profile(user))+'. La modification des droits est réservée aux administrateurs autorisés.</p>';return;}
      detailController=new AbortController();const current=detailController;
      const abort=()=>current.abort();signal.addEventListener('abort',abort,{once:true});
      try{await permissionEditor().open(root,user,{signal:current.signal,embedded:true,onSaved:async saved=>{detailRevision=saved.revision;feedback('Droits enregistrés pour '+user.username+'.');await refresh();}});}
      finally{signal.removeEventListener('abort',abort);}
    }
    function visibleUsers(){return users.filter(user=>(!search||user.username.toLowerCase().includes(search))&&(filter==='all'||filter==='disabled'&&user.disabled||filter==='pending'&&!user.disabled&&user.credentialPending||filter==='active'&&!user.disabled&&!user.credentialPending));}
    function render(){
      if(!live())return;const disabled=busy||stale||!available()||!manage();find('#wgUserAdd').disabled=disabled;find('#wgUserInvite').disabled=disabled;
      find('#wgPermissionsAudit').hidden=!rights();find('#wgPermissionsAudit').disabled=busy;
      find('#wgUsersCount').textContent=users.length;
      find('#wgUsersSummary').innerHTML=[[users.filter(user=>!user.disabled&&!user.credentialPending).length,'actifs'],[users.filter(user=>!user.disabled&&user.credentialPending).length,'à activer'],[users.filter(user=>user.disabled).length,'désactivés'],[users.filter(user=>!user.disabled&&!user.mfa?.complete).length,'MFA à configurer']].map(([count,label])=>'<span><strong>'+count+'</strong> '+label+'</span>').join('');
      find('#wgPendingInvitations').hidden=!invitations.length;find('#wgPendingCount').textContent=invitations.length;
      find('#wgPendingList').innerHTML=invitations.map((invitation,index)=>'<div class="users-pending-row"><div><strong>Invitation du '+esc(date(invitation.createdAt))+'</strong><p>Expire le '+esc(date(invitation.expiresAt))+' · Usage unique</p></div><button type="button" class="settings-btn access-danger" data-invitation-id="'+esc(invitation.id)+'" '+(disabled?'disabled':'')+' aria-label="Annuler l’invitation '+(index+1)+'">Annuler le lien</button></div>').join('');
      const focused=document.activeElement?.dataset.selectUser;
      find('#wgUsersList').innerHTML=visibleUsers().map(user=>'<button type="button" class="user-card users-account-row" data-user-id="'+esc(user.id)+'" data-select-user="'+esc(user.id)+'" aria-pressed="'+(user.id===selected)+'" '+(busy?'disabled':'')+'><span class="user-avatar" aria-hidden="true">'+esc(user.username.slice(0,2).toUpperCase())+'</span><span class="users-account-copy"><strong>'+esc(user.username)+'</strong><small>'+esc(profile(user))+(user.current?' · Mon compte':'')+'</small><span class="users-account-state" data-state="'+(user.disabled?'disabled':user.credentialPending?'pending':'active')+'">'+accountState(user)+'</span></span><span class="users-account-arrow" aria-hidden="true">›</span></button>').join('')||'<p class="access-empty">Aucun compte ne correspond à la recherche.</p>';
      if(focused)find('[data-select-user="'+focused+'"]')?.focus({preventScroll:true});
      renderOverview();const fieldset=find('#wgPermissionHost fieldset');if(fieldset)fieldset.disabled=busy||stale||permissionEditor().isSaving(root);
    }
    async function refresh(){
      if(!live()||busy)return;if(refreshing)return refreshing;
      if(!available()){find('#wgUsersList').textContent='Cette gestion nécessite un compte autorisé dans l’espace partagé.';find('#wgUserAdd').disabled=true;find('#wgUserInvite').disabled=true;return;}
      find('#wgUsersRefresh').disabled=true;
      refreshing=(async()=>{try{
        const recovered=stale,result=await request('');if(!live())return;users=result.users;invitations=result.invitations||[];stale=false;
        const user=users.find(row=>row.id===selected);let replace=false;
        if(!user){selected=users[0]?.id||null;replace=true;}
        render();
        if(replace)await loadPermissions();
        else if(user.permission_revision!==detailRevision&&!find('#wgPermissionHost [data-close-audit]'))find('#wgUserStale').hidden=false;
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
      editing=user;const form=find('#wgUserForm');form.hidden=false;form.reset();form.dataset.dirty='false';find('#wgUserFormError').textContent='';find('#wgUserFormTitle').textContent=user?'Modifier le compte':'Inviter par e-mail';find('#wgUserName').value=user?.username||'';find('#wgUserName').readOnly=!!user&&protectedAdmin(user);find('#wgUserRoleInfo').textContent=protectedAdmin(user)?'Compte propriétaire protégé. Ses droits restent complets.':user?'Les droits restent réglables dans le panneau du compte.':'La personne choisira son code via son lien personnel. Son compte démarre sans accès.';find('#wgUserDisabled').checked=!!user?.disabled;find('#wgUserDisabledRow').hidden=!user;find('#wgUserDisabled').disabled=!!user&&protectedAdmin(user);find('#wgUserName').focus();form.scrollIntoView({block:'nearest'});
    }
    find('#wgUserForm').oninput=()=>{find('#wgUserForm').dataset.dirty='true';};
    find('#wgUsersSearch').oninput=event=>{search=event.target.value.trim().toLowerCase();render();};find('#wgUsersFilter').onchange=event=>{filter=event.target.value;render();};
    find('#wgUserInvite').onclick=async()=>{
      if(busy||stale||!available()||!manage()||!await canLeave()||!live())return;busy=true;render();feedback('Création du lien…');feedback('',true);
      try{const result=await request('/invite',{});if(!live())return;showInvitation(result.invitation);feedback('Invitation créée. Copiez le lien pour le partager.');}catch(error){feedback(error.message,true);feedback('');}finally{busy=false;if(live())await refresh();}
    };
    find('#wgUserInvitationCopy').onclick=async()=>{const copied=await copyText(find('#wgUserInvitationLink').value);feedback(copied?'Lien copié.':'Copie impossible. Sélectionne le lien pour le copier.',!copied);};
    find('#wgUserInvitationClose').onclick=()=>{find('#wgUserInvitationLink').value='';find('#wgUserInvitationEmail').removeAttribute('href');find('#wgUserInvitation').hidden=true;};
    find('#wgPermissionsAudit').onclick=async()=>{if(!await canLeave()||!live())return;clearEditor();await permissionEditor().audit(root,{signal,onClose:loadPermissions});};
    find('#wgUserReloadRights').onclick=async()=>{if(await canLeave()&&live())await loadPermissions();};
    find('#wgUserForm').onsubmit=async event=>{
      event.preventDefault();if(busy||stale||!live()||!manage()||permissionEditor()?.isSaving(root))return;
      const target=editing,value={username:find('#wgUserName').value.trim(),role:target?.role||'member'};if(target){value.id=target.id;value.disabled=find('#wgUserDisabled').checked;}
      if(target&&value.disabled!==target.disabled&&!await appConfirm('Modifier l’état de « '+target.username+' » ? Ses sessions seront déconnectées.',{confirmLabel:'Modifier le compte',danger:true}))return;
      if(!live())return;busy=true;find('#wgUserSave').disabled=true;render();
      try{const result=await request(target?'/update':'/create',value);if(!live())return;find('#wgUserForm').reset();find('#wgUserForm').hidden=true;find('#wgUserForm').dataset.dirty='false';if(result.reconnect){await lockApplication();return;}selected=result.user?.id||selected;feedback(target?'Compte modifié.':'Compte créé. Attribuez maintenant son profil et ses droits.');if(result.invitation)showInvitation(result.invitation,value.username);feedback('',true);}
      catch(error){if(live())find('#wgUserFormError').textContent=error.message;}
      finally{busy=false;if(live()){find('#wgUserSave').disabled=false;await refresh();if(selected!==target?.id)await loadPermissions();}}
    };
    find('#wgUserCancel').onclick=()=>{find('#wgUserForm').reset();find('#wgUserForm').hidden=true;find('#wgUserForm').dataset.dirty='false';editing=null;};
    find('#wgUserAdd').onclick=async()=>{if(await canLeave()&&live())editor();};find('#wgUsersRefresh').onclick=refresh;
    root.addEventListener('click',async event=>{
      const row=event.target.closest('[data-select-user]');if(row&&!row.disabled){await selectUser(row.dataset.selectUser);return;}
      const invitation=event.target.closest('button[data-invitation-id]');
      if(invitation&&!invitation.disabled){
        if(busy||stale||!manage()||!await appConfirm('Annuler cette invitation ? Le lien ne pourra plus être utilisé.',{confirmLabel:'Annuler le lien',danger:true})||!live()||busy)return;
        busy=true;render();try{await request('/revoke-invitation',{id:invitation.dataset.invitationId});if(!live())return;if(find('#wgUserInvitation').dataset.invitationId===invitation.dataset.invitationId)find('#wgUserInvitationClose').click();feedback('Invitation annulée.');}catch(error){feedback(error.message,true);}finally{busy=false;if(live())await refresh();}return;
      }
      const button=event.target.closest('[data-user-action]');if(!button||button.disabled||busy||stale)return;const user=users.find(row=>row.id===button.dataset.userId);if(!user)return;
      const action=button.dataset.userAction;
      if(action==='edit'){if(!permissionEditor()?.isSaving(root))editor(user);return;}if(action==='security'&&user.current){if(await canLeave()&&live())window.openAccountMFA?.();return;}
      if(!manage()||!await canLeave()||!live())return;
      const labels={disconnect:'Déconnecter toutes les sessions',toggle:user.disabled?'Activer':'Désactiver',reset:'Réinitialiser le code','reset-otp':'Réinitialiser Authenticator',delete:'Supprimer définitivement'};
      if(!labels[action]||!await appConfirm(labels[action]+' de « '+user.username+' » ?'+(['toggle','reset','reset-otp','delete'].includes(action)?' Les sessions concernées seront coupées.':''),{title:'Gestion de '+user.username,confirmLabel:labels[action],danger:action!=='toggle'||!user.disabled})||!live()||busy)return;
      busy=true;render();feedback('');feedback('',true);
      try{const path=action==='reset'?'reset-code':action==='toggle'?'update':action,value=action==='toggle'?{id:user.id,username:user.username,role:user.role,disabled:!user.disabled}:{id:user.id};const result=await request('/'+path,value);if(!live())return;if(result.reconnect){await lockApplication();return;}feedback(action==='reset'?'Nouveau lien créé : l’utilisateur choisira son code.':'Action effectuée pour '+user.username+'.');if(result.invitation)showInvitation(result.invitation,user.username);}
      catch(error){feedback(error.message,true);}finally{busy=false;if(live())await refresh();}
    },{signal});
    signal.addEventListener('abort',()=>detailController?.abort(),{once:true});
    async function poll(){try{await refresh();}finally{if(live())timer=setTimeout(poll,15000);}}poll();
  }
  return {mount,unmount,beforeLeave:()=>canLeave()};
})();
