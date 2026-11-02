'use strict';

const webScanHistory = (() => {
  const kinds=['passive','active','map','vulnerability'];
  const statuses={queued:'En attente',running:'En cours',completed:'Terminé',cancelled:'Arrêté',failed:'Échec',expired:'Agent indisponible',lost:'Connexion perdue',saved:'Archive enregistrée'};
  const date=value=>{const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'Date non fournie':parsed.toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'});};
  let generation=0,root=null;
  function unmount(){generation++;root?.replaceChildren();root=null;}
  function mount(panel){
    unmount();if(!panel)return;root=panel;const token=generation,key=state.vaultKey;
    const live=()=>token===generation&&panel.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    const find=selector=>panel.querySelector(selector);
    let items=[],kind='all',query='',page=0,loading=false,complete=false,busy=false;
    panel.innerHTML=`<header class="settings-panel-head scan-history-heading"><div class="settings-heading">${settingsIcon('history')}<h3>Historique des scans</h3></div><span class="settings-status" id="wgHistoryCount">Chargement…</span></header>
      <p class="scan-history-intro">Retrouve tes anciens scans et leurs rapports PDF WolfGuard. Les résultats de l’agent sont conservés sans expiration automatique.</p>
      <div class="scan-history-toolbar"><label class="scan-history-search">${PROTOCOL_ICONS.search}<input id="wgHistorySearch" type="search" aria-label="Rechercher un ancien scan" placeholder="Cible, poste, nom du relevé…" autocomplete="off"></label><button type="button" class="settings-btn settings-btn-icon" id="wgHistoryRefresh" title="Actualiser l’historique" aria-label="Actualiser l’historique">${settingsIcon('refresh-cw')}</button><button type="button" class="settings-btn primary" id="wgHistoryExportAll" disabled>${settingsIcon('download')}Exporter tout</button></div>
      <div class="scan-history-filters" role="group" aria-label="Type de scan">${[['all','Tous'],['passive','Passif'],['active','Actif'],['map','Cartographie'],['vulnerability','Vulnérabilités']].map(([value,label])=>'<button type="button" data-history-kind="'+value+'" aria-pressed="'+(value==='all')+'">'+label+'<span>0</span></button>').join('')}</div>
      <p id="wgHistoryStatus" class="scan-history-status" role="status" aria-live="polite"></p><div id="wgHistoryList" class="scan-history-list" aria-label="Scans enregistrés"></div><nav id="wgHistoryPages" class="scan-history-pages" aria-label="Pages de l’historique"></nav>`;
    function status(value,error=false){if(!live())return;const el=find('#wgHistoryStatus');el.textContent=value;el.classList.toggle('is-error',error);el.setAttribute('role',error?'alert':'status');}
    const filtered=()=>items.filter(item=>(kind==='all'||item.kind===kind)&&(!query||[scanInsights.definitions[item.kind].short,item.name,item.target,item.agentName,date(item.createdAt)].join(' ').toLocaleLowerCase('fr').includes(query)));
    function controls(){
      const rows=filtered();find('#wgHistoryExportAll').disabled=busy||!complete||!rows.length;
      find('#wgHistoryExportAll').innerHTML=settingsIcon('download')+(kind==='all'&&!query?'Exporter tout':'Exporter la sélection')+' <span>('+rows.length+')</span>';
      find('#wgHistoryRefresh').disabled=busy||loading;
      for(const button of panel.querySelectorAll('[data-history-export]'))button.disabled=busy;
    }
    function draw(){
      if(!live())return;
      const rows=filtered(),pages=Math.max(1,Math.ceil(rows.length/20));page=Math.min(page,pages-1);
      find('#wgHistoryCount').textContent=items.length.toLocaleString('fr-FR')+' scan(s)';
      for(const button of panel.querySelectorAll('[data-history-kind]')){button.setAttribute('aria-pressed',String(kind===button.dataset.historyKind));button.querySelector('span').textContent=items.filter(item=>button.dataset.historyKind==='all'||item.kind===button.dataset.historyKind).length;}
      find('#wgHistoryList').innerHTML=rows.slice(page*20,page*20+20).map(item=>'<article class="scan-history-item" data-kind="'+item.kind+'"><span class="scan-history-icon" aria-hidden="true">'+workspaceSectionIcon('scan-'+item.kind)+'</span><div class="scan-history-copy"><div><strong>'+esc(scanInsights.definitions[item.kind].short)+'</strong><span class="scan-history-state" data-status="'+esc(item.status)+'">'+esc(statuses[item.status]||'État non fourni')+'</span></div><p>'+esc(item.target||(item.kind==='vulnerability'?'Poste de l’agent':'Cible non fournie'))+'</p><small>'+esc(item.agentName||item.name||'Source non fournie')+'</small></div><time datetime="'+esc(new Date(item.createdAt).toISOString())+'">'+esc(date(item.createdAt))+'</time><button type="button" class="settings-btn" data-history-export="'+esc(item.id)+'" aria-label="Exporter '+esc(item.name)+'">'+settingsIcon('download')+'Exporter PDF</button></article>').join('')||'<div class="scan-history-empty">'+settingsIcon('history')+'<h4>'+(loading?'Chargement des anciens scans…':items.length?'Aucun scan pour ces filtres':'Aucun ancien scan disponible')+'</h4><p>'+(items.length?'Change de type ou de recherche pour retrouver un relevé.':'Les prochains scans apparaîtront ici. Les résultats supprimés avant l’activation de cet historique ne sont plus récupérables.')+'</p></div>';
      find('#wgHistoryPages').innerHTML=pages>1?'<span>'+rows.length+' scan(s) · Page '+(page+1)+' sur '+pages+'</span><div><button type="button" class="settings-btn" id="wgHistoryPrev" '+(page===0?'disabled':'')+'>Précédente</button><button type="button" class="settings-btn" id="wgHistoryNext" '+(page+1===pages?'disabled':'')+'>Suivante</button></div>':'<span>'+rows.length+' scan(s)'+(query||kind!=='all'?' pour ces filtres':'')+'</span>';
      if(find('#wgHistoryPrev'))find('#wgHistoryPrev').onclick=()=>{page--;draw();};if(find('#wgHistoryNext'))find('#wgHistoryNext').onclick=()=>{page++;draw();};
      for(const button of panel.querySelectorAll('[data-history-export]'))button.onclick=()=>exportRows([items.find(item=>item.id===button.dataset.historyExport)],false);
      controls();
    }
    async function legacy(){
      const records=await Promise.all(kinds.map(value=>get('settings','scan-web-'+value+'-reports-v1')));if(!live())return;
      let invalid=0;
      for(const [index,record] of records.entries())for(const [position,raw] of (Array.isArray(record?.value?.reports)?record.value.reports:[]).entries()){
        try{
          const report=webScanModel.parse(JSON.stringify(raw),scanInsights.definitions[kinds[index]].strategy,raw.name,kinds[index]);
          const stamp=new Date(raw.importedAt||report.importedAt);report.importedAt=Number.isNaN(stamp.getTime())?report.importedAt:stamp.toISOString();report.source=String(raw.source||report.source).slice(0,100);report.jobStatus=raw.jobStatus||'';
          items.push({id:'saved-'+kinds[index]+'-'+position,kind:kinds[index],name:report.name,target:report.target,agentName:report.name,createdAt:Date.parse(report.importedAt),status:'saved',report});
        }catch{invalid++;}
      }
      return invalid;
    }
    async function refresh(){
      if(loading||busy||!live())return;loading=true;complete=false;items=[];page=0;status('Chargement de l’historique…');draw();
      try{
        const invalid=await legacy();if(!live())return;
        if(workspaceAgents.available()){
          let cursor=null;const seen=new Set(),jobs=new Map();
          do{
            const response=await WolfGuardCloud.agentRequest('scans?history=1'+(cursor?'&beforeAt='+cursor.beforeAt+'&beforeId='+cursor.beforeId:''));if(!live())return;
            for(const job of response.jobs||[]){if(!kinds.includes(job.workspace)||!/^[a-f0-9]{32}$/.test(job.id)||!Number.isSafeInteger(job.createdAt)||Number.isNaN(new Date(job.createdAt).getTime()))throw new Error('Un ancien scan contient des métadonnées invalides.');jobs.set(job.id,{...job,kind:job.workspace,name:scanInsights.definitions[job.workspace].short+' · '+job.agentName});}
            items=[...items.filter(item=>item.report),...jobs.values()].sort((a,b)=>b.createdAt-a.createdAt);draw();
            cursor=response.next;if(cursor){if(!Number.isSafeInteger(cursor.beforeAt)||!/^[a-f0-9]{32}$/.test(cursor.beforeId)||seen.has(cursor.beforeId))throw new Error('Le chargement des anciens scans a été interrompu.');seen.add(cursor.beforeId);status(items.length+' scans chargés · Recherche des relevés plus anciens…');}
          }while(cursor);
        }
        if(!live())return;items.sort((a,b)=>b.createdAt-a.createdAt);complete=true;
        status(invalid?invalid+' ancienne(s) archive(s) illisible(s). Les autres rapports restent exportables.':workspaceAgents.available()?'Historique à jour · Export individuel ou archive ZIP de la sélection.':'Archives locales disponibles. Connecte-toi au site pour retrouver les scans de l’agent.',!!invalid);
      }catch(error){if(live())status('Historique incomplet : '+error.message+' Actualise pour réessayer.',true);}
      finally{loading=false;if(live())draw();}
    }
    async function resolve(item){
      if(item.report)return item.report;
      const data=await WolfGuardCloud.agentRequest('scans/result?id='+item.id);if(!live())return null;
      return webScanAgent.fromJob({...data,agentName:item.agentName,platform:item.platform});
    }
    async function exportRows(rows,bulk){
      if(busy||!live()||!rows.length)return;busy=true;controls();
      try{
        const files=[];let bytes=0;
        for(const [index,item] of rows.entries()){
          status('Préparation du rapport '+(index+1)+' / '+rows.length+'…');
          const report=await resolve(item);if(!live()||!report)return;
          const output=await webScanReport.file(item.kind,report);if(!live())return;
          bytes+=output.content.byteLength;
          if(bytes>128*1024*1024)throw new Error('L’ensemble dépasse 128 Mo. Filtre l’historique par type ou par cible, puis réessaie.');
          files.push(output);
        }
        if(!live())return;
        if(bulk)webScanReport.downloadArchive(files);else webScanReport.downloadFile(files[0]);
        if(live())status(bulk?files.length+' rapport(s) PDF exporté(s) dans l’archive ZIP.':'Rapport exporté. Le fichier PDF est prêt à être ouvert ou partagé.');
      }catch(error){if(live())status('Export impossible : '+error.message,true);}
      finally{busy=false;if(live())controls();}
    }
    find('#wgHistorySearch').oninput=event=>{query=event.target.value.trim().toLocaleLowerCase('fr');page=0;draw();};
    for(const button of panel.querySelectorAll('[data-history-kind]'))button.onclick=()=>{kind=button.dataset.historyKind;page=0;draw();};
    find('#wgHistoryRefresh').onclick=refresh;find('#wgHistoryExportAll').onclick=()=>exportRows(filtered(),true);
    refresh();
  }
  return {mount,unmount};
})();
