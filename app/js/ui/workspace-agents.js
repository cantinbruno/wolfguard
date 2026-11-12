'use strict';

// Agent selection is common to scans and desktop in the current session.
const workspaceAgents = (() => {
  const downloadRevision=new URL(document.currentScript?.src||location.href).searchParams.get('wg')||'network-target-v1';
  const platformNames = {win32:'Windows',linux:'Linux',darwin:'macOS'};
  const downloads = {
    win32:{name:'Windows',file:'WolfGuard-Agent-Windows.exe',help:'Windows 10 / 11 · x64',instruction:'Ouvre le fichier téléchargé. L’agent démarre et s’associe automatiquement à ton espace, puis se lance au démarrage de Windows. Aucun code à saisir.'},
    linux:{name:'Linux',file:'WolfGuard-Agent-Linux.zip',help:'x64 / ARM64 · glibc',instruction:'Extrais l’archive et lance sh Start-Agent.sh : l’agent s’associe automatiquement à ton espace et démarre en arrière-plan.'},
    darwin:{name:'macOS',file:'WolfGuard-Agent-macOS.zip',help:'Intel / Apple Silicon',instruction:'Extrais l’archive et ouvre Start-Agent.command : l’agent s’associe automatiquement à ton espace et démarre en arrière-plan.'}
  };
  const platformIcon = value => value==='win32'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m3 5 8-1v7H3Zm10-1 8-1v8h-8ZM3 13h8v7l-8-1Zm10 0h8v8l-8-1Z"/></svg>':value==='darwin'?'<span aria-hidden="true">⌘</span>':value==='linux'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3m6 0h4"/></svg>':settingsIcon('monitor');
  let timer=0,generation=0;
  const cloud=()=>typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud;
  const available=()=>!!(cloud()?.enabled&&cloud().hasSession());
  const platformName=value=>platformNames[value]||'Système non renseigné';
  function unmount(){clearTimeout(timer);timer=0;generation++;}
  async function snapshot(){
    if(!available())return {agents:[],selected:null};
    const key=state.vaultKey,response=await cloud().agentRequest('agents'),saved=await setting('scanAgentId','');
    if(!available()||state.vaultKey!==key)throw new Error('Espace verrouillé.');
    const agents=response.agents||[],selected=saved?agents.find(agent=>agent.id===saved):agents.at(-1);
    return {agents,selected:selected||null};
  }
  function mount(root){
    unmount();const token=generation,key=state.vaultKey;
    const live=()=>generation===token&&root.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    const find=selector=>root.querySelector(selector),admin=()=>!!cloud()?.isAdmin();
    let agents=[],selected=null,busy=false,refreshing=null,firstLoad=true,stale=false,tab='fleet',expanded='',expiresAt=0,shareExpiresAt=0,knownIds=new Set(),listHTML='',pickerHTML='';
    root.innerHTML=`<header class="settings-panel-head agent-manager-heading"><div><div class="settings-heading">${settingsIcon('monitor')}<h3>Agents</h3></div><p>Le poste utilisé pour les scans et la prise en main.</p></div><button type="button" class="settings-btn settings-btn-icon" id="wgAgentRefresh" aria-label="Actualiser les postes" title="Actualiser">${settingsIcon('refresh-cw')}</button></header>
      <section class="agent-manager-current" aria-labelledby="wgAgentCurrentTitle"><span class="agent-manager-current-icon" aria-hidden="true">${settingsIcon('monitor')}</span><div class="agent-manager-current-copy"><span class="agent-manager-eyebrow">POSTE UTILISÉ</span><h4 id="wgAgentCurrentTitle">Chargement…</h4><p id="wgAgentCurrentDetail">Recherche de tes postes associés.</p></div><span id="wgAgentSettingsPresence" class="agent-manager-presence" data-state="loading" role="status">Chargement…</span><label class="agent-manager-switch"><span>Changer de poste</span><select id="wgAgentSelect" class="settings-select" disabled><option>Chargement…</option></select></label></section>
      <p id="wgAgentConnectionNotice" class="settings-agent-notice" role="status" hidden></p><p id="wgAgentSetupError" class="settings-agent-error" role="alert"></p><p id="wgAgentSetupStatus" role="status" aria-live="polite"></p>
      <nav class="agent-manager-tabs" role="tablist" aria-label="Gestion des agents"><button type="button" role="tab" id="wgAgentTab-fleet" data-agent-tab="fleet" aria-controls="wgAgentFleetPanel" aria-selected="true">Mes postes <span id="wgAgentCount">—</span></button><button type="button" role="tab" id="wgAgentAdd" data-agent-tab="connect" aria-controls="wgAgentConnect" aria-selected="false" tabindex="-1">${settingsIcon('download')}Ajouter un poste</button></nav>
      <section id="wgAgentFleetPanel" role="tabpanel" aria-labelledby="wgAgentTab-fleet"><div class="agent-manager-list-heading"><span>POSTES ASSOCIÉS</span><span id="wgAgentFleetSummary">Chargement…</span></div><div id="wgAgentManage" class="agent-manager-list"><p class="settings-agent-note">Chargement des postes…</p></div><p class="agent-manager-list-note">Le poste utilisé est commun aux scans passif, actif, cartographie et vulnérabilités.</p></section>
      <section id="wgAgentConnect" role="tabpanel" aria-labelledby="wgAgentAdd" hidden><div class="agent-manager-install-head"><h4>Ajouter un poste</h4><p>Un installateur personnel, aucune saisie de code.</p></div><div class="agent-manager-platforms" role="group" aria-label="Système du poste">${Object.entries(downloads).map(([id,item])=>'<button type="button" class="agent-manager-platform" data-agent-platform="'+id+'" aria-pressed="false">'+platformIcon(id)+'<span>'+item.name+'</span></button>').join('')}</div><input type="hidden" id="wgAgentPlatform"><section class="agent-manager-install-step"><h4>Installer et associer</h4><p id="wgAgentInstructions"></p><div class="agent-manager-install-actions"><button type="button" class="settings-btn primary" id="wgAgentPair">Télécharger l’installateur personnel</button><button type="button" class="settings-btn" id="wgAgentShare">Créer un lien de téléchargement</button></div><div id="wgAgentShareLink" class="agent-manager-share" hidden><label for="wgAgentShareURL">Lien à ouvrir sur le poste à ajouter</label><input id="wgAgentShareURL" type="url" readonly spellcheck="false"><button type="button" class="settings-btn" id="wgAgentShareCopy">Copier le lien</button><p id="wgAgentShareExpiry"></p><p>Valable dix minutes pour associer un seul poste, sans code à saisir.</p></div><div id="wgAgentPairCode" class="agent-manager-pair" hidden><small></small><a class="settings-btn" id="wgAgentConnectPair">Associer un agent déjà installé</a><progress id="wgAgentPairProgress" max="600" value="600" aria-label="Durée de validité"></progress><p id="wgAgentPairFeedback" role="status"></p></div><div id="wgAgentNewPost" class="agent-manager-new-post" hidden><div><strong></strong><p>Le poste est prêt.</p></div><button type="button" class="settings-btn" id="wgAgentViewPosts">Voir mes postes</button></div><p id="wgAgentCapacity" class="settings-agent-notice" hidden>Limite de 200 postes atteinte.</p><details><summary>Fichiers d’installation et mise à jour</summary><small id="wgAgentDownloadHelp"></small><a id="wgAgentDownload" class="settings-btn" download></a></details></section><section class="agent-manager-install-step"><h4>Retirer l’agent Windows</h4><p>Exécute ce fichier sur le poste à désinstaller.</p><a id="wgAgentUninstall" class="settings-btn" download href="downloads/WolfGuard-Agent-Uninstall.cmd">Télécharger le désinstalleur</a></section></section>`;
    const error=message=>{if(live())find('#wgAgentSetupError').textContent=message;};
    const status=message=>{if(live())find('#wgAgentSetupStatus').textContent=message;};
    const platform=find('#wgAgentPlatform');
    platform.value=/Mac/i.test(navigator.userAgentData?.platform||navigator.platform)?'darwin':/Linux/i.test(navigator.userAgentData?.platform||navigator.platform)?'linux':'win32';
    function showDownload(){
      const item=downloads[platform.value],link=find('#wgAgentDownload');
      if(find('#wgAgentShareLink').dataset.platform!==platform.value){shareExpiresAt=0;find('#wgAgentShareLink').hidden=true;find('#wgAgentShareURL').value='';}
      find('#wgAgentConnectPair').hidden=false;
      link.href='downloads/'+item.file+'?v='+encodeURIComponent(downloadRevision);link.innerHTML=settingsIcon('download')+'Télécharger pour '+item.name;
      find('#wgAgentDownloadHelp').textContent=item.help;find('#wgAgentInstructions').textContent=item.instruction;
      for(const button of root.querySelectorAll('[data-agent-platform]'))button.setAttribute('aria-pressed',String(button.dataset.agentPlatform===platform.value));
    }
    for(const button of root.querySelectorAll('[data-agent-platform]'))button.onclick=()=>{platform.value=button.dataset.agentPlatform;showDownload();};
    showDownload();
    function showTab(value,focus=false){
      tab=value;
      for(const button of root.querySelectorAll('[data-agent-tab]')){const active=button.dataset.agentTab===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;if(active&&focus)button.focus({preventScroll:true});}
      find('#wgAgentFleetPanel').hidden=tab!=='fleet';find('#wgAgentConnect').hidden=tab!=='connect';
    }
    for(const button of root.querySelectorAll('[data-agent-tab]'))button.onclick=()=>showTab(button.dataset.agentTab);
    find('.agent-manager-tabs').onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();showTab(event.key==='Home'?'fleet':event.key==='End'?'connect':tab==='fleet'?'connect':'fleet',true);};
    find('#wgAgentViewPosts').onclick=()=>showTab('fleet',true);
    const lastSeen=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'Non renseignée':date.toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',year:'numeric'});};
    function clearCode(){const area=find('#wgAgentPairCode');area.hidden=true;expiresAt=0;find('#wgAgentConnectPair').removeAttribute('href');find('#wgAgentPair').textContent='Télécharger l’installateur personnel';}
    function updatePairing(){
      if(shareExpiresAt){
        const remaining=Math.max(0,Math.ceil((shareExpiresAt-Date.now())/1000));
        find('#wgAgentShareExpiry').textContent=remaining?'Expire dans '+Math.floor(remaining/60)+' min '+String(remaining%60).padStart(2,'0')+' s':'Lien expiré. Crée un nouveau lien.';
        find('#wgAgentShareCopy').disabled=!remaining;
        if(!remaining)find('#wgAgentShareURL').value='';
      }
      if(!expiresAt)return;
      const remaining=Math.max(0,Math.ceil((expiresAt-Date.now())/1000));
      if(!remaining){clearCode();status('Le code d’association a expiré. Tu peux en générer un nouveau.');return;}
      find('#wgAgentPairCode small').textContent=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
      find('#wgAgentPairProgress').value=Math.min(600,remaining);
    }
    function renderAgents(){
      const presence=find('#wgAgentSettingsPresence'),picker=find('#wgAgentSelect');
      presence.dataset.state=stale?'unknown':selected?selected.online?'online':'offline':'empty';
      presence.textContent=stale?'À vérifier':selected?selected.online?'Connecté':'Hors ligne':'Aucun poste';
      find('#wgAgentCurrentTitle').textContent=selected?.name||'Aucun poste choisi';
      find('#wgAgentCurrentDetail').textContent=selected?platformName(selected.platform)+' · '+(stale?'État indisponible':selected.online?'Prêt pour les scans':'Démarre l’agent sur ce poste'):agents.length?'Choisis un poste dans la liste.':'Ajoute un poste pour lancer tes scans.';
      find('.agent-manager-current-icon').innerHTML=platformIcon(selected?.platform);
      find('#wgAgentCount').textContent=String(agents.length);
      const online=agents.filter(agent=>agent.online).length;
      find('#wgAgentFleetSummary').textContent=(stale?'État indisponible':online+' connecté'+(online>1?'s':''))+' · '+agents.length+' / 200 postes';
      const choices='<option value="" disabled>Choisir un poste</option>'+agents.map(agent=>'<option value="'+esc(agent.id)+'">'+esc(agent.name)+' · '+platformName(agent.platform)+'</option>').join('');
      if(choices!==pickerHTML){picker.innerHTML=choices;pickerHTML=choices;}
      picker.value=selected?.id||'';picker.disabled=busy||!available()||!agents.length;
      const ordered=[...agents].sort((a,b)=>Number(b.id===selected?.id)-Number(a.id===selected?.id)||Number(b.online)-Number(a.online));
      const html=ordered.map(agent=>{
        const chosen=selected?.id===agent.id,open=expanded===agent.id,audit=agent.capabilities?.includes('security-audit-v1'),network=agent.capabilities?.includes('network-scan-v3'),desktop=agent.capabilities?.includes('remote-desktop-v1');
        return '<article class="agent-manager-machine" data-agent-id="'+esc(agent.id)+'" data-selected="'+chosen+'"><div class="agent-manager-machine-row"><span class="agent-manager-platform-icon" aria-hidden="true">'+platformIcon(agent.platform)+'</span><div class="agent-manager-machine-copy"><div><strong>'+esc(agent.name)+'</strong>'+(chosen?'<span class="agent-manager-selected">Utilisé</span>':'')+'</div><small>'+platformName(agent.platform)+(!network?' · Scans réseau à mettre à jour':audit?'':' · Audit à mettre à jour')+'</small></div><span class="agent-manager-presence" data-state="'+(stale?'unknown':agent.online?'online':'offline')+'">'+(stale?'À vérifier':agent.online?'Connecté':'Hors ligne')+'</span><div class="agent-manager-actions"><button type="button" class="settings-btn" data-agent-use="'+esc(agent.id)+'" '+(chosen||busy?'disabled':'')+'>'+(chosen?'Utilisé':'Utiliser')+'</button><button type="button" class="settings-btn settings-btn-icon" data-agent-details="'+esc(agent.id)+'" aria-label="Détails de '+esc(agent.name)+'" aria-expanded="'+open+'" aria-controls="wgAgentInfo-'+esc(agent.id)+'">'+settingsIcon(open?'x':'sliders-horizontal')+'</button></div></div><div class="agent-manager-machine-details" id="wgAgentInfo-'+esc(agent.id)+'" '+(open?'':'hidden')+'><dl><div><dt>Système</dt><dd>'+platformName(agent.platform)+'</dd></div><div><dt>Dernière connexion</dt><dd>'+esc(lastSeen(agent.lastSeen))+'</dd></div><div><dt>Scans réseau actif / passif</dt><dd>'+(network?'Pris en charge':'Mise à jour de l’agent nécessaire')+'</dd></div><div><dt>Audit de sécurité</dt><dd>'+(audit?'Pris en charge':'Mise à jour de l’agent nécessaire')+'</dd></div><div><dt>Prise en main du bureau</dt><dd>'+(desktop?'Prise en charge':'Mise à jour de l’agent nécessaire')+'</dd></div><div><dt>Utilisation</dt><dd>'+(chosen?'Poste commun aux scans et à la prise en main':'Poste disponible')+'</dd></div></dl>'+(!agent.online?'<p class="agent-manager-offline-help">Ouvre WolfGuard Agent sur ce poste et vérifie sa connexion à Internet.</p>':'')+(!audit||!network||!desktop?'<button type="button" class="settings-btn" data-agent-update="'+esc(agent.platform)+'">'+settingsIcon('download')+'Installer la dernière version</button>':'')+(admin()||cloud()?.currentUser()?.permissions?.admin?'<label class="users-checkbox"><input type="checkbox" data-agent-restricted="'+esc(agent.id)+'" '+(agent.restricted?'checked':'')+' '+(busy?'disabled':'')+'>Restreint · visible uniquement par les administrateurs</label>':'')+'<div class="agent-manager-revoke-row"><p>Retirer ce poste coupe son accès et arrête ses scans et partages en cours.</p><button type="button" class="settings-btn agent-manager-revoke" data-agent-revoke="'+esc(agent.id)+'" '+(busy?'disabled':'')+'>Révoquer l’accès</button></div></div></article>';
      }).join('')||'<div class="agent-manager-empty">'+settingsIcon('monitor')+'<strong>Ton premier poste, en quelques étapes</strong><p>Associe un poste Windows, Linux ou macOS pour exécuter tes scans depuis cet espace.</p><button type="button" class="settings-btn primary" data-agent-start>Connecter un poste</button></div>';
      if(html!==listHTML){
        const focused=document.activeElement,focusId=focused?.dataset.agentDetails||focused?.dataset.agentUse,action=focused?.hasAttribute('data-agent-details')?'details':'use';
        find('#wgAgentManage').innerHTML=html;listHTML=html;
        if(focusId){const target=[...root.querySelectorAll('[data-agent-'+action+']')].find(button=>button.dataset[action==='details'?'agentDetails':'agentUse']===focusId);if(target&&!target.disabled)target.focus({preventScroll:true});}
      }
      const limit=agents.length>=200;find('#wgAgentCapacity').hidden=!limit;
      find('#wgAgentAdd').hidden=!(admin()||cloud()?.can?.('agents.pair'));
      find('#wgAgentPair').disabled=busy||!available()||limit||!(admin()||cloud()?.can?.('agents.pair'));
      find('#wgAgentShare').disabled=find('#wgAgentPair').disabled;
      for(const button of root.querySelectorAll('[data-agent-revoke]'))button.disabled=busy||!(admin()||cloud()?.can?.('agents.revoke'));
      for(const button of root.querySelectorAll('[data-agent-start]'))button.hidden=!(admin()||cloud()?.can('agents.pair'));
      if(firstLoad){showTab(agents.length||!admin()?'fleet':'connect');firstLoad=false;}
    }
    async function refresh(){
      if(!live()||busy)return;
      if(refreshing)return refreshing;
      find('#wgAgentRefresh').disabled=true;
      refreshing=(async()=>{
        try{
          const data=await snapshot();if(!live())return;
          const added=!firstLoad?data.agents.filter(agent=>!knownIds.has(agent.id)):[];
          agents=data.agents;selected=data.selected;knownIds=new Set(agents.map(agent=>agent.id));stale=false;
          find('#wgAgentConnectionNotice').hidden=true;
          if(added.length){find('#wgAgentNewPost').hidden=false;find('#wgAgentNewPost strong').textContent=added[0].name+' est maintenant associé';}
          renderAgents();
          WolfGuardAgentUpdates.automatic(agents,{onChange:()=>{if(live())renderAgents();}});
        }catch(exception){
          if(!live())return;stale=true;const notice=find('#wgAgentConnectionNotice');notice.hidden=false;notice.textContent='Connexion au service indisponible. '+exception.message;
          if(firstLoad){showTab('connect');find('#wgAgentManage').textContent='Les postes n’ont pas pu être chargés.';}
          else renderAgents();
          find('#wgAgentSettingsPresence').dataset.state='unknown';find('#wgAgentSettingsPresence').textContent='À vérifier';
        }finally{if(live())find('#wgAgentRefresh').disabled=false;}
      })();
      try{await refreshing;}finally{refreshing=null;}
    }
    root.addEventListener('change',async event=>{const input=event.target.closest('[data-agent-restricted]');if(!input||busy)return;busy=true;try{await cloud().agentRequest('agents/restricted',{id:input.dataset.agentRestricted,restricted:input.checked});status('Visibilité du poste enregistrée.');}catch(exception){error(exception.message);}finally{busy=false;await refresh();}});
    find('#wgAgentRefresh').onclick=refresh;
    async function choose(id){
      if(busy||!live()||!agents.some(agent=>agent.id===id))return;
      busy=true;renderAgents();error('');
      try{await setSetting('scanAgentId',id);status('Agent commun enregistré pour toutes les sections'+(cloud()?.enabled?' de cet onglet.':'.'));}
      catch(exception){error(exception.message);}
      finally{busy=false;if(live()){await refresh();const card=[...root.querySelectorAll('[data-agent-id]')].find(node=>node.dataset.agentId===id);if(card&&selected?.id===id){card.tabIndex=-1;card.focus({preventScroll:true});}}}
    }
    find('#wgAgentSelect').onchange=event=>choose(event.target.value);
    find('#wgAgentManage').onclick=async event=>{
      const use=event.target.closest('[data-agent-use]');if(use){await choose(use.dataset.agentUse);return;}
      const details=event.target.closest('[data-agent-details]');if(details){expanded=expanded===details.dataset.agentDetails?'':details.dataset.agentDetails;renderAgents();return;}
      if(event.target.closest('[data-agent-start]')){showTab('connect',true);return;}
      const update=event.target.closest('[data-agent-update]');if(update){if(downloads[update.dataset.agentUpdate]){platform.value=update.dataset.agentUpdate;showDownload();}showTab('connect',true);return;}
      const revoke=event.target.closest('[data-agent-revoke]');if(!revoke||busy)return;
      const id=revoke.dataset.agentRevoke,name=agents.find(agent=>agent.id===id)?.name||'ce poste';
      if(!await appConfirm('Révoquer l’accès de « '+name+' » et arrêter ses scans en cours ?',{title:'Révoquer ce poste',confirmLabel:'Révoquer l’accès',danger:true})||!live()||busy)return;
      busy=true;renderAgents();error('');
      try{await cloud().agentRequest('agents/revoke',{id});if(!live())return;if(selected?.id===id)await setSetting('scanAgentId','');expanded='';status('Accès du poste retiré pour toutes les sections.');}
      catch(exception){error(exception.message);}
      finally{busy=false;if(live())await refresh();}
    };
    find('#wgAgentPair').disabled=!available();
    find('#wgAgentShare').disabled=!available();
    find('#wgAgentShareCopy').onclick=async()=>{
      if(!live()||Date.now()>=shareExpiresAt)return;
      const input=find('#wgAgentShareURL'),copied=await copyText(input.value);
      if(!live())return;
      if(copied)status('Lien de téléchargement copié.');
      else{input.focus();input.select();status('Sélectionne et copie le lien de téléchargement.');}
    };
    async function prepareInstaller(share){
      if(busy||!live()||!(admin()||cloud()?.can?.('agents.pair')))return;
      const target=platform.value;busy=true;renderAgents();error('');
      try{
        const pairing=await cloud().agentRequest('agents/pair',{});
        if(!live())return;
        if(!/^[a-f0-9]{32}$/.test(pairing.code)||!Number.isSafeInteger(pairing.expiresAt))throw new Error('Association invalide.');
        if(platform.value!==target)throw new Error('Le système a changé. Recommence pour le système choisi.');
        if(share){
          const link=new URL('agent-download.html',location.href);link.searchParams.set('v',downloadRevision);
          link.hash=new URLSearchParams({code:pairing.code,platform:target,expires:String(pairing.expiresAt)}).toString();
          find('#wgAgentShareURL').value=link.href;
          find('#wgAgentShareLink').dataset.platform=target;find('#wgAgentShareLink').hidden=false;
          shareExpiresAt=pairing.expiresAt;updatePairing();status('Lien prêt pour un poste '+downloads[target].name+'.');
        }else{
          const installer=await WolfGuardAgentInstaller.prepare(target,pairing.code);
          if(!live())return;
          WolfGuardAgentInstaller.download(installer);
          find('#wgAgentPairCode').hidden=false;find('#wgAgentConnectPair').href='wolfguard-agent://pair?code='+pairing.code;
          find('#wgAgentConnectPair').hidden=target!=='win32';
          find('#wgAgentPairFeedback').textContent=target==='win32'?'Ouvre Installer-WolfGuard.cmd sur le poste.':'Sur le poste, lance sh Installer-WolfGuard.sh.';
          expiresAt=pairing.expiresAt;updatePairing();
        }
      }catch(exception){error(exception.message);}finally{busy=false;if(live())await refresh();}
    }
    find('#wgAgentPair').onclick=()=>prepareInstaller(false);
    find('#wgAgentShare').onclick=()=>prepareInstaller(true);
    async function poll(){if(live())updatePairing();await refresh();if(live())timer=setTimeout(poll,3000);}
    if(available())poll();else{renderAgents();find('#wgAgentCurrentDetail').textContent='L’association est disponible sur le site après saisie de ton code.';}
  }
  return {mount,unmount,snapshot,platformName,available};
})();

async function openAgentsInterface(){
  if($('#app').classList.contains('hidden'))return;
  modal('Agents','<button type="button" class="settings-btn settings-btn-icon settings-close" id="closeAgentsBtn" aria-label="Fermer les agents">'+settingsIcon('x')+'</button><div class="agents-dialog-content"><section id="settings-agents"></section></div>');
  const dialog=$('#modalRoot .modal');dialog.classList.add('settings-modal','agents-modal');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.querySelector('h2').id='agentsTitle';dialog.setAttribute('aria-labelledby','agentsTitle');dialog.parentElement.classList.add('settings-wrap');
  const close=()=>{closeModal();($('#agentsManage') || $('#securityBtn'))?.focus();};$('#closeAgentsBtn').onclick=close;dialog.parentElement.onclick=event=>{if(event.target===dialog.parentElement)close();};
  dialog.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')].filter(node=>node.getClientRects().length&&node.tabIndex!==-1),first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}};
  workspaceAgents.mount($('#settings-agents'));$('#closeAgentsBtn').focus();
}
