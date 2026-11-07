'use strict';

const workspaceAccess=(()=>{
  let generation=0,timer=0,controller=null;
  function unmount(){generation++;clearTimeout(timer);timer=0;controller?.abort();controller=null;}
  function mount(root){
    unmount();const token=generation,key=state.vaultKey;controller=new AbortController();const signal=controller.signal;
    const live=()=>generation===token&&root.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    const cloud=()=>typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud;
    const available=()=>!!(cloud()?.enabled&&cloud().hasSession());
    const request=(path,value)=>cloud().agentRequest('access'+path,value,{signal});
    const find=selector=>root.querySelector(selector);
    let data=null,busy=false,refreshing=null,stale=true;
    root.innerHTML='<header class="settings-panel-head"><div class="settings-heading">'+settingsIcon('key-round')+'<h3>Accès</h3></div><button type="button" class="settings-btn settings-btn-icon" id="wgAccessRefresh" aria-label="Actualiser les connexions" title="Actualiser les connexions">'+settingsIcon('refresh-cw')+'</button></header><p class="access-intro">Chaque connexion est rattachée à un utilisateur, son navigateur et son adresse IP.</p><p class="access-permissions">Cette gestion est réservée aux administrateurs.</p><p id="wgAccessError" class="access-error" role="alert"></p><p id="wgAccessStatus" class="access-feedback" role="status" aria-live="polite"></p><section class="access-section" aria-labelledby="wgAccessConnectionsTitle"><div class="access-section-heading"><h4 id="wgAccessConnectionsTitle">Connexions</h4><span id="wgAccessCount"></span></div><p id="wgAccessIP" class="access-help"></p><div id="wgAccessConnections" class="access-list"><p>Chargement des connexions…</p></div></section><section class="access-section" aria-labelledby="wgAccessBlocksTitle"><div class="access-section-heading"><h4 id="wgAccessBlocksTitle">Adresses IP bloquées</h4><span id="wgAccessBlockCount"></span></div><form id="wgAccessBlockForm" class="access-block-form"><label for="wgAccessBlockIP">Bloquer une adresse IP</label><div><input id="wgAccessBlockIP" type="text" maxlength="64" placeholder="IPv4 ou IPv6" autocomplete="off" spellcheck="false" required><button type="submit" class="settings-btn" id="wgAccessBlockSubmit">Bloquer l’IP</button></div></form><p class="access-help">Bloquer une IP coupe ses connexions et empêche une nouvelle connexion. Une IP peut être commune à plusieurs personnes. Ta propre IP reste protégée contre le blocage.</p><div id="wgAccessBlocks" class="access-list"><p>Chargement des blocages…</p></div></section>';
    function feedback(message,error=false){if(live())find(error?'#wgAccessError':'#wgAccessStatus').textContent=message;}
    const date=value=>value?new Date(value).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'Non renseigné';
    function render(){
      if(!live())return;
      const disabled=busy||stale||!available()||!cloud()?.isAdmin();
      find('#wgAccessBlockSubmit').disabled=disabled;find('#wgAccessBlockIP').disabled=disabled;
      if(!data)return;
      find('#wgAccessCount').textContent=data.connections.length+' session'+(data.connections.length>1?'s':'');
      find('#wgAccessBlockCount').textContent=String(data.blocks.length);
      find('#wgAccessIP').textContent=data.currentIP?'Ton IP : '+data.currentIP:'L’hébergement ne transmet pas l’IP de cette connexion. Les sessions restent déconnectables.';
      const focused=document.activeElement,focusAction=focused?.dataset.accessAction,focusId=focused?.dataset.accessId;
      find('#wgAccessConnections').innerHTML=data.connections.map(row=>'<article class="access-card" data-access-session="'+esc(row.id||'')+'"><div class="access-card-heading"><strong>'+esc(row.username||row.device)+'</strong><span class="access-device">'+esc(row.device)+'</span>'+(row.current?'<span class="access-badge">Cet onglet</span>':'')+'<span class="access-presence" data-online="'+row.online+'">'+(stale?'État non confirmé':row.online?'En ligne':'Inactive')+'</span></div><code class="access-ip">'+esc(row.ip||'IP non disponible')+'</code><p class="access-details">Connexion : '+esc(date(row.createdAt))+'<br>Dernière activité : '+esc(date(row.lastSeen))+'</p><div class="access-actions"><button type="button" class="settings-btn" data-access-action="disconnect" data-access-id="'+esc(row.id||'')+'" '+(disabled||!row.id?'disabled':'')+'>'+(row.current?'Déconnecter cet onglet':'Déconnecter')+'</button><button type="button" class="settings-btn access-danger" data-access-action="block" data-access-id="'+esc(row.id||'')+'" '+(disabled||!row.ip||row.sameIP||row.current?'disabled':'')+' title="'+(row.sameIP||row.current?'Cette IP est utilisée par ta connexion':'Couper les connexions et bloquer cette IP')+'">Bloquer l’IP</button>'+(row.sameIP&&!row.current?'<small>Même IP que toi</small>':'')+'</div></article>').join('')||'<p class="access-empty">Aucune connexion active.</p>';
      find('#wgAccessBlocks').innerHTML=data.blocks.map(row=>'<article class="access-card access-blocked"><div><code class="access-ip">'+esc(row.ip)+'</code><p class="access-details">Bloquée le '+esc(date(row.createdAt))+'</p></div><button type="button" class="settings-btn" data-access-action="unblock" data-access-id="'+esc(row.id)+'" '+(disabled?'disabled':'')+'>Débloquer</button></article>').join('')||'<p class="access-empty">Aucune adresse IP bloquée.</p>';
      if(focusAction&&focusId){const button=[...root.querySelectorAll('[data-access-action]')].find(button=>button.dataset.accessAction===focusAction&&button.dataset.accessId===focusId);if(button&&!button.disabled)button.focus({preventScroll:true});}
    }
    async function refresh({clearError=true}={}){
      if(!live()||busy)return;if(refreshing)return refreshing;
      if(!available()){find('#wgAccessConnections').textContent='La gestion des accès est disponible dans l’espace partagé en ligne.';find('#wgAccessBlocks').textContent='Connecte cet espace au service partagé.';render();return;}
      find('#wgAccessRefresh').disabled=true;
      refreshing=(async()=>{
        try{const result=await request('');if(!live())return;data=result;stale=false;if(clearError)feedback('',true);render();}
        catch(error){if(live()){stale=true;feedback('Les accès n’ont pas pu être actualisés. '+error.message,true);if(!data){find('#wgAccessConnections').textContent='Connexions indisponibles.';find('#wgAccessBlocks').textContent='Blocages indisponibles.';}render();}}
        finally{if(live())find('#wgAccessRefresh').disabled=false;}
      })();
      try{await refreshing;}finally{refreshing=null;}
    }
    async function perform(action,value,label){
      if(busy||!live()||stale)return;
      const message=action==='disconnect'?'Déconnecter '+label+' ? Cette session devra saisir le code à nouveau.':action==='block'?'Bloquer l’IP '+label+' ? Toutes ses connexions seront coupées et elle ne pourra plus se reconnecter.':'Débloquer l’IP '+label+' ? Une nouvelle connexion avec le code sera autorisée.';
      if(!await appConfirm(message,{title:action==='block'?'Bloquer une IP':action==='unblock'?'Débloquer une IP':'Déconnecter une session',confirmLabel:action==='block'?'Bloquer':action==='unblock'?'Débloquer':'Déconnecter',danger:action!=='unblock'})||!live()||busy)return;
      busy=true;feedback('');feedback('',true);render();
      try{const result=await request('/'+action,value);if(!live())return;if(result.current){await lockApplication();return;}feedback(action==='block'?'IP bloquée et connexions coupées.':action==='unblock'?'IP débloquée. Les anciennes sessions restent déconnectées.':'Session déconnectée.');if(action==='block')find('#wgAccessBlockIP').value='';}
      catch(error){feedback(error.message,true);}
      finally{busy=false;if(live())await refresh({clearError:false});}
    }
    root.addEventListener('click',event=>{
      const button=event.target.closest('[data-access-action]');if(!button||button.disabled||!data)return;
      const action=button.dataset.accessAction,id=button.dataset.accessId;
      if(action==='unblock'){const row=data.blocks.find(row=>row.id===id);if(row)perform(action,{id},row.ip);}
      else{const row=data.connections.find(row=>row.id===id);if(row)perform(action,action==='block'?{ip:row.ip}:{id},action==='block'?row.ip:row.current?'cet onglet':row.device+' · '+(row.ip||'IP non disponible'));}
    },{signal});
    find('#wgAccessBlockForm').onsubmit=event=>{event.preventDefault();const ip=find('#wgAccessBlockIP').value.trim();if(ip)perform('block',{ip},ip);};
    find('#wgAccessRefresh').onclick=refresh;
    async function poll(){try{await refresh();}finally{if(live())timer=setTimeout(poll,15000);}}
    render();poll();
  }
  return {mount,unmount};
})();
