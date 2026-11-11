'use strict';

const edrWorkspace=(()=>{
  let generation=0,timer=0,controller=null;
  const healthLabels={protected:'Protégé',attention:'À protéger',unknown:'À confirmer',unsupported:'Protection non intégrée'};
  const eventLabels={alert:'Détecté',failed:'Action en échec',blocked:'Bloqué',quarantined:'En quarantaine',removed:'Supprimé par l’antivirus',cleaned:'Nettoyé',info:'Information'};
  const time=value=>value?new Date(value).toLocaleString('fr-FR'):'Aucun relevé';
  function reset(){generation++;clearTimeout(timer);controller?.abort();controller=null;}
  async function render(){
    reset();const token=generation,key=state.vaultKey;controller=new AbortController();const signal=controller.signal;
    const root=document.createElement('section');root.className='edr-workspace';$('#content').replaceChildren(root);
    const live=()=>generation===token&&root.isConnected&&state.vaultKey===key;
    const request=(path,value)=>WolfGuardCloud.agentRequest('edr'+path,value,{signal});
    const can=right=>!window.WolfGuardAccess||WolfGuardAccess.can(right),find=selector=>root.querySelector(selector);
    let endpoints=[],selected=null,query='',filter='all',busy=false,stale=false,events=[],commands=[],next=null,detailGeneration=0,policyDirty=false,policyRevision=0;
    root.innerHTML='<header class="security-workspace-heading"><div><span class="security-kicker">PROTECTION DES POSTES</span><h1>EDR</h1><p>Journal de protection remonté par l’agent : détections, blocages et actions confirmées.</p></div><div class="security-actions"><button type="button" id="edrAgents">Gérer les postes</button><button type="button" id="edrRefresh">Actualiser</button></div></header><div id="edrMetrics" class="edr-metrics"></div><div class="edr-filters"><label>Rechercher un poste<input id="edrSearch" type="search" placeholder="Nom du poste…"></label><label>Afficher<select id="edrFilter"><option value="all">Tous les postes</option><option value="attention">À protéger / à confirmer</option><option value="alerts">Avec alertes ouvertes</option><option value="blocks">Avec blocages</option><option value="offline">Hors ligne</option></select></label></div><p id="edrStatus" role="status" aria-live="polite">Chargement des protections…</p><div class="edr-console"><section id="edrPosts" class="edr-fleet" aria-label="Choisir un poste"></section><section id="edrPostDetail" class="edr-detail" hidden></section></div>';
    find('#edrAgents').hidden=!can('agents.read');find('#edrAgents').onclick=()=>openAgentsInterface();
    const status=message=>{if(live())find('#edrStatus').textContent=message;};
    function draw(){
      if(!live())return;
      find('#edrMetrics').innerHTML=[['Postes protégés',endpoints.filter(row=>row.health==='protected'&&!stale).length+' / '+endpoints.length],['À protéger / confirmer',endpoints.filter(row=>row.health!=='protected'||stale).length],['Alertes ouvertes',endpoints.reduce((n,row)=>n+row.alerts,0)],['Blocages · 24 h',endpoints.reduce((n,row)=>n+row.blocks,0)]].map(([label,value])=>'<article><span>'+label+'</span><strong>'+value+'</strong></article>').join('');
      const rows=endpoints.filter(row=>row.name.toLocaleLowerCase().includes(query)&&(filter==='all'||filter==='attention'&&(row.health!=='protected'||stale)||filter==='alerts'&&row.alerts||filter==='blocks'&&row.blocks||filter==='offline'&&!row.online));
      const focused=document.activeElement?.dataset.edrPost;
      find('#edrPosts').innerHTML=rows.map(row=>'<button type="button" class="edr-fleet-row" data-edr-post="'+row.id+'" aria-pressed="'+(row.id===selected)+'"><span class="edr-fleet-heading"><strong>'+esc(row.name)+'</strong><span class="security-badge" data-health="'+(stale?'unknown':row.health)+'">'+(row.online&&!stale?healthLabels[row.health]:'Hors ligne · dernier état')+'</span></span><span class="edr-fleet-system">'+esc(workspaceAgents.platformName(row.platform))+' · '+esc(row.snapshot?.provider||'Agent à mettre à jour')+'</span><span class="edr-fleet-counts"><span>'+row.alerts+' alerte(s)</span><span>'+row.blocks+' blocage(s) / 24 h</span></span><small>Dernier relevé : '+esc(time(row.collectedAt))+'</small></button>').join('')||'<div class="security-empty"><h2>'+(endpoints.length?'Aucun poste pour ces filtres':'Aucun poste associé')+'</h2><p>'+(endpoints.length?'Modifie les filtres ou la recherche.':'Ajoute l’agent en arrière-plan depuis Agents.')+'</p></div>';
      if(focused)find('[data-edr-post="'+focused+'"]')?.focus({preventScroll:true});
      drawState();
    }
    function drawState(){
      const row=endpoints.find(item=>item.id===selected);if(!row||!find('#edrProtectionState'))return;
      const snapshot=row.snapshot,known=row.online&&!stale,compatible=row.capabilities?.includes('endpoint-protection-v1');
      find('#edrDetailName').textContent=row.name;
      find('#edrProtectionState').innerHTML='<div class="edr-protection-head"><span class="security-badge" data-health="'+(known?row.health:'unknown')+'">'+(known?healthLabels[row.health]:'État actuel non confirmé')+'</span><span>'+esc(snapshot?.provider||'En attente de télémétrie')+'</span></div><dl class="edr-checks">'+[['Antivirus',snapshot?.antivirus],['Protection en temps réel',snapshot?.realtime],['Pare-feu',snapshot?.firewall],['Signatures',snapshot?.signatures]].map(([label,value])=>'<div><dt>'+label+'</dt><dd data-check="'+(known?value:'unknown')+'">'+esc(!known?'À confirmer':({enabled:'Activé',disabled:'Désactivé / à actualiser',passive:'Passif · antivirus tiers',unsupported:'Non intégré',unknown:'Non confirmé'})[value]||'Non confirmé')+'</dd></div>').join('')+'</dl><p class="security-note">Relevé : '+esc(time(row.collectedAt))+' · Dernier contact : '+esc(time(row.lastSeen))+'</p>'+(!compatible?'<p class="edr-notice">Mets à jour l’agent pour recevoir les protections et événements en arrière-plan. Les scans restent disponibles dans leurs sections.</p>':'')+(snapshot?.warnings||[]).map(message=>'<p class="edr-notice">'+esc(message)+'</p>').join('');
      find('#edrPolicyForm').hidden=!can('edr.manage')||!compatible;
      if(!policyDirty){find('#edrPolicyMode').value=row.policy.mode;find('#edrRealtime').checked=row.policy.realtime;find('#edrFirewall').checked=row.policy.firewall;policyRevision=row.revision;}
      find('#edrPolicySave').disabled=busy||!policyDirty||stale;
      find('#edrQuickScan').disabled=busy||stale||!known||!snapshot?.canEnforce||!compatible;
      find('#edrCollect').disabled=busy||stale||!known||!compatible;
      find('#edrEnforcementHint').textContent=snapshot?.canEnforce?'Les actions sont confirmées par le poste après leur exécution.':'La modification des protections nécessite le composant système installé avec les privilèges administrateur / root. Les protections natives déjà actives continuent de fonctionner.';
    }
    function drawEvents(){
      if(!live()||!find('#edrEvents'))return;
      find('#edrEvents').innerHTML=events.map(event=>'<article class="edr-event" data-event-status="'+event.status+'" data-severity="'+esc(event.severity||'medium')+'"><header><span class="security-badge" data-event="'+event.status+'">'+esc(eventLabels[event.status])+'</span><span class="edr-event-severity" data-severity="'+esc(event.severity||'medium')+'">'+esc(({'critical':'Critique','high':'Élevée','medium':'Moyenne','low':'Faible','info':'Info'})[event.severity||'medium'])+'</span><time>'+esc(time(event.occurredAt))+'</time></header><h3>'+esc(event.title)+'</h3><p>'+esc(event.provider)+'</p>'+(event.resource?'<p class="edr-event-resource">'+esc(event.resource)+'</p>':'')+'<details><summary>Preuve et détails</summary><p>'+esc(event.detail)+'</p></details>'+(event.acknowledgedAt?'<small>Acquitté le '+esc(time(event.acknowledgedAt))+'</small>':can('edr.acknowledge')?'<button type="button" data-edr-ack="'+event.key+'" '+(busy?'disabled':'')+'>Acquitter</button>':'')+'</article>').join('')||'<p class="security-note">Aucun événement remonté pour ce poste. Cela ne confirme pas à lui seul l’absence de menace.</p>';
      find('#edrMore').hidden=!next;find('#edrMore').disabled=busy;
      find('#edrCommandHistory').innerHTML=commands.length?'<h3>Actions de protection</h3>'+commands.map(command=>'<article class="edr-command"><strong>'+esc(({'enable-protection':'Activer les protections','quick-scan':'Analyse rapide',refresh:'Collecte de l’état'})[command.action]||command.action)+'</strong><span>'+esc(({queued:'En attente du poste',running:'En cours',completed:'Confirmée par le poste',failed:'Échec signalé par le poste',expired:'Expirée',cancelled:'Annulée'})[command.status]||command.status)+'</span>'+(command.result?.message?'<p>'+esc(command.result.message)+'</p>':'')+'</article>').join(''):'';
    }
    async function loadEvents(append=false){
      if(!selected)return;const id=selected,run=++detailGeneration;
      const result=await request('/events?agentId='+id+(append&&next?'&beforeAt='+next.beforeAt+'&beforeKey='+next.beforeKey:''));
      if(!live()||selected!==id||run!==detailGeneration)return;
      events=append?[...events,...result.events]:result.events;next=result.next;commands=result.commands;drawEvents();
    }
    async function choose(id){
      if(id===selected)return;if(policyDirty&&!await appConfirm('Quitter les modifications de politique non enregistrées ?', {confirmLabel:'Quitter sans enregistrer'})||!live())return;
      selected=id;policyDirty=false;events=[];commands=[];next=null;detailGeneration++;
      const detail=find('#edrPostDetail');detail.hidden=false;detail.innerHTML='<header class="edr-detail-heading"><div><span class="security-kicker">PROTECTION DU POSTE</span><h2 id="edrDetailName"></h2></div></header><div id="edrProtectionState"></div><form id="edrPolicyForm" class="edr-policy"><h3>Politique de protection</h3><label>Mode<select id="edrPolicyMode"><option value="protect">Protéger et maintenir les protections</option><option value="observe">Observer les protections existantes</option></select></label><label class="edr-checkbox"><input id="edrRealtime" type="checkbox">Maintenir la protection en temps réel</label><label class="edr-checkbox"><input id="edrFirewall" type="checkbox">Maintenir le pare-feu activé</label><p class="security-note">Le mode observation et les cases décochées n’arrêtent jamais l’antivirus ni le pare-feu du poste.</p><button id="edrPolicySave" type="submit" disabled>Enregistrer la politique</button></form><div class="edr-post-actions" '+(!can('edr.manage')?'hidden':'')+'><button id="edrQuickScan" type="button">Analyse antivirus rapide</button><button id="edrCollect" type="button">Collecter l’état maintenant</button><p id="edrEnforcementHint" class="security-note"></p></div><section id="edrCommandHistory" class="edr-command-history"></section><section class="edr-events-heading"><h3>Alertes et blocages du poste</h3><p>Les détections et les mesures réellement confirmées restent distinctes.</p></section><div id="edrEvents" role="log" aria-label="Événements de protection">Chargement des événements…</div><button id="edrMore" type="button" hidden>Voir les événements précédents</button>';
      find('#edrPolicyForm').oninput=()=>{policyDirty=true;drawState();};
      find('#edrPolicyForm').onsubmit=async event=>{
        event.preventDefault();if(busy||!policyDirty)return;
        const policy={mode:find('#edrPolicyMode').value,realtime:find('#edrRealtime').checked,firewall:find('#edrFirewall').checked};
        if(policy.mode==='protect'&&!await appConfirm('Appliquer cette politique au poste ? Elle peut réactiver les protections natives et le pare-feu.',{title:'Politique de protection',confirmLabel:'Appliquer'}))return;
        if(!live()||selected!==id)return;busy=true;drawState();
        try{await request('/policy',{agentId:id,revision:policyRevision,policy});if(!live())return;policyDirty=false;status('Politique enregistrée. Le prochain relevé confirmera son application.');}catch(error){status(error.message);}finally{busy=false;if(live())await refresh();}
      };
      async function action(name){if(busy)return;if(name==='quick-scan'&&!await appConfirm('Lancer une analyse antivirus rapide sur ce poste ?', {confirmLabel:'Lancer l’analyse'}))return;if(!live()||id!==selected)return;busy=true;drawState();try{await request('/command',{agentId:id,action:name});status('Action transmise. Son état restera en attente jusqu’à la confirmation du poste.');await loadEvents();}catch(error){status(error.message);}finally{busy=false;if(live()){drawState();drawEvents();}}}
      find('#edrQuickScan').onclick=()=>action('quick-scan');find('#edrCollect').onclick=()=>action('refresh');find('#edrMore').onclick=()=>loadEvents(true).catch(error=>status(error.message));
      draw();try{await loadEvents();}catch(error){status(error.message);}
    }
    async function refresh(){
      if(!live()||busy)return;busy=true;find('#edrRefresh').disabled=true;
      try{const result=await request('');if(!live())return;endpoints=result.endpoints;stale=false;if(selected&&!endpoints.some(row=>row.id===selected)){selected=null;policyDirty=false;find('#edrPostDetail').hidden=true;}
        draw();if(!selected&&endpoints.length)await choose(endpoints[0].id);else if(selected)await loadEvents();status('Relevés reçus · '+new Date(result.serverTime).toLocaleTimeString('fr-FR')+' · Les postes hors ligne restent non confirmés.');
      }catch(error){if(live()){stale=true;status(error.message+' Les états précédents ne sont plus confirmés.');draw();}}
      finally{busy=false;if(live()){find('#edrRefresh').disabled=false;drawState();drawEvents();clearTimeout(timer);timer=setTimeout(refresh,15000);}}
    }
    root.addEventListener('click',async event=>{
      const post=event.target.closest('[data-edr-post]');if(post&&!busy){await choose(post.dataset.edrPost);return;}
      const acknowledge=event.target.closest('[data-edr-ack]');if(!acknowledge||busy)return;busy=true;drawEvents();try{await request('/acknowledge',{agentId:selected,key:acknowledge.dataset.edrAck});await loadEvents();}catch(error){status(error.message);}finally{busy=false;if(live())await refresh();}
    },{signal});
    find('#edrSearch').oninput=event=>{query=event.target.value.trim().toLocaleLowerCase();draw();};find('#edrFilter').onchange=event=>{filter=event.target.value;draw();};find('#edrRefresh').onclick=refresh;
    await refresh();
  }
  return {render,reset};
})();
