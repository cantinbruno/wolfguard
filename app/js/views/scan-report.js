'use strict';

// Report data, direct PDF downloads and ZIP archives; no external PDF service.
const webScanReport = (() => {
  const number=value=>Number(value||0).toLocaleString('fr-FR');
  const date=value=>{if(!value)return 'Non fournie';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?String(value):parsed.toLocaleString('fr-FR',{dateStyle:'long',timeStyle:'short'});};
  const themes={passive:'#78cdbb',active:'#f1b16b',map:'#73c7ba',vulnerability:'#e8ad82'};
  const jobLabels={queued:'En attente · relevé partiel',running:'En cours · relevé partiel',completed:'Terminé',cancelled:'Arrêté · relevé partiel',failed:'Échec · relevé partiel',expired:'Agent indisponible',lost:'Connexion perdue · relevé partiel'};
  const limits={passive:'Une entrée de cache ne confirme pas la présence actuelle du voisin. Aucune sonde ni capture de paquets n’a été effectuée.',active:'Les états filtrés ou ambigus sont conservés. Un service nommé peut être une correspondance de port ; seules les preuves reçues permettent de préciser son identification.',map:'Une absence de réponse peut correspondre à un filtrage ou à un poste indisponible. Cette découverte ne décrit pas la topologie physique du réseau.',vulnerability:'Audit de configuration en lecture seule, adapté au système de l’agent. Les contrôles non vérifiés ne sont pas conformes par défaut. Il ne s’agit pas d’un inventaire exhaustif des CVE.'};
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
    return {kind,title:definition.title,short:definition.short,kicker:definition.kicker,name:String(report.name||definition.short),accent:themes[kind],target:report.target||(kind==='vulnerability'?'Poste de l’agent':'Non fournie'),source:report.source||'Non fournie',captured:date(report.capturedAt||report.importedAt),generated:date(new Date()),status:jobLabels[report.jobStatus]||'Non fourni',rows:safe.rows,metrics:metrics(kind,safe.rows),summary:synthesis(kind,safe.rows),limit:limits[kind],warnings:[...(safe.warnings||[]),...(report.error?[report.error]:[])].map(String),reference:reference?{name:reference.name,date:date(reference.capturedAt||reference.importedAt),changes:webScanModel.compare(safe,reference)}:null};
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
  return {pdfModel,file,download,archive,downloadArchive,downloadFile};
})();
