'use strict';

const webScanAgent=(()=>{
  let timer=0,generation=0,selected='',jobIds={passive:'',active:''};
  const labels={queued:'En attente de l’agent',running:'Scan en cours',completed:'Scan terminé',cancelled:'Scan arrêté',failed:'Collecte en échec',expired:'Agent non disponible à temps',lost:'Connexion à l’agent perdue'};
  const cloud=()=>typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud;
  function reset(clear=true){clearTimeout(timer);timer=0;generation++;if(clear){selected='';jobIds={passive:'',active:''};}}
  function mount(kind,values,onReport){
    reset(false);const token=generation,root=document.createElement('section');root.className='wgscan-agent';root.setAttribute('aria-label','Exécution par un agent');
    $('.wgscan-environment').after(root);
    root.innerHTML=`<div class="wgscan-agent-top"><div><span class="wgscan-kicker">EXÉCUTION DISTANTE · AGENT WINDOWS</span><h2>Scanner depuis ton poste</h2><p>Choisis un agent connecté. Ses résultats remontent ici automatiquement.</p></div><button type="button" id="wgAgentSetup">Associer un agent</button></div><div class="wgscan-agent-controls"><label class="wgscan-field">Poste d’exécution<select id="wgAgentSelect"><option value="">Chargement des agents…</option></select></label><button type="button" id="wgAgentLaunch" class="wgscan-primary" disabled>${workspaceSectionIcon('scan')}Lancer le scan ${kind==='passive'?'passif':'actif'}</button><button type="button" id="wgAgentStop" disabled>Arrêter</button><span id="wgAgentPresence"></span></div><p id="wgAgentStatus" role="status" aria-live="polite"></p><div id="wgAgentProgress" hidden><progress max="1" value="0" aria-label="Progression réelle du scan"></progress><span></span></div><div class="wgscan-agent-history"><label>Derniers scans<select id="wgAgentHistory" aria-label="Charger un scan exécuté par l’agent"><option value="">Aucun scan</option></select></label><small>Résultats conservés 7 jours · Enregistrer pour les garder dans ton espace</small></div><dialog id="wgAgentSetupDialog" class="wgscan-dialog" aria-labelledby="wgAgentSetupTitle"><header><div><span class="wgscan-kicker">ASSOCIATION UNIQUE</span><h2 id="wgAgentSetupTitle">Connecter ton poste à WolfGuard</h2></div><button type="button" id="wgAgentCloseSetup" aria-label="Fermer">✕</button></header><ol class="wgscan-agent-instructions"><li><strong>Télécharge et extrais l’agent sur le poste à scanner.</strong><a href="downloads/WolfGuard-Agent-Windows.zip" download class="wgscan-agent-download">Télécharger l’agent Windows x64 ↓</a></li><li><strong>Génère un code temporaire.</strong><p>Il reste valable cinq minutes et ne peut servir qu’une fois.</p><button type="button" id="wgAgentPair">Générer un code</button></li><li><strong>Lance Demarrer-agent.cmd, puis colle le code dans la console.</strong><p>Garde l’agent ouvert. Le démarrage avec Windows est disponible dans le dossier extrait.</p></li></ol><div id="wgAgentPairCode" hidden><code></code><button type="button" id="wgAgentCopyPair">Copier le code</button><small></small></div><p id="wgAgentSetupError" role="alert"></p><h3>Postes associés</h3><div id="wgAgentManage"></div><p class="wgscan-note">L’agent n’enregistre pas ton code WolfGuard et n’ouvre aucun port entrant. Il exécute uniquement les scans réseau prévus, vers des adresses privées ou locales.</p></dialog>`;
    const live=()=>token===generation&&root.isConnected&&!$('#app').classList.contains('hidden');
    let agents=[],jobs=[],busy=false,lastResult='',current=null,running=null;
    const status=(text,error=false)=>{if(!live())return;$('#wgAgentStatus').textContent=text;$('#wgAgentStatus').classList.toggle('is-error',error);};
    async function request(path,value){return cloud().agentRequest(path,value);}
    function render(){
      if(!live())return;
      const picker=$('#wgAgentSelect');picker.innerHTML=agents.length?agents.map(agent=>'<option value="'+esc(agent.id)+'" '+(agent.id===selected?'selected':'')+'>'+esc(agent.name)+(agent.online?' · Connecté':' · Hors ligne')+'</option>').join(''):'<option value="">Aucun agent associé</option>';
      const agent=agents.find(item=>item.id===selected);running=jobs.find(job=>['queued','running'].includes(job.status));
      const matching=jobs.filter(job=>job.strategy===kind);current=matching.find(job=>job.id===jobIds[kind])||matching[0]||null;if(current)jobIds[kind]=current.id;
      $('#wgAgentPresence').textContent=agent?(agent.online?'● Connecté':'○ Hors ligne'):'Aucun poste connecté';$('#wgAgentPresence').dataset.online=String(!!agent?.online);
      $('#wgAgentLaunch').disabled=busy||!agent?.online||!!running;$('#wgAgentStop').disabled=busy||!running;
      $('#wgAgentStop').textContent=running&&running.strategy!==kind?'Arrêter le scan '+(running.strategy==='passive'?'passif':'actif'):'Arrêter';
      $('#wgAgentHistory').innerHTML=matching.length?matching.map(job=>'<option value="'+job.id+'" '+(current?.id===job.id?'selected':'')+'>'+new Date(job.createdAt).toLocaleString('fr-FR')+' · '+(labels[job.status]||job.status)+'</option>').join(''):'<option value="">Aucun scan '+(kind==='passive'?'passif':'actif')+'</option>';
      const progress=$('#wgAgentProgress');progress.hidden=!current;
      if(current){const bar=progress.querySelector('progress');bar.max=Math.max(1,current.total);if(current.status==='running'&&!current.total)bar.removeAttribute('value');else bar.value=current.completed;progress.querySelector('span').textContent=(labels[current.status]||current.status)+(current.total?' · '+current.completed+' / '+current.total+' tests':'');}
      const manage=$('#wgAgentManage');manage.innerHTML=agents.map(agent=>'<article class="wgscan-saved-item"><div><strong>'+esc(agent.name)+'</strong><small>'+(agent.online?'Connecté':'Dernière connexion : '+new Date(agent.lastSeen).toLocaleString('fr-FR'))+'</small></div><button type="button" data-agent-revoke="'+agent.id+'">Révoquer</button></article>').join('')||'<p class="wgscan-note">Aucun agent associé pour le moment.</p>';
      for(const button of manage.querySelectorAll('[data-agent-revoke]'))button.onclick=async()=>{if(!await appConfirm('Retirer l’accès de ce poste et arrêter ses scans en cours ?'))return;if(!live())return;try{await request('agents/revoke',{id:button.dataset.agentRevoke});if(live()){status('Accès du poste retiré.');await refresh();}}catch(error){if(live())$('#wgAgentSetupError').textContent=error.message;}};
    }
    async function result(){
      if(!current||lastResult===current.id+':'+current.revision)return;
      const id=current.id,revision=current.revision,data=await request('scans/result?id='+id);if(!live()||current?.id!==id)return;
      if(data.report){const name='Scan '+(kind==='passive'?'passif':'actif')+' · '+(agents.find(a=>a.id===selected)?.name||'Agent');
        const report=data.report.results?.length?webScanModel.parse(JSON.stringify(data.report),kind,name):{format:'wolfguard-scan',version:1,strategy:kind,name,importedAt:new Date().toISOString(),source:'Agent',warnings:(data.report.warnings||[]).map(value=>String(value).slice(0,500)),rows:[]};
        report.source='Agent Windows';report.importedAt=new Date(data.createdAt).toISOString();report.capturedAt=data.report.startedAt||'';
        onReport(report,data);lastResult=id+':'+revision;
        if(data.report.error)status(data.report.error,true);else if(['completed','cancelled'].includes(data.status))status(labels[data.status]+' : '+report.rows.length+' observation(s) reçue(s).');
      }else if(data.status==='running')onReport({format:'wolfguard-scan',version:1,strategy:kind,name:'Collecte en cours',importedAt:new Date().toISOString(),source:'Agent Windows',warnings:[],rows:[]},data);
    }
    async function refresh(){
      if(!live()||busy)return;
      try{
        const response=await request('agents');if(!live())return;agents=response.agents;
        if(!agents.some(agent=>agent.id===selected))selected=agents.find(a=>a.online)?.id||agents[0]?.id||'';
        const id=selected;
        if(id){const response=await request('scans?agentId='+id);if(!live()||selected!==id)return;jobs=response.jobs;}else jobs=[];
        render();await result();
      }catch(error){if(live())status(error.message,true);}
    }
    async function poll(){await refresh();if(live())timer=setTimeout(poll,3000);}
    $('#wgAgentSelect').onchange=async event=>{selected=event.target.value;lastResult='';jobIds[kind]='';jobs=[];await refresh();};
    $('#wgAgentHistory').onchange=async event=>{jobIds[kind]=event.target.value;lastResult='';render();try{await result();}catch(error){status(error.message,true);}};
    $('#wgAgentLaunch').onclick=async()=>{
      if(busy||!selected||!live())return;busy=true;render();
      try{const v=values();const data={agentId:selected,strategy:kind,...(kind==='active'?{target:v.target,mode:v.profile==='discovery'?'discovery':'tcp',ports:v.profile==='discovery'?'22,80,443,445,3389':v.profile==='web'?'80,443,8000,8080,8443':v.profile==='custom'?v.ports:SCAN_PORT_PRESETS.common,identifyServices:v.identify,timeoutMs:v.agentTimeoutMs??1500,concurrency:v.agentConcurrency??16}:{passiveScope:'all'})};
        const job=await request('scans',data);if(!live())return;jobIds[kind]=job.id;lastResult='';status('Demande transmise à l’agent.');
      }catch(error){status(error.message,true);}finally{busy=false;if(live())await refresh();}
    };
    $('#wgAgentStop').onclick=async()=>{if(busy||!running)return;busy=true;render();try{await request('scans/cancel',{id:running.id});status('Arrêt demandé. L’agent interrompt les tests à sa prochaine mise à jour.');}catch(error){status(error.message,true);}finally{busy=false;if(live())await refresh();}};
    $('#wgAgentSetup').onclick=()=>$('#wgAgentSetupDialog').showModal();$('#wgAgentCloseSetup').onclick=()=>$('#wgAgentSetupDialog').close();
    $('#wgAgentPair').onclick=async()=>{const button=$('#wgAgentPair');button.disabled=true;$('#wgAgentSetupError').textContent='';try{const pairing=await request('agents/pair',{});if(!live())return;const area=$('#wgAgentPairCode');area.hidden=false;area.querySelector('code').textContent=pairing.code;area.querySelector('small').textContent='Expire à '+new Date(pairing.expiresAt).toLocaleTimeString('fr-FR');}catch(error){if(live())$('#wgAgentSetupError').textContent=error.message;}finally{if(button.isConnected)button.disabled=false;}};
    $('#wgAgentCopyPair').onclick=async()=>{const copied=await copyText($('#wgAgentPairCode code').textContent);if(live())$('#wgAgentSetupError').textContent=copied?'Code copié. Colle-le dans la console de l’agent.':'Copie impossible. Sélectionne le code pour le copier.';};
    if(cloud()?.enabled&&cloud().hasSession())poll();
    else{$('#wgAgentSelect').innerHTML='<option>Ouvrir le site pour connecter un agent</option>';$('#wgAgentPair').disabled=true;status('Les agents sont disponibles sur wolfguard.wavetools.fr après saisie de ton code.');render();}
  }
  return {mount,reset};
})();
