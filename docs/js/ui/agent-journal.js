'use strict';

window.WolfGuardAgentJournal=(()=>{
  const statuses={alert:'Alerte',failed:'Échec',blocked:'Bloqué',quarantined:'Quarantaine',removed:'Supprimé',cleaned:'Nettoyé',info:'Information'};
  const severities={critical:'Critique',high:'Élevée',medium:'Moyenne',low:'Faible',info:'Info'};
  function create({signal}){
    let host=null,agent=null,events=[],next=null,error='',last=0,loading=false,paused=false,history=false,query='',filter='all',controller=null,revision=0,helpOpen=false;
    const live=()=>!signal.aborted&&host?.isConnected;
    const find=selector=>host?.querySelector(selector);
    function draw(){
      if(!live())return;
      const visible=events.filter(event=>(filter==='all'||filter==='alerts'&&['alert','failed'].includes(event.status)||filter==='info'&&event.status==='info')&&(!query||[event.title,event.provider,event.resource,event.detail].some(value=>String(value||'').toLocaleLowerCase().includes(query))));
      const list=find('.agent-journal-list'),top=list.scrollTop;
      const open=new Set([...list.querySelectorAll('details[open]')].map(row=>row.dataset.logKey));
      const focused=document.activeElement?.closest('[data-log-key]')?.dataset.logKey;
      const html=visible.map(event=>'<article class="agent-log-row" data-log-status="'+esc(event.status)+'" data-severity="'+esc(event.severity)+'"><time datetime="'+new Date(event.occurredAt).toISOString()+'">'+esc(new Date(event.occurredAt).toLocaleString('fr-FR'))+'</time><span class="agent-log-level">'+esc(statuses[event.status]||event.status)+'<small>'+esc(severities[event.severity]||'')+'</small></span><div><strong>'+esc(event.title)+'</strong><span class="agent-log-provider">'+esc(event.provider)+'</span><details data-log-key="'+esc(event.key||event.id)+'" '+(open.has(event.key||event.id)?'open':'')+'><summary>Détails</summary>'+(event.resource?'<p>'+esc(event.resource)+'</p>':'')+'<p>'+esc(event.detail||'Aucun détail complémentaire.')+'</p>'+(event.acknowledgedAt?'<p>Acquitté le '+esc(new Date(event.acknowledgedAt).toLocaleString('fr-FR'))+'</p>':'')+'</details></div></article>').join('')||'<p class="agent-journal-empty">'+(loading?'Chargement du journal…':events.length?'Aucun événement pour ces filtres.':'Aucun événement remonté par ce poste.')+'</p>';
      if(list.innerHTML!==html){list.innerHTML=html;list.scrollTop=top;if(focused)list.querySelector('[data-log-key="'+CSS.escape(focused)+'"] summary')?.focus({preventScroll:true});}
      find('[data-journal-status]').textContent=error?'Actualisation impossible : '+error+(events.length?' · Derniers événements conservés.':''):loading?'Chargement…':events.length+' événement(s) chargé(s)'+(paused?' · Actualisation en pause':history?' · Consultation de l’historique':last?' · Actualisé à '+new Date(last).toLocaleTimeString('fr-FR'):'');
      find('[data-journal-refresh]').disabled=loading;
      find('[data-journal-more]').hidden=!next;find('[data-journal-more]').disabled=loading;
      find('[data-journal-pause]').textContent=paused?'Reprendre':'Pause';find('[data-journal-pause]').setAttribute('aria-pressed',String(paused));
      list.setAttribute('aria-busy',String(loading));
    }
    async function refresh({append=false,force=false}={}){
      if(!live()||loading||!force&&(paused||history||Date.now()-last<8000))return;
      loading=true;error='';draw();const id=agent.id,run=++revision;controller=new AbortController();
      try{
        const cursor=append&&next?'&beforeAt='+encodeURIComponent(next.beforeAt)+'&beforeKey='+encodeURIComponent(next.beforeKey):'';
        const result=await WolfGuardCloud.agentRequest('edr/events?agentId='+encodeURIComponent(id)+cursor,undefined,{signal:AbortSignal.any([signal,controller.signal])});
        if(!live()||run!==revision||agent.id!==id)return;
        events=[...new Map((append?[...events,...result.events]:result.events).map(event=>[event.key||event.id,event])).values()].sort((a,b)=>b.occurredAt-a.occurredAt||String(b.key||b.id).localeCompare(String(a.key||a.id)));
        next=result.next;history=append;last=Date.now();
      }catch(problem){if(live()&&run===revision&&problem.name!=='AbortError'){error=problem.message;if(problem.status===401||problem.status===403){events=[];next=null;}}}
      finally{if(run===revision){loading=false;draw();}}
    }
    function hide(){revision++;controller?.abort();controller=null;loading=false;host=null;}
    function close(){hide();agent=null;events=[];next=null;last=0;history=false;error='';query='';filter='all';paused=false;helpOpen=false;}
    function show(target,post){
      if(!target||signal.aborted)return;
      if(agent?.id!==post.id)close();
      agent=post;
      if(target!==host){
        host=target;
        host.innerHTML='<details class="agent-journal-help" '+(helpOpen?'open':'')+'><summary>Quels logs sont remontés ?</summary><ul><li>Détections, blocages, quarantaines et restaurations signalés par les antivirus.</li><li>Protections désactivées, signatures à actualiser et rétablissements confirmés.</li><li>Installation de WolfGuard Antivirus et vérification des signatures : résultats et échecs.</li></ul><p>Chaque ligne indique la date, la gravité, le fournisseur et les détails reçus, avec le chemin concerné lorsqu’il est fourni.</p></details><div class="agent-journal-controls"><label>Rechercher<input type="search" data-journal-search placeholder="Événement, fichier, fournisseur…"></label><label>Afficher<select data-journal-filter><option value="all">Tous les événements</option><option value="alerts">Alertes et échecs</option><option value="info">Informations</option></select></label><button type="button" data-journal-pause aria-pressed="false">Pause</button><button type="button" data-journal-refresh>Actualiser</button></div><p data-journal-status role="status"></p><div class="agent-journal-list" role="log" aria-live="off" tabindex="0" aria-label="Journal horodaté remonté par l’agent"></div><button type="button" data-journal-more hidden>Événements plus anciens</button>';
        find('.agent-journal-help').ontoggle=event=>{helpOpen=event.target.open;};
        find('[data-journal-search]').value=query;find('[data-journal-search]').oninput=event=>{query=event.target.value.trim().toLocaleLowerCase();draw();};
        find('[data-journal-filter]').value=filter;find('[data-journal-filter]').onchange=event=>{filter=event.target.value;draw();};
        find('[data-journal-refresh]').onclick=()=>refresh({force:true});
        find('[data-journal-pause]').onclick=()=>{paused=!paused;draw();if(!paused)refresh();};
        find('[data-journal-more]').onclick=()=>refresh({append:true,force:true});draw();
      }
      refresh();
    }
    signal.addEventListener('abort',close,{once:true});
    return {show,hide,close};
  }
  return {create};
})();
