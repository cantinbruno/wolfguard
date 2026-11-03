'use strict';

// Report data, direct PDF downloads and ZIP archives; no external PDF service.
const webScanReport = (() => {
  const number=value=>Number(value||0).toLocaleString('fr-FR');
  const date=value=>{if(!value)return 'Non fournie';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?String(value):parsed.toLocaleString('fr-FR',{dateStyle:'long',timeStyle:'short'});};
  const themes={passive:'#78cdbb',active:'#f1b16b',map:'#73c7ba',vulnerability:'#e8ad82'};
  const jobLabels={queued:'En attente · relevé partiel',running:'En cours · relevé partiel',completed:'Terminé',cancelled:'Arrêté · relevé partiel',failed:'Échec · relevé partiel',expired:'Agent indisponible',lost:'Connexion perdue · relevé partiel'};
  const limits={passive:'Caches, connexions et sockets déjà présents sur le poste. Ces traces ne confirment pas la disponibilité actuelle de la cible. Aucune sonde ni capture de paquets.',active:'Un port fermé a répondu par un refus. Une absence de réponse peut correspondre à un filtrage. Un nom de service peut être une association de port ; consulte la preuve avant de conclure.',map:'Une absence de réponse peut correspondre à un filtrage ou à un poste indisponible. Cette découverte ne décrit pas la topologie physique du réseau.',vulnerability:'Audit de configuration en lecture seule, adapté au système de l’agent. Les contrôles non vérifiés ne sont pas conformes par défaut. Il ne s’agit pas d’un inventaire exhaustif des CVE.'};
  const sourceLabels={'agent-neighbor':'Cache voisin','agent-dns-cache':'Cache DNS','agent-hosts':'Fichier hosts','agent-tcp-table':'Table TCP','agent-udp-table':'Sockets UDP','agent-ss':'Table des sockets','agent-lsof':'Table des sockets','agent-proc-net':'Table du noyau','agent-connection-table':'Connexions locales','agent-local-socket':'Socket locale','agent-local-cache':'Cache local','agent-tcp':'Sonde TCP','agent-discovery':'Découverte TCP','agent-icmp':'Sonde ICMP'};
  const sourceLabel=value=>sourceLabels[value]||value||'Non fournie';
  const endpoint=(address,port)=>address?(address.includes(':')?'['+address+']':address)+(port==null?'':':'+port):'—';
  function portRanges(values){
    const ports=[...new Set((Array.isArray(values)?values:[]).filter(value=>Number.isInteger(value)&&value>0&&value<=65535))].sort((a,b)=>a-b),ranges=[];
    for(let index=0;index<ports.length;index++){const start=ports[index];let end=start;while(ports[index+1]===end+1)end=ports[++index];ranges.push(start===end?String(start):start+'–'+end);}
    return ranges.join(', ');
  }
  function reading(kind,report){
    const rows=report.rows||[],options=report.parameters||{},started=new Date(report.startedAt||report.capturedAt).getTime(),finished=new Date(report.finishedAt).getTime();
    const elapsed=Number.isFinite(started)&&Number.isFinite(finished)&&finished>=started?finished-started:null;
    const duration=elapsed===null?'Non fournie':elapsed<1000?elapsed+' ms':elapsed<60000?number(Math.round(elapsed/100)/10)+' s':Math.floor(elapsed/60000)+' min '+Math.floor(elapsed%60000/1000)+' s';
    const methods={passive:'Observation des tables et caches locaux',active:options.mode==='icmp'?'Tests ICMP':'Connexions TCP',map:'Découverte par réponses TCP',vulnerability:'Contrôles locaux en lecture seule'};
    const facts=[['Méthode',methods[kind]],['Durée',duration]];
    if(report.agentName)facts.push(['Poste d’observation',report.agentName]);
    if(report.platform)facts.push(['Système',({win32:'Windows',darwin:'macOS',linux:'Linux'})[report.platform]||report.platform]);
    const validCount=value=>Number.isInteger(value)&&value>=0;
    if(validCount(report.completed)&&validCount(report.total))facts.push(['Collecte',number(report.completed)+' / '+number(report.total)+(kind==='vulnerability'?' contrôles':kind==='map'?' adresses':kind==='passive'?' observations':' tests')]);
    const requested=portRanges(options.ports);
    if(requested)facts.push(['Ports TCP demandés',requested]);
    else if(kind==='active'){const observed=portRanges(rows.filter(row=>row.transport==='TCP').map(row=>row.port));if(observed)facts.push(['Ports TCP dans le relevé',observed]);}
    if(kind==='active'&&typeof options.identifyServices==='boolean')facts.push(['Identification des services',options.identifyServices?'Demandée · selon les réponses disponibles':'Non demandée · associations de ports uniquement']);
    if(['active','map'].includes(kind)&&Number.isInteger(options.timeoutMs))facts.push(['Délai par test',number(options.timeoutMs)+' ms']);
    if(['active','map'].includes(kind)&&Number.isInteger(options.concurrency))facts.push(['Tests simultanés',number(options.concurrency)]);
    if(kind==='passive'){
      const interfaces=[...new Set(rows.map(row=>row.interfaceName).filter(Boolean))],sources=[...new Set(rows.map(row=>sourceLabel(row.source)))];
      if(interfaces.length)facts.push(['Interfaces observées',interfaces.join(' · ')]);
      if(sources.length)facts.push(['Sources locales',sources.join(' · ')]);
    }
    const addresses=[...new Set(rows.map(row=>row.address))];
    if(addresses.length&&addresses.length<=3)facts.push(['Adresse(s) observée(s)',addresses.join(' · ')]);
    const names=[...new Set(rows.map(row=>row.hostname).filter(Boolean))];
    if(names.length)facts.push(['Noms fournis',names.slice(0,8).join(' · ')+(names.length>8?' …':'')]);
    const count=status=>rows.filter(row=>row.status===status).length;
    const definitions=kind==='passive'?[['ARP','Voisins IPv4','neutral'],['NDP','Voisins IPv6','neutral'],['DNS','Noms DNS / hosts','info'],['TCP','Observations TCP','positive'],['UDP','Sockets UDP','info']]:kind==='vulnerability'?[['issue','À corriger','warning'],['notchecked','Non vérifiés','neutral'],['passed','Conformes','positive'],['info','Informations','info']]:[['open','Ouverts','positive'],['closed','Fermés','neutral'],['reachable','Répondants','positive'],['filtered','Filtrés','warning'],['open|filtered','Ouverts ou filtrés','warning'],['no-response','Sans réponse','neutral'],['unreachable','Injoignables','neutral'],['error','Erreurs','warning'],['unknown','Non renseignés','neutral'],['unfiltered','Non filtrés','info'],['closed|filtered','Fermés ou filtrés','warning']];
    const breakdown=definitions.map(([key,label,tone])=>({key,label,tone,count:kind==='passive'?rows.filter(row=>row.transport===key).length:count(key)})).filter(item=>item.count);
    const latencies=rows.filter(row=>['open','closed','reachable'].includes(row.status)&&Number.isFinite(row.latencyMs)&&row.latencyMs>=0).map(row=>row.latencyMs).sort((a,b)=>a-b);
    if(latencies.length){const middle=Math.floor(latencies.length/2),median=latencies.length%2?latencies[middle]:(latencies[middle-1]+latencies[middle])/2;facts.push(['Temps de réponse médian',number(Math.round(median*10)/10)+' ms · '+number(latencies.length)+' réponse(s) mesurée(s)']);}
    const warnings=[...new Set([...(report.warnings||[]),...(report.error?[report.error]:[])].map(String))];
    return {status:jobLabels[report.jobStatus]||'État non fourni',tone:report.jobStatus==='completed'?'positive':['failed','expired','lost','cancelled'].includes(report.jobStatus)?'warning':'neutral',duration,facts,breakdown,warnings,summary:synthesis(kind,rows),limit:limits[kind]};
  }
  const answered=row=>['reachable','open','closed'].includes(row.status);
  function metrics(kind,rows){
    const count=status=>rows.filter(row=>row.status===status).length,hosts=select=>new Set(rows.filter(select).map(row=>row.address)).size;
    if(kind==='passive')return [[rows.length,'Observations locales'],[rows.filter(row=>row.status==='connection').length,'Connexions connues'],[new Set(rows.filter(row=>row.transport==='DNS').map(row=>row.hostname)).size,'Noms en cache'],[new Set(rows.map(row=>row.interfaceName).filter(Boolean)).size,'Interfaces réseau']];
    if(kind==='map')return [[hosts(()=>true),'Adresses observées'],[hosts(answered),'Adresses répondantes'],[hosts(row=>['unreachable','no-response'].includes(row.status)),'Sans réponse'],[hosts(row=>row.status==='error'),'Erreurs de collecte']];
    if(kind==='vulnerability')return [[count('issue'),'Risques détectés'],[count('passed'),'Contrôles conformes'],[count('notchecked'),'Non vérifiés'],[rows.filter(row=>row.status==='issue'&&['critical','high'].includes(row.severity)).length,'Risques élevés / critiques']];
    return [[hosts(()=>true),'Machines observées'],[count('open'),'Ports ouverts'],[rows.filter(row=>row.status.includes('filtered')).length,'États filtrés / ambigus'],[new Set(rows.map(row=>row.service).filter(Boolean)).size,'Services nommés']];
  }
  function synthesis(kind,rows){
    if(!rows.length)return 'Aucune observation disponible dans ce relevé. Consulte l’état de la collecte et ses limites avant de conclure.';
    if(kind==='passive')return number(rows.length)+' observation(s) associée(s) à la cible dans les caches et tables locales : voisins, noms DNS, connexions ou sockets du poste.';
    if(kind==='map')return number(new Set(rows.filter(answered).map(row=>row.address)).size)+' adresse(s) ont répondu depuis le poste d’observation. La carte et les preuves ci-dessous permettent de situer les réponses dans le périmètre examiné.';
    if(kind==='vulnerability')return number(rows.filter(row=>row.status==='issue').length)+' contrôle(s) signalent une configuration à examiner. Les risques sont classés par gravité, puis accompagnés de leurs preuves et de leurs recommandations. Les contrôles indisponibles restent non vérifiés.';
    return number(rows.filter(row=>row.status==='open').length)+' port(s) ont été observés ouverts. Les états, services et éléments d’identification sont détaillés pour la cible examinée. Un port ouvert ne constitue pas, à lui seul, une vulnérabilité.';
  }
  function pdfModel(kind,report,reference=null){
    const definition=scanInsights.definitions[kind];if(!definition||!report)throw new Error('Aucun relevé à exporter.');
    const safe=kind==='passive'?webScanModel.networkReport(report):report;
    if(kind==='passive'&&reference)reference=webScanModel.networkReport(reference);
    return {kind,title:definition.title,short:definition.short,kicker:definition.kicker,name:String(report.name||definition.short),accent:themes[kind],target:report.target||(kind==='vulnerability'?'Poste de l’agent':'Non fournie'),source:report.source||'Non fournie',captured:date(report.capturedAt||report.importedAt),generated:date(new Date()),...reading(kind,safe),rows:safe.rows,metrics:metrics(kind,safe.rows),reference:reference?{name:reference.name,date:date(reference.capturedAt||reference.importedAt),changes:webScanModel.compare(safe,reference)}:null};
  }
  async function file(kind,report,reference){
    const stamp=new Date(report.capturedAt||report.importedAt),day=Number.isNaN(stamp.getTime())?new Date().toISOString().slice(0,10):stamp.toISOString().slice(0,10);
    return {name:'WolfGuard-'+kind+'-'+day+'.pdf',content:await webScanPDF.create(pdfModel(kind,report,reference))};
  }
  function save(content,type,name){
    const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function download(kind,report,reference,isCurrent=()=>true){
    const output=await file(kind,report,reference);
    if(!isCurrent())return;
    save(output.content,'application/pdf',output.name);
  }
  const crcTable=Uint32Array.from({length:256},(_,i)=>{let crc=i;for(let bit=0;bit<8;bit++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;return crc>>>0;});
  function archive(files){
    if(!files.length||files.length>65535)throw new Error('Nombre de rapports invalide.');
    const encoder=new TextEncoder(),locals=[],directory=[];let offset=0,size=0;
    const stamp=new Date(),dosDate=((Math.min(2107,Math.max(1980,stamp.getFullYear()))-1980)<<9)|((stamp.getMonth()+1)<<5)|stamp.getDate(),dosTime=(stamp.getHours()<<11)|(stamp.getMinutes()<<5)|Math.floor(stamp.getSeconds()/2);
    for(const [index,file] of files.entries()){
      if(typeof file.name!=='string'||/[\\/\u0000]/.test(file.name)||(typeof file.content!=='string'&&!ArrayBuffer.isView(file.content)))throw new Error('Nom de rapport invalide.');
      const name=encoder.encode(String(index+1).padStart(4,'0')+'-'+file.name),data=typeof file.content==='string'?encoder.encode(file.content):new Uint8Array(file.content.buffer,file.content.byteOffset,file.content.byteLength);size+=data.length;
      if(name.length>255)throw new Error('Nom de rapport trop long.');
      if(size>128*1024*1024)throw new Error('L’ensemble dépasse 128 Mo. Filtre l’historique par type ou par cible, puis réessaie.');
      let crc=0xffffffff;for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);crc=(crc^0xffffffff)>>>0;
      const local=new Uint8Array(30+name.length),l=new DataView(local.buffer);
      l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x0800,true);l.setUint16(12,0x21,true);l.setUint32(14,crc,true);l.setUint32(18,data.length,true);l.setUint32(22,data.length,true);l.setUint16(26,name.length,true);local.set(name,30);
      l.setUint16(10,dosTime,true);l.setUint16(12,dosDate,true);
      const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);
      c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);
      c.setUint16(12,dosTime,true);c.setUint16(14,dosDate,true);
      locals.push(local,data);directory.push(central);offset+=local.length+data.length;
    }
    const directorySize=directory.reduce((sum,part)=>sum+part.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
    e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,directorySize,true);e.setUint32(16,offset,true);
    return new Blob([...locals,...directory,end],{type:'application/zip'});
  }
  function downloadArchive(files){save(archive(files),'application/zip','WolfGuard-Historique-'+new Date().toISOString().slice(0,10)+'.zip');}
  function downloadFile(output){save(output.content,'application/pdf',output.name);}
  return {pdfModel,reading,sourceLabel,endpoint,file,download,archive,downloadArchive,downloadFile};
})();
