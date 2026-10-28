'use strict';

// Classify the subject of a procedure, never incidental products mentioned in
// its command examples or body. The primary title takes precedence over the
// old folder, so an ESET deployment by GPO stays with ESET.
function procedureTechnologyPath(item, folders = []) {
  const fold=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();
  const rules=[
    [/^eset\b/,['ESET']],
    [/^pfsense\b/,['pfSense']],
    [/^3cx\b/,['3CX']],
    [/^(?:vmware\s+)?vcenter\b|^vcsa\b/,['VMware','vCenter']],
    [/^(?:vmware\s+)?esxi\b|^shell esxi\b/,['VMware','ESXi']],
    [/^dell\s+idrac\b|^idrac\b/,['Matériel et stockage','Dell iDRAC']],
    [/^proxmox\b/,['Proxmox VE']],
    [/^(?:cisco\s+)?(?:ise|identity services engine)\b|^cisco ise et aaa/,['Cisco','ISE et AAA']],
    [/^(?:cisco\s+)?(?:nexus|nx-os)\b/,['Cisco','Nexus et NX-OS']],
    [/^(?:cisco\s+)?catalyst center\b/,['Cisco','Catalyst Center']],
    [/^(?:cisco\s+)?(?:ios|catalyst)\b/,['Cisco','Catalyst et IOS-XE']],
    [/^(?:juniper|junos)\b/,['Juniper Junos']],
    [/^(?:fortigate|fortios)\b/,['Fortinet','FortiGate']],
    [/^fortiweb\b/,['Fortinet','FortiWeb']],
    [/^forticlient\b/,['Fortinet','FortiClient EMS']],
    [/^check point\b|^identity collector\b/,['Check Point']],
    [/^stormshield\b/,['Stormshield']],
    [/^aruba\b/,['Wi-Fi','Aruba']],
    [/^zyxel\b/,['Wi-Fi','Zyxel']],
    [/^f5\b|^big-ip\b/,['F5 BIG-IP']],
    [/^ivanti\b/,['Ivanti']],
    [/^trend micro\b/,['Trend Micro']],
    [/^active directory\b/,['Windows','Active Directory']],
    [/^(?:gpo|strategies de groupe)\b/,['Windows','GPO']],
    [/^dhcp windows\b/,['Windows','DHCP Server']],
    [/^hyper-v\b/,['Windows','Hyper-V']],
    [/^iis\b/,['Windows','IIS']],
    [/^defender\b|^windows (?:et defender|defender firewall)\b|^pare-feu windows\b/,['Windows','Defender et pare-feu']],
    [/^bitlocker\b/,['Windows','BitLocker']],
    [/^smb\b|^partages smb\b/,['Windows','Partages SMB et NTFS']],
    [/^windows\b/,/\b(?:ntfs|smb|partage)\b/],
    [/^powershell\b/,['Windows','PowerShell']],
    [/^exchange online\b/,['Microsoft 365','Exchange Online']],
    [/^(?:microsoft\s+)?entra\b/,['Microsoft 365','Entra ID']],
    [/^microsoft 365\b/,['Microsoft 365']],
    [/^(?:office|onenote|teams)\b/,['Microsoft 365','Office et Teams']],
    [/^exchange\b/,['Messagerie','Exchange Server']],
    [/^outlook\b/,['Messagerie','Outlook']],
    [/^gmail\b/,['Messagerie','Gmail']],
    [/^postfix\b/,['Linux','Postfix']],
    [/^(?:macos|mac os)\b/,['macOS']],
    [/^debian\b|^ubuntu\b/,['Linux','Debian et Ubuntu']],
    [/^linux audit\b/,['Linux','Audit']],
    [/^nftables\b/,['Linux','nftables']],
    [/^firewalld\b/,['Linux','firewalld']],
    [/^linux\b|^terminal linux\b/,['Linux']],
    [/^docker\b/,['Conteneurs','Docker']],
    [/^kubernetes\b|^kubectl\b/,['Conteneurs','Kubernetes']],
    [/^ansible\b/,['Automatisation et DevOps','Ansible']],
    [/^terraform\b/,['Automatisation et DevOps','Terraform']],
    [/^git\b/,['Automatisation et DevOps','Git']],
    [/^python\b/,['Automatisation et DevOps','Python']],
    [/^postgres(?:ql)?\b/,['Bases de données','PostgreSQL']],
    [/^mysql\b|^mariadb\b/,['Bases de données','MySQL et MariaDB']],
    [/^sqlite\b/,['Bases de données','SQLite']],
    [/^redis\b/,['Bases de données','Redis']],
    [/^prometheus\b|^grafana\b/,['Supervision','Prometheus et Grafana']],
    [/^(?:snmp|snmpv3)\b/,['Supervision','SNMP']],
    [/^centreon\b/,['Supervision','Centreon']],
    [/^observium\b/,['Supervision','Observium']],
    [/^oxidized\b/,['Supervision','Oxidized']],
    [/^nmap\b|^scan reseau\b/,['Sécurité','Nmap et scans réseau']],
    [/^nuclei\b/,['Sécurité','Nuclei']],
    [/^gophish\b/,['Sécurité','Gophish']],
    [/^qnap\b/,['Matériel et stockage','QNAP']],
    [/^nas\b/,['Matériel et stockage','NAS']],
    [/^sauvegarde\b/,['Sauvegarde et restauration']],
    [/^chrome\b/,['Applications','Chrome']],
    [/^firefox\b/,['Applications','Firefox']],
    [/^adobe\b/,['Applications','Adobe Reader']],
    [/^ebp\b/,['Applications','EBP']],
    [/^impression\b/,['Matériel et stockage','Impression']],
    [/^dns(?:sec)?\b/,['Réseaux et protocoles','DNS et DNSSEC']],
    [/^dhcp\b/,['Réseaux et protocoles','DHCP']],
    [/^proxy\b/,['Réseaux et protocoles','Proxy']],
    [/^iperf\b/,['Réseaux et protocoles','iPerf']],
    [/^802\.1x\b/,['Réseaux et protocoles','802.1X et RADIUS']],
    [/^tcp\b|^mtu\b/,['Réseaux et protocoles','TCP et MTU']],
    [/^commutation\b/,['Réseaux et protocoles','Commutation']],
    [/^ipv4\b|^cidr\b/,['Réseaux et protocoles','IPv4 et VLAN']],
    [/^ipv6\b/,['Réseaux et protocoles','IPv6']],
    [/^wireguard\b/,['Réseaux et protocoles','WireGuard']],
    [/^openvpn\b/,['Réseaux et protocoles','OpenVPN']],
    [/^(?:vpn\s+)?ipsec\b/,['Réseaux et protocoles','IPsec']],
    [/^ssh\b|^acces ssh\b/,['Réseaux et protocoles','SSH']],
    [/^tls\b|^https\b|^http et tls\b/,['Réseaux et protocoles','TLS et certificats']],
    [/^ntp\b/,['Réseaux et protocoles','NTP']],
    [/^ldap\b/,['Réseaux et protocoles','LDAP']],
    [/^wi-fi\b/,['Wi-Fi','Diagnostic']],
    [/^capture reseau\b|^captures et analyse de paquets\b/,['Réseaux et protocoles','Captures réseau']],
    [/^web et api\b/,['Web et API']],
    [/^reseau\b|^fondamentaux et diagnostic\b/,['Réseaux et protocoles','Diagnostic']],
    [/^journaux\b/,['Supervision','Journaux et événements']],
    [/^vulnerabilites\b/,['Sécurité','Vulnérabilités et images']],
    [/^preuves numeriques\b/,['Sécurité','Collecte de preuves']],
    [/^incident de securite\b|^rancongiciel\b|^phishing\b/,['Sécurité','Réponse aux incidents']],
  ];
  function classify(value) {
    const text=fold(value);
    for(const [pattern,path] of rules)if(pattern.test(text)) {
      if(path instanceof RegExp)return path.test(text)?['Windows','Partages SMB et NTFS']:['Windows'];
      return path;
    }
    return null;
  }
  return classify(item.title)||folders.map(folder=>classify(folder.name)).find(Boolean)||classify(item.platform)||null;
}

// A one-time folder-only plan, applied together with the existing migrations.
// The caller backs up and encrypts the entire workspace before any write.
function buildProcedureTechnologyOrganization(snapshot, stamp = new Date().toISOString()) {
  const versionKey='procedure-technology-organization-version';
  const summary={movedProcedures:0,movedCommands:0,createdFolders:0,emptyFolders:0};
  if(snapshot.settings?.some(row=>row.key===versionKey&&Number(row.value)>=1))return {operations:[],summary};
  const rootName='00 · Procédures par technologie';
  const libraryTypes=new Set(['memo','procedure','personal','command','report','template']);
  const managed=id=>/^(?:tech-folder-|wg-memo-folder-|procedure-folder-)/.test(id||'');
  const folders=new Map((snapshot.folders||[]).map(folder=>[folder.id,folder]));
  const usedIds=new Set(folders.keys()),operations=[],oldDestinations=new Set();
  const items=snapshot.items||[],paths=new Map();
  function ancestry(id) {
    const path=[],seen=new Set();
    while(id&&folders.has(id)) {
      if(seen.has(id))throw new Error('Cycle dans les dossiers : rangement des procédures annulé.');
      seen.add(id);const folder=folders.get(id);path.push(folder);id=folder.parentId;
    }
    return path;
  }
  const eligible=item=>!item.deletedAt&&libraryTypes.has(item.type)&&folders.has(item.folderId)&&managed(item.folderId)&&ancestry(item.folderId).every(folder=>!folder.deletedAt&&!/^99\s*[·.: -]/.test(folder.name)&&['library','memo','personal','command','template'].includes(folder.section));
  const candidates=items.filter(item=>(item.originalType||item.type)==='procedure'&&eligible(item));
  for(const item of candidates) {
    const path=procedureTechnologyPath(item,ancestry(item.folderId));
    // Generic methods are grouped explicitly, rather than guessing a product
    // from an example command or an incidental mention in the procedure body.
    paths.set(item.id,[rootName,...(path||['Méthodes transversales'])]);
  }
  // Move an associated command only when every referencing procedure agrees
  // on its destination. Shared references remain where they are, with links.
  const references=new Map();
  for(const item of items)if(!item.deletedAt)for(const id of item.linkedItemIds||[]) {
    if(!references.has(id))references.set(id,[]);references.get(id).push(item.id);
  }
  const procedurePaths=new Map(paths);
  for(const item of items)if((item.originalType||item.type)==='command'&&eligible(item)) {
    const parents=references.get(item.id)||[],destinations=parents.map(id=>procedurePaths.get(id));
    if(destinations.length&&destinations.every(path=>path&&JSON.stringify(path)===JSON.stringify(destinations[0])))paths.set(item.id,destinations[0]);
  }
  function folderFor(names) {
    let parentId=null;
    for(const name of names) {
      let folder=[...folders.values()].find(folder=>!folder.deletedAt&&folder.section==='library'&&folder.name===name&&(folder.parentId||null)===parentId);
      if(!folder) {
        const identity=JSON.stringify([parentId,name]);let hash=2166136261;
        for(let i=0;i<identity.length;i++)hash=Math.imul(hash^identity.charCodeAt(i),16777619)>>>0;
        const base='wg-procedure-tech-'+hash.toString(16).padStart(8,'0');let id=base,n=0;
        while(usedIds.has(id))id=base+'-'+(++n);
        usedIds.add(id);folder={id,name,section:'library',parentId,createdAt:stamp,updatedAt:stamp};folders.set(id,folder);
        operations.push({action:'put',store:'folders',record:folder});summary.createdFolders++;
      }
      parentId=folder.id;
    }
    return parentId;
  }
  const finalDestinations=new Map(items.map(item=>[item.id,item.folderId]));
  for(const item of items)if(paths.has(item.id)) {
    const folderId=folderFor(paths.get(item.id));
    if(folderId===item.folderId)continue;
    finalDestinations.set(item.id,folderId);
    ancestry(item.folderId).forEach(folder=>oldDestinations.add(folder.id));
    operations.push({action:'put',store:'items',record:{...item,folderId}});
    summary[(item.originalType||item.type)==='procedure'?'movedProcedures':'movedCommands']++;
  }
  const occupied=new Set(finalDestinations.values());
  const retired=new Set();let changed;
  do {
    changed=false;
    for(const id of oldDestinations) {
      const folder=folders.get(id);
      if(!managed(id)||folder.deletedAt||retired.has(id)||occupied.has(id))continue;
      if([...folders.values()].some(child=>!child.deletedAt&&!retired.has(child.id)&&child.parentId===id))continue;
      retired.add(id);changed=true;
      operations.push({action:'put',store:'folders',record:{...folder,deletedAt:stamp,procedureTechnologyEmpty:true}});summary.emptyFolders++;
    }
  } while(changed);
  operations.push({action:'put',store:'settings',record:{key:versionKey,value:1}});
  operations.push({action:'put',store:'settings',record:{key:'procedure-technology-organization-report',value:{at:stamp,...summary}}});
  return {operations,summary};
}
