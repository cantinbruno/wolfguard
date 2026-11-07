'use strict';

const edrWorkspace=(()=>{
  let generation=0,timer=0;
  const request=(path,value)=>WolfGuardCloud.agentRequest(path,value);
  function summary(job,data,now=Date.now()){
    const rows=Array.isArray(data?.report?.results)?data.report.results.filter(row=>row.transport==='AUDIT'):[];
    return {issues:rows.filter(row=>row.status==='issue'),unchecked:rows.filter(row=>row.status==='notchecked').length,passed:rows.filter(row=>row.status==='passed').length,
      fresh:!!job&&job.status==='completed'&&rows.length>0&&now-job.createdAt<86400000,rows,job};
  }
  function reset(){generation++;clearTimeout(timer);}
  async function render(){
    reset();const token=generation,key=state.vaultKey,root=document.createElement('section');root.className='edr-workspace';$('#content').replaceChildren(root);
    root.innerHTML='<header class="security-workspace-heading"><div><span class="security-kicker">SURVEILLANCE DES POSTES</span><h1>EDR</h1><p>État des agents, contrôles de sécurité et alertes des derniers audits.</p></div><div class="security-actions"><button type="button" id="edrAgents">Gérer les agents</button><button type="button" id="edrRefresh">Actualiser</button></div></header><p class="security-note">Surveillance par audits à la demande. Les dates et contrôles non vérifiés restent visibles ; aucune protection en continu ni remédiation automatique.</p><div id="edrMetrics" class="edr-metrics"></div><div class="edr-filters"><label>Rechercher un poste<input id="edrSearch" type="search" placeholder="Nom du poste…"></label><label>Afficher<select id="edrFilter"><option value="all">Tous les postes</option><option value="issues">Avec alertes</option><option value="missing">Sans audit récent</option><option value="offline">Hors ligne</option></select></label></div><p id="edrStatus" role="status" aria-live="polite">Chargement des postes…</p><div id="edrPosts" class="edr-posts"></div>';
    const live=()=>token===generation&&root.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    const find=selector=>root.querySelector(selector);let agents=[],audits=new Map(),jobs=new Map(),busy=false,stale=false,query='',filter='all',limited=false;
    find('#edrAgents').onclick=()=>openAgentsInterface();
    function draw(){
      if(!live())return;
      const issueCount=[...audits.values()].reduce((sum,audit)=>sum+audit.issues.length,0);
      find('#edrMetrics').innerHTML=[['Postes',agents.length],['Connectés',stale?'À confirmer':agents.filter(agent=>agent.online).length],['Alertes relevées',issueCount],['Sans audit récent',agents.filter(agent=>!audits.get(agent.id)?.fresh).length]].map(([label,value])=>'<article><span>'+label+'</span><strong>'+value+'</strong></article>').join('');
      const selected=agents.filter(agent=>agent.name.toLocaleLowerCase().includes(query)&&('all'===filter||filter==='offline'&&!agent.online||filter==='issues'&&audits.get(agent.id)?.issues.length||filter==='missing'&&!audits.get(agent.id)?.fresh));
      find('#edrPosts').innerHTML=selected.map(agent=>{
        const audit=audits.get(agent.id),job=jobs.get(agent.id),working=job&&['queued','running'].includes(job.status),canRun=!window.WolfGuardAccess||WolfGuardAccess.can('scan.vulnerability.run'),compatible=agent.capabilities?.includes('security-audit-v1');
        const headline=working?'Audit en cours':!job?'Aucun audit disponible':!audit?.rows.length?'Audit sans résultat exploitable':!audit.fresh?'Audit ancien ou incomplet':audit.issues.length?audit.issues.length+' alerte(s) relevée(s)':'Aucune alerte parmi les contrôles effectués';
        return '<article class="edr-post"><header><div><h2>'+esc(agent.name)+'</h2><p>'+esc(workspaceAgents.platformName(agent.platform))+' · Dernier contact : '+esc(new Date(agent.lastSeen).toLocaleString('fr-FR'))+'</p></div><span class="security-badge" data-state="'+(stale?'unknown':agent.online?'online':'offline')+'">'+(stale?'État non confirmé':agent.online?'Connecté':'Hors ligne')+'</span></header><div class="edr-audit-state"><strong>'+esc(headline)+'</strong><span>'+(job?'Audit du '+esc(new Date(audit?.job?.createdAt||job.createdAt).toLocaleString('fr-FR'))+' · '+esc(({queued:'Nouvel audit en attente',running:'Nouvel audit en cours',completed:'Terminé',cancelled:'Dernière collecte arrêtée',failed:'Dernière collecte en échec',expired:'Dernière demande expirée',lost:'Dernière collecte interrompue'})[job.status]||job.status):'Lance un premier audit pour connaître l’état des protections.')+'</span></div>'+(audit?.rows.length?'<p>'+audit.rows.length+' contrôles · '+audit.unchecked+' non vérifiés</p><div class="edr-findings">'+audit.issues.map(row=>'<details><summary><span class="security-badge" data-severity="'+esc(row.severity||'medium')+'">'+esc(({critical:'Critique',high:'Élevée',medium:'Moyenne',low:'Faible'})[row.severity]||'À vérifier')+'</span>'+esc(row.title||row.checkId)+'</summary><p>'+esc(row.detail||'Preuve non disponible.')+'</p>'+(row.recommendation?'<p><strong>Recommandation :</strong> '+esc(row.recommendation)+'</p>':'')+'</details>').join('')+'</div>':'')+'<footer><span>'+(!compatible?'Mets à jour cet agent pour l’audit de sécurité.':'Les résultats décrivent le poste au moment de la collecte.')+'</span><button type="button" data-edr-audit="'+esc(agent.id)+'" '+(!canRun||!compatible||stale||!agent.online||working||busy?'disabled':'')+'>Lancer un audit</button></footer></article>';
      }).join('')||'<div class="security-empty"><h2>'+(agents.length?'Aucun poste pour ces filtres':'Aucun poste associé')+'</h2><p>'+(agents.length?'Modifie la recherche ou le filtre.':'Ajoute un poste depuis Agents pour commencer la surveillance.')+'</p></div>';
      for(const button of root.querySelectorAll('[data-edr-audit]'))button.onclick=async()=>{
        if(busy||!live())return;busy=true;draw();
        try{await request('scans',{agentId:button.dataset.edrAudit,workspace:'vulnerability',strategy:'passive',passiveScope:'security'});if(live())find('#edrStatus').textContent='Audit demandé. Les résultats apparaîtront à la fin de la collecte.';}
        catch(error){if(live())find('#edrStatus').textContent=error.message;}
        finally{busy=false;if(live())await refresh();}
      };
    }
    async function refresh(){
      if(busy||!live())return;busy=true;find('#edrRefresh').disabled=true;
      try{
        if(!workspaceAgents.available())throw new Error('Connecte-toi à ton espace partagé pour surveiller les postes.');
        const listed=await request('agents');if(!live())return;
        const nextJobs=new Map(),nextEvidence=new Map();let cursor='',page=0,next=null;
        do{
          const history=await request('scans?history=1'+cursor);if(!live())return;
          for(const job of history.jobs||[])if(job.workspace==='vulnerability'){if(!nextJobs.has(job.agentId))nextJobs.set(job.agentId,job);if(job.hasReport&&!nextEvidence.has(job.agentId))nextEvidence.set(job.agentId,job);}
          next=history.next;cursor=next?'&beforeAt='+next.beforeAt+'&beforeId='+next.beforeId:'';page++;
        }while(next&&page<20&&listed.agents.some(agent=>!nextEvidence.has(agent.id)));
        const results=await Promise.allSettled(listed.agents.map(async agent=>{const job=nextEvidence.get(agent.id)||nextJobs.get(agent.id);return [agent.id,summary(job,job?.hasReport?await request('scans/result?id='+job.id):null)];}));
        if(!live())return;const nextAudits=new Map();let failures=0;
        for(const result of results)if(result.status==='fulfilled')nextAudits.set(result.value[0],result.value[1]);else failures++;
        agents=listed.agents;jobs=nextJobs;audits=nextAudits;stale=false;limited=!!next&&page>=20;
        find('#edrStatus').textContent='Actualisé à '+new Date().toLocaleTimeString('fr-FR')+(failures?' · '+failures+' rapport(s) indisponible(s).':'')+(limited?' · Recherche limitée aux 1 000 derniers scans.':'');
        draw();
      }catch(error){if(live()){stale=true;find('#edrStatus').textContent=error.message+' Les états précédents ne sont plus confirmés.';draw();}}
      finally{busy=false;if(live()){draw();find('#edrRefresh').disabled=false;clearTimeout(timer);timer=setTimeout(refresh,20000);}}
    }
    find('#edrSearch').oninput=event=>{query=event.target.value.trim().toLocaleLowerCase();draw();};find('#edrFilter').onchange=event=>{filter=event.target.value;draw();};find('#edrRefresh').onclick=refresh;
    await refresh();
  }
  return {render,reset,summary};
})();
