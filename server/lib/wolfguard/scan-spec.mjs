// Shared validation. Jobs are network operations, never terminal commands.
export function localAddress(value) {
  if(typeof value!=='string'||value.length>100)throw new Error('Adresse IP locale invalide.');
  if(value==='localhost')return '127.0.0.1';
  if(value.includes(':')){
    let address;try{address=new URL('http://['+value+']/').hostname.slice(1,-1);}catch{throw new Error('Adresse IPv6 invalide.');}
    if(address==='::1'||/^(?:f[cd][\da-f]{2}|fe[89ab][\da-f]):/i.test(address))return address;
    throw new Error('Utilise une adresse privée, locale ou de boucle locale.');
  }
  const parts=value.split('.');
  if(parts.length!==4||parts.some(p=>!/^\d{1,3}$/.test(p)||Number(p)>255))throw new Error('Adresse IPv4 invalide.');
  const n=parts.map(Number);
  if(n[0]===10||n[0]===127||n[0]===172&&n[1]>=16&&n[1]<=31||n[0]===192&&n[1]===168||n[0]===169&&n[1]===254)return n.join('.');
  throw new Error('Utilise une adresse privée, locale ou de boucle locale.');
}
const integer=ip=>ip.split('.').reduce((n,p)=>n*256+Number(p),0);
const address=n=>[24,16,8,0].map(shift=>Math.floor(n/2**shift)%256).join('.');
export function singleTarget(value){
  if(typeof value!=='string'||!value.trim()||value.length>253)throw new Error('Indique une seule adresse IP ou un FQDN.');
  const target=value.trim().toLowerCase().replace(/\.$/,'');
  if(target==='localhost'||target.includes(':')||/^[\d.]+$/.test(target))return localAddress(target);
  const labels=target.split('.');
  if(labels.length<2||labels.some(label=>!label.length||label.length>63||!(/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/.test(label)))||/^\d+$/.test(labels.at(-1)))throw new Error('Indique une seule IP ou un FQDN, sans plage, CIDR, URL ni port.');
  return target;
}
export function targets(input){
  if(typeof input!=='string'||input.length>253)throw new Error('Cible invalide.');
  input=input.trim();
  if(input.includes('/')){
    const parts=input.split('/'),prefix=Number(parts[1]),ip=localAddress(parts[0]);
    if(parts.length!==2||ip.includes(':')||!/^\d{1,2}$/.test(parts[1])||prefix<24||prefix>32)throw new Error('Choisis un réseau IPv4 de /24 à /32.');
    const size=2**(32-prefix),base=Math.floor(integer(ip)/size)*size,start=prefix<31?1:0,end=prefix<31?size-1:size;
    return Array.from({length:end-start},(_,i)=>localAddress(address(base+start+i)));
  }
  if(input.includes('-')){
    const parts=input.split('-').map(p=>localAddress(p.trim()));
    if(parts.length!==2||parts.some(p=>p.includes(':')))throw new Error('Plage IPv4 invalide.');
    const start=integer(parts[0]),end=integer(parts[1]);if(end<start||end-start>=256)throw new Error('Maximum 256 adresses par scan.');
    return Array.from({length:end-start+1},(_,i)=>localAddress(address(start+i)));
  }
  return [localAddress(input)];
}
export function ports(input){
  if(typeof input!=='string'||!input.trim()||input.length>10000)throw new Error('Indique les ports TCP à tester.');
  const found=new Set();
  for(const part of input.split(/[,;\s]+/).filter(Boolean)){
    if(!/^\d{1,5}(?:-\d{1,5})?$/.test(part))throw new Error('Port ou plage invalide.');
    const [start,end=start]=part.split('-').map(Number);if(start<1||end>65535||end<start||end-start>=4096)throw new Error('Ports de 1 à 65535, maximum 4096 tests.');
    for(let n=start;n<=end;n++){found.add(n);if(found.size>4096)throw new Error('Maximum 4096 tests par scan.');}
  }
  if(!found.size)throw new Error('Indique au moins un port.');return [...found].sort((a,b)=>a-b);
}
export function scanSpec(raw){
  if(!raw||typeof raw!=='object'||!['active','passive'].includes(raw.strategy))throw new Error('Type de scan invalide.');
  const workspace=raw.workspace;
  if(workspace!==undefined&&!['passive','active','map','vulnerability'].includes(workspace))throw new Error('Section de scan invalide.');
  const extra=workspace?{workspace}:{};
  if(raw.strategy==='passive'){
    if(raw.passiveScope&&!['all','neighbours','security'].includes(raw.passiveScope))throw new Error('Le scan passif réseau lit uniquement les voisins ARP/NDP.');
    const passiveScope=raw.passiveScope==='security'?'security':'neighbours';
    if(workspace&&workspace!==(passiveScope==='security'?'vulnerability':'passive'))throw new Error('Source incompatible avec cette section.');
    return {strategy:'passive',passiveScope,...(passiveScope==='neighbours'?{target:singleTarget(raw.target)}:{}),...extra};
  }
  if(workspace&& !['active','map'].includes(workspace))throw new Error('Section incompatible avec un scan actif.');
  const mode=raw.mode||'tcp';if(!['tcp','discovery','icmp'].includes(mode))throw new Error('Mode de scan invalide.');
  const supplied=Array.isArray(raw.ports)&&raw.ports.every(Number.isInteger)?raw.ports.join(','):raw.ports;
  const target=workspace==='map'?raw.target.trim():singleTarget(raw.target);
  const addresses=workspace==='map'?targets(target):target.includes(':')||/^[\d.]+$/.test(target)?[localAddress(target)]:[],selected=mode==='icmp'?[]:ports(mode==='discovery'?(supplied||raw.discoveryPorts||'22,80,443,445,3389'):supplied);
  if(workspace==='map'&&mode!=='discovery')throw new Error('La cartographie utilise la découverte réseau.');
  if(mode==='discovery'&&selected.length>8)throw new Error('Maximum huit ports de découverte.');
  if(addresses.length*Math.max(1,selected.length)>4096)throw new Error('Maximum 4096 tests : réduis la plage ou les ports.');
  const timeoutMs=raw.timeoutMs??1500,concurrency=raw.concurrency??16;
  if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>3000||!Number.isInteger(concurrency)||concurrency<1||concurrency>32)throw new Error('Délai de 100 à 3000 ms ; 1 à 32 tests simultanés.');
  return {strategy:'active',target,mode,addresses,ports:selected,timeoutMs,concurrency,identifyServices:raw.identifyServices===true,...extra};
}
