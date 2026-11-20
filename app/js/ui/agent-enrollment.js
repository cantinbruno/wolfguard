'use strict';

const workspaceAgentEnrollment=(()=>{
  let generation=0,timer=0,controller=null;
  function unmount(){generation++;clearTimeout(timer);controller?.abort();controller=null;}
  function mount(root,{onAdded}={}){
    unmount();controller=new AbortController();const {signal}=controller,token=generation,key=state.vaultKey;
    const live=()=>token===generation&&root.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    const find=selector=>root.querySelector(selector),cloud=()=>typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud;
    const allowed=()=>workspaceAgents.available()&&!!cloud()?.can('agents.pair');
    const revision=workspaceAgents.downloadRevision;
    let platform=/Mac/i.test(navigator.userAgentData?.platform||navigator.platform)?'darwin':/Linux/i.test(navigator.userAgentData?.platform||navigator.platform)?'linux':'win32';
    let ready=false,busy=false,stale=false,count=0,knownIds=new Set(),ticket=null,added=null,refreshing=null;
    root.classList.add('agent-enrollment');
    root.innerHTML=`<p class="enrollment-intro">Installe WolfGuard sur le poste à ajouter. Il apparaîtra automatiquement dans ton parc.</p>
      <fieldset class="enrollment-platforms"><legend>Système du poste</legend><div role="group" aria-label="Système du poste">${Object.entries(workspaceAgents.downloads).map(([id,item])=>'<button type="button" data-agent-platform="'+id+'" aria-pressed="false">'+workspaceAgents.platformIcon(id)+'<span><strong>'+item.name+'</strong><small>'+esc(item.help)+'</small></span><span class="enrollment-platform-check" aria-hidden="true"></span></button>').join('')}</div></fieldset>
      <section id="wgAgentConnect" class="enrollment-install" aria-label="Installation du poste">
        <div class="enrollment-install-heading"><span aria-hidden="true">${settingsIcon('download')}</span><div><h3>Installer et associer</h3><p>Aucun code à saisir.</p></div></div>
        <p id="wgAgentInstructions"></p><div class="enrollment-install-actions"><button type="button" class="settings-btn primary" id="wgAgentPair" disabled>${settingsIcon('download')}<span>Télécharger l’installateur</span></button><button type="button" class="settings-btn" id="wgAgentShare" disabled>${settingsIcon('link')}Créer un lien pour un autre poste</button></div>
        <p class="enrollment-ticket-note">Installateur personnel · Valable 1 heure · Un seul poste</p>
        <section id="wgAgentShareLink" class="enrollment-share" hidden><label for="wgAgentShareURL">Ouvre ce lien sur le poste à ajouter</label><div><input id="wgAgentShareURL" type="url" readonly spellcheck="false"><button type="button" class="settings-btn" id="wgAgentShareCopy">Copier</button></div><p id="wgAgentShareExpiry"></p></section>
      </section>
      <p id="wgAgentSetupError" class="settings-agent-error" role="alert"></p><p id="wgAgentSetupStatus" class="enrollment-feedback" role="status" aria-live="polite"></p>
      <p id="wgAgentCapacity" class="settings-agent-notice" hidden>La limite de 200 postes est atteinte.</p>
      <p id="wgAgentConnectionNotice" class="settings-agent-notice" role="status" hidden></p>
      <section id="wgAgentEnrollmentProgress" class="enrollment-progress" data-state="idle" role="status" hidden><span class="enrollment-progress-icon" aria-hidden="true">${settingsIcon('monitor')}</span><div><strong id="wgAgentEnrollmentTitle"></strong><p id="wgAgentEnrollmentHelp"></p><small id="wgAgentPairExpiry"></small></div><button type="button" class="settings-btn" id="wgAgentRefresh" aria-label="Vérifier l’arrivée du poste" title="Vérifier l’arrivée du poste">${settingsIcon('refresh-cw')}</button><button type="button" class="settings-btn primary" id="wgAgentViewPosts" hidden>Voir le poste</button></section>`;
    const status=message=>{if(live())find('#wgAgentSetupStatus').textContent=message;};
    const error=message=>{if(live())find('#wgAgentSetupError').textContent=message;};
    function controls(){
      const disabled=!allowed()||!ready||busy||stale||count>=200;
      find('#wgAgentPair').disabled=disabled;find('#wgAgentShare').disabled=disabled;
      find('#wgAgentCapacity').hidden=count<200;
      for(const button of root.querySelectorAll('[data-agent-platform]'))button.disabled=busy;
    }
    function clearTicket(){const restoreFocus=find('#wgAgentShareLink').contains(document.activeElement);ticket=null;find('#wgAgentShareLink').hidden=true;find('#wgAgentShareURL').value='';find('#wgAgentPairExpiry').textContent='';if(restoreFocus)find('#wgAgentPair').focus({preventScroll:true});}
    function selectPlatform(value){
      platform=value;clearTicket();added=null;status('');error('');
      const item=workspaceAgents.downloads[platform];
      for(const button of root.querySelectorAll('[data-agent-platform]')){const selected=button.dataset.agentPlatform===platform;button.setAttribute('aria-pressed',String(selected));button.querySelector('.enrollment-platform-check').textContent=selected?'✓':'';}
      find('#wgAgentInstructions').textContent=platform==='win32'?'Ouvre Installer-WolfGuard.cmd sur le poste. L’installation et l’association se font automatiquement.':platform==='linux'?'Sur le poste, exécute sh Installer-WolfGuard.sh. L’agent s’installe et rejoint automatiquement ton espace.':'Sur le Mac, exécute sh Installer-WolfGuard.sh. L’agent s’installe et rejoint automatiquement ton espace.';
      find('#wgAgentPair span').textContent='Télécharger pour '+item.name;
      find('#wgAgentViewPosts').hidden=true;find('#wgAgentEnrollmentProgress').hidden=true;find('#wgAgentEnrollmentProgress').dataset.state='idle';find('#wgAgentEnrollmentTitle').textContent='';find('#wgAgentEnrollmentHelp').textContent='';
    }
    function updateExpiry(){
      if(!ticket||added)return;
      const remaining=Math.max(0,Math.ceil((ticket.expiresAt-Date.now())/1000));
      const label='Expire dans '+Math.floor(remaining/60)+' min '+String(remaining%60).padStart(2,'0')+' s';
      find('#wgAgentPairExpiry').textContent=label;find('#wgAgentShareExpiry').textContent=label;
      if(!remaining){clearTicket();find('#wgAgentEnrollmentProgress').dataset.state='expired';find('#wgAgentEnrollmentTitle').textContent='Lien d’association expiré';find('#wgAgentEnrollmentHelp').textContent='Crée un nouvel installateur ou un nouveau lien pour continuer.';status('Le lien a expiré. Tu peux en créer un nouveau.');}
    }
    async function refresh(){
      if(!live()||busy)return;if(refreshing)return refreshing;
      find('#wgAgentRefresh').disabled=true;
      refreshing=(async()=>{
        try{
          const data=await cloud().agentRequest('agents',undefined,{signal});if(!live())return;
          const agents=data.agents||[];count=agents.length;
          const arrived=ready&&ticket&&!added?agents.find(agent=>!knownIds.has(agent.id)):null;
          knownIds=new Set(agents.map(agent=>agent.id));ready=true;stale=false;find('#wgAgentConnectionNotice').hidden=true;
          if(arrived){added=arrived;clearTicket();find('#wgAgentEnrollmentProgress').dataset.state='success';find('#wgAgentEnrollmentTitle').textContent=arrived.name+' est associé';find('#wgAgentEnrollmentHelp').textContent='Le poste est disponible dans ton parc.';find('#wgAgentViewPosts').hidden=false;status('Poste ajouté avec succès.');}
        }catch(problem){if(live()){stale=true;find('#wgAgentConnectionNotice').hidden=false;find('#wgAgentConnectionNotice').textContent='Impossible de vérifier l’arrivée du poste. '+problem.message;}}
        finally{if(live()){find('#wgAgentRefresh').disabled=false;controls();}}
      })();
      try{await refreshing;}finally{refreshing=null;}
    }
    async function prepare(share){
      if(!live()||busy||stale||!ready||!allowed()||count>=200)return;
      const target=platform;busy=true;error('');status('Préparation du lien sécurisé…');controls();
      try{
        const pairing=await cloud().agentRequest('agents/pair',{},{signal});if(!live())return;
        if(!/^[a-f0-9]{32}$/.test(pairing.code)||!Number.isSafeInteger(pairing.expiresAt)||pairing.expiresAt<=Date.now())throw new Error('Lien d’association invalide.');
        if(share){
          clearTicket();const link=new URL('agent-download.html',location.href);link.searchParams.set('v',revision);link.hash=new URLSearchParams({code:pairing.code,platform:target,expires:String(pairing.expiresAt)}).toString();
          find('#wgAgentShareURL').value=link.href;find('#wgAgentShareLink').hidden=false;status('Lien prêt. Copie-le et ouvre-le sur le poste à ajouter.');
        }else{
          const installer=await WolfGuardAgentInstaller.prepare(target,pairing.code);if(!live())return;
          clearTicket();WolfGuardAgentInstaller.download(installer);status('Installateur téléchargé. Ouvre-le sur le poste à ajouter.');
        }
        ticket=pairing;added=null;find('#wgAgentViewPosts').hidden=true;
        find('#wgAgentEnrollmentProgress').hidden=false;find('#wgAgentEnrollmentProgress').dataset.state='pending';find('#wgAgentEnrollmentTitle').textContent='En attente du poste';find('#wgAgentEnrollmentHelp').textContent='Cette fenêtre confirmera automatiquement son association.';updateExpiry();
      }catch(problem){error(problem.message);status('');}
      finally{busy=false;if(live())controls();}
    }
    for(const button of root.querySelectorAll('[data-agent-platform]'))button.onclick=()=>{if(!busy)selectPlatform(button.dataset.agentPlatform);};
    find('#wgAgentPair').onclick=()=>prepare(false);find('#wgAgentShare').onclick=()=>prepare(true);
    find('#wgAgentShareCopy').onclick=async()=>{if(!live()||!ticket||Date.now()>=ticket.expiresAt)return;const input=find('#wgAgentShareURL');const copied=await copyText(input.value);if(live()){if(copied)status('Lien copié.');else{input.focus();input.select();status('Sélectionne et copie le lien.');}}};
    find('#wgAgentRefresh').onclick=refresh;
    find('#wgAgentViewPosts').onclick=()=>{if(added)onAdded?.(added);};
    selectPlatform(platform);controls();
    async function poll(){updateExpiry();await refresh();if(live())timer=setTimeout(poll,3000);}
    if(workspaceAgents.available())poll();else{find('#wgAgentConnectionNotice').hidden=false;find('#wgAgentConnectionNotice').textContent='Connecte-toi au service partagé pour ajouter un poste.';}
  }
  return {mount,unmount};
})();
