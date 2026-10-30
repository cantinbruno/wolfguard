'use strict';

// Agent selection belongs to the encrypted workspace, shared by all scans.
const workspaceAgents = (() => {
  const downloadRevision=new URL(document.currentScript?.src||location.href).searchParams.get('wg')||'network-scan-v2';
  const platformNames = {win32:'Windows',linux:'Linux',darwin:'macOS'};
  const downloads = {
    win32:{name:'Windows',file:'WolfGuard-Agent-Windows.exe',help:'Windows 10 / 11 · x64',instruction:'Ouvre le fichier téléchargé, puis colle le code dans la fenêtre WolfGuard Agent.'},
    linux:{name:'Linux',file:'WolfGuard-Agent-Linux.zip',help:'x64 / ARM64 · glibc',instruction:'Extrais l’archive, ouvre un terminal dans le dossier et lance sh Start-Agent.sh. Colle ensuite le code demandé.'},
    darwin:{name:'macOS',file:'WolfGuard-Agent-macOS.zip',help:'Intel / Apple Silicon',instruction:'Extrais l’archive et ouvre Start-Agent.command, ou lance sh Start-Agent.sh dans le terminal. Colle ensuite le code demandé.'}
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
    const find=selector=>root.querySelector(selector);
    let agents=[],selected=null,busy=false,refreshing=null,firstLoad=true,stale=false,tab='fleet',expanded='',expiresAt=0,knownIds=new Set(),listHTML='',pickerHTML='';
    root.innerHTML=`<header class="settings-panel-head agent-manager-heading"><div><div class="settings-heading">${settingsIcon('monitor')}<h3>Agents</h3></div><p>Un poste commun pour les quatre scans.</p></div><button type="button" class="settings-btn settings-btn-icon" id="wgAgentRefresh" aria-label="Actualiser les postes" title="Actualiser">${settingsIcon('refresh-cw')}</button></header>
      <section class="agent-manager-current" aria-labelledby="wgAgentCurrentTitle"><span class="agent-manager-current-icon" aria-hidden="true">${settingsIcon('monitor')}</span><div class="agent-manager-current-copy"><span class="agent-manager-eyebrow">POSTE UTILISÉ</span><h4 id="wgAgentCurrentTitle">Chargement…</h4><p id="wgAgentCurrentDetail">Recherche de tes postes associés.</p></div><span id="wgAgentSettingsPresence" class="agent-manager-presence" data-state="loading" role="status">Chargement…</span><label class="agent-manager-switch"><span>Changer de poste</span><select id="wgAgentSelect" class="settings-select" disabled><option>Chargement…</option></select></label></section>
      <p id="wgAgentConnectionNotice" class="settings-agent-notice" role="status" hidden></p><p id="wgAgentSetupError" class="settings-agent-error" role="alert"></p><p id="wgAgentSetupStatus" role="status" aria-live="polite"></p>
      <nav class="agent-manager-tabs" role="tablist" aria-label="Gestion des agents"><button type="button" role="tab" id="wgAgentTab-fleet" data-agent-tab="fleet" aria-controls="wgAgentFleetPanel" aria-selected="true">Mes postes <span id="wgAgentCount">—</span></button><button type="button" role="tab" id="wgAgentAdd" data-agent-tab="connect" aria-controls="wgAgentConnect" aria-selected="false" tabindex="-1">${settingsIcon('download')}Ajouter un poste</button></nav>
      <section id="wgAgentFleetPanel" role="tabpanel" aria-labelledby="wgAgentTab-fleet"><div class="agent-manager-list-heading"><span>POSTES ASSOCIÉS</span><span id="wgAgentFleetSummary">Chargement…</span></div><div id="wgAgentManage" class="agent-manager-list"><p class="settings-agent-note">Chargement des postes…</p></div><p class="agent-manager-list-note">Le poste utilisé est commun aux scans passif, actif, cartographie et vulnérabilités.</p></section>
      <section id="wgAgentConnect" role="tabpanel" aria-labelledby="wgAgentAdd" hidden><div class="agent-manager-install-head"><h4>Connecter un poste</h4><p>Installe l’agent sur un poste du réseau à observer, puis associe-le à ton espace.</p></div><div class="agent-manager-platforms" role="group" aria-label="Système du poste">${Object.entries(downloads).map(([id,item])=>'<button type="button" class="agent-manager-platform" data-agent-platform="'+id+'" aria-pressed="false">'+platformIcon(id)+'<span>'+item.name+'</span><i aria-hidden="true"></i></button>').join('')}</div><input type="hidden" id="wgAgentPlatform"><section class="agent-manager-install-step"><div class="agent-manager-step-title"><span>1</span><h4>Télécharger et ouvrir l’agent</h4></div><div class="agent-manager-download"><img src="images/logo-loup.svg" width="38" height="38" alt=""><div><strong>WolfGuard Agent</strong><small id="wgAgentDownloadHelp"></small></div><a id="wgAgentDownload" class="settings-btn primary" download></a></div><p id="wgAgentInstructions"></p></section><section class="agent-manager-install-step"><div class="agent-manager-step-title"><span>2</span><h4>Associer à ton espace</h4></div><div class="agent-manager-pair-start"><p>Colle le code temporaire dans l’agent.<small>5 minutes · Une seule utilisation</small></p><button type="button" class="settings-btn" id="wgAgentPair">Générer le code</button></div><div id="wgAgentPairCode" class="agent-manager-pair" hidden><div class="agent-manager-pair-heading"><span class="agent-manager-eyebrow">CODE D’ASSOCIATION</span><small></small></div><div class="agent-manager-pair-value"><code aria-label="Code d’association temporaire"></code><button type="button" class="settings-btn" id="wgAgentCopyPair">${ITEM_ACTION_ICONS.copy}<span>Copier</span></button></div><progress id="wgAgentPairProgress" max="300" value="300" aria-label="Durée restante du code d’association"></progress><p id="wgAgentPairFeedback" role="status">En attente de la connexion du poste…</p></div><div id="wgAgentNewPost" class="agent-manager-new-post" hidden><span>${settingsIcon('shield-check')}</span><div><strong></strong><p>Le poste est disponible dans ton espace.</p></div><button type="button" class="settings-btn" id="wgAgentViewPosts">Voir mes postes</button></div><p class="agent-manager-pair-note">${settingsIcon('lock')}Le code d’accès de ton espace reste personnel. Seul le code temporaire doit être saisi dans l’agent.</p><p id="wgAgentCapacity" class="settings-agent-notice" hidden>Six postes sont déjà associés. Révoque l’accès d’un ancien poste dans Mes postes pour en connecter un nouveau.</p></section></section>`;
    const error=message=>{if(live())find('#wgAgentSetupError').textContent=message;};
    const status=message=>{if(live())find('#wgAgentSetupStatus').textContent=message;};
    const platform=find('#wgAgentPlatform');
    platform.value=/Mac/i.test(navigator.userAgentData?.platform||navigator.platform)?'darwin':/Linux/i.test(navigator.userAgentData?.platform||navigator.platform)?'linux':'win32';
    function showDownload(){
      const item=downloads[platform.value],link=find('#wgAgentDownload');
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
    function clearCode(){const area=find('#wgAgentPairCode');area.hidden=true;area.querySelector('code').textContent='';expiresAt=0;find('#wgAgentPair').textContent='Générer le code';}
    function updatePairing(){
      if(!expiresAt)return;
      const remaining=Math.max(0,Math.ceil((expiresAt-Date.now())/1000));
      if(!remaining){clearCode();status('Le code d’association a expiré. Tu peux en générer un nouveau.');return;}
      find('#wgAgentPairCode small').textContent=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
      find('#wgAgentPairProgress').value=Math.min(300,remaining);
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
      find('#wgAgentFleetSummary').textContent=(stale?'État indisponible':online+' connecté'+(online>1?'s':''))+' · '+agents.length+' / 6 postes';
      const choices='<option value="" disabled>Choisir un poste</option>'+agents.map(agent=>'<option value="'+esc(agent.id)+'">'+esc(agent.name)+' · '+platformName(agent.platform)+'</option>').join('');
      if(choices!==pickerHTML){picker.innerHTML=choices;pickerHTML=choices;}
      picker.value=selected?.id||'';picker.disabled=busy||!available()||!agents.length;
      const ordered=[...agents].sort((a,b)=>Number(b.id===selected?.id)-Number(a.id===selected?.id)||Number(b.online)-Number(a.online));
      const html=ordered.map(agent=>{
        const chosen=selected?.id===agent.id,open=expanded===agent.id,audit=agent.capabilities?.includes('security-audit-v1'),network=agent.capabilities?.includes('network-scan-v2');
        return '<article class="agent-manager-machine" data-agent-id="'+esc(agent.id)+'" data-selected="'+chosen+'"><div class="agent-manager-machine-row"><span class="agent-manager-platform-icon" aria-hidden="true">'+platformIcon(agent.platform)+'</span><div class="agent-manager-machine-copy"><div><strong>'+esc(agent.name)+'</strong>'+(chosen?'<span class="agent-manager-selected">Utilisé</span>':'')+'</div><small>'+platformName(agent.platform)+(!network?' · Scans réseau à mettre à jour':audit?'':' · Audit à mettre à jour')+'</small></div><span class="agent-manager-presence" data-state="'+(stale?'unknown':agent.online?'online':'offline')+'">'+(stale?'À vérifier':agent.online?'Connecté':'Hors ligne')+'</span><div class="agent-manager-actions"><button type="button" class="settings-btn" data-agent-use="'+esc(agent.id)+'" '+(chosen||busy?'disabled':'')+'>'+(chosen?'Utilisé':'Utiliser')+'</button><button type="button" class="settings-btn settings-btn-icon" data-agent-details="'+esc(agent.id)+'" aria-label="Détails de '+esc(agent.name)+'" aria-expanded="'+open+'" aria-controls="wgAgentInfo-'+esc(agent.id)+'">'+settingsIcon(open?'x':'sliders-horizontal')+'</button></div></div><div class="agent-manager-machine-details" id="wgAgentInfo-'+esc(agent.id)+'" '+(open?'':'hidden')+'><dl><div><dt>Système</dt><dd>'+platformName(agent.platform)+'</dd></div><div><dt>Dernière connexion</dt><dd>'+esc(lastSeen(agent.lastSeen))+'</dd></div><div><dt>Scans réseau actif / passif</dt><dd>'+(network?'Pris en charge':'Mise à jour de l’agent nécessaire')+'</dd></div><div><dt>Audit de sécurité</dt><dd>'+(audit?'Pris en charge':'Mise à jour de l’agent nécessaire')+'</dd></div><div><dt>Utilisation</dt><dd>'+(chosen?'Poste commun aux quatre scans':'Poste disponible')+'</dd></div></dl>'+(!agent.online?'<p class="agent-manager-offline-help">Ouvre WolfGuard Agent sur ce poste et vérifie sa connexion à Internet.</p>':'')+(!audit||!network?'<button type="button" class="settings-btn" data-agent-update="'+esc(agent.platform)+'">'+settingsIcon('download')+'Installer la dernière version</button>':'')+'<div class="agent-manager-revoke-row"><p>Retirer ce poste coupe son accès et arrête ses scans en cours.</p><button type="button" class="settings-btn agent-manager-revoke" data-agent-revoke="'+esc(agent.id)+'" '+(busy?'disabled':'')+'>Révoquer l’accès</button></div></div></article>';
      }).join('')||'<div class="agent-manager-empty">'+settingsIcon('monitor')+'<strong>Ton premier poste, en quelques étapes</strong><p>Associe un poste Windows, Linux ou macOS pour exécuter tes scans depuis cet espace.</p><button type="button" class="settings-btn primary" data-agent-start>Connecter un poste</button></div>';
      if(html!==listHTML){
        const focused=document.activeElement,focusId=focused?.dataset.agentDetails||focused?.dataset.agentUse,action=focused?.hasAttribute('data-agent-details')?'details':'use';
        find('#wgAgentManage').innerHTML=html;listHTML=html;
        if(focusId){const target=[...root.querySelectorAll('[data-agent-'+action+']')].find(button=>button.dataset[action==='details'?'agentDetails':'agentUse']===focusId);if(target&&!target.disabled)target.focus({preventScroll:true});}
      }
      const limit=agents.length>=6;find('#wgAgentCapacity').hidden=!limit;
      find('#wgAgentPair').disabled=busy||!available()||limit;
      if(firstLoad){showTab(agents.length?'fleet':'connect');firstLoad=false;}
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
        }catch(exception){
          if(!live())return;stale=true;const notice=find('#wgAgentConnectionNotice');notice.hidden=false;notice.textContent='Connexion au service indisponible. '+exception.message;
          if(firstLoad){showTab('connect');find('#wgAgentManage').textContent='Les postes n’ont pas pu être chargés.';}
          else renderAgents();
          find('#wgAgentSettingsPresence').dataset.state='unknown';find('#wgAgentSettingsPresence').textContent='À vérifier';
        }finally{if(live())find('#wgAgentRefresh').disabled=false;}
      })();
      try{await refreshing;}finally{refreshing=null;}
    }
    find('#wgAgentRefresh').onclick=refresh;
    async function choose(id){
      if(busy||!live()||!agents.some(agent=>agent.id===id))return;
      busy=true;renderAgents();error('');
      try{await setSetting('scanAgentId',id);status('Agent commun enregistré pour toutes les sections.');}
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
    find('#wgAgentPair').onclick=async()=>{
      if(busy||!live())return;busy=true;renderAgents();error('');const button=find('#wgAgentPair');button.textContent='Génération…';
      try{const pairing=await cloud().agentRequest('agents/pair',{});if(!live())return;find('#wgAgentPairCode').hidden=false;find('#wgAgentPairCode code').textContent=pairing.code;find('#wgAgentPairFeedback').textContent='En attente de la connexion du poste…';expiresAt=pairing.expiresAt;updatePairing();}
      catch(exception){error(exception.message);}
      finally{busy=false;if(live()){button.textContent=expiresAt?'Nouveau code':'Générer le code';await refresh();}}
    };
    find('#wgAgentCopyPair').onclick=async()=>{
      if(!expiresAt)return;if(Date.now()>=expiresAt){clearCode();status('Le code d’association a expiré.');return;}
      const copied=await copyText(find('#wgAgentPairCode code').textContent);if(!live())return;
      error(copied?'':'Copie impossible. Sélectionne le code pour le copier.');find('#wgAgentPairFeedback').textContent=copied?'Code copié. Colle-le dans WolfGuard Agent.':'Sélectionne le code pour le copier manuellement.';
    };
    async function poll(){if(live())updatePairing();await refresh();if(live())timer=setTimeout(poll,3000);}
    if(available())poll();else{renderAgents();find('#wgAgentCurrentDetail').textContent='L’association est disponible sur le site après saisie de ton code.';}
  }
  return {mount,unmount,snapshot,platformName,available};
})();
