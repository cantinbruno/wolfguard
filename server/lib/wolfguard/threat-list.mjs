import seed from './threat-seed.mjs';

const KEY='security/spamhaus-drop-v1.json',DAY=86400000,HOUR=3600000;
const cache=new WeakMap();
const compiled=new WeakMap();
const urls=['https://www.spamhaus.org/drop/drop_v4.json','https://www.spamhaus.org/drop/drop_v6.json'];

function address(value) {
  if(typeof value!=='string')return null;
  if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)){
    const parts=value.split('.');if(parts.some(part=>Number(part)>255||String(Number(part))!==part))return null;
    return {bits:32,n:parts.reduce((n,part)=>(n<<8n)|BigInt(part),0n)};
  }
  try{
    const canonical=new URL('http://['+value+']/').hostname.slice(1,-1);
    const halves=canonical.split('::'),left=halves[0]?halves[0].split(':'):[],right=halves[1]?halves[1].split(':'):[];
    const parts=halves.length===2?[...left,...Array(8-left.length-right.length).fill('0'),...right]:left;
    if(parts.length!==8)return null;
    const n=parts.reduce((n,part)=>(n<<16n)|BigInt('0x'+part),0n);
    if(n>>32n===65535n)return {bits:32,n:n&0xffffffffn};
    return {bits:128,n};
  }catch{return null;}
}
export function parseNetwork(cidr) {
  if(typeof cidr!=='string'||cidr.length>64)return null;
  const [ip,prefix,...extra]=cidr.split('/'),parsed=address(ip),bits=Number(prefix);
  if(!parsed||extra.length||!/^\d+$/.test(prefix)||bits<1||bits>parsed.bits)return null;
  const shift=BigInt(parsed.bits-bits);
  return {...parsed,network:parsed.n>>shift,shift};
}
export function matchesNetwork(ip,cidr){const parsed=address(ip),network=parseNetwork(cidr);return !!parsed&&!!network&&parsed.bits===network.bits&&(parsed.n>>network.shift)===network.network;}
function validated(value,now) {
  if(!Array.isArray(value?.sources)||value.sources.length!==2)throw new Error('Liste de réputation incomplète.');
  const sources=value.sources.map((source,index)=>{
    if(source.url!==urls[index]||!Number.isFinite(source.timestamp)||source.timestamp*1000>now+HOUR||source.timestamp*1000<now-3*DAY||typeof source.copyright!=='string'||!Array.isArray(source.networks)||!source.networks.length||source.networks.length>20000)throw new Error('Liste de réputation invalide ou périmée.');
    return {...source,networks:source.networks.map(row=>{const network=parseNetwork(row.cidr);if(!network||network.bits!==(index===0?32:128))throw new Error('Réseau de réputation invalide.');return {cidr:row.cidr,sblid:String(row.sblid||'').slice(0,30)};})};
  });
  return {sources,lastAttempt:Number(value.lastAttempt)||Math.min(...sources.map(source=>source.timestamp*1000))};
}
async function download(env,now) {
  const sources=await Promise.all(urls.map(async url=>{
    const response=await (env.THREAT_FEED_FETCH||fetch)(url,{signal:AbortSignal.timeout(5000),redirect:'error',headers:{Accept:'application/json'}});
    if(!response.ok||Number(response.headers.get('Content-Length'))>2*1024*1024)throw new Error('Source Spamhaus indisponible.');
    const reader=response.body.getReader(),decoder=new TextDecoder();let text='',size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024)throw new Error('Liste de réputation trop volumineuse.');text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
    const rows=text.trim().split(/\r?\n/).map(line=>JSON.parse(line)),meta=rows.find(row=>Object.hasOwn(row,'timestamp'));
    return {url,timestamp:meta?.timestamp,copyright:meta?.copyright,networks:rows.filter(row=>row.cidr)};
  }));
  return validated({sources,lastAttempt:now},now);
}
export async function threatList(env,now=Date.now(),{refresh=false,force=false}={}) {
  const owner=env.BUCKET||env;
  let entry=cache.get(owner);
  if(!entry||now-entry.loadedAt>HOUR){
    let value=seed;
    if(env.BUCKET)try{const object=await env.BUCKET.get(KEY);if(object)value=JSON.parse(await new Response(object.body).text());}catch{}
    entry={value,loadedAt:now,pending:null,error:null};cache.set(owner,entry);
  }
  const lastAttempt=entry.value.lastAttempt||Math.min(...entry.value.sources.map(source=>source.timestamp*1000));
  if((refresh&&now-lastAttempt>DAY||force&&now-lastAttempt>HOUR)&&!entry.pending){
    entry.pending=(async()=>{
      try{entry.value=await download(env,now);entry.error=null;}
      catch(error){entry.value={...entry.value,lastAttempt:now};entry.error=error.message;}
      if(env.BUCKET)try{await env.BUCKET.put(KEY,JSON.stringify(entry.value),{httpMetadata:{contentType:'application/json'}});}catch{entry.error='La mise à jour ne peut pas être conservée.';}
    })().finally(()=>{entry.pending=null;});
  }
  if(entry.pending)await entry.pending;
  const sources=entry.value.sources,updatedAt=Math.min(...sources.map(source=>source.timestamp*1000));
  const expired=now-updatedAt>3*DAY;
  return {sources,updatedAt,expired,error:entry.error,lastAttempt:entry.value.lastAttempt||updatedAt};
}
export function threatMatch(list,ip){
  const parsed=address(ip);if(list.expired||!parsed)return false;
  return list.sources.some(source=>{
    let networks=compiled.get(source);
    if(!networks){networks=source.networks.map(row=>parseNetwork(row.cidr)).filter(Boolean);compiled.set(source,networks);}
    return networks.some(network=>parsed.bits===network.bits&&(parsed.n>>network.shift)===network.network);
  });
}
