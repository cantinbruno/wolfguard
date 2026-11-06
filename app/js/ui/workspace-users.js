'use strict';

const workspaceUsers=(()=>{
  let generation=0,timer=0,controller=null;
  function unmount(){generation++;clearTimeout(timer);controller?.abort();controller=null;}
  function mount(root){
    unmount();const token=generation,key=state.vaultKey;controller=new AbortController();const signal=controller.signal;
    const live=()=>generation===token&&root.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    const cloud=()=>typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud;
    const available=()=>cloud()?.enabled&&cloud().hasSession()&&cloud().isAdmin();
    const request=(path,value)=>cloud().agentRequest('users'+path,value,{signal});
    const find=selector=>root.querySelector(selector);
    let users=[],invitations=[],filter='all',search='',busy=false,stale=true,editing=null,refreshing=null;const expanded=new Set();
    root.innerHTML=`<header class="settings-panel-head"><div class="settings-heading">${settingsIcon('users')}<h3>Utilisateurs</h3></div><button type="button" class="settings-btn settings-btn-icon" id="wgUsersRefresh" aria-label="Actualiser les utilisateurs">${settingsIcon('refresh-cw')}</button></header>
      <p class="access-intro">Un lien pour rejoindre votre espace partagé.</p>
      <section class="users-invite-hero" aria-labelledby="wgInviteTitle"><div class="users-invite-icon">${settingsIcon('link')}</div><div><h4 id="wgInviteTitle">Invitez quelqu’un, simplement</h4><p>Partagez un lien. La personne saisit son e-mail et choisit son code de 8 chiffres.</p><span class="users-invite-rule">Usage unique · Expire après 24 h</span></div><button type="button" class="settings-btn primary" id="wgUserInvite">${settingsIcon('plus')}Inviter par lien</button></section>
      <p class="access-help">Les membres peuvent consulter et modifier les fiches partagées. Seul l’administrateur gère les comptes et les accès.</p>
      <div class="users-summary" id="wgUsersSummary" aria-label="Résumé des comptes"></div>
      <p id="wgUsersError" class="access-error" role="alert"></p><p id="wgUsersStatus" class="access-feedback" role="status"></p>
      <section id="wgUserInvitation" class="users-invitation" aria-labelledby="wgUserInvitationTitle" hidden><span class="users-invite-rule">1 lien = 1 inscription</span><h4 id="wgUserInvitationTitle">Votre lien est prêt</h4><p id="wgUserInvitationHelp"></p><textarea id="wgUserInvitationLink" rows="3" readonly aria-label="Lien personnel de connexion"></textarea><div class="actions"><button type="button" class="settings-btn primary" id="wgUserInvitationCopy">Copier le lien</button><a class="settings-btn" id="wgUserInvitationEmail">Préparer l’e-mail</a><button type="button" class="settings-btn" id="wgUserInvitationClose">Fermer</button></div><small>Copiez ce lien avant de fermer. Aucun e-mail n’est envoyé automatiquement.</small></section>
      <section id="wgPendingInvitations" class="users-pending" aria-label="Invitations en attente" hidden></section>
      <div class="users-toolbar"><h4>Comptes <span id="wgUsersCount"></span></h4><button type="button" class="settings-btn" id="wgUserAdd">Ajouter par e-mail</button></div>
      <div class="users-filters"><label class="users-search">${settingsIcon('search')}<input id="wgUsersSearch" type="search" placeholder="Rechercher une adresse e-mail" aria-label="Rechercher un utilisateur"></label><label class="users-filter-label">Afficher<select id="wgUsersFilter"><option value="all">Tous les comptes</option><option value="active">Actifs</option><option value="pending">À activer</option><option value="disabled">Désactivés</option></select></label></div>
      <form id="wgUserForm" class="users-form" hidden><h4 id="wgUserFormTitle"></h4><label>Adresse mail<input id="wgUserName" type="email" inputmode="email" maxlength="254" autocomplete="off" required><small>L’adresse e-mail identifie le compte pour les invitations et les réinitialisations.</small></label><p class="access-help" id="wgUserRoleInfo"></p><label id="wgUserDisabledRow" class="users-checkbox"><input type="checkbox" id="wgUserDisabled">Compte désactivé</label><p id="wgUserFormError" class="access-error" role="alert"></p><div class="actions"><button type="submit" class="settings-btn primary" id="wgUserSave">Enregistrer</button><button type="button" class="settings-btn" id="wgUserCancel">Annuler</button></div></form>
      <div id="wgUsersList" class="access-list"><p>Chargement des utilisateurs…</p></div>`;
    const feedback=(message,error=false)=>{if(live())find(error?'#wgUsersError':'#wgUsersStatus').textContent=message;};
    function showInvitation(invitation,username){
      const url=new URL(location.href);url.hash='account='+invitation.ticket;
      find('#wgUserInvitationLink').value=url.href;invitation.ticket='';
      find('#wgUserInvitationEmail').href='mailto:'+encodeURIComponent(username||'')+'?subject='+encodeURIComponent('Votre accès WolfGuard')+'&body='+encodeURIComponent('Bonjour,\n\nVoici votre lien personnel WolfGuard pour créer votre compte ou réinitialiser votre code :\n'+url.href+'\n\nCe lien est valable 24 heures et utilisable une seule fois. Votre adresse e-mail reste associée à votre compte. Vous choisirez votre code personnel de 8 chiffres ; ce code suffira ensuite pour vous connecter.\n');
      find('#wgUserInvitationHelp').textContent=(username?'Transmets ce lien à '+username+'. ':'Partage ce lien avec une seule personne : elle renseignera son adresse e-mail et choisira son code. ')+'Valable jusqu’au '+date(invitation.expiresAt)+'. Le lien devient inutilisable après validation.';
      find('#wgUserInvitation').dataset.invitationId=invitation.id||'';find('#wgUserInvitation').hidden=false;find('#wgUserInvitation').scrollIntoView({block:'nearest'});find('#wgUserInvitationCopy').focus();
    }
    find('#wgUserInvitationCopy').onclick=async()=>{const copied=await copyText(find('#wgUserInvitationLink').value);feedback(copied?'Lien copié.':'Copie impossible. Sélectionne le lien pour le copier.',!copied);};
    find('#wgUserInvitationClose').onclick=()=>{find('#wgUserInvitationLink').value='';find('#wgUserInvitationEmail').removeAttribute('href');find('#wgUserInvitation').hidden=true;};
    const date=value=>value?new Date(value).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Jamais';
    const protectedAdmin=user=>user.role==='admin'&&!user.disabled&&users.filter(row=>row.role==='admin'&&!row.disabled).length===1;
    function render(){
      if(!live())return;const disabled=busy||stale||!available();find('#wgUserAdd').disabled=disabled;find('#wgUserInvite').disabled=disabled;find('#wgUsersCount').textContent=users.length+' compte'+(users.length>1?'s':'');
      const activeCount=users.filter(user=>!user.disabled&&!user.credentialPending).length,pendingCount=users.filter(user=>!user.disabled&&user.credentialPending).length;
      find('#wgUsersSummary').innerHTML=[[activeCount,'Actifs'],[pendingCount,'À activer'],[users.filter(user=>user.disabled).length,'Désactivés']].map(([count,label])=>'<div><strong>'+count+'</strong><span>'+label+'</span></div>').join('');
      find('#wgPendingInvitations').hidden=!invitations.length;
      find('#wgPendingInvitations').innerHTML='<h4>Liens en attente <span>'+invitations.length+'</span></h4>'+invitations.map((invitation,index)=>'<div class="users-pending-row"><div><strong>Invitation du '+esc(date(invitation.createdAt))+'</strong><p>Expire le '+esc(date(invitation.expiresAt))+' · Usage unique</p></div><button type="button" class="settings-btn access-danger" data-invitation-id="'+esc(invitation.id)+'" '+(disabled?'disabled':'')+' aria-label="Annuler l’invitation '+(index+1)+'">Annuler le lien</button></div>').join('');
      const visible=users.filter(user=>(!search||user.username.toLowerCase().includes(search))&&(filter==='all'||filter==='disabled'&&user.disabled||filter==='pending'&&!user.disabled&&user.credentialPending||filter==='active'&&!user.disabled&&!user.credentialPending));
      const active=document.activeElement,focusId=active?.dataset.userId,focusAction=active?.dataset.userAction;
      find('#wgUsersList').innerHTML=visible.map(user=>'<article class="access-card user-card" data-user-id="'+esc(user.id)+'"><div class="access-card-heading"><span class="user-avatar" aria-hidden="true">'+esc(user.username.slice(0,2).toUpperCase())+'</span><strong>'+esc(user.username)+'</strong><span class="access-badge">'+(user.role==='admin'?'Administrateur':'Utilisateur')+'</span>'+(user.current?'<span class="user-current">Mon compte</span>':'')+'</div><p class="access-details">'+(user.disabled?'Compte désactivé':user.credentialPending?'Code à définir par l’utilisateur':user.sessions+' session'+(user.sessions>1?'s':'')+' active'+(user.sessions>1?'s':''))+' · Dernière connexion : '+esc(date(user.lastLogin))+'</p>'+(protectedAdmin(user)?'<p class="access-help">Dernier administrateur actif · Compte protégé</p>':'')+'<div class="access-actions"><button type="button" class="settings-btn" data-user-action="edit" data-user-id="'+esc(user.id)+'" '+(disabled?'disabled':'')+'>Modifier</button><details class="user-actions" data-user-details="'+esc(user.id)+'" '+(expanded.has(user.id)?'open':'')+'><summary>Gérer ce compte</summary><div class="access-actions">'+[['disconnect','Déconnecter les sessions'],['toggle',user.disabled?'Activer':'Désactiver'],['reset',user.credentialPending?'Nouveau lien personnel':'Réinitialiser le code'],...(!protectedAdmin(user)?[['reset-otp','Réinitialiser OTP et téléphone']]:[]),['delete','Supprimer']].map(([action,label])=>'<button type="button" class="settings-btn'+(action==='delete'?' access-danger':'')+'" data-user-action="'+action+'" data-user-id="'+esc(user.id)+'" '+(disabled||user.current&&action==='reset'||protectedAdmin(user)&&['toggle','delete'].includes(action)?'disabled':'')+'>'+label+'</button>').join('')+'</div></details></div></article>').join('')||'<p class="access-empty">Aucun compte ne correspond à votre recherche.</p>';
      if(focusId&&focusAction){const button=[...root.querySelectorAll('[data-user-action]')].find(button=>button.dataset.userId===focusId&&button.dataset.userAction===focusAction);if(button&&!button.disabled)button.focus({preventScroll:true});}
    }
    async function refresh(){
      if(!live()||busy)return;if(refreshing)return refreshing;
      if(!available()){find('#wgUsersList').textContent='La gestion des utilisateurs nécessite un compte administrateur dans l’espace partagé.';find('#wgUserAdd').disabled=true;find('#wgUserInvite').disabled=true;return;}
      find('#wgUsersRefresh').disabled=true;
      refreshing=(async()=>{try{const result=await request('');if(!live())return;users=result.users;invitations=result.invitations||[];stale=false;render();}catch(error){stale=true;feedback(error.message,true);render();}finally{if(live())find('#wgUsersRefresh').disabled=false;}})();
      try{await refreshing;}finally{refreshing=null;}
    }
    function editor(user=null){
      editing=user;const form=find('#wgUserForm');form.hidden=false;form.reset();find('#wgUserFormError').textContent='';find('#wgUserFormTitle').textContent=user?'Modifier '+user.username:'Ajouter un utilisateur';
      find('#wgUserName').value=user?.username||'';find('#wgUserName').readOnly=!!user&&protectedAdmin(user);find('#wgUserRoleInfo').textContent=protectedAdmin(user||{})?'Administrateur unique : ce compte est protégé.':'Utilisateur : la gestion des comptes et des accès est bloquée.';find('#wgUserDisabled').checked=!!user?.disabled;
      find('#wgUserDisabledRow').hidden=!user;
      find('#wgUserDisabled').disabled=!!user&&protectedAdmin(user);
      find('#wgUserName').focus();form.scrollIntoView({block:'nearest'});
    }
    find('#wgUsersSearch').oninput=event=>{search=event.target.value.trim().toLowerCase();render();};
    find('#wgUsersFilter').onchange=event=>{filter=event.target.value;render();};
    find('#wgUserInvite').onclick=async()=>{
      if(busy||stale||!available())return;
      busy=true;render();feedback('Création du lien…');feedback('',true);
      try{const result=await request('/invite',{});if(!live())return;showInvitation(result.invitation);feedback('Invitation créée. Copiez le lien pour le partager.');}
      catch(error){feedback(error.message,true);feedback('');}
      finally{busy=false;if(live())await refresh();}
    };
    find('#wgPendingInvitations').onclick=async event=>{
      const button=event.target.closest('[data-invitation-id]');if(!button||button.disabled||busy||stale)return;
      if(!await appConfirm('Annuler cette invitation ? Le lien ne pourra plus être utilisé.',{confirmLabel:'Annuler le lien',danger:true})||!live()||busy||stale)return;
      busy=true;render();
      try{await request('/revoke-invitation',{id:button.dataset.invitationId});if(!live())return;if(find('#wgUserInvitation').dataset.invitationId===button.dataset.invitationId)find('#wgUserInvitationClose').click();feedback('Invitation annulée.');feedback('',true);}
      catch(error){feedback(error.message,true);}
      finally{busy=false;if(live())await refresh();}
    };
    find('#wgUserForm').onsubmit=async event=>{
      event.preventDefault();if(busy||stale||!live())return;
      const value={username:find('#wgUserName').value.trim(),role:editing?.role||'member'};if(editing){value.id=editing.id;value.disabled=find('#wgUserDisabled').checked;}
      if(editing&&(value.disabled!==editing.disabled||value.role!==editing.role)&&!await appConfirm('Modifier les droits de « '+editing.username+' » ? Ses sessions seront déconnectées.',{confirmLabel:'Modifier les droits',danger:true}))return;
      busy=true;find('#wgUserSave').disabled=true;render();
      try{const result=await request(editing?'/update':'/create',value);if(!live())return;find('#wgUserForm').reset();find('#wgUserForm').hidden=true;if(result.reconnect){await lockApplication();return;}feedback(editing?'Utilisateur modifié.':'Utilisateur ajouté. Il définira son code avec son lien personnel.');if(result.invitation)showInvitation(result.invitation,value.username);feedback('',true);}
      catch(error){if(live())find('#wgUserFormError').textContent=error.message;}
      finally{busy=false;if(live()){find('#wgUserSave').disabled=false;await refresh();}}
    };
    find('#wgUserCancel').onclick=()=>{find('#wgUserForm').reset();find('#wgUserForm').hidden=true;editing=null;};
    find('#wgUserAdd').onclick=()=>{filter='all';search='';find('#wgUsersFilter').value='all';find('#wgUsersSearch').value='';render();editor();};find('#wgUsersRefresh').onclick=refresh;
    root.addEventListener('toggle',event=>{const id=event.target.dataset?.userDetails;if(id)event.target.open?expanded.add(id):expanded.delete(id);}, {signal,capture:true});
    root.addEventListener('click',async event=>{
      const button=event.target.closest('[data-user-action]');if(!button||button.disabled||busy||stale)return;const user=users.find(row=>row.id===button.dataset.userId);if(!user)return;
      const action=button.dataset.userAction;if(action==='edit'){editor(user);return;}
      const labels={disconnect:'Déconnecter toutes les sessions',toggle:user.disabled?'Activer':'Désactiver',reset:'Réinitialiser le code','reset-otp':'Réinitialiser OTP et téléphone',delete:'Supprimer définitivement'};
      if(!await appConfirm(labels[action]+' de « '+user.username+' » ?'+(['toggle','reset','reset-otp','delete'].includes(action)?' Les sessions concernées seront coupées.':''),{title:'Gestion de '+user.username,confirmLabel:labels[action],danger:action!=='toggle'||!user.disabled})||!live()||busy)return;
      busy=true;render();feedback('');feedback('',true);
      try{const path=action==='reset'?'reset-code':action==='toggle'?'update':action;const value=action==='toggle'?{id:user.id,username:user.username,role:user.role,disabled:!user.disabled}:{id:user.id};const result=await request('/'+path,value);if(!live())return;if(result.reconnect){await lockApplication();return;}feedback(action==='reset'?'Réinitialisation demandée : le nouveau code sera choisi par l’utilisateur.':'Action effectuée pour '+user.username+'.');if(result.invitation)showInvitation(result.invitation,user.username);}
      catch(error){feedback(error.message,true);}
      finally{busy=false;if(live())await refresh();}
    },{signal});
    async function poll(){try{await refresh();}finally{if(live())timer=setTimeout(poll,15000);}}poll();
  }
  return {mount,unmount};
})();
