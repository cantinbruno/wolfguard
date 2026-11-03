'use strict';

const webScanWorkspace = (() => {
  const compareAddresses = new Intl.Collator('en', {numeric: true}).compare;
  let generation=0;
  const make=kind=>({kind,report:null,preparing:false,execution:null,reference:null,tab:'overview',query:'',filter:'all',sort:'address',page:0,target:'',profile:kind==='map'?'discovery':'common',ports:'22,80,443,445,3389',identify:false,passiveScope:'neighbours',passiveCategory:'all',passiveInterface:'all',mapQuery:'',mapSelection:'',mapZoom:1,auditSeverity:'all',status:'',error:false,busy:false});
  function resetPassiveFilters(view){view.passiveCategory='all';view.passiveInterface='all';}
  const scanPhase=view=>view.preparing?'ready':['starting','queued','running','receiving'].includes(view.execution?.status)?'loading':view.execution?.status==='error'?'error':view.report?'results':'ready';
  function syncWorkflow(view){
    const root=$('.wgscan');if(!root)return;
    const phase=scanPhase(view),loading=phase==='loading',execution=view.execution||{},entering=loading&&root.dataset.phase!=='loading';
    root.dataset.phase=phase;
    $('#wgScanNew').hidden=phase!=='results';
    const stop=$('#wgAgentStop'),cancel=$('#wgScanCancel');cancel.hidden=!loading||!stop||stop.hidden;cancel.disabled=!stop||stop.disabled;
    const panel=$('#wgScanExecution');panel.hidden=!['loading','error'].includes(phase);
    $('#wgScanPanel-overview').setAttribute('aria-busy',String(loading));
    if(entering)requestAnimationFrame(()=>{if(panel.isConnected&&root.dataset.phase==='loading')panel.scrollIntoView({block:'center',behavior:'instant'});});
    const titles={starting:'Lancement du scan…',queued:'En attente de l’agent…',running:'Scan en cours…',receiving:'Préparation des résultats…',error:'Le scan n’a pas pu aboutir'};
    $('#wgScanExecutionTitle').textContent=execution.title||titles[execution.status]||'';
    $('#wgScanExecutionText').textContent=phase==='error'?execution.message||'Vérifie la connexion, puis relance le scan.':execution.status==='queued'?'Le poste sélectionné va démarrer la collecte.':execution.status==='receiving'?'Le scan est terminé. Chargement du rapport.':'Les résultats s’afficheront automatiquement à la fin du scan.';
    const bar=$('#wgScanExecutionProgress'),known=execution.status==='running'&&Number.isFinite(execution.total)&&execution.total>0;
    bar.hidden=!loading;bar.max=known?execution.total:1;
    if(known)bar.value=Math.min(execution.total,Math.max(0,execution.completed||0));else bar.removeAttribute('value');
    $('#wgScanExecutionCount').textContent=known?(execution.completed||0)+' / '+execution.total+({'vulnerability':' contrôles','map':' adresses'}[view.kind]||' tests'):'';
    for(const control of root.querySelectorAll('#scanTarget,#wgScanPorts,#wgScanIdentify,#wgAgentTimeout,#wgAgentConcurrency,[data-wg-profile]'))control.disabled=loading;
    const exportButton=$('#wgScanExport');if(exportButton)exportButton.disabled=loading||phase==='error'||!view.report||view.busy;
  }
  const fresh=()=>Object.fromEntries(Object.keys(scanInsights.definitions).map(kind=>[kind,make(kind)]));
  let views=fresh();
  const labels=webScanModel.labels;
  const date=value=>{const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'Date non fournie':parsed.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});};
  function alive(kind,view,token){return token===generation&&view===views[kind]&&state.section==='scan-'+kind&&!$('#app').classList.contains('hidden');}
  function message(view,value,error=false){view.status=value;view.error=error;const el=$('#wgScanStatus');if(el){el.textContent=value;el.classList.toggle('is-error',error);el.setAttribute('role',error?'alert':'status');}}
  function hostRows(report){
    const hosts=new Map();for(const row of report?.rows||[]){if(!hosts.has(row.address))hosts.set(row.address,{address:row.address,name:row.hostname,rows:[],open:0,listening:0});const host=hosts.get(row.address);host.rows.push(row);if(row.status==='open')host.open++;if(row.status==='listening')host.listening++;}return [...hosts.values()].sort((a,b)=>b.open-a.open||b.listening-a.listening||compareAddresses(a.address,b.address));
  }
  function summary(view,passive,visibleRows){
    const rows=view.report?.rows||[],known=view.report!==null;
    const stamp=$('#wgScanReportStamp');stamp.textContent=known?view.report.name+(view.report.target?' · Cible : '+view.report.target:'')+' · '+view.report.source+' · relevé du '+date(view.report.importedAt):'Aucun relevé chargé';
    $('#wgScanReference').disabled=!known;
    $('#wgScanExport').disabled=!known||view.busy;
    // These sections render their own metrics and overview below.
    if(view.kind==='map'||view.kind==='vulnerability')return;
    const hosts=hostRows(view.report);
    const metrics=passive?[[rows.length,'Observations locales'],[rows.filter(r=>r.status==='connection').length,'Connexions connues'],[new Set(rows.filter(r=>r.transport==='DNS').map(r=>r.hostname)).size,'Noms en cache'],[new Set(rows.map(r=>r.interfaceName).filter(Boolean)).size,'Interfaces réseau']]:[[hosts.length,'Machines dans le rapport'],[rows.filter(r=>r.status==='open').length,'Ports ouverts'],[rows.filter(r=>r.status.includes('filtered')).length,'Ports filtrés / ambigus'],[new Set(rows.filter(r=>r.service).map(r=>r.service)).size,'Services nommés']];
    $('#wgScanMetrics').innerHTML=metrics.map(([n,label],i)=>'<article><span class="wgscan-metric-index">0'+(i+1)+'</span><strong>'+ (known?n.toLocaleString('fr-FR'):'—')+'</strong><span>'+label+'</span></article>').join('');
    const hints=[];
    if(known){
      if(passive){hints.push(['Observations locales',rows.length+' observation(s) pour cette cible','Caches DNS et voisins, connexions et sockets déjà connus du poste. Aucune sonde envoyée.']);}
      else {const plain=rows.filter(r=>r.status==='open'&&[21,23,110,143].includes(r.port));if(plain.length)hints.push(['À vérifier',plain.length+' port(s) associé(s) à des protocoles pouvant être non chiffrés','Vérifie le protocole réellement utilisé et sa configuration. Un port ouvert ne prouve pas une vulnérabilité.']);const filtered=rows.filter(r=>r.status.includes('filtered'));if(filtered.length)hints.push(['À interpréter',filtered.length+' résultat(s) filtré(s) ou ambigu(s)','Le rapport ne permet pas de conclure que ces ports sont ouverts ou fermés.']);}
      if(!hints.length)hints.push(['Lecture du relevé','Aucun point particulier déduit de ces observations','Ce résumé ne constitue pas un audit de sécurité. Examine les services et le périmètre réellement observés.']);
    }
    $('#wgScanOverview').innerHTML=scanInsights.overview(view.kind,view.report,hints,{...view,rows:visibleRows});
    for(const button of $('#wgScanOverview').querySelectorAll('[data-insight-row]'))button.onclick=()=>detail(rows[Number(button.dataset.insightRow)],passive);
  }
  function filtered(view){
    const query=view.query.toLocaleLowerCase('fr');
    return (view.report?.rows||[]).filter(row=>(view.filter==='all'||row.status===view.filter)&&(view.kind!=='passive'||scanInsights.passiveMatches(row,view))&&(view.kind!=='vulnerability'||view.auditSeverity==='all'||row.severity===view.auditSeverity)&&(!query||Object.values(row).join(' ').toLocaleLowerCase('fr').includes(query))).sort((a,b)=>view.sort==='port'?(a.port??-1)-(b.port??-1):view.sort==='interface'?compareAddresses(a.interfaceName,b.interfaceName)||compareAddresses(a.address,b.address):view.sort==='transport'?compareAddresses(a.transport,b.transport)||compareAddresses(a.address,b.address):view.sort==='severity'?(['critical','high','medium','low','info'].indexOf(a.severity)-['critical','high','medium','low','info'].indexOf(b.severity)):view.sort==='status'?a.status.localeCompare(b.status):compareAddresses(a.address,b.address)||(a.port??-1)-(b.port??-1));
  }
  function badge(row){return '<span class="wgscan-badge" data-status="'+esc(row.status)+'">'+esc(labels[row.status]||row.status)+'</span>';}
  function endpoint(address,port=null){return address?(address.includes(':')?'['+address+']':address)+(port===null?'':':'+port):'—';}
  function tableColumns(kind){
    return kind==='vulnerability'?['Contrôle','État','Gravité','Observation','Suite proposée']:kind==='map'?['Adresse','État observé','Nom fourni','Port / transport','Preuve / MAC']:kind==='passive'?['Adresse / port','Source','Processus / nom','Interface','Observation']:['Adresse','Port','État','Service / version','Nom d’hôte'];
  }
  function tableCells(row,kind){
    if(kind==='vulnerability')return '<td><strong>'+esc(row.title||row.checkId)+'</strong><small>'+esc(row.checkId)+'</small></td><td>'+badge(row)+'</td><td>'+esc(row.status==='issue'?(scanInsights.severity[row.severity]||'À examiner'):'—')+'</td><td>'+esc(row.detail)+'</td><td>'+esc(row.recommendation)+'</td>';
    if(kind==='map')return '<td><code>'+esc(row.address)+'</code></td><td>'+badge(row)+'</td><td>'+esc(row.hostname||'—')+'</td><td><code>'+(row.port??'—')+'</code> <small>'+esc(row.transport)+'</small></td><td>'+esc(row.macAddress||row.detail||'—')+'</td>';
    if(kind==='passive')return '<td><code>'+esc(endpoint(row.address,row.port))+'</code><small>'+esc(row.transport)+'</small></td><td>'+esc(row.source)+'<small>'+esc(row.macAddress||'')+'</small></td><td>'+esc(row.processName||row.hostname||'—')+(row.pid==null?'':'<small>PID '+row.pid+'</small>')+'</td><td>'+esc(row.interfaceName||'—')+'</td><td>'+badge(row)+'<small>'+esc(row.detail||'')+'</small></td>';
    const passive=kind==='passive';
    return '<td><code>'+esc(row.address)+'</code></td><td><code>'+(row.port??'—')+'</code> <small>'+esc(row.transport)+'</small></td><td>'+badge(row)+'</td><td><strong>'+esc(passive?(row.processName||(row.pid!==null?'PID '+row.pid:'')):(row.service||'—'))+'</strong><small>'+esc(passive?endpoint(row.remoteAddress,row.remotePort):[row.product,row.version].filter(Boolean).join(' '))+'</small></td><td>'+esc(passive?(row.interfaceName||row.macAddress||'—'):(row.hostname||'—'))+'</td>';
  }
  function drawRows(view,passive,rows){
    const pageCount=Math.max(1,Math.ceil(rows.length/75));view.page=Math.min(view.page,pageCount-1);
    const shown=rows.slice(view.page*75,(view.page+1)*75);
    const extraPassive=view.kind==='passive'&&(view.passiveCategory!=='all'||view.passiveInterface!=='all');
    $('#wgScanRows').innerHTML=`${extraPassive?'<div class="passive-table-context"><span>Filtres de la vue locale appliqués</span><button type="button" id="wgPassiveTableReset">Retirer ces filtres</button></div>':''}<div class="wgscan-table-controls"><label class="wgscan-search">${PROTOCOL_ICONS.search}<input id="wgScanSearch" type="search" placeholder="${view.kind==='vulnerability'?'Contrôle, preuve, recommandation…':view.kind==='map'?'Adresse, nom ou preuve…':passive?'Adresse IP, MAC ou interface…':'Adresse, port, service ou version…'}" aria-label="Rechercher dans le relevé" value="${esc(view.query)}"></label><select id="wgScanFilter" aria-label="Filtrer par état" ${view.kind==='passive'?'hidden':''}><option value="all">Tous les états</option>${[...new Set((view.report?.rows||[]).map(r=>r.status))].map(status=>'<option value="'+esc(status)+'" '+(view.filter===status?'selected':'')+'>'+esc(labels[status]||status)+'</option>').join('')}</select><select id="wgScanSort" aria-label="Trier les résultats">${(view.kind==='passive'?[['address','Par adresse IP'],['interface','Par interface'],['transport','Par cache']]:view.kind==='vulnerability'?[['address','Ordre du relevé'],['severity','Par gravité'],['status','Par état']]:view.kind==='map'?[['address','Par adresse'],['status','Par état']]:[['address','Par adresse'],['port','Par port'],['status','Par état']]).map(([value,label])=>'<option value="'+value+'" '+(view.sort===value?'selected':'')+'>'+label+'</option>').join('')}</select><span>${rows.length.toLocaleString('fr-FR')} résultat(s)</span></div><div class="wgscan-table-wrap"><table><thead><tr>${tableColumns(view.kind).map(label=>'<th>'+label+'</th>').join('')}<th><span class="wgscan-sr">Détail</span></th></tr></thead><tbody>${shown.map((row,index)=>`<tr>${tableCells(row,view.kind)}<td><button type="button" class="wgscan-row-detail" data-wg-row="${index}" aria-label="Détail ${esc(endpoint(row.address,row.port))}">↗</button></td></tr>`).join('')}</tbody></table>${!shown.length?'<p class="wgscan-table-empty">'+(view.report?'Aucune observation ne correspond aux filtres.':'Lance un scan pour afficher les observations.')+'</p>':''}</div><footer class="wgscan-table-footer"><span>Page ${view.page+1} sur ${pageCount} · 75 lignes par page</span><div><button type="button" id="wgScanPrev" ${view.page===0?'disabled':''}>← Précédente</button><button type="button" id="wgScanNext" ${view.page+1>=pageCount?'disabled':''}>Suivante →</button></div></footer>`;
    if($('#wgPassiveTableReset'))$('#wgPassiveTableReset').onclick=()=>{resetPassiveFilters(view);view.page=0;draw(view,passive);};
    $('#wgScanSearch').oninput=event=>{const {selectionStart,selectionEnd,selectionDirection}=event.target;view.query=event.target.value;view.page=0;draw(view,passive);const input=$('#wgScanSearch');input.focus({preventScroll:true});input.setSelectionRange(selectionStart,selectionEnd,selectionDirection);};
    $('#wgScanFilter').onchange=event=>{view.filter=event.target.value;view.page=0;draw(view,passive);$('#wgScanFilter').focus({preventScroll:true});};
    $('#wgScanSort').onchange=event=>{view.sort=event.target.value;view.page=0;draw(view,passive);$('#wgScanSort').focus({preventScroll:true});};
    const turn=(step,id)=>{view.page+=step;draw(view,passive);const button=$(id);if(!button.disabled)button.focus({preventScroll:true});else{const table=$('#wgScanRows .wgscan-table-wrap');table.tabIndex=-1;table.focus({preventScroll:true});}$('#wgScanRows').scrollIntoView({block:'start',behavior:'instant'});};
    $('#wgScanPrev').onclick=()=>turn(-1,'#wgScanPrev');$('#wgScanNext').onclick=()=>turn(1,'#wgScanNext');
    for(const button of $('#wgScanRows').querySelectorAll('[data-wg-row]'))button.onclick=()=>detail(shown[Number(button.dataset.wgRow)],passive);
  }
  function detail(row,passive){
    const dialog=$('#wgScanDetail'),content=$('#wgScanDetailBody');
    $('#wgScanDetailTitle').textContent=row.transport==='AUDIT'?(row.title||row.checkId):endpoint(row.address,row.port);
    if(passive&&row.transport!=='AUDIT'){
      content.innerHTML='<dl>'+Object.entries({'Adresse IP':row.address,'Adresse MAC':row.macAddress||'Non fournie','Interface réseau':row.interfaceName||'Non renseignée','Type':row.transport,'Nom fourni':row.hostname,'Observation':row.detail,'Source':row.source,'Port observé':row.port,'Adresse locale':row.localAddress||'', 'Port local':row.localPort,'Adresse distante':row.remoteAddress||'','Port distant':row.remotePort,'Processus':row.processName||'','PID':row.pid,'TTL restant (s)':row.ttl}).filter(([,value])=>value!==''&&value!==null&&value!==undefined).map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+esc(String(value))+'</dd></div>').join('')+'</dl><p class="wgscan-note">Cette observation provient des tables ou caches locaux du poste. Aucun test distant n’a été effectué.</p>';dialog.showModal();return;
    }
    const fields=Object.entries({'État':labels[row.status]||row.status,'Transport':row.transport,'Nom d’hôte':row.hostname,'Service':row.service,'Produit / version':[row.product,row.version].filter(Boolean).join(' '),'Adresse MAC':row.macAddress,'Interface':row.interfaceName,'Processus':row.processName,'PID':row.pid,'Pair distant':endpoint(row.remoteAddress,row.remotePort),'Source':row.source,'Contrôle':row.title,'Gravité':scanInsights.severity[row.severity]||'','Suite proposée':row.recommendation});
    content.innerHTML='<dl>'+fields.filter(([,value])=>value!==''&&value!==null).map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+esc(String(value))+'</dd></div>').join('')+'</dl>'+(row.detail?'<h3>'+(row.transport==='AUDIT'?'Preuve du contrôle':'Détail fourni par le relevé')+'</h3><pre>'+esc(row.detail)+'</pre>':'')+'<p class="wgscan-note">'+(row.transport==='AUDIT'?'Le contrôle décrit une configuration au moment de l’audit. La recommandation ne modifie pas le poste.':passive?'Une observation locale décrit une table ou un cache au moment du relevé.':'Les états et les services proviennent du relevé. Un service nommé peut être une simple correspondance de port.')+'</p>';
    dialog.showModal();
  }
  function changes(view){
    const el=$('#wgScanChanges');
    if(!view.reference||!view.report){el.innerHTML='<section class="wgscan-comparison-empty"><span class="wgscan-kicker">SUIVRE LES CHANGEMENTS</span><h2>Comparer deux relevés du même périmètre</h2><p>Charge un premier relevé, puis clique sur « Définir comme référence ». Lance ensuite un nouveau scan ou choisis un autre scan dans l’historique de l’agent pour voir ce qui est apparu, a disparu ou a changé.</p><p class="wgscan-note">Une absence dans un relevé ne prouve pas qu’un service a été arrêté. Compare des collectes avec les mêmes cibles et options.</p></section>';return;}
    const rows=webScanModel.compare(view.report,view.reference);
    el.innerHTML=`<div class="wgscan-comparison-heading"><div><span class="wgscan-kicker">RÉFÉRENCE</span><strong>${esc(view.reference.name)}</strong><small>${date(view.reference.importedAt)}</small></div><span>→</span><div><span class="wgscan-kicker">RELEVÉ ACTUEL</span><strong>${esc(view.report.name)}</strong><small>${date(view.report.importedAt)}</small></div></div><div class="wgscan-change-counts">${[['added','Nouvelles'],['removed','Absentes'],['changed','Modifiées']].map(([type,label])=>'<span><b>'+rows.filter(r=>r.type===type).length+'</b> '+label+'</span>').join('')}</div><p class="wgscan-note">Comparer le même périmètre et les mêmes options. Une absence ne signifie pas forcément une disparition réelle.</p><div class="wgscan-change-list">${rows.slice(0,150).map(change=>'<article data-change="'+change.type+'"><span>'+({added:'+',removed:'−',changed:'↔'})[change.type]+'</span><code>'+esc(endpoint(change.row.address,change.row.port))+'</code><span>'+esc(change.before?(labels[change.before.status]||change.before.status)+' → '+(labels[change.row.status]||change.row.status):labels[change.row.status]||change.row.status)+'</span><small>'+esc(change.row.service||change.row.processName||change.row.macAddress)+'</small></article>').join('')||'<p class="wgscan-table-empty">Aucun changement dans les observations détaillées.</p>'}</div>${rows.length>150?'<p class="wgscan-note">150 changements affichés sur '+rows.length+'. Le rapport exporté contient la comparaison complète.</p>':''}`;
  }
  function draw(view,passive){
    if(!$('#wgScanMetrics'))return;
    $('.wgscan').dataset.hasReport=String(!!view.report);
    if(!view.report)view.tab='overview';
    const visibleRows=filtered(view);
    summary(view,passive,visibleRows);drawRows(view,passive,visibleRows);changes(view);
    if(view.kind==='passive'){
      const refresh=focus=>{view.page=0;draw(view,passive);if(focus)document.getElementById(focus)?.focus({preventScroll:true});};
      const reset=()=>{resetPassiveFilters(view);view.query='';view.filter='all';refresh('wgPassiveSearch');};
      const search=$('#wgPassiveSearch');if(search)search.oninput=event=>{const start=event.target.selectionStart,end=event.target.selectionEnd;view.query=event.target.value;refresh('wgPassiveSearch');if(start!==null)try{$('#wgPassiveSearch').setSelectionRange(start,end);}catch{}};
      for(const button of $('#wgScanOverview').querySelectorAll('[data-passive-category]'))button.onclick=()=>{view.passiveCategory=button.dataset.passiveCategory;view.filter='all';refresh();[...$('#wgScanOverview').querySelectorAll('[data-passive-category]')].find(node=>node.dataset.passiveCategory===view.passiveCategory)?.focus({preventScroll:true});};
      const iface=$('#wgPassiveInterface');if(iface)iface.onchange=event=>{view.passiveInterface=event.target.value;refresh('wgPassiveInterface');};
      for(const button of $('#wgScanOverview').querySelectorAll('[data-passive-reset]'))button.onclick=reset;
      for(const button of $('#wgScanOverview').querySelectorAll('[data-passive-interface-table]'))button.onclick=()=>{view.passiveInterface=button.dataset.passiveInterfaceTable;view.tab='rows';refresh('wgScanTab-rows');};
      for(const button of $('#wgScanOverview').querySelectorAll('[data-passive-table]'))button.onclick=()=>{view.tab='rows';refresh('wgScanTab-rows');};
    }
    if(view.kind==='map'){
      $('#wgScanOverview').innerHTML=scanInsights.mapping(view.report,view);
      scanInsights.bindMapping($('#wgScanOverview'),address=>{view.mapSelection=address;draw(view,passive);[...$('#wgScanOverview').querySelectorAll('[data-map-address]')].find(node=>node.dataset.mapAddress===address)?.focus({preventScroll:true});});
      const search=$('#wgMapSearch');if(search)search.oninput=event=>{view.mapQuery=event.target.value;draw(view,passive);$('#wgMapSearch').focus({preventScroll:true});};
      for(const button of $('#wgScanOverview').querySelectorAll('[data-map-zoom]'))button.onclick=()=>{const direction=button.dataset.mapZoom;view.mapZoom=direction==='fit'?1:Math.min(2.5,Math.max(.75,view.mapZoom+(direction==='in'?.25:-.25)));draw(view,passive);};
      for(const button of $('#wgScanOverview').querySelectorAll('[data-map-observations]'))button.onclick=()=>{view.query=button.dataset.mapObservations;view.filter='all';view.tab='rows';view.page=0;draw(view,passive);$('#wgScanTab-rows').focus({preventScroll:true});};
      const rows=view.report?.rows||[],count=statuses=>new Set(rows.filter(row=>statuses.includes(row.status)).map(row=>row.address)).size;
      const metrics=[[new Set(rows.map(row=>row.address)).size,'Adresses dans le relevé'],[count(['reachable','open','closed']),'Adresses répondantes'],[count(['no-response','unreachable']),'Sans réponse'],[count(['error']),'Erreurs de collecte']];
      $('#wgScanMetrics').innerHTML=metrics.map(([n,label])=>'<article><strong>'+(view.report?n:'—')+'</strong><span>'+label+'</span></article>').join('');
    }
    if(view.kind==='vulnerability'){
      $('#wgScanOverview').innerHTML=scanInsights.audit(view.report,{...view,rows:visibleRows});
      for(const button of $('#wgScanOverview').querySelectorAll('[data-audit-filter]'))button.onclick=()=>{view.filter=button.dataset.auditFilter;view.page=0;draw(view,passive);[...$('#wgScanOverview').querySelectorAll('[data-audit-filter]')].find(node=>node.dataset.auditFilter===view.filter)?.focus({preventScroll:true});};
      const search=$('#wgAuditSearch');if(search)search.oninput=event=>{view.query=event.target.value;view.page=0;draw(view,passive);$('#wgAuditSearch').focus({preventScroll:true});};
      const severity=$('#wgAuditSeverity');if(severity)severity.onchange=event=>{view.auditSeverity=event.target.value;view.page=0;draw(view,passive);$('#wgAuditSeverity').focus({preventScroll:true});};
      for(const button of $('#wgScanOverview').querySelectorAll('[data-audit-copy]'))button.onclick=async()=>{const row=view.report.rows[Number(button.dataset.auditCopy)],copied=await copyText(row.recommendation);message(view,copied?'Recommandation copiée.':'La copie a échoué.',!copied);};
      const rows=view.report?.rows||[],metrics=[[rows.filter(r=>r.status==='issue').length,'Risques détectés'],[rows.filter(r=>r.status==='passed').length,'Contrôles réussis'],[rows.filter(r=>r.status==='notchecked').length,'Non vérifiés'],[rows.filter(r=>r.status==='issue'&&['critical','high'].includes(r.severity)).length,'Risques élevés / critiques']];
      $('#wgScanMetrics').innerHTML=metrics.map(([n,label])=>'<article><strong>'+(view.report?n:'—')+'</strong><span>'+label+'</span></article>').join('');

    }
    for(const button of document.querySelectorAll('[data-wg-tab]')){const selected=button.dataset.wgTab===view.tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
    for(const panel of document.querySelectorAll('[data-wg-panel]'))panel.hidden=panel.dataset.wgPanel!==view.tab;
    $('#wgScanReferenceLabel').textContent=view.reference?'Référence : '+view.reference.name:'Aucune référence définie';
    message(view,view.status,view.error);
    syncWorkflow(view);
  }
  async function exportData(view,kind,token){
    if(!view.report||view.busy)return;
    const report=structuredClone(view.report),reference=view.reference?structuredClone(view.reference):null;
    view.busy=true;draw(view,kind==='passive');
    try{await webScanReport.download(kind,report,reference,()=>alive(kind,view,token));if(alive(kind,view,token))message(view,'Rapport exporté. Le fichier PDF est prêt à être ouvert ou partagé.');}
    catch{if(alive(kind,view,token))message(view,'Le rapport n’a pas pu être exporté. Réessaie.',true);}
    finally{view.busy=false;if(alive(kind,view,token))draw(view,kind==='passive');}
  }
  function preparation(view){
    const kind=view.kind,passive=kind==='passive',audit=kind==='vulnerability';
    const target=kind==='map'?['Réseau ou plage d’adresses','192.168.1.0/24','Réseau IPv4, plage de 256 adresses maximum ou adresse IP.']:['Adresse IP ou nom d’hôte','192.168.1.10 ou serveur.exemple.local','Une seule machine, avec une adresse privée ou publique.'];
    const targetField=`<label class="wgscan-field">${target[0]}<input id="scanTarget" placeholder="${target[1]}" value="${esc(view.target)}" maxlength="253" autocomplete="off" spellcheck="false" required></label><p class="wgscan-note">${target[2]}</p>`;
    const profiles=kind==='active'?`<fieldset class="scan-profile-picker"><legend>Ports à tester</legend><div class="wgscan-profiles" role="group" aria-label="Ports à tester">${[['common','Ports courants','SSH, DNS, web, Windows…'],['web','Services web','HTTP, HTTPS et administration'],['custom','Personnalisé','Saisir une liste de ports']].map(([id,title,help])=>'<button type="button" data-wg-profile="'+id+'" aria-pressed="'+(view.profile===id)+'"><span><strong>'+title+'</strong><small>'+help+'</small></span><i></i></button>').join('')}</div></fieldset><label id="wgScanCustomPorts" class="wgscan-field">Ports TCP<input id="wgScanPorts" value="${esc(view.ports)}" maxlength="10000" placeholder="22,80,443 ou 8000-8100" spellcheck="false"></label><label id="wgScanIdentifyLabel" class="wgscan-check"><input id="wgScanIdentify" type="checkbox" ${view.identify?'checked':''}><span>Identifier les services<small>Préciser leur nom et leur version quand c’est possible.</small></span></label>`:'';
    const scope=audit?`<div class="scan-audit-checks"><div>${settingsIcon('shield-check')}<strong>Protections</strong><span>Pare-feu et sécurité du poste</span></div><div>${settingsIcon('refresh-cw')}<strong>Mises à jour</strong><span>État disponible sur le poste</span></div><div>${settingsIcon('sliders-horizontal')}<strong>Configuration</strong><span>Réglages présentant un risque</span></div></div><p class="wgscan-note">Windows, Linux et macOS · Audit en lecture seule.</p>`:targetField+profiles;
    const advanced=!passive&&!audit?`<details class="wgscan-agent-options"><summary>Réglages du scan</summary><div><label class="wgscan-field">Délai par test (ms)<input id="wgAgentTimeout" type="number" min="100" max="3000" step="100" value="${view.agentTimeoutMs||1500}"></label><label class="wgscan-field">Tests simultanés<input id="wgAgentConcurrency" type="number" min="1" max="32" value="${view.agentConcurrency||16}"></label></div><p class="wgscan-note">Adresses privées et publiques. Une seule IP pour les scans actif/passif ; cartographie limitée à 256 adresses. Maximum 4096 tests ; arrêt après trois minutes.</p></details>`:'';
    const explanation=passive?'<details class="scan-setup-explanation"><summary>Que relève ce scan ?</summary><p>Les voisins ARP/NDP, noms en cache DNS ou dans le fichier hosts, connexions et processus associés à cette cible. Pour le poste de l’agent, les ports en écoute sont aussi relevés. Une IP publique est acceptée : seules ses traces locales sont visibles, sans sonde ni requête DNS réseau.</p></details>':'';
    return {scope,advanced:advanced+explanation};
  }
  function pageLayout(view,definition){
    const kind=view.kind,passive=kind==='passive',controls=preparation(view);
    const agent='<div id="wgScanAgentHost"></div>',metrics='<div id="wgScanMetrics" class="wgscan-metrics"></div>',status='<p id="wgScanStatus" class="wgscan-status" role="status" aria-live="polite"></p>';
    const execution='<section id="wgScanExecution" class="scan-execution" role="status" aria-live="polite" aria-atomic="true" aria-labelledby="wgScanExecutionTitle" hidden><span class="scan-execution-symbol" aria-hidden="true"></span><h2 id="wgScanExecutionTitle"></h2><p id="wgScanExecutionText"></p><progress id="wgScanExecutionProgress" max="1" aria-label="Progression du scan"></progress><span id="wgScanExecutionCount"></span><button type="button" id="wgScanCancel" hidden>Arrêter le scan</button></section>';
    const panels=`${execution}<nav class="wgscan-tabs" role="tablist" aria-label="Analyse du relevé">${['overview','rows','changes'].map((id,index)=>'<button type="button" role="tab" id="wgScanTab-'+id+'" aria-controls="wgScanPanel-'+id+'" data-wg-tab="'+id+'">'+definition.tabs[index]+'</button>').join('')}</nav><section id="wgScanPanel-overview" role="tabpanel" aria-labelledby="wgScanTab-overview" data-wg-panel="overview"><div id="wgScanOverview"></div></section><section id="wgScanPanel-rows" role="tabpanel" aria-labelledby="wgScanTab-rows" data-wg-panel="rows"><div id="wgScanRows"></div></section><section id="wgScanPanel-changes" role="tabpanel" aria-labelledby="wgScanTab-changes" data-wg-panel="changes"><div class="wgscan-reference-bar"><span id="wgScanReferenceLabel"></span><button type="button" id="wgScanReference">Définir comme référence</button></div><div id="wgScanChanges"></div></section>`;
    const heading=`<header class="wgscan-heading"><div class="wgscan-title-group"><span class="wgscan-title-icon">${workspaceSectionIcon('scan-'+kind)}</span><div><span class="wgscan-kicker">${definition.kicker}</span><h1 id="scanTitle">${definition.title}</h1><p>${definition.description}</p></div></div><button type="button" id="wgScanNew" hidden>${networkToolIcon('reset')}Nouveau scan</button></header>`;
    const report=`<div class="scan-report-strip"><p id="wgScanReportStamp"></p><div class="wgscan-report-actions"><button type="button" id="wgScanExport" title="Télécharger le rapport PDF complet">${networkToolIcon('download')}Exporter PDF</button></div></div>`;
    const setupTitles={passive:'Quelle machine observer ?',active:'Quelle machine scanner ?',map:'Quel réseau explorer ?',vulnerability:'Vérifier la sécurité du poste'};
    const modes={passive:'Sans sonde',active:'Ports TCP',map:'Découverte réseau',vulnerability:'Lecture seule'};
    const setup=`<section class="scan-setup" aria-labelledby="wgScanSetupTitle"><header class="scan-setup-heading"><h2 id="wgScanSetupTitle">${setupTitles[kind]}</h2><span class="scan-setup-mode">${modes[kind]}</span></header><div class="scan-setup-fields">${controls.scope}${controls.advanced}</div><footer class="scan-setup-footer">${agent}</footer></section>`;
    const shell=heading+setup+report;
    if(passive)return shell+`<main class="scan-output scan-monitor-feed">${metrics}${status}${panels}</main>`;
    if(kind==='active')return shell+`<main class="scan-output scan-probe-results">${metrics}${status}${panels}</main>`;
    if(kind==='map')return shell+`<section class="scan-output scan-atlas"><main class="scan-atlas-canvas">${status}${panels}</main><div class="scan-atlas-legend">${metrics}</div></section>`;
    return shell+`<div class="scan-output scan-review-layout"><aside class="scan-review-summary">${metrics}</aside><main class="scan-review-findings">${status}${panels}</main></div>`;
  }

  async function render(kind){
    const definition=scanInsights.definitions[kind],passive=definition.strategy==='passive',audit=kind==='vulnerability',view=views[kind],token=generation;
    if(!alive(kind,view,token))return;
    webScanAgent.reset(false);
    $('#content').classList.add('scan-content');
    const layouts={passive:'monitor',active:'probe',map:'atlas',vulnerability:'review'};
    $('#content').innerHTML=`<section class="wgscan" data-kind="${kind}" data-layout="${layouts[kind]}" data-has-report="${!!view.report}" data-phase="${scanPhase(view)}" aria-labelledby="scanTitle">${pageLayout(view,definition)}
      <dialog id="wgScanDetail" class="wgscan-dialog" aria-labelledby="wgScanDetailTitle"><header><h2 id="wgScanDetailTitle"></h2><button type="button" data-wg-close aria-label="Fermer">✕</button></header><div id="wgScanDetailBody"></div></dialog>
    </section>`;
    for(const button of document.querySelectorAll('[data-wg-close]'))button.onclick=()=>button.closest('dialog').close();
    if(!audit){
      $('#scanTarget').oninput=event=>{view.target=event.target.value;};
      if(kind==='active'){
        $('#wgScanPorts').oninput=event=>{view.ports=event.target.value;};$('#wgScanIdentify').onchange=event=>{view.identify=event.target.checked;};
        for(const button of document.querySelectorAll('[data-wg-profile]'))button.onclick=()=>{view.profile=button.dataset.wgProfile;for(const candidate of document.querySelectorAll('[data-wg-profile]'))candidate.setAttribute('aria-pressed',String(candidate===button));$('#wgScanCustomPorts').hidden=view.profile!=='custom';};
      }
      if(!passive)$('#wgAgentTimeout').oninput=event=>{view.agentTimeoutMs=Number(event.target.value);};if(!passive)$('#wgAgentConcurrency').oninput=event=>{view.agentConcurrency=Number(event.target.value);};
    }
    for(const button of document.querySelectorAll('[data-wg-tab]'))button.onclick=()=>{view.tab=button.dataset.wgTab;draw(view,passive);};
    $('.wgscan-tabs').onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const buttons=[...document.querySelectorAll('[data-wg-tab]')],index=buttons.indexOf(document.activeElement);if(index<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].click();buttons[next].focus();};
    $('#wgScanReference').onclick=()=>{view.reference=structuredClone(view.report);message(view,'Référence définie pour cette session. Lance un nouveau scan ou choisis le scan à comparer dans l’historique de l’agent.');draw(view,passive);};
    $('#wgScanExport').onclick=()=>exportData(view,kind,token);
    $('#wgScanCancel').onclick=()=>$('#wgAgentStop')?.click();
    $('#wgScanNew').onclick=()=>{view.preparing=true;view.execution=null;view.error=false;view.status='';draw(view,passive);$('#content').scrollTop=0;($('#scanTarget')||$('#wgAgentLaunch'))?.focus({preventScroll:true});};
    if(kind==='active')$('#wgScanCustomPorts').hidden=view.profile!=='custom';
    draw(view,passive);
    webScanAgent.mount(kind,()=>view,(report,data)=>{
      if(!alive(kind,view,token))return;
      const reveal=scanPhase(view)==='loading';
      const focused=['wgScanSearch','wgMapSearch','wgAuditSearch','wgPassiveSearch','wgPassiveInterface'].includes(document.activeElement?.id)?document.activeElement.id:'';
      if(kind==='passive')report=webScanModel.networkReport(report);
      if(data)view.reportJob=data.id+':'+data.revision;
      view.report=report;view.preparing=false;view.execution=null;view.error=!!report.error||['failed','expired','lost'].includes(report.jobStatus);view.status=report.error||({cancelled:'Scan arrêté. Les observations disponibles sont affichées.',failed:'Le scan a échoué. Les observations reçues restent consultables.',expired:'L’agent n’a pas démarré le scan à temps.',lost:'La connexion à l’agent a été perdue. Les observations reçues restent consultables.'}[report.jobStatus]||'');
      draw(view,passive);if(focused)document.getElementById(focused)?.focus({preventScroll:true});
      if(reveal)requestAnimationFrame(()=>{if(alive(kind,view,token)&&scanPhase(view)==='results')$('#wgScanExecution').parentElement.scrollIntoView({block:'start',behavior:'instant'});});
    },execution=>{
      if(!alive(kind,view,token)||execution.status==='ready'&&view.execution?.status==='error')return;
      if(['starting','queued','running'].includes(execution.status))view.preparing=false;
      view.execution=execution;syncWorkflow(view);
    });$('#content').scrollTop=0;
  }
  return {render,reset(){webScanAgent.reset();generation++;for(const dialog of document.querySelectorAll('.wgscan-dialog'))dialog.close();views=fresh();}};
})();
