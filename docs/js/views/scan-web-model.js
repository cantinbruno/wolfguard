'use strict';

// Local parsing only. Imported content is treated as data, never as markup.
const webScanModel = (() => {
  const MAX_BYTES=2*1024*1024,MAX_ROWS=5000;
  const text=(value,max=500)=>String(value??'').slice(0,max);
  const number=value=>value===''||value==null?null:Number(value);
  const states={listen:'listening',listening:'listening',established:'connection',bound:'bound',up:'reachable',down:'unreachable'};
  const labels={observed:'En cache',listening:'En écoute',connection:'Connexion',bound:'Socket UDP',open:'Ouvert',closed:'Fermé',filtered:'Filtré',unfiltered:'Non filtré','open|filtered':'Ouvert ou filtré','closed|filtered':'Fermé ou filtré',reachable:'Répond',unreachable:'Sans réponse','no-response':'Sans réponse',error:'Erreur',unknown:'Non renseigné'};
  function row(raw,kind,source='Import'){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Une observation doit être un objet avec une adresse.');
    const address=text(raw.address??raw.LocalAddress??raw.IPAddress??'',253).trim();
    if(!address||/[\s<>"'`]/.test(address))throw new Error('Une observation contient une adresse absente ou invalide.');
    const port=number(raw.port??raw.LocalPort);
    if(port!==null&&(!Number.isInteger(port)||port<0||port>65535))throw new Error('Port invalide dans le relevé.');
    const transport=text(raw.transport??raw.protocol??(port===null?'ARP':'TCP'),10).toUpperCase();
    const original=text(raw.status??raw.State??(kind==='active'?'unknown':port===null?'observed':transport==='UDP'?'bound':'connection'),60);
    const status=states[original.toLowerCase()]||original.toLowerCase();
    const normalized=labels[status]?status:kind==='passive'?(port===null?'observed':'connection'):'unknown';
    const service=typeof raw.service==='object'?raw.service?.protocol:raw.service;
    const pid=number(raw.pid??raw.processId??raw.OwningProcess);
    const remotePort=number(raw.remotePort??raw.RemotePort);
    return {address,port,transport,status:normalized,source:text(raw.source||source,100),
      hostname:text(raw.hostname),service:text(service),product:text(raw.product??raw.service?.product),version:text(raw.version),
      macAddress:text(raw.macAddress??raw.LinkLayerAddress,80),interfaceName:text(raw.interfaceName??raw.InterfaceAlias??raw.InterfaceIndex,100),
      processName:text(raw.processName),pid:Number.isInteger(pid)&&pid>=0?pid:null,
      remoteAddress:text(raw.remoteAddress??raw.RemoteAddress,253),remotePort:Number.isInteger(remotePort)&&remotePort>=0&&remotePort<=65535?remotePort:null,
      detail:text(raw.detail??raw.observationState??raw.State,2000)};
  }
  function key(r){return JSON.stringify([r.address,r.port,r.transport,r.remoteAddress,r.remotePort,r.pid,r.interfaceName]);}
  function signature(r){return JSON.stringify([r.status,r.macAddress,r.service,r.product,r.version,r.processName,r.detail]);}
  function csv(input){
    const content=input.replace(/^#TYPE[^\n]*\n/i,'');
    const first=content.split(/\r?\n/,1)[0],delimiter=first.includes('\t')?'\t':first.split(';').length>first.split(',').length?';':',';
    const rows=[];let cells=[],cell='',quoted=false;
    for(let i=0;i<content.length;i++){
      const char=content[i];
      if(char==='"'){if(quoted&&content[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell.trim())throw new Error('CSV invalide : guillemet inattendu.');else quoted=!quoted;}
      else if(!quoted&&(char===delimiter||char==='\n'||char==='\r')){
        cells.push(cell.trim());cell='';if(char!==delimiter){if(cells.some(Boolean))rows.push(cells);cells=[];if(char==='\r'&&content[i+1]==='\n')i++;}
      }else cell+=char;
      if(rows.length>MAX_ROWS+1)throw new Error('Maximum 5 000 observations par relevé.');
    }
    if(quoted)throw new Error('CSV invalide : guillemet non fermé.');
    if(cell||cells.length){cells.push(cell.trim());rows.push(cells);}
    const headers=rows.shift()||[];
    if(!headers.some(header=>['address','LocalAddress','IPAddress'].includes(header)))throw new Error('CSV attendu : colonnes address, port, transport, status ; ou export PowerShell LocalAddress / IPAddress.');
    return rows.map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index]??''])));
  }
  function endpoint(value){
    const match=/^\[([^\]]+)\]:(\d+|\*)$/.exec(value)||/^(.*):(\d+|\*)$/.exec(value);
    return match?{address:match[1]==='*'?'0.0.0.0':match[1],port:match[2]==='*'?null:Number(match[2])}:null;
  }
  function passiveText(input){
    const rows=[];let ignored=0,iface='';
    for(const line of input.split(/\r?\n/)){
      const value=line.trim();if(!value)continue;
      const heading=/^Interface\s*:\s*(\S+)/i.exec(value);if(heading){iface=heading[1];continue;}
      const neighbour=/^([\da-f:.%]+)\s+(?:dev\s+(\S+)\s+)?(?:lladdr\s+)?([\da-f]{2}(?:[:-][\da-f]{2}){5})\s*(.*)$/i.exec(value);
      if(neighbour){rows.push({address:neighbour[1],macAddress:neighbour[3],interfaceName:neighbour[2]||iface,status:'observed',detail:neighbour[4],transport:neighbour[1].includes(':')?'NDP':'ARP'});continue;}
      const parts=value.split(/\s+/),protocol=parts[0].toUpperCase().replace(/[46]$/,'');
      if(['TCP','UDP'].includes(protocol)){
        // netstat -ano (Windows), netstat -tunap and ss -H -tunap (Linux).
        const index=parts.findIndex((part,i)=>i>0&&endpoint(part));
        const local=endpoint(parts[index]||''),remote=endpoint(parts[index+1]||'');
        if(local&&remote){
          const state=/LISTEN|ESTAB|TIME_WAIT|CLOSE_WAIT|SYN_SENT|ÉCOUTE|ECOUTE/i.exec(value)?.[0]||'';
          const process=parts.at(-1),pid=/^(\d+)(?:\/|$)/.exec(process)?.[1]||/pid=(\d+)/.exec(value)?.[1];
          rows.push({address:local.address,port:local.port,transport:protocol,status:/LISTEN|ÉCOUTE|ECOUTE/i.test(state)?'listening':protocol==='UDP'?'bound':'connection',remoteAddress:remote.address,remotePort:remote.port,pid,processName:process.includes('/')?process.split('/').slice(1).join('/'):'',detail:state});continue;
        }
      }
      if(!/^(?:Active|Proto|Adresse|Internet|IP Address|Netid|Connexions|Table|\-+)/i.test(value))ignored++;
    }
    return {rows,ignored};
  }
  function xml(input){
    if(/<!ENTITY|<!DOCTYPE[^>]*(?:\[|SYSTEM|PUBLIC)/i.test(input))throw new Error('Les entités et les DTD externes ne sont pas acceptées.');
    const doc=new DOMParser().parseFromString(input,'application/xml');
    if(doc.querySelector('parsererror')||doc.documentElement.localName!=='nmaprun')throw new Error('Le fichier ne contient pas un rapport XML Nmap valide.');
    const rows=[];let summarized=0;
    for(const host of doc.querySelectorAll('nmaprun > host')){
      const address=host.querySelector('address[addrtype="ipv4"], address[addrtype="ipv6"]')?.getAttribute('addr');if(!address)continue;
      const common={address,hostname:host.querySelector('hostname')?.getAttribute('name'),macAddress:host.querySelector('address[addrtype="mac"]')?.getAttribute('addr')};
      const ports=host.querySelectorAll('ports > port');
      for(const port of ports){const service=port.querySelector('service'),state=port.querySelector('state');rows.push({...common,port:port.getAttribute('portid'),transport:port.getAttribute('protocol'),status:state?.getAttribute('state')||'unknown',service:service?.getAttribute('name'),product:service?.getAttribute('product'),version:service?.getAttribute('version'),detail:[state?.getAttribute('reason'),...Array.from(port.querySelectorAll('script')).map(s=>s.getAttribute('id')+': '+s.getAttribute('output'))].filter(Boolean).join('\n')});if(rows.length>MAX_ROWS)throw new Error('Maximum 5 000 observations par relevé.');}
      if(!ports.length)rows.push({...common,status:host.querySelector('status')?.getAttribute('state')==='up'?'reachable':'unreachable',transport:'HOST',port:null,detail:host.querySelector('status')?.getAttribute('reason')});
      for(const extra of host.querySelectorAll('extraports'))summarized+=Math.max(0,Number(extra.getAttribute('count'))||0);
    }
    return {rows,source:'Nmap XML',capturedAt:doc.documentElement.getAttribute('startstr')||'',warnings:summarized?[summarized.toLocaleString('fr-FR')+' ports regroupés par Nmap ne sont pas détaillés dans la table.']:[]};
  }
  function parse(input,kind,name='Relevé collé'){
    if(!['passive','active'].includes(kind))throw new Error('Type de relevé invalide.');
    if(new TextEncoder().encode(input).length>MAX_BYTES)throw new Error('Le fichier dépasse 2 Mo.');
    const value=input.replace(/^\uFEFF/,'').trim();if(!value)throw new Error('Ajoute un fichier ou colle un relevé à analyser.');
    let parsed={rows:[],source:'Texte',warnings:[]};
    if(value.startsWith('<')){if(kind!=='active')throw new Error('Les rapports Nmap vont dans Scan actif.');parsed=xml(value);}
    else if(/^[\[{]/.test(value)){
      let data;try{data=JSON.parse(value);}catch{throw new Error('Le JSON est incomplet ou invalide.');}
      if(!data||typeof data!=='object')throw new Error('JSON attendu : une liste d’observations ou un rapport WolfGuard.');
      if(data?.strategy&&data.strategy!==kind)throw new Error('Ce relevé appartient au scan '+(data.strategy==='active'?'actif':'passif')+'.');
      parsed.source='JSON';parsed.capturedAt=text(data.capturedAt||data.startedAt);parsed.warnings=Array.isArray(data.warnings)?data.warnings.slice(0,20).map(w=>text(w,500)):[];
      if(Array.isArray(data))parsed.rows=data;
      else if(Array.isArray(data.rows)||Array.isArray(data.results))parsed.rows=data.rows||data.results;
      else if(kind==='passive'&&(data.neighbors||data.connections||data.udp))parsed.rows=[...(Array.isArray(data.neighbors)?data.neighbors:[]).map(r=>({...r,status:'observed',transport:String(r.IPAddress).includes(':')?'NDP':'ARP'})),...(Array.isArray(data.connections)?data.connections:[]),...(Array.isArray(data.udp)?data.udp:[]).map(r=>({...r,status:'bound',transport:'UDP'}))];
      else if(data.IPAddress||data.LocalAddress)parsed.rows=[data];
      else throw new Error('JSON attendu : une liste d’observations ou un rapport WolfGuard.');
    }else if(/^(?:#TYPE[^\n]*\n)?[^\n]*(?:"?LocalAddress"?|"?IPAddress"?|"?address"?)[,;\t]/i.test(value)) {parsed.rows=csv(value);parsed.source='CSV';}
    else if(kind==='passive'){const result=passiveText(value);parsed.rows=result.rows;if(result.ignored)parsed.warnings.push(result.ignored+' ligne(s) non reconnue(s) ignorée(s).');}
    else throw new Error('Importe un XML Nmap, un JSON WolfGuard ou un CSV avec en-têtes.');
    if(parsed.rows.length>MAX_ROWS)throw new Error('Maximum 5 000 observations par relevé.');
    if(!parsed.rows.length)throw new Error('Aucune observation reconnue. Le relevé précédent reste conservé.');
    const unique=new Map();for(const raw of parsed.rows){const record=row(raw,kind,parsed.source);unique.set(key(record),record);}
    return {format:'wolfguard-scan',version:1,strategy:kind,name:text(name,180),importedAt:new Date().toISOString(),capturedAt:text(parsed.capturedAt),source:parsed.source,warnings:parsed.warnings||[],rows:[...unique.values()]};
  }
  function compare(current,baseline){
    const old=new Map(baseline.rows.map(r=>[key(r),r])),next=new Map(current.rows.map(r=>[key(r),r])),changes=[];
    for(const [id,r] of next){const before=old.get(id);if(!before)changes.push({type:'added',row:r});else if(signature(before)!==signature(r))changes.push({type:'changed',row:r,before});}
    for(const [id,r] of old)if(!next.has(id))changes.push({type:'removed',row:r});return changes;
  }
  function command(values){
    const target=text(values.target,253).trim();
    if(!target||target.startsWith('-')||!/^[a-zA-Z0-9][a-zA-Z0-9.:-]*(?:\/\d{1,3})?$/.test(target))throw new Error('Indique une IP, un nom d’hôte ou un réseau CIDR, sans option ni caractère de commande.');
    if(target.includes('/')){const [ip,prefix]=target.split('/');if(!ipaddr.isValid(ip)||Number(prefix)>(ip.includes(':')?128:32))throw new Error('Réseau CIDR invalide.');}
    else if(target.includes(':')&&!ipaddr.isValid(target))throw new Error('Adresse IPv6 invalide.');
    else if(/^[\d.]+$/.test(target)&&!ipaddr.isValid(target))throw new Error('Adresse IPv4 invalide.');
    const ports=values.profile==='web'?'80,443,8000,8080,8443':values.profile==='custom'?scanPortList(values.ports).join(','):SCAN_PORT_PRESETS.common;
    const args=values.profile==='discovery'?'-sn':('-sT '+(values.identify?'-sV --version-light ':'')+'-p '+ports);
    if(values.profile==='custom'&&!ports)throw new Error('Indique au moins un port.');
    return 'nmap -n '+args+' -oX wolfguard-actif.xml '+target;
  }
  return {parse,compare,key,labels,command,MAX_BYTES,MAX_ROWS};
})();
