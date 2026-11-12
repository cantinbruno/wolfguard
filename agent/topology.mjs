import {networkInterfaces,hostname} from 'node:os';
import {isIP} from 'node:net';
import {reverse as dnsReverse} from 'node:dns/promises';
import {fileURLToPath} from 'node:url';
import {parseNeighbors} from './posix.mjs';

const integer=ip=>ip.split('.').reduce((n,p)=>n*256+Number(p),0);
const address=n=>[24,16,8,0].map(shift=>Math.floor(n/2**shift)%256).join('.');
const ip=value=>{const text=String(value||'');return isIP(text.split('%')[0])&&!/\s/.test(text)?text:'';};
const unicast=value=>{const base=value.split('%')[0];return isIP(base)===4?!/^(0\.|127\.|22[4-9]\.|2[3-5]\d\.)/.test(base)&&base!=='255.255.255.255':isIP(base)===6&&!/^(ff|::(?:1)?$)/i.test(base);};
export function cidrRange(value){
  const [base,prefixText]=String(value).split('/'),prefix=Number(prefixText);
  if(isIP(base)!==4||!/^\d+$/.test(prefixText||'')||prefix<1||prefix>32||!unicast(base))return null;
  const count=2**(32-prefix),start=Math.floor(integer(base)/count)*count;
  return {cidr:address(start)+'/'+prefix,start,end:start+count-1,prefix,count};
}
export function parseTrace(output){
  const hops=[];
  for(const line of String(output).split(/\r?\n/)){
    const match=/^\s*(\d{1,2})\s+(.+)$/.exec(line);if(!match)continue;
    const ttl=Number(match[1]);if(ttl<1||ttl>32)continue;
    const found=[...new Set((match[2].match(/(?:\d{1,3}\.){3}\d{1,3}/g)||[]).filter(value=>isIP(value)===4&&unicast(value)))];
    for(const address of found){if(hops.length>=64)return hops;hops.push({ttl,address,source:'agent-traceroute',detail:'Réponse reçue au saut '+ttl+' du parcours réseau.'});}
  }
  return hops;
}
export async function collectTopology({run,signal,platform=process.platform}={}){
  if(platform==='win32'){
    const text=await run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./topology.ps1',import.meta.url))],{signal,timeout:15000});
    return JSON.parse(text.replace(/^\uFEFF/,''));
  }
  if(platform==='linux'){
    const routes=JSON.parse(await run('ip',['-j','route','show','table','main'],{signal,timeout:8000}));let neighbors=[];
    try{neighbors=JSON.parse(await run('ip',['-j','neigh','show'],{signal,timeout:8000})).filter(row=>!row.state?.some(state=>['FAILED','INCOMPLETE'].includes(state))).map(row=>({address:row.dst,macAddress:row.lladdr,interfaceName:row.dev}));}catch{}
    return {routes:routes.filter(row=>!['blackhole','unreachable','prohibit','throw'].includes(row.type)).map(row=>({prefix:row.dst==='default'?'0.0.0.0/0':row.dst,gateway:row.gateway,interfaceName:row.dev,metric:row.metric||0})),neighbors};
  }
  const table=await run('/usr/sbin/netstat',['-rn','-f','inet'],{signal,timeout:8000}),routes=[];
  for(const line of table.split(/\r?\n/)){
    const fields=line.trim().split(/\s+/),target=fields[0];if(!target||target!=='default'&&!/^\d/.test(target))continue;
    let prefix=target==='default'?'0.0.0.0/0':target;
    if(/^\d+(?:\.\d+){0,3}(?:\/\d+)?$/.test(prefix)){
      const [base,bits]=prefix.split('/'),parts=base.split('.');prefix=parts.concat(Array(4-parts.length).fill('0')).join('.')+'/'+(bits||parts.length*8);
    }
    if(prefix!=='0.0.0.0/0'&&!cidrRange(prefix))continue;
    routes.push({prefix,gateway:ip(fields[1]),interfaceName:fields.find(value=>/^(en|utun|bridge|vlan|ppp)\d/.test(value))||'',metric:0});
  }
  let neighbors=[];try{neighbors=parseNeighbors(await run('/usr/sbin/arp',['-an'],{signal,timeout:8000}));}catch{}
  return {routes,neighbors};
}
export function planTopology(interfaces,snapshot,{limit=2048}={}){
  const origins=Object.entries(interfaces).flatMap(([name,entries])=>(entries||[]).filter(entry=>!entry.internal&&ip(entry.address)&&unicast(entry.address)).map(entry=>({address:entry.address,interfaceName:name,cidr:entry.cidr,hostname:entry.hostname||''}))).slice(0,64);
  if(!origins.length)throw new Error('Aucune interface réseau active sur ce poste.');
  const routes=(snapshot.routes||[]).filter(row=>row.prefix==='0.0.0.0/0'||cidrRange(row.prefix)).sort((a,b)=>(a.metric||0)-(b.metric||0)).slice(0,128);
  const ranges=new Map();
  for(const origin of origins){const range=cidrRange(origin.cidr);if(range)ranges.set(range.cidr,{...range,interfaceName:origin.interfaceName,anchor:origin.address,source:'interface'});}
  for(const route of routes){const range=cidrRange(route.prefix);if(range&&!ranges.has(range.cidr)&&range.prefix>=8)ranges.set(range.cidr,{...range,interfaceName:route.interfaceName,gateway:route.gateway,source:'route'});}
  const candidates=new Map(),add=(value,extra={})=>{const normalized=ip(value);if(normalized&&unicast(normalized)&&candidates.size<limit&&!origins.some(row=>row.address===normalized))candidates.set(normalized,{address:normalized,...candidates.get(normalized),...extra});};
  for(const route of routes)add(route.gateway,{interfaceName:route.interfaceName,role:'gateway'});
  for(const neighbor of (snapshot.neighbors||[]).slice(0,1024)){
    let value=ip(neighbor.address);if(/^fe80:/i.test(value)&&!value.includes('%')){const scope=neighbor.interfaceIndex||neighbor.interfaceName;if(scope&&/^[\w.-]+$/.test(String(scope)))value+='%'+scope;}
    add(value,{...neighbor,address:value});
  }
  const networks=[...ranges.values()].slice(0,32),offsets=networks.map(()=>0);
  let active=true;
  while(candidates.size<limit&&active){
    active=false;
    networks.forEach((range,index)=>{
      if(candidates.size>=limit||offsets[index]>=range.count)return;
      active=true;const offset=offsets[index]++,anchor=range.anchor?Math.floor(integer(range.anchor)/256)*256:range.start;
      const n=range.start+((anchor-range.start+offset)%range.count);
      if(range.prefix<=30&&(n===range.start||n===range.end))return;
      add(address(n),{interfaceName:range.interfaceName,network:range.cidr,gateway:range.gateway||''});
    });
  }
  return {origin:origins.find(origin=>origin.interfaceName===routes.find(route=>route.prefix==='0.0.0.0/0')?.interfaceName)||origins[0],origins,interfaces:origins,routes,networks:networks.map((range,index)=>({cidr:range.cidr,interfaceName:range.interfaceName,source:range.source,limited:offsets[index]<range.count,addresses:range.count})),candidates:[...candidates.values()]};
}
async function bounded(work,ms,signal){
  let timer,abort;const interrupted=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Délai dépassé.')),ms);abort=()=>reject(signal.reason||new Error('Scan arrêté.'));signal?.addEventListener('abort',abort,{once:true});});
  try{signal?.throwIfAborted();return await Promise.race([work,interrupted]);}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export async function traceInternet({run,signal,platform=process.platform,targets=['1.1.1.1','8.8.8.8']}={}){
  return Promise.all(targets.slice(0,2).map(async target=>{
    let output='',error='';
    try{output=await run(platform==='win32'?'tracert.exe':platform==='darwin'?'/usr/sbin/traceroute':'traceroute',platform==='win32'?['-d','-h','24','-w','500',target]:['-n','-m','24','-w','1','-q','1',target],{signal,timeout:45000,maxBytes:64000});}
    catch(failure){output=failure.stdout||'';error=failure.code==='ENOENT'?'Outil traceroute indisponible sur ce poste.':'Parcours incomplet : certains routeurs ne répondent pas.';}
    const hops=parseTrace(output);return {target,hops,reached:hops.some(hop=>hop.address===target),...(error?{warning:error}:{})};
  }));
}
export async function discoverTopology(raw,{signal,onProgress=()=>{},run,probe,interfaces=networkInterfaces,collect=collectTopology,trace=traceInternet,reverse=dnsReverse,localName=hostname(),limit=2048}={}){
  const startedAt=new Date().toISOString(),warnings=[],rows=[],paths=[];
  let snapshot={routes:[],neighbors:[]};try{snapshot=await collect({run,signal});}catch(error){if(signal?.aborted)throw error;warnings.push('Table de routage indisponible : découverte limitée aux interfaces locales.');}
  const plan=planTopology(typeof interfaces==='function'?interfaces():interfaces,snapshot,{limit});
  if(plan.networks.some(network=>network.limited))warnings.push('Les grands réseaux sont partiellement explorés : limite de '+limit+' adresses par relevé. Les voisins connus et passerelles sont prioritaires.');
  const network={...plan,paths};delete network.candidates;
  let bytes=0,limited=false;
  const add=row=>{const size=Buffer.byteLength(JSON.stringify(row))+300;if(bytes+size>850000){if(!limited){warnings.push('Le relevé détaillé a atteint sa limite de taille.');limited=true;}return;}bytes+=size;rows.push(row);};
  let completed=0;const total=plan.candidates.length;
  const report=()=>({strategy:'active',workspace:'map',platform:process.platform,target:'auto',network,startedAt,finishedAt:new Date().toISOString(),completed,total,results:rows,warnings,cancelled:!!signal?.aborted});
  for(const origin of plan.origins)add({...origin,hostname:localName,port:null,transport:'LOCAL',status:'reachable',source:'agent-interface',role:'origin',detail:'Adresse active du poste de l’agent, confirmée par le système.'});
  const tracing=trace({run,signal}).then(value=>{
    paths.push(...value);
    for(const path of value){if(path.warning)warnings.push(path.warning);for(const hop of path.hops)if(ip(hop.address)&&unicast(hop.address))add({...hop,port:null,transport:'ICMP',status:'reachable',role:hop.address===path.target?'internet':'router',pathTarget:path.target});}
    onProgress(report());
  }).catch(()=>{if(!signal?.aborted)warnings.push('Parcours vers Internet indisponible.');});
  let next=0;
  async function worker(){while(!signal?.aborted){
    const candidate=plan.candidates[next++];if(!candidate)return;
    const evidence=await probe(candidate.address,{signal,timeoutMs:Math.min(raw.timeoutMs||750,750),interfaceName:candidate.interfaceName});
    if(evidence&&['reachable','open'].includes(evidence.status))add({...candidate,...evidence,port:null,transport:'HOST',source:evidence.source||'agent-discovery',role:candidate.role||'host'});
    completed++;onProgress(report());
  }}
  onProgress(report());await Promise.all(Array.from({length:Math.min(24,Math.max(1,raw.concurrency||16))},worker));await tracing;
  const hosts=new Map();for(const row of rows){if(!hosts.has(row.address))hosts.set(row.address,[]);hosts.get(row.address).push(row);}
  const unresolved=[...hosts.entries()].filter(([,observations])=>!observations.some(row=>row.hostname));let resolving=0;
  await Promise.all(Array.from({length:8},async()=>{while(!signal?.aborted){const host=unresolved[resolving++];if(!host)return;try{const names=await bounded(reverse(host[0].split('%')[0]),1200,signal),name=names.find(value=>typeof value==='string'&&value.length<=253);if(name)for(const row of host[1])row.hostname=name.replace(/\.$/,'');}catch{}}}));
  if(signal?.aborted)warnings.push('Relevé interrompu : seuls les hôtes déjà confirmés sont affichés.');
  if(!paths.some(path=>path.reached))warnings.push('La destination Internet n’a pas répondu au traçage. Aucun saut manquant n’est inventé.');
  onProgress(report());return report();
}
