'use strict';

const PROTOCOL_CATALOG_VERSION=1;
const PROTOCOL_CATALOG_SETTING='protocolCatalogVersion';
const PROTOCOL_CATALOG_SOURCES={
  iana:['Registre IANA des services','https://www.iana.org/assignments/service-names-port-numbers/'],
  ip:['Registre IANA des protocoles IP','https://www.iana.org/assignments/protocol-numbers/'],
  ad:['Microsoft - Active Directory','https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/config-firewall-for-ad-domains-and-trusts'],
  pxgrid:['Cisco - pxGrid','https://developer.cisco.com/docs/pxgrid/technical-overview/'],
  ise:['Cisco ISE 3.4 - Ports','https://www.cisco.com/c/en/us/td/docs/security/ise/3-4/install_guide/b_ise_installationGuide34/b_ise_InstallationGuide_chapter_7.html'],
  ems:['FortiClient EMS 7.2.4 - Ports','https://docs.fortinet.com/document/forticlient/7.2.4/ems-administration-guide/439480'],
  centreon:['Centreon - Communications','https://docs.centreon.com/docs/monitoring/monitoring-servers/communications/'],
  prometheus:['Prometheus - Getting started','https://prometheus.io/docs/tutorials/getting_started/'],
  grafana:['Grafana - Connexion','https://grafana.com/docs/grafana/latest/setup-grafana/sign-in-to-grafana/'],
  wireguard:['WireGuard - Quick start','https://www.wireguard.com/quickstart/']
};
// Ports standards, puis valeurs de configuration identifiees comme telles.
const PROTOCOL_CATALOG_ADDITIONS=[
  ['http3','HTTP/3 - QUIC','443','UDP','web','HTTP sur QUIC et UDP, distinct de HTTPS sur TCP.','9114'],
  ['dot','DNS over TLS','853','TCP','network','R\u00e9solution DNS chiffr\u00e9e vers un r\u00e9solveur compatible DoT.','7858'],
  ['doq','DNS over QUIC','853','UDP','network','R\u00e9solution DNS chiffr\u00e9e sur QUIC, distincte de DoT/TCP.','9250'],
  ['syslog-tls','Syslog TLS','6514','TCP','monitoring','Collecte des journaux sous TLS ; v\u00e9rifier les certificats et l\u2019identit\u00e9 du collecteur.','5425'],
  ['nts','NTS-KE','4460','TCP','network','\u00c9tablissement des cl\u00e9s NTS sous TLS. Le trafic NTP utilise ensuite UDP/123.','8915'],
  ['submission','SMTP Submission','587','TCP','messaging','Soumission des courriels par un client. STARTTLS doit \u00eatre impos\u00e9 par la politique du serveur.','6409'],
  ['submissions','SMTPS Submission','465','TCP','messaging','Soumission des courriels avec TLS implicite.','8314'],
  ['imaps','IMAPS','993','TCP','messaging','Acc\u00e8s aux bo\u00eetes aux lettres IMAP sous TLS implicite.','8314'],
  ['pop3s','POP3S','995','TCP','messaging','Rel\u00e8ve POP3 sous TLS implicite.','8314'],
  ['ftps','FTPS implicite','990','TCP','data','Canal de contr\u00f4le FTP sous TLS implicite. Les connexions de donn\u00e9es sont distinctes.','iana'],
  ['rsync','Rsync','873','TCP','data','Service rsync en mode daemon ; ne pas confondre avec rsync sur SSH.','iana'],
  ['iscsi','iSCSI','3260','TCP','data','Sessions de stockage bloc entre initiateur et cible iSCSI.','7143'],
  ['netconf-ssh','NETCONF SSH','830','TCP','network','Administration NETCONF sur SSH ; v\u00e9rifier l\u2019activation et les droits du compte.','6242'],
  ['netconf-tls','NETCONF TLS','6513','TCP','network','Administration NETCONF sur TLS ; v\u00e9rifier les certificats et les identit\u00e9s autoris\u00e9es.','7589'],
  ['restconf','RESTCONF HTTPS','443','TCP','web','API RESTCONF sur HTTPS. Le port peut \u00eatre modifi\u00e9 dans la configuration du serveur.','8040'],
  ['gnmi','gNMI','9339','TCP','network','Interface gRPC de gestion et t\u00e9l\u00e9m\u00e9trie ; port enregistr\u00e9, \u00e9coute configurable.','iana'],
  ['ipfix','IPFIX','4739','TCP/UDP/SCTP','monitoring','Export des informations de flux vers un collecteur ; choisir le transport configur\u00e9.','7011'],
  ['sflow','sFlow','6343','UDP','monitoring','Export d\u2019\u00e9chantillons de trafic vers un collecteur sFlow.','3176'],
  ['bfd','BFD Control','3784','UDP','network','D\u00e9tection rapide de d\u00e9faillance sur un lien BFD single-hop.','5881'],
  ['bfd-echo','BFD Echo','3785','UDP','network','Fonction Echo BFD single-hop, lorsqu\u2019elle est activ\u00e9e.','5881'],
  ['bfd-multi','BFD Multihop','4784','UDP','network','Messages de contr\u00f4le BFD multihop ; distincts du port single-hop.','5883'],
  ['rip','RIPv2','520','UDP','network','\u00c9changes du protocole de routage RIPv2.','2453'],
  ['ripng','RIPng','521','UDP','network','\u00c9changes du protocole de routage RIPng pour IPv6.','2080'],
  ['ptp-event','PTP Event','319','UDP','network','Messages \u00e9v\u00e9nementiels PTP sur UDP ; les profils Ethernet natifs n\u2019utilisent pas ce port.','iana'],
  ['ptp-general','PTP General','320','UDP','network','Messages g\u00e9n\u00e9raux PTP sur UDP, compl\u00e9mentaires aux \u00e9v\u00e9nements UDP/319.','iana'],
  ['pcp','PCP','5351','UDP','network','Port Control Protocol : contr\u00f4le des mappings sur une passerelle compatible.','6887'],
  ['radius-coa','RADIUS CoA','3799','UDP','identity','Autorisation dynamique RADIUS : CoA et Disconnect. Certains \u00e9quipements utilisent un port diff\u00e9rent.','5176'],
  ['radius-tls','RADIUS TLS - RadSec','2083','TCP','identity','Transport RADIUS sous TLS ; le support d\u00e9pend des produits et versions.','6614'],
  ['kpasswd','Kerberos Password','464','TCP/UDP','identity','Changement de mot de passe Kerberos, notamment dans Active Directory.','ad'],
  ['adws','ADWS','9389','TCP','identity','Active Directory Web Services, utilis\u00e9 notamment par les outils d\u2019administration AD.','ad'],
  ['rpcbind','rpcbind','111','TCP/UDP','data','D\u00e9couverte des services ONC RPC. Les services annonc\u00e9s peuvent utiliser d\u2019autres ports.','1833'],
  ['ise-pxgrid','Cisco ISE pxGrid','8910','TCP','identity','pxGrid 2.0 : REST et WebSocket pour les int\u00e9grations ISE.','pxgrid'],
  ['ise-ers','Cisco ISE ERS','9060','TCP','identity','Port ERS historique. ISE 3.4 recommande HTTPS/443 pour ERS ; confirmer la version d\u00e9ploy\u00e9e.','ise'],
  ['ems-telemetry','FortiClient Telemetry','8013','TCP','monitoring','Port de t\u00e9l\u00e9m\u00e9trie EMS par d\u00e9faut ; confirmer les services et ports de la version d\u00e9ploy\u00e9e.','ems'],
  ['gorgone','Centreon Gorgone','5556','TCP','monitoring','Port recommand\u00e9 pour les communications Gorgone. La configuration et la topologie font r\u00e9f\u00e9rence.','centreon'],
  ['prometheus','Prometheus','9090','TCP','monitoring','Serveur HTTP Prometheus : port par d\u00e9faut, configurable. Restreindre les acc\u00e8s.','prometheus'],
  ['grafana','Grafana','3000','TCP','monitoring','Interface HTTP Grafana : port par d\u00e9faut, configurable ; TLS peut \u00eatre termin\u00e9 par un proxy.','grafana'],
  ['wireguard','WireGuard','51820','UDP','network','Port utilis\u00e9 dans les exemples WireGuard ; ListenPort est configurable, ce n\u2019est pas un port impos\u00e9.','wireguard'],
  ['icmp','ICMP','','IP','network','Diagnostic et messages de contr\u00f4le IPv4. Num\u00e9ro de protocole IP 1, sans port TCP/UDP.','ip','1'],
  ['icmpv6','ICMPv6','','IP','network','Messages de contr\u00f4le IPv6. Next Header 58, sans port TCP/UDP.','ip','58'],
  ['ospf','OSPF','','IP','network','Protocole de routage OSPF. Num\u00e9ro de protocole IP 89, sans port TCP/UDP.','ip','89'],
  ['gre','GRE','','IP','network','Encapsulation GRE. Num\u00e9ro de protocole IP 47, sans port TCP/UDP.','ip','47'],
  ['esp','ESP','','IP','network','Encapsulation de s\u00e9curit\u00e9 IPsec. Num\u00e9ro IP 50 ; NAT-T peut encapsuler ESP dans UDP/4500.','ip','50'],
  ['ah','AH','','IP','network','Authentification IPsec AH. Num\u00e9ro de protocole IP 51, sans port TCP/UDP.','ip','51'],
  ['vrrp','VRRP','','IP','network','Redondance de passerelle VRRP. Num\u00e9ro de protocole IP 112, sans port TCP/UDP.','ip','112']
];
function enrichProtocolLibrary(data,stamp=now()){
  data.items??=[];data.folders??=[];data.settings??=[];
  if(Number(data.settings.find(record=>record.key===PROTOCOL_CATALOG_SETTING)?.value)>=PROTOCOL_CATALOG_VERSION)return data;
  const foldersByName=new Map(data.folders.filter(folder=>folder.section==='protocol'&&!folder.deletedAt).map(folder=>[folder.name,folder]));
  const labels={web:'Web / API',network:'R\u00e9seau',identity:'Identit\u00e9',data:'Fichiers / Stockage',messaging:'Messagerie',monitoring:'Supervision'};
  const existing=new Set(data.items.filter(item=>item.type==='protocol').map(item=>{
    const value=protocolData(item);return protocolKey(value.service||item.title,value.port,value.transport);
  }));
  const ids=new Set([...data.items,...data.folders].map(record=>record.id));
  const uniqueId=preferred=>{const id=ids.has(preferred)?uid():preferred;ids.add(id);return id};
  for(const [slug,service,port,transport,family,usage,sourceKey,number] of PROTOCOL_CATALOG_ADDITIONS){
    const key=protocolKey(service,port,transport);if(existing.has(key))continue;
    let folder=foldersByName.get(labels[family]);
    if(!folder){
      folder={id:uniqueId('protocol-folder-'+family),section:'protocol',name:labels[family],parentId:null,createdAt:stamp,updatedAt:stamp};
      data.folders.push(folder);foldersByName.set(folder.name,folder);
    }
    const source=PROTOCOL_CATALOG_SOURCES[sourceKey]||['RFC '+sourceKey,'https://www.rfc-editor.org/rfc/rfc'+sourceKey+'.html'];
    const endpoint=number?'Num\u00e9ro IP '+number:port+'/'+transport;
    const title=service+' \u2014 '+endpoint;
    const summary='<table><tr><th>'+(number?'Num\u00e9ro IP':'Port')+'</th><td>'+esc(number||port)+'</td></tr><tr><th>Transport</th><td>'+esc(transport)+'</td></tr><tr><th>Usage</th><td>'+esc(usage)+'</td></tr></table>';
    const security="V\u00e9rifier l'\u00e9coute r\u00e9elle, les pairs autoris\u00e9s et la configuration de la version d\u00e9ploy\u00e9e avant de d\u00e9finir les flux.";
    data.items.push({id:uniqueId('protocol-extra-'+slug),type:'protocol',documentType:'memo',title,description:usage,
      protocol:{service,port,transport,usage,security,...(number?{number}: {})},folderId:folder.id,tags:['reference','protocole',family],favorite:false,
      content:'<h1>'+esc(title)+'</h1><h2>R\u00e9sum\u00e9</h2><p>'+esc(usage)+'</p>'+summary+'<h2>S\u00e9curit\u00e9</h2><p>'+esc(security)+'</p><h2>Sources</h2><ul><li><a href="'+esc(source[1])+'" target="_blank" rel="noopener noreferrer">'+esc(source[0])+'</a></li></ul>',
      references:[{title:source[0],url:source[1]}],createdAt:stamp,updatedAt:stamp});
    existing.add(key);
  }
  const marker=data.settings.find(record=>record.key===PROTOCOL_CATALOG_SETTING);
  if(marker)marker.value=PROTOCOL_CATALOG_VERSION;else data.settings.push({key:PROTOCOL_CATALOG_SETTING,value:PROTOCOL_CATALOG_VERSION});
  data.updatedAt=stamp;return data;
}
async function enrichLocalProtocolLibrary(){
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(['items','folders','settings'],'readwrite');
    const records={},requests={},changed={value:false};let failure;
    transaction.oncomplete=()=>{if(changed.value)window.workspaceSearch?.invalidate();resolve(changed.value)};
    transaction.onerror=transaction.onabort=()=>reject(failure||transaction.error||new Error('Enrichissement interrompu'));
    const merge=()=>{
      if(!records.items||!records.folders||!records.settings)return;
      if(!records.items.some(item=>item.type==='protocol'))return;
      try{
        const payload=enrichProtocolLibrary(structuredClone(records));
        for(const store of ['items','folders','settings']){
          const previous=new Map(records[store].map(record=>[record.id||record.key,JSON.stringify(record)]));
          for(const record of payload[store])if(previous.get(record.id||record.key)!==JSON.stringify(record)){
            transaction.objectStore(store).put(record);changed.value=true;
          }
        }
      }catch(error){failure=error;transaction.abort()}
    };
    for(const store of ['items','folders','settings']){
      requests[store]=transaction.objectStore(store).getAll();
      requests[store].onsuccess=()=>{records[store]=requests[store].result;merge()};
    }
  });
}
