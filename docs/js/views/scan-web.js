'use strict';

const webScanWorkspace=(()=>{
  let generation=0;
  const make=kind=>({kind,target:'',profile:kind==='map'?'discovery':'common',ports:'22,80,443,445,3389',identify:false,preparing:false,reportJob:'',execution:null});
  let views=Object.fromEntries(Object.keys(scanInsights.definitions).map(kind=>[kind,make(kind)]));
  function preparation(view){
    const kind=view.kind,passive=kind==='passive',audit=kind==='vulnerability';
    const target=kind==='map'?['Réseau ou plage d’adresses','192.168.1.0/24','Réseau IPv4, plage de 256 adresses maximum ou adresse IP.']:['Adresse IP ou nom d’hôte','192.168.1.10 ou serveur.exemple.local','Une seule machine, avec une adresse privée ou publique.'];
    const targetField=`<label class="wgscan-field">${target[0]}<input id="scanTarget" placeholder="${target[1]}" value="${esc(view.target)}" maxlength="253" autocomplete="off" spellcheck="false" required></label><p class="wgscan-note">${target[2]}</p>`;
    const profiles=kind==='active'?`<fieldset class="scan-profile-picker"><legend>Ports à tester</legend><div class="wgscan-profiles" role="group" aria-label="Ports à tester">${[['common','Ports courants','SSH, DNS, web, Windows…'],['web','Services web','HTTP, HTTPS et administration'],['custom','Personnalisé','Saisir une liste de ports']].map(([id,title,help])=>'<button type="button" data-wg-profile="'+id+'" aria-pressed="'+(view.profile===id)+'"><span><strong>'+title+'</strong><small>'+help+'</small></span><i></i></button>').join('')}</div></fieldset><label id="wgScanCustomPorts" class="wgscan-field">Ports TCP<input id="wgScanPorts" value="${esc(view.ports)}" maxlength="10000" placeholder="22,80,443 ou 8000-8100" spellcheck="false"></label><label id="wgScanIdentifyLabel" class="wgscan-check"><input id="wgScanIdentify" type="checkbox" ${view.identify?'checked':''}><span>Identifier les services<small>Préciser leur nom et leur version quand c’est possible.</small></span></label>`:'';
    const scope=kind==='map'?'<input id="scanTarget" type="hidden" value="auto"><div class="scan-auto-network">'+settingsIcon('monitor')+'<strong>Réseau du poste sélectionné</strong><p>Hôtes confirmés sur les réseaux accessibles, noms et IP, parcours observés vers Internet.</p></div>':audit?`<div class="scan-audit-checks"><div>${settingsIcon('shield-check')}<strong>Protections</strong><span>Pare-feu et sécurité du poste</span></div><div>${settingsIcon('refresh-cw')}<strong>Mises à jour</strong><span>État disponible sur le poste</span></div><div>${settingsIcon('sliders-horizontal')}<strong>Configuration</strong><span>Réglages présentant un risque</span></div></div><p class="wgscan-note">Windows, Linux et macOS · Audit en lecture seule.</p>`:targetField+profiles;
    const advanced=!passive&&!audit?`<details class="wgscan-agent-options"><summary>Réglages du scan</summary><div><label class="wgscan-field">Délai par test (ms)<input id="wgAgentTimeout" type="number" min="100" max="3000" step="100" value="${view.agentTimeoutMs||1500}"></label><label class="wgscan-field">Tests simultanés<input id="wgAgentConcurrency" type="number" min="1" max="32" value="${view.agentConcurrency||16}"></label></div><p class="wgscan-note">Adresses privées et publiques. Une seule IP pour les scans actif/passif ; cartographie limitée à 256 adresses. Maximum 4096 tests ; arrêt après trois minutes.</p></details>`:'';
    const explanation=passive?'<details class="scan-setup-explanation"><summary>Que relève ce scan ?</summary><p>Les voisins ARP/NDP, noms en cache DNS ou dans le fichier hosts, connexions et processus associés à cette cible. Pour le poste de l’agent, les ports en écoute sont aussi relevés. Une IP publique est acceptée : seules ses traces locales sont visibles, sans sonde ni requête DNS réseau.</p></details>':'';
    return {scope,advanced:advanced+explanation};
  }

  async function render(kind,host=$('#agentToolHost')||$('#content')){
    const view=views[kind],definition=scanInsights.definitions[kind],token=++generation;
    webScanAgent.reset(false);webScanHistory.unmount();
    const live=()=>token===generation&&host.isConnected&&state.section==='scan-'+kind&&!$('#app').classList.contains('hidden');
    const controls=preparation(view);
    host.classList.add('scan-content');
    host.innerHTML=`<section class="wgscan" data-kind="${kind}" data-layout="launcher" data-phase="ready" data-has-report="false" aria-labelledby="scanTitle"><header class="wgscan-heading"><div class="wgscan-title-group"><span class="wgscan-title-icon">${workspaceSectionIcon('scan-'+kind)}</span><div><h1 id="scanTitle">${definition.title}</h1><p>${definition.description}</p></div></div><button type="button" id="wgScanShowHistory">${settingsIcon('history')}Historique du poste</button></header><section class="scan-setup"><div class="scan-setup-fields">${controls.scope}${controls.advanced}</div><footer class="scan-setup-footer"><div id="wgScanAgentHost"></div></footer></section><p class="wgscan-note">Les rapports sont disponibles uniquement en PDF dans la fiche du poste → Historique.</p><section id="wgScanExecution" class="scan-execution" role="status" aria-live="polite" hidden><h2 id="wgScanExecutionTitle"></h2><p id="wgScanExecutionText"></p><progress id="wgScanExecutionProgress" max="1" aria-label="Progression du scan"></progress><button type="button" id="wgScanCancel" hidden>Arrêter le scan</button></section><p id="wgScanStatus" class="wgscan-status" role="status" aria-live="polite"></p></section>`;
    if($('#scanTarget'))$('#scanTarget').oninput=event=>{view.target=event.target.value;};
    if(kind==='active'){
      $('#wgScanPorts').oninput=event=>{view.ports=event.target.value;};$('#wgScanIdentify').onchange=event=>{view.identify=event.target.checked;};
      for(const button of host.querySelectorAll('[data-wg-profile]'))button.onclick=()=>{view.profile=button.dataset.wgProfile;for(const candidate of host.querySelectorAll('[data-wg-profile]'))candidate.setAttribute('aria-pressed',String(candidate===button));$('#wgScanCustomPorts').hidden=view.profile!=='custom';};
      $('#wgScanCustomPorts').hidden=view.profile!=='custom';
    }
    for(const [id,key]of [['wgAgentTimeout','agentTimeoutMs'],['wgAgentConcurrency','agentConcurrency']])if($('#'+id))$('#'+id).oninput=event=>{view[key]=Number(event.target.value);};
    $('#wgScanCancel').onclick=()=>$('#wgAgentStop')?.click();
    $('#wgScanShowHistory').onclick=async()=>{try{const {selected}=await workspaceAgents.snapshot();if(live()&&selected)await agentsWorkspace.openHistory(selected.id);}catch(error){if(live())$('#wgScanStatus').textContent=error.message;}};
    webScanAgent.mount(kind,()=>view,(_report,data)=>{
      if(!live())return;view.reportJob=data.id+':'+data.revision;
      const labels={completed:'Scan terminé.',cancelled:'Scan arrêté.',failed:'Le scan a échoué.',expired:'L’agent n’a pas démarré le scan.',lost:'Connexion à l’agent perdue.'};
      $('#wgScanStatus').textContent=(labels[data.status]||'Scan enregistré.')+' Consulte son rapport PDF dans l’historique de ce poste.';
    },execution=>{
      if(!live()||execution.status==='ready'&&view.execution?.status==='error')return;view.execution=execution;
      const loading=['starting','queued','running','receiving'].includes(execution.status),error=execution.status==='error';
      host.querySelector('.wgscan').dataset.phase=loading?'loading':error?'error':'ready';
      $('#wgScanExecution').hidden=!loading&&!error;
      const stop=$('#wgAgentStop');$('#wgScanCancel').hidden=!loading||!stop||stop.hidden;$('#wgScanCancel').disabled=!stop||stop.disabled;
      for(const field of host.querySelectorAll('#scanTarget,#wgScanPorts,#wgScanIdentify,#wgAgentTimeout,#wgAgentConcurrency,[data-wg-profile]'))field.disabled=loading;
      $('#wgScanExecutionTitle').textContent=execution.title||({starting:'Lancement du scan…',queued:'En attente du poste…',running:'Scan en cours…',receiving:'Enregistrement du rapport…'})[execution.status]||'';
      $('#wgScanExecutionText').textContent=error?execution.message||'Réessaie après avoir vérifié la connexion.':'Le PDF sera disponible dans l’historique de ce poste.';
      const meter=$('#wgScanExecutionProgress');meter.hidden=!loading;
      if(Number.isFinite(execution.total)&&execution.total>0){meter.max=execution.total;meter.value=Math.min(execution.total,Math.max(0,execution.completed||0));}else meter.removeAttribute('value');
      if(['starting','queued','running'].includes(execution.status))$('#wgScanStatus').textContent='';
    });host.scrollTop=0;
  }
  return {render,reset(){generation++;webScanAgent.reset();webScanHistory.unmount();views=Object.fromEntries(Object.keys(scanInsights.definitions).map(kind=>[kind,make(kind)]));}};
})();
