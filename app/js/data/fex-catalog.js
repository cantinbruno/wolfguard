'use strict';

const FEX_CATALOG_VERSION=1;
const FEX_CATALOG_SETTING='fexCatalogVersion';
const FEX_REVIEW_DATE='2026-10-08';
const FEX_PLATFORM='Cisco Nexus 9000 / NX-OS avec Nexus 2000 FEX';
const FEX_SOURCES={
  guide:{title:'Cisco Nexus 2000 FEX pour Nexus 9000 - Guide NX-OS 10.3(x)',url:'https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/configuration/fex/cisco-nexus-2000-series-nx-os-fabric-extender-configuration-guide-for-cisco-nexus-9000-series-switches-release-103x/m-configuring-fex.html'},
  consistency:{title:'Cisco Nexus 9000 - Consistency Checker NX-OS 10.2(x)',url:'https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/102x/command-reference/show/b_n9k_show_commands_1021/m_c_showcmds.html'}
};
const FEX_COMMANDS=[
  ['inventory','show fex','show fex','Lister les FEX rattach\u00e9s, leur \u00e9tat, leur mod\u00e8le et leur num\u00e9ro de s\u00e9rie.','show fex'],
  ['detail','show fex <FEX_ID> detail','show fex <FEX_ID> detail','Afficher le d\u00e9tail d\u2019un FEX : versions, \u00e9tat, port de contr\u00f4le et interfaces fabric.','show fex 101 detail'],
  ['fabric','show interface fex-fabric','show interface fex-fabric','Contr\u00f4ler les uplinks FEX d\u00e9tect\u00e9s et leur \u00e9tat op\u00e9rationnel.','show interface fex-fabric'],
  ['po-map','show interface port-channel <PORT_CHANNEL_ID> fex-intf','show interface port-channel <PORT_CHANNEL_ID> fex-intf','Afficher les interfaces h\u00f4tes FEX associ\u00e9es \u00e0 un port-channel fabric.','show interface port-channel 101 fex-intf'],
  ['eth-map','show interface ethernet <PARENT_INTERFACE> fex-intf','show interface ethernet <PARENT_INTERFACE> fex-intf','Afficher les interfaces h\u00f4tes FEX \u00e9pingl\u00e9es \u00e0 un uplink physique du parent.','show interface ethernet 1/40 fex-intf'],
  ['parent-optic','show interface ethernet <PARENT_INTERFACE> transceiver','show interface ethernet <PARENT_INTERFACE> transceiver','Lire l\u2019identit\u00e9 et les informations disponibles du transceiver c\u00f4t\u00e9 Nexus parent.','show interface ethernet 1/40 transceiver'],
  ['fex-optic','show interface ethernet <PARENT_INTERFACE> transceiver fex-fabric','show interface ethernet <PARENT_INTERFACE> transceiver fex-fabric','Lire les informations du transceiver c\u00f4t\u00e9 uplink FEX lorsque la plateforme les expose.','show interface ethernet 1/40 transceiver fex-fabric'],
  ['hif-status','show interface ethernet <FEX_ID>/1/<HIF_PORT> status','show interface ethernet <FEX_ID>/1/<HIF_PORT> status','V\u00e9rifier rapidement l\u2019\u00e9tat, le VLAN, le duplex, la vitesse et le type d\u2019un port h\u00f4te FEX.','show interface ethernet 101/1/12 status'],
  ['hif-detail','show interface ethernet <FEX_ID>/1/<HIF_PORT>','show interface ethernet <FEX_ID>/1/<HIF_PORT>','Afficher l\u2019\u00e9tat d\u00e9taill\u00e9 et les compteurs d\u2019un port h\u00f4te FEX.','show interface ethernet 101/1/12'],
  ['hif-errors','show interface ethernet <FEX_ID>/1/<HIF_PORT> counters errors','show interface ethernet <FEX_ID>/1/<HIF_PORT> counters errors','Isoler les erreurs physiques et les rejets sur un port h\u00f4te FEX.','show interface ethernet 101/1/12 counters errors'],
  ['hif-config','show running-config interface ethernet <FEX_ID>/1/<HIF_PORT>','show running-config interface ethernet <FEX_ID>/1/<HIF_PORT>','Lire la configuration effective du port h\u00f4te sans parcourir toute la configuration.','show running-config interface ethernet 101/1/12'],
  ['hif-mac','show mac address-table interface ethernet <FEX_ID>/1/<HIF_PORT>','show mac address-table interface ethernet <FEX_ID>/1/<HIF_PORT>','V\u00e9rifier les adresses MAC apprises sur le port h\u00f4te cibl\u00e9.','show mac address-table interface ethernet 101/1/12'],
  ['hif-stp','show spanning-tree interface ethernet <FEX_ID>/1/<HIF_PORT> detail','show spanning-tree interface ethernet <FEX_ID>/1/<HIF_PORT> detail','Contr\u00f4ler le r\u00f4le STP et les incoh\u00e9rences d\u2019un port FEX de niveau 2.','show spanning-tree interface ethernet 101/1/12 detail'],
  ['logs','show logging logfile | include FEX','show logging logfile | include FEX','Filtrer les journaux contenant FEX avant et pendant l\u2019incident. Compl\u00e9ter avec l\u2019identifiant ou l\u2019interface concern\u00e9e.','show logging logfile | include FEX'],
  ['consistency','show consistency-checker fex-interfaces fex <FEX_ID> detail','show consistency-checker fex-interfaces fex <FEX_ID> detail','Comparer les \u00e9tats logiciel et mat\u00e9riel des interfaces du FEX sur les versions qui proposent ce contr\u00f4le.','show consistency-checker fex-interfaces fex 101 detail','consistency']
];
const FEX_DOCUMENTS=[
  {
    slug:'concepts',type:'memo',title:'Cisco Nexus FEX - Architecture et rep\u00e8res',
    description:'Comprendre le parent, le FEX, les uplinks NIF, les ports h\u00f4tes HIF et leur num\u00e9rotation.',
    tags:['cisco','nexus','nx-os','fex','n2k','architecture'],
    sourceKeys:['guide'],
    content:'<h1>Cisco Nexus FEX - Architecture et rep\u00e8res</h1><p>Un Fabric Extender Nexus 2000 est administr\u00e9 depuis son switch parent NX-OS. Il ne doit pas \u00eatre trait\u00e9 comme un switch autonome.</p><h2>Rep\u00e8res</h2><ul><li><strong>Parent :</strong> Nexus qui porte la configuration et le plan de contr\u00f4le du FEX.</li><li><strong>FEX ID :</strong> identifiant g\u00e9n\u00e9ralement compris entre 101 et 199 dans le guide de r\u00e9f\u00e9rence.</li><li><strong>NIF / fabric interface :</strong> uplink entre le parent et le FEX, physique ou agr\u00e9g\u00e9 selon le design support\u00e9.</li><li><strong>HIF :</strong> port h\u00f4te pr\u00e9sent\u00e9 sur le parent, par exemple Ethernet101/1/12.</li></ul><h2>Lecture rapide</h2><pre>show fex\nshow fex &lt;FEX_ID&gt; detail\nshow interface fex-fabric</pre><h2>Points de vigilance</h2><ul><li>Confirmer le mod\u00e8le du parent, le mod\u00e8le FEX, la release NX-OS et la matrice de compatibilit\u00e9 avant tout changement.</li><li>Distinguer un uplink FEX, un port h\u00f4te FEX et un port-channel de serveur.</li><li>Un FEX Online ne garantit pas qu\u2019un HIF transmet correctement le VLAN attendu.</li></ul>'+fexSourcesHTML(['guide'])
  },
  {
    slug:'offline',type:'procedure',title:'Cisco Nexus FEX - Diagnostiquer un FEX Offline ou d\u00e9grad\u00e9',
    description:'S\u00e9parer association, uplinks, optiques, port-channel et compatibilit\u00e9 sans provoquer de coupure.',
    tags:['cisco','nexus','nx-os','fex','n2k','diagnostic','uplink'],
    sourceKeys:['guide','consistency'],
    content:'<h1>Cisco Nexus FEX - Diagnostiquer un FEX Offline ou d\u00e9grad\u00e9</h1><p>Collecte en lecture seule pour localiser la panne avant toute action sur les interfaces fabric.</p><h2>Diagnostic</h2><ol><li>Relever le parent, sa release NX-OS, le mod\u00e8le et le num\u00e9ro de s\u00e9rie du FEX, son ID et l\u2019heure de l\u2019incident.</li><li>Avec <code>show fex</code> puis <code>show fex &lt;FEX_ID&gt; detail</code>, comparer l\u2019\u00e9tat, les versions et l\u2019interface utilis\u00e9e pour le trafic de contr\u00f4le.</li><li>Avec <code>show interface fex-fabric</code>, identifier chaque NIF et v\u00e9rifier qu\u2019il est actif.</li><li>Si les NIF sont agr\u00e9g\u00e9s, contr\u00f4ler le port-channel, ses membres et la coh\u00e9rence de leur configuration.</li><li>Examiner les compteurs et les transceivers aux deux extr\u00e9mit\u00e9s. Une perte de signal, des erreurs ou un membre absent orientent vers le chemin physique.</li><li>Corr\u00e9ler les journaux au moment de la panne. Utiliser le consistency checker seulement s\u2019il existe sur la release et si son co\u00fbt est acceptable.</li></ol><h2>Interpr\u00e9tation</h2><ul><li><strong>Absent :</strong> v\u00e9rifier d\u2019abord association, c\u00e2blage, support mat\u00e9riel et fonction FEX.</li><li><strong>Offline :</strong> examiner NIF, optiques, versions et journaux avant tout red\u00e9marrage.</li><li><strong>Online avec un uplink inactif :</strong> traiter le membre ou le port-channel sans conclure \u00e0 une panne compl\u00e8te du FEX.</li></ul><h2>Validation</h2><p>Le FEX est Online, les uplinks attendus sont Active, les versions sont coh\u00e9rentes et les HIF critiques retrouvent leur \u00e9tat nominal.</p><h2>Pr\u00e9cautions</h2><p>Ne pas utiliser <code>reload fex</code>, <code>no fex associate</code>, <code>shutdown</code> ou <code>clear</code> comme test. Ces actions peuvent interrompre tous les h\u00f4tes du FEX.</p>'+fexSourcesHTML(['guide','consistency'])
  },
  {
    slug:'host-port',type:'procedure',title:'Cisco Nexus FEX - Diagnostiquer un port h\u00f4te',
    description:'Analyser un HIF FEX depuis le lien physique jusqu\u2019au VLAN, STP et \u00e0 l\u2019apprentissage MAC.',
    tags:['cisco','nexus','nx-os','fex','n2k','hif','diagnostic'],
    sourceKeys:['guide'],
    content:'<h1>Cisco Nexus FEX - Diagnostiquer un port h\u00f4te</h1><p>Proc\u00e9dure cibl\u00e9e sur une interface telle que Ethernet101/1/12.</p><h2>Diagnostic</h2><ol><li>Confirmer le FEX ID, le port, le serveur connect\u00e9, le VLAN attendu et l\u2019heure du d\u00e9faut.</li><li>V\u00e9rifier que le FEX est Online avant d\u2019analyser le HIF isol\u00e9ment.</li><li>Comparer l\u2019\u00e9tat synth\u00e9tique, le d\u00e9tail de l\u2019interface et les compteurs d\u2019erreurs.</li><li>Lire la configuration du HIF : mode access ou trunk, VLAN, port-channel, politiques et \u00e9tat administratif.</li><li>Contr\u00f4ler STP et l\u2019apprentissage MAC. Une interface Up sans MAC peut indiquer un probl\u00e8me c\u00f4t\u00e9 h\u00f4te, VLAN ou agr\u00e9gation.</li><li>Comparer avec le port jumeau du serveur et avec un HIF fonctionnel de m\u00eame usage.</li></ol><h2>Collecte minimale</h2><pre>show interface ethernet &lt;FEX_ID&gt;/1/&lt;HIF_PORT&gt; status\nshow interface ethernet &lt;FEX_ID&gt;/1/&lt;HIF_PORT&gt;\nshow interface ethernet &lt;FEX_ID&gt;/1/&lt;HIF_PORT&gt; counters errors\nshow running-config interface ethernet &lt;FEX_ID&gt;/1/&lt;HIF_PORT&gt;\nshow mac address-table interface ethernet &lt;FEX_ID&gt;/1/&lt;HIF_PORT&gt;</pre><h2>Validation</h2><p>Interface dans l\u2019\u00e9tat attendu, compteurs stables, VLAN et STP coh\u00e9rents, MAC apprise et test applicatif bidirectionnel r\u00e9ussi.</p><h2>Pr\u00e9cautions</h2><p>Ne pas fermer le HIF, vider les compteurs ou modifier son VLAN avant d\u2019avoir conserv\u00e9 les preuves et valid\u00e9 l\u2019impact avec l\u2019exploitant.</p>'+fexSourcesHTML(['guide'])
  }
];

function fexSourcesHTML(keys){
  return '<h2>Sources officielles</h2><ul>'+keys.map(key=>{const source=FEX_SOURCES[key];return '<li><a href="'+source.url+'" target="_blank" rel="noopener noreferrer">'+source.title+'</a></li>'}).join('')+'</ul><p>Documentation consult\u00e9e le '+FEX_REVIEW_DATE+'. Confirmer le mod\u00e8le, la release et le mode NX-OS avant ex\u00e9cution.</p>';
}
function fexCatalogKey(item){
  const value=item.type==='command'?item.content:item.title;
  return item.type+'\0'+String(value||'').trim().toLowerCase();
}
function enrichFexLibrary(data,stamp=now()){
  data.items??=[];data.folders??=[];data.settings??=[];
  if(Number(data.settings.find(record=>record.key===FEX_CATALOG_SETTING)?.value)>=FEX_CATALOG_VERSION)return data;
  const ids=new Set([...data.items,...data.folders].map(record=>record.id));
  const uniqueId=preferred=>{const id=ids.has(preferred)?uid():preferred;ids.add(id);return id};
  const folderFor=section=>{
    let folder=data.folders.find(record=>record.section===section&&!record.deletedAt&&record.name==='Cisco Nexus');
    if(!folder){folder={id:uniqueId('fex-folder-'+section),section,name:'Cisco Nexus',parentId:null,createdAt:stamp,updatedAt:stamp};data.folders.push(folder)}
    return folder;
  };
  const existing=new Set(data.items.filter(item=>!item.deletedAt).map(fexCatalogKey));
  const commandFolder=folderFor('command'),memoFolder=folderFor('memo');
  const common={vendor:'Cisco',platform:FEX_PLATFORM,favorite:false,viewCount:0,attachments:[]};
  for(const [slug,title,content,description,example,sourceKey='guide'] of FEX_COMMANDS){
    const key='command\0'+content.toLowerCase();if(existing.has(key))continue;
    const source=FEX_SOURCES[sourceKey],limited=sourceKey==='consistency'?' Disponibilit\u00e9 et charge variables selon la release ; lancer de fa\u00e7on cibl\u00e9e.':'';
    data.items.push({...common,id:uniqueId('fex-command-'+slug),type:'command',title,folderId:commandFolder.id,content,description,
      tags:['cisco','nexus','nx-os','fex','n2k','diagnostic'],context:'EXEC NX-OS (#). Remplacer tous les param\u00e8tres entre chevrons. Impact : lecture seule.'+limited+' R\u00e9f\u00e9rence Nexus 9000 / Nexus 2000 ; confirmer le support sur le mod\u00e8le et la release d\u00e9ploy\u00e9s.',example,
      sources:[source],quality:{reviewedAt:FEX_REVIEW_DATE,validation:'documentation',impact:'Lecture seule'},createdAt:stamp,updatedAt:stamp});existing.add(key);
  }
  for(const document of FEX_DOCUMENTS){
    const {sourceKeys=['guide'],...record}=document,key=record.type+'\0'+record.title.toLowerCase();if(existing.has(key))continue;
    data.items.push({...common,...record,id:uniqueId('fex-document-'+record.slug),folderId:memoFolder.id,
      sources:sourceKeys.map(sourceKey=>FEX_SOURCES[sourceKey]),quality:{reviewedAt:FEX_REVIEW_DATE,validation:'documentation-et-methode',impact:'R\u00e9f\u00e9rence'},createdAt:stamp,updatedAt:stamp});existing.add(key);
  }
  const marker=data.settings.find(record=>record.key===FEX_CATALOG_SETTING);
  if(marker)marker.value=FEX_CATALOG_VERSION;else data.settings.push({key:FEX_CATALOG_SETTING,value:FEX_CATALOG_VERSION});
  data.updatedAt=stamp;return data;
}
async function enrichLocalFexLibrary(){
  return new Promise((resolve,reject)=>{
    const stores=['items','folders','settings'],transaction=db.transaction(stores,'readwrite'),records={};let failure,changed=false;
    transaction.oncomplete=()=>{if(changed)window.workspaceSearch?.invalidate();resolve(changed)};
    transaction.onerror=transaction.onabort=()=>reject(failure||transaction.error||new Error('Enrichissement FEX interrompu'));
    const merge=()=>{
      if(stores.some(store=>!records[store]))return;
      if(!records.items.length)return;
      try{
        const payload=enrichFexLibrary(structuredClone(records));
        for(const store of stores){
          const previous=new Map(records[store].map(record=>[record.id||record.key,JSON.stringify(record)]));
          for(const record of payload[store])if(previous.get(record.id||record.key)!==JSON.stringify(record)){transaction.objectStore(store).put(record);changed=true}
        }
      }catch(error){failure=error;transaction.abort()}
    };
    for(const store of stores){const request=transaction.objectStore(store).getAll();request.onsuccess=()=>{records[store]=request.result;merge()}}
  });
}
