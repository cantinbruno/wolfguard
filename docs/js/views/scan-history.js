'use strict';

const webScanHistory = (() => {
  const kinds=['passive','active','map','vulnerability'];
  const statuses={queued:'En attente',running:'En cours',completed:'Terminé',cancelled:'Arrêté',failed:'Échec',expired:'Agent indisponible',lost:'Connexion perdue',saved:'Archive enregistrée'};
  const date=value=>{const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'Date non fournie':parsed.toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'});};
  const searchText=value=>String(value||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('fr');
  const partial=new Set(['cancelled','failed','expired','lost']);
  let generation=0,root=null,dispose=null;
  function unmount(){generation++;dispose?.();dispose=null;root?.replaceChildren();root=null;}
  function mount(panel){
    unmount();if(!panel)return;root=panel;const token=generation,key=state.vaultKey;
    const live=()=>token===generation&&panel.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    const find=selector=>panel.querySelector(selector);
    const lifetime=new AbortController();let exportController=null;
    dispose=()=>{lifetime.abort();exportController?.abort();};
    let items=[],kind='all',query='',stateFilter='all',from='',to='',sort='recent',page=0,loading=false,complete=false,busy=false;
    panel.innerHTML=`<header class="settings-panel-head scan-history-heading"><div class="settings-heading">${settingsIcon('history')}<h3>Historique des scans</h3></div><span class="settings-status" id="wgHistoryCount">Chargement…</span></header>
      <p class="scan-history-intro">Retrouve tes anciens scans et leurs rapports PDF WolfGuard. Les résultats de l’agent sont conservés sans expiration automatique.</p>
      <div class="scan-history-toolbar"><label class="scan-history-search">${PROTOCOL_ICONS.search}<input id="wgHistorySearch" type="search" aria-label="Rechercher un ancien scan" placeholder="Cible, poste, nom du relevé…" autocomplete="off"></label><button type="button" class="settings-btn settings-btn-icon" id="wgHistoryRefresh" title="Actualiser l’historique" aria-label="Actualiser l’historique">${settingsIcon('refresh-cw')}</button><button type="button" class="settings-btn primary" id="wgHistoryExportAll" disabled>${settingsIcon('download')}Exporter tout</button></div>
      <div class="scan-history-filters" role="group" aria-label="Type de scan">${[['all','Tous'],['passive','Passif'],['active','Actif'],['map','Cartographie'],['vulnerability','Vulnérabilités']].map(([value,label])=>'<button type="button" data-history-kind="'+value+'" aria-pressed="'+(value==='all')+'">'+label+'<span>0</span></button>').join('')}</div>
      <div class="scan-history-refine"><label>État<select id="wgHistoryState"><option value="all">Tous les états</option><option value="completed">Terminés</option><option value="progress">En attente / en cours</option><option value="partial">Interrompus / en échec</option><option value="saved">Anciens relevés enregistrés</option></select></label><label>Du<input id="wgHistoryFrom" type="date"></label><label>Au<input id="wgHistoryTo" type="date"></label><label>Ordre<select id="wgHistorySort"><option value="recent">Plus récents</option><option value="oldest">Plus anciens</option></select></label><button type="button" class="settings-btn" id="wgHistoryReset" hidden>Effacer les filtres</button></div>
      <div id="wgHistoryExportProgress" class="scan-history-export-progress" hidden><div><progress id="wgHistoryProgress" value="0" max="1" aria-label="Rapports PDF préparés"></progress><span id="wgHistoryProgressLabel"></span></div><button type="button" class="settings-btn" id="wgHistoryCancel">Annuler l’export</button></div>
      <p id="wgHistoryStatus" class="scan-history-status" role="status" aria-live="polite" aria-atomic="true"></p><div id="wgHistoryList" class="scan-history-list" aria-label="Scans enregistrés"></div><nav id="wgHistoryPages" class="scan-history-pages" aria-label="Pages de l’historique"></nav>`;
    function status(value,error=false){if(!live())return;const el=find('#wgHistoryStatus');el.textContent=value;el.classList.toggle('is-error',error);el.setAttribute('role',error?'alert':'status');}
    const hasFilters=()=>kind!=='all'||!!query||stateFilter!=='all'||!!from||!!to;
    const indexItem=item=>({...item,search:searchText([scanInsights.definitions[item.kind].short,scanInsights.definitions[item.kind].title,item.name,item.target,item.agentName,date(item.createdAt),statuses[item.status]].join(' '))});
    function filtered(){
      const start=from?new Date(from+'T00:00:00').getTime():-Infinity,end=to?new Date(to+'T00:00:00'):null;
      if(end)end.setDate(end.getDate()+1);
      const rows=items.filter(item=>(kind==='all'||item.kind===kind)&&(!query||item.search.includes(query))&&item.createdAt>=start&&(!end||item.createdAt<end.getTime())&&(stateFilter==='all'||stateFilter==='progress'&&['queued','running'].includes(item.status)||stateFilter==='partial'&&partial.has(item.status)||item.status===stateFilter));
      return sort==='oldest'?rows.reverse():rows;
    }
    function controls(){
      const rows=filtered();find('#wgHistoryExportAll').disabled=busy||!complete||!rows.length;
      find('#wgHistoryExportAll').innerHTML=settingsIcon('download')+(hasFilters()?'Exporter la sélection':'Exporter tout')+' <span>('+rows.length+')</span>';
      find('#wgHistoryExportAll').setAttribute('aria-busy',String(busy));
      find('#wgHistoryRefresh').disabled=busy||loading;
      find('#wgHistoryList').setAttribute('aria-busy',String(loading));
      find('#wgHistoryReset').hidden=!hasFilters();
      for(const control of panel.querySelectorAll('.scan-history-refine input,.scan-history-refine select,#wgHistoryReset,#wgHistorySearch,[data-history-kind]'))control.disabled=busy;
      for(const button of panel.querySelectorAll('[data-history-export]'))button.disabled=busy;
      for(const button of panel.querySelectorAll('[data-history-delete]'))button.disabled=busy||loading||['queued','running'].includes(items.find(item=>item.id===button.dataset.historyDelete)?.status);
    }
    function draw(){
      if(!live())return;
      const rows=filtered(),pages=Math.max(1,Math.ceil(rows.length/20));page=Math.min(page,pages-1);
      find('#wgHistoryCount').textContent=items.length.toLocaleString('fr-FR')+' scan(s)';
      for(const button of panel.querySelectorAll('[data-history-kind]')){button.setAttribute('aria-pressed',String(kind===button.dataset.historyKind));button.querySelector('span').textContent=items.filter(item=>button.dataset.historyKind==='all'||item.kind===button.dataset.historyKind).length;}
      const focused=panel.contains(document.activeElement)?document.activeElement:null,focusId=focused?.id,exportId=focused?.dataset.historyExport,deleteId=focused?.dataset.historyDelete;
      find('#wgHistoryList').innerHTML=rows.slice(page*20,page*20+20).map(item=>'<article class="scan-history-item" data-kind="'+item.kind+'"><span class="scan-history-icon" aria-hidden="true">'+workspaceSectionIcon('scan-'+item.kind)+'</span><div class="scan-history-copy"><div><strong>'+esc(scanInsights.definitions[item.kind].short)+'</strong><span class="scan-history-state" data-status="'+esc(item.status)+'">'+esc(statuses[item.status]||'État non fourni')+'</span></div><p>'+esc(item.target||(item.kind==='vulnerability'?'Poste de l’agent':'Cible non fournie'))+'</p><small>'+esc(item.agentName||item.name||'Source non fournie')+'</small></div><time datetime="'+esc(new Date(item.createdAt).toISOString())+'">'+esc(date(item.createdAt))+'</time><div class="scan-history-actions"><button type="button" class="settings-btn" data-history-export="'+esc(item.id)+'" aria-label="Exporter le PDF '+esc(item.name)+' du '+esc(date(item.createdAt))+'">'+settingsIcon('download')+'Exporter PDF</button><button type="button" class="settings-btn scan-history-delete" data-history-delete="'+esc(item.id)+'" title="'+(['queued','running'].includes(item.status)?'Arr?ter le scan avant de le supprimer':'Supprimer ce scan')+'" aria-label="Supprimer '+esc(item.name)+' du '+esc(date(item.createdAt))+'">'+ITEM_ACTION_ICONS.delete+'Supprimer</button></div></article>').join('')||'<div class="scan-history-empty">'+settingsIcon('history')+'<h4>'+(loading?'Chargement des anciens scans…':items.length?'Aucun scan pour ces filtres':'Aucun ancien scan disponible')+'</h4><p>'+(items.length?'Efface ou ajuste les filtres pour retrouver un relevé.':'Les prochains scans apparaîtront ici. Les résultats supprimés avant l’activation de cet historique ne sont plus récupérables.')+'</p></div>';
      find('#wgHistoryPages').innerHTML=pages>1?'<span role="status" aria-live="polite">'+rows.length+' scan(s) · Page '+(page+1)+' sur '+pages+'</span><div><button type="button" class="settings-btn" id="wgHistoryPrev" '+(page===0?'disabled':'')+'>Précédente</button><button type="button" class="settings-btn" id="wgHistoryNext" '+(page+1===pages?'disabled':'')+'>Suivante</button></div>':'<span role="status" aria-live="polite">'+rows.length+' scan(s)'+(hasFilters()?' pour ces filtres':'')+'</span>';
      if(find('#wgHistoryPrev'))find('#wgHistoryPrev').onclick=()=>{page--;draw();find('#wgHistoryList').scrollIntoView({block:'start',behavior:'instant'});};if(find('#wgHistoryNext'))find('#wgHistoryNext').onclick=()=>{page++;draw();find('#wgHistoryList').scrollIntoView({block:'start',behavior:'instant'});};
      for(const button of panel.querySelectorAll('[data-history-export]'))button.onclick=()=>exportRows([items.find(item=>item.id===button.dataset.historyExport)],false);
      for(const button of panel.querySelectorAll('[data-history-delete]'))button.onclick=()=>deleteRow(items.find(item=>item.id===button.dataset.historyDelete));
      controls();
      if(focused&&!focused.isConnected){const target=exportId?[...panel.querySelectorAll('[data-history-export]')].find(button=>button.dataset.historyExport===exportId):deleteId?[...panel.querySelectorAll('[data-history-delete]')].find(button=>button.dataset.historyDelete===deleteId):focusId?find('#'+focusId):null;if(target&&!target.disabled)target.focus({preventScroll:true});else find('#wgHistoryList').focus({preventScroll:true});}
    }
    async function legacy(){
      const settings=await Promise.all(kinds.map(value=>get('settings','scan-web-'+value+'-reports-v1')));if(!live())return;
      let invalid=0;const records=[];
      for(const [index,record] of settings.entries())for(const [position,raw] of (Array.isArray(record?.value?.reports)?record.value.reports:[]).entries()){
        try{
          const report=webScanModel.parse(JSON.stringify(raw),scanInsights.definitions[kinds[index]].strategy,raw.name,kinds[index]);
          const stamp=new Date(raw.importedAt||report.importedAt);report.importedAt=Number.isNaN(stamp.getTime())?report.importedAt:stamp.toISOString();report.source=String(raw.source||report.source).slice(0,100);report.jobStatus=raw.jobStatus||'';
          records.push(indexItem({id:'saved-'+kinds[index]+'-'+position,kind:kinds[index],name:report.name,target:report.target,agentName:report.name,createdAt:Date.parse(report.importedAt),status:'saved',report,archive:raw,archiveKey:record.key,archivePosition:position}));
        }catch{invalid++;}
      }
      return {invalid,records};
    }
    async function refresh(){
      if(loading||busy||!live())return;loading=true;complete=false;const previous=items;let candidates=[];status('Chargement de l’historique…');draw();
      try{
        const local=await legacy();if(!live())return;const {invalid,records}=local;candidates=records;
        if(workspaceAgents.available()){
          let cursor=null;const seen=new Set(),jobs=new Map();
          do{
            const response=await WolfGuardCloud.agentRequest('scans?history=1'+(cursor?'&beforeAt='+cursor.beforeAt+'&beforeId='+cursor.beforeId:''),undefined,{signal:lifetime.signal});if(!live())return;
            if(!Array.isArray(response.jobs))throw new Error('La liste des anciens scans est invalide.');
            for(const job of response.jobs){if(!kinds.includes(job.workspace)||!/^[a-f0-9]{32}$/.test(job.id)||!Number.isSafeInteger(job.createdAt)||Number.isNaN(new Date(job.createdAt).getTime()))throw new Error('Un ancien scan contient des métadonnées invalides.');jobs.set(job.id,indexItem({...job,kind:job.workspace,name:scanInsights.definitions[job.workspace].short+' · '+(job.agentName||'Poste non fourni')}));}
            candidates=[...records,...jobs.values()];if(!previous.length){items=[...candidates].sort((a,b)=>b.createdAt-a.createdAt);draw();}
            cursor=response.next;if(cursor){if(!Number.isSafeInteger(cursor.beforeAt)||!/^[a-f0-9]{32}$/.test(cursor.beforeId)||seen.has(cursor.beforeId))throw new Error('Le chargement des anciens scans a été interrompu.');seen.add(cursor.beforeId);status(items.length+' scans chargés · Recherche des relevés plus anciens…');}
          }while(cursor);
        }
        if(!live())return;items=candidates.sort((a,b)=>b.createdAt-a.createdAt);complete=true;
        status(invalid?invalid+' ancienne(s) archive(s) illisible(s). Les autres rapports restent exportables.':workspaceAgents.available()?'Historique à jour · Export individuel ou archive ZIP de la sélection.':'Archives locales disponibles. Connecte-toi au site pour retrouver les scans de l’agent.',!!invalid);
      }catch(error){if(live()){items=[...new Map([...previous,...candidates].map(item=>[item.id,item])).values()].sort((a,b)=>b.createdAt-a.createdAt);status('Historique incomplet : '+error.message+' Les relevés déjà chargés restent disponibles. Actualise pour réessayer.',true);}}
      finally{loading=false;if(live())draw();}
    }
    async function deleteRow(item){
      if(busy||loading||!live()||!item||['queued','running'].includes(item.status))return;
      busy=true;controls();
      try{
        const accepted=await appConfirm('Supprimer le scan « '+item.name+' » du '+date(item.createdAt)+(item.target?' pour '+item.target:'')+' ? Son rapport sera définitivement supprimé de l’historique.',{title:'Supprimer ce scan ?',confirmLabel:'Supprimer',danger:true});
        if(!accepted||!live())return;
        status('Suppression du scan…');
        if(item.status==='saved'){
          const record=await get('settings',item.archiveKey);if(!live())return;
          const reports=record?.value?.reports;
          if(!Array.isArray(reports)||JSON.stringify(reports[item.archivePosition])!==JSON.stringify(item.archive))throw new Error('Cette archive a changé. Actualise l’historique puis réessaie.');
          await put('settings',{...record,value:{...record.value,reports:reports.filter((_,index)=>index!==item.archivePosition)}});if(!live())return;
          const local=await legacy();if(!live())return;
          items=[...items.filter(row=>row.status!=='saved'),...local.records].sort((a,b)=>b.createdAt-a.createdAt);
        }else{
          await WolfGuardCloud.agentRequest('scans/delete',{id:item.id},{signal:lifetime.signal});if(!live())return;
          items=items.filter(row=>row.id!==item.id);
        }
        status('Scan supprimé de l’historique.');
      }catch(error){if(live())status('Suppression impossible : '+error.message,true);}
      finally{busy=false;if(live()){draw();const target=[...panel.querySelectorAll('[data-history-delete]')].find(button=>button.dataset.historyDelete===item.id)||find('#wgHistoryList');target.focus({preventScroll:true});}}
    }
    async function resolve(item,signal){
      if(item.report)return item.report;
      const data=await WolfGuardCloud.agentRequest('scans/result?id='+item.id,undefined,{signal});if(!live()||signal.aborted)return null;
      if(data.id!==item.id||(data.workspace||data.spec?.workspace)!==item.kind)throw new Error('Le rapport reçu ne correspond pas au scan demandé.');
      return webScanAgent.fromJob({...data,agentName:item.agentName,platform:item.platform});
    }
    async function exportRows(rows,bulk){
      if(busy||!live()||!rows.length)return;busy=true;const controller=new AbortController();exportController=controller;
      const active=()=>live()&&!controller.signal.aborted;
      const progress=find('#wgHistoryExportProgress'),meter=find('#wgHistoryProgress'),label=find('#wgHistoryProgressLabel');
      progress.hidden=false;meter.max=rows.length;meter.value=0;label.textContent='0 / '+rows.length;find('#wgHistoryCancel').disabled=false;controls();
      try{
        const files=[];let bytes=0;
        for(const [index,item] of rows.entries()){
          status('Préparation du rapport '+(index+1)+' / '+rows.length+'…');
          if(!active())return;
          const report=await resolve(item,controller.signal);if(!active()||!report)return;
          const output=await webScanReport.file(item.kind,report);if(!active())return;
          bytes+=output.content.byteLength;
          if(bytes>128*1024*1024)throw new Error('L’ensemble dépasse 128 Mo. Filtre l’historique par type ou par cible, puis réessaie.');
          files.push(output);
          meter.value=index+1;label.textContent=(index+1)+' / '+rows.length;
        }
        if(!active())return;
        if(bulk)webScanReport.downloadArchive(files);else webScanReport.downloadFile(files[0]);
        if(live())status(bulk?files.length+' rapport(s) PDF exporté(s) dans l’archive ZIP.':'Rapport exporté. Le fichier PDF est prêt à être ouvert ou partagé.');
      }catch(error){if(active())status('Export impossible : '+error.message,true);}
      finally{busy=false;exportController=null;if(live()){const restoreFocus=progress.contains(document.activeElement);progress.hidden=true;controls();if(restoreFocus)find('#wgHistoryExportAll').focus({preventScroll:true});}}
    }
    find('#wgHistoryList').tabIndex=-1;
    find('#wgHistoryCancel').onclick=()=>{exportController?.abort();find('#wgHistoryCancel').disabled=true;status('Export annulé. Aucun fichier téléchargé.');};
    find('#wgHistorySearch').oninput=event=>{query=searchText(event.target.value.trim());page=0;draw();};
    for(const [selector,update] of [['#wgHistoryState',value=>stateFilter=value],['#wgHistoryFrom',value=>from=value],['#wgHistoryTo',value=>to=value],['#wgHistorySort',value=>sort=value]])find(selector).onchange=event=>{update(event.target.value);page=0;find('#wgHistoryFrom').max=to;find('#wgHistoryTo').min=from;draw();};
    find('#wgHistoryReset').onclick=()=>{kind='all';query='';stateFilter='all';from='';to='';page=0;find('#wgHistorySearch').value='';find('#wgHistoryState').value='all';for(const id of ['From','To']){const input=find('#wgHistory'+id);input.value='';input.removeAttribute('min');input.removeAttribute('max');}draw();find('#wgHistorySearch').focus({preventScroll:true});};
    for(const button of panel.querySelectorAll('[data-history-kind]'))button.onclick=()=>{kind=button.dataset.historyKind;page=0;draw();};
    find('#wgHistoryRefresh').onclick=refresh;find('#wgHistoryExportAll').onclick=()=>exportRows(filtered(),true);
    refresh();
  }
  return {mount,unmount};
})();
