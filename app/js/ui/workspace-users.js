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
    let users=[],busy=false,stale=true,editing=null,refreshing=null;const expanded=new Set();
    root.innerHTML='<header class="settings-panel-head"><div class="settings-heading">'+settingsIcon('key-round')+'<h3>Utilisateurs</h3></div><button type="button" class="settings-btn settings-btn-icon" id="wgUsersRefresh" aria-label="Actualiser les utilisateurs">'+settingsIcon('refresh-cw')+'</button></header><p class="access-intro">Chaque personne se connecte avec son adresse mail et son code personnel.</p><p class="access-help">Seul cantin.bruno@gmx.fr administre les comptes, les accès et l’association des agents. Les utilisateurs partagent les fiches et utilisent les postes associés.</p><ol class="users-workflow"><li>Crée un utilisateur avec son identifiant et un code personnel.</li><li>Transmets-lui le lien privé du site et ses identifiants.</li><li>Il accède à la même base et peut modifier les fiches. La gestion des comptes et des accès lui reste bloquée.</li></ol><div class="users-toolbar"><span id="wgUsersCount"></span><button type="button" class="settings-btn primary" id="wgUserAdd">Ajouter un utilisateur</button></div><p id="wgUsersError" class="access-error" role="alert"></p><p id="wgUsersStatus" class="access-feedback" role="status"></p><form id="wgUserForm" class="users-form" hidden><h4 id="wgUserFormTitle"></h4><label>Adresse mail<input id="wgUserName" type="email" inputmode="email" maxlength="254" autocomplete="off" required><small>L’adresse mail sert d’identifiant de connexion.</small></label><p class="access-help" id="wgUserRoleInfo"></p><label id="wgUserCodeRow">Code personnel de 8 chiffres<input id="wgUserCode" type="password" inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" autocomplete="new-password"></label><label id="wgUserDisabledRow" class="users-checkbox"><input type="checkbox" id="wgUserDisabled">Compte désactivé</label><p id="wgUserFormError" class="access-error" role="alert"></p><div class="actions"><button type="submit" class="settings-btn primary" id="wgUserSave">Enregistrer</button><button type="button" class="settings-btn" id="wgUserCancel">Annuler</button></div></form><div id="wgUsersList" class="access-list"><p>Chargement des utilisateurs…</p></div>';
    const feedback=(message,error=false)=>{if(live())find(error?'#wgUsersError':'#wgUsersStatus').textContent=message;};
    const date=value=>value?new Date(value).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Jamais';
    const protectedAdmin=user=>user.role==='admin'&&!user.disabled&&users.filter(row=>row.role==='admin'&&!row.disabled).length===1;
    function render(){
      if(!live())return;const disabled=busy||stale||!available();find('#wgUserAdd').disabled=disabled;find('#wgUsersCount').textContent=users.length+' compte'+(users.length>1?'s':'');
      const active=document.activeElement,focusId=active?.dataset.userId,focusAction=active?.dataset.userAction;
      find('#wgUsersList').innerHTML=users.map(user=>'<article class="access-card user-card" data-user-id="'+esc(user.id)+'"><div class="access-card-heading"><strong>'+esc(user.username)+'</strong><span class="access-badge">'+(user.role==='admin'?'Administrateur':'Utilisateur')+'</span>'+(user.current?'<span class="user-current">Mon compte</span>':'')+'</div><p class="access-details">'+(user.disabled?'Compte désactivé':user.sessions+' session'+(user.sessions>1?'s':'')+' active'+(user.sessions>1?'s':''))+' · Dernière connexion : '+esc(date(user.lastLogin))+'</p>'+(protectedAdmin(user)?'<p class="access-help">Dernier administrateur actif · Compte protégé</p>':'')+'<div class="access-actions"><button type="button" class="settings-btn" data-user-action="edit" data-user-id="'+esc(user.id)+'" '+(disabled?'disabled':'')+'>Modifier</button><details class="user-actions" data-user-details="'+esc(user.id)+'" '+(expanded.has(user.id)?'open':'')+'><summary>Gérer ce compte</summary><div class="access-actions">'+[['disconnect','Déconnecter les sessions'],['toggle',user.disabled?'Activer':'Désactiver'],['reset','Réinitialiser le code'],['delete','Supprimer']].map(([action,label])=>'<button type="button" class="settings-btn'+(action==='delete'?' access-danger':'')+'" data-user-action="'+action+'" data-user-id="'+esc(user.id)+'" '+(disabled||protectedAdmin(user)&&['toggle','delete'].includes(action)?'disabled':'')+'>'+label+'</button>').join('')+'</div></details></div></article>').join('')||'<p class="access-empty">Aucun utilisateur.</p>';
      if(focusId&&focusAction){const button=[...root.querySelectorAll('[data-user-action]')].find(button=>button.dataset.userId===focusId&&button.dataset.userAction===focusAction);if(button&&!button.disabled)button.focus({preventScroll:true});}
    }
    async function refresh(){
      if(!live()||busy)return;if(refreshing)return refreshing;
      if(!available()){find('#wgUsersList').textContent='La gestion des utilisateurs nécessite un compte administrateur dans l’espace partagé.';find('#wgUserAdd').disabled=true;return;}
      find('#wgUsersRefresh').disabled=true;
      refreshing=(async()=>{try{const result=await request('');if(!live())return;users=result.users;stale=false;render();}catch(error){stale=true;feedback(error.message,true);render();}finally{if(live())find('#wgUsersRefresh').disabled=false;}})();
      try{await refreshing;}finally{refreshing=null;}
    }
    function editor(user=null){
      editing=user;const form=find('#wgUserForm');form.hidden=false;form.reset();find('#wgUserFormError').textContent='';find('#wgUserFormTitle').textContent=user?'Modifier '+user.username:'Ajouter un utilisateur';
      find('#wgUserName').value=user?.username||'';find('#wgUserName').readOnly=!!user&&protectedAdmin(user);find('#wgUserRoleInfo').textContent=protectedAdmin(user||{})?'Administrateur unique : ce compte est protégé.':'Utilisateur : la gestion des comptes et des accès est bloquée.';find('#wgUserDisabled').checked=!!user?.disabled;
      find('#wgUserCodeRow').hidden=!!user;find('#wgUserCode').required=!user;find('#wgUserDisabledRow').hidden=!user;
      find('#wgUserDisabled').disabled=!!user&&protectedAdmin(user);
      find('#wgUserName').focus();form.scrollIntoView({block:'nearest'});
    }
    find('#wgUserForm').onsubmit=async event=>{
      event.preventDefault();if(busy||stale||!live())return;
      const value={username:find('#wgUserName').value.trim(),role:editing?.role||'member'};if(editing){value.id=editing.id;value.disabled=find('#wgUserDisabled').checked;}else value.code=find('#wgUserCode').value;
      if(editing&&(value.disabled!==editing.disabled||value.role!==editing.role)&&!await appConfirm('Modifier les droits de « '+editing.username+' » ? Ses sessions seront déconnectées.',{confirmLabel:'Modifier les droits',danger:true}))return;
      busy=true;find('#wgUserSave').disabled=true;render();
      try{const result=await request(editing?'/update':'/create',value);if(!live())return;find('#wgUserForm').reset();find('#wgUserForm').hidden=true;if(result.reconnect){await lockApplication();return;}feedback(editing?'Utilisateur modifié.':'Utilisateur créé. Transmets-lui le lien privé, son identifiant et son code par un moyen sûr.');feedback('',true);}
      catch(error){if(live())find('#wgUserFormError').textContent=error.message;}
      finally{value.code='';busy=false;if(live()){find('#wgUserSave').disabled=false;await refresh();}}
    };
    find('#wgUserCancel').onclick=()=>{find('#wgUserForm').reset();find('#wgUserForm').hidden=true;editing=null;};
    find('#wgUserAdd').onclick=()=>editor();find('#wgUsersRefresh').onclick=refresh;
    root.addEventListener('toggle',event=>{const id=event.target.dataset?.userDetails;if(id)event.target.open?expanded.add(id):expanded.delete(id);}, {signal,capture:true});
    root.addEventListener('click',async event=>{
      const button=event.target.closest('[data-user-action]');if(!button||button.disabled||busy||stale)return;const user=users.find(row=>row.id===button.dataset.userId);if(!user)return;
      const action=button.dataset.userAction;if(action==='edit'){editor(user);return;}
      let code=null;
      if(action==='reset'){code=await appPrompt('Nouveau code de 8 chiffres pour « '+user.username+' ».','',{title:'Réinitialiser le code',inputType:'password',confirmLabel:'Continuer'});if(code===null)return;}
      const labels={disconnect:'Déconnecter toutes les sessions',toggle:user.disabled?'Activer':'Désactiver',reset:'Réinitialiser le code',delete:'Supprimer définitivement'};
      if(!await appConfirm(labels[action]+' de « '+user.username+' » ?'+(['toggle','reset','delete'].includes(action)?' Les sessions concernées seront coupées.':''),{title:'Gestion de '+user.username,confirmLabel:labels[action],danger:action!=='toggle'||!user.disabled})||!live()||busy){code='';return;}
      busy=true;render();feedback('');feedback('',true);
      try{const path=action==='reset'?'reset-code':action==='toggle'?'update':action;const value=action==='toggle'?{id:user.id,username:user.username,role:user.role,disabled:!user.disabled}:action==='reset'?{id:user.id,code}:{id:user.id};const result=await request('/'+path,value);if(!live())return;if(result.reconnect){await lockApplication();return;}feedback('Action effectuée pour '+user.username+'.');}
      catch(error){feedback(error.message,true);}
      finally{code='';busy=false;if(live())await refresh();}
    },{signal});
    async function poll(){try{await refresh();}finally{if(live())timer=setTimeout(poll,15000);}}poll();
  }
  return {mount,unmount};
})();
