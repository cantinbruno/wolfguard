import {closeRemote} from './remote.mjs';
const encoder=new TextEncoder(),IDLE_MS=15*60000;
const hex=value=>[...new Uint8Array(value)].map(n=>n.toString(16).padStart(2,'0')).join('');
const bytes=value=>Uint8Array.from(value.match(/../g)||[],n=>parseInt(n,16));
const random=()=>hex(crypto.getRandomValues(new Uint8Array(16)));

export function normalizeIP(value){
  if(typeof value!=='string'||value.length>64)return null;
  const ip=value.trim();
  if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)){
    const parts=ip.split('.');if(parts.some(part=>Number(part)>255||String(Number(part))!==part))return null;
    return parts.join('.');
  }
  if(!/^[a-f0-9:.]+$/i.test(ip)||!ip.includes(':'))return null;
  try{
    const canonical=new URL('http://['+ip+']/').hostname.slice(1,-1);
    // Treat IPv4-mapped IPv6 and IPv4 as the same address.
    const mapped=/^::ffff:([a-f0-9]+):([a-f0-9]+)$/.exec(canonical);
    if(mapped){const a=parseInt(mapped[1],16),b=parseInt(mapped[2],16);return [a>>8,a&255,b>>8,b&255].join('.');}
    return canonical;
  }catch{return null;}
}
export function requestIP(request){
  // Only the edge's address is authoritative. Never trust client-supplied XFF.
  const ip=normalizeIP(request.headers.get('CF-Connecting-IP'));
  // Cloudflare uses this shared placeholder for cross-zone Worker subrequests.
  return ip==='2a06:98c0:3600::103'?null:ip;
}
export async function addressContext(request,env){
  const ip=requestIP(request);return {ip,hash:ip?await addressHash(ip,env):null};
}
async function addressHash(ip,env){
  const key=await crypto.subtle.importKey('raw',bytes(env.AUTH_PEPPER),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(await crypto.subtle.sign('HMAC',key,encoder.encode('WolfGuard access IP v1:'+ip)));
}
async function recordKey(env){return crypto.subtle.importKey('raw',bytes(env.STORAGE_KEY),'AES-GCM',false,['encrypt','decrypt']);}
async function seal(value,context,env){
  const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(context)},await recordKey(env),encoder.encode(JSON.stringify(value))));
  return hex(iv)+':'+btoa(String.fromCharCode(...cipher));
}
async function open(value,context,env){
  if(!value)return null;const [iv,data]=value.split(':');
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv),additionalData:encoder.encode(context)},await recordKey(env),Uint8Array.from(atob(data),char=>char.charCodeAt(0)))));
}
function deviceName(request){
  const ua=request.headers.get('User-Agent')||'';
  const browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Navigateur';
  const os=/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':/Windows/.test(ua)?'Windows':/Macintosh|Mac OS/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'';
  return browser+(os?' · '+os:'');
}
export async function assertAddressAllowed(env,context,fail){
  if(context.hash&&await env.DB.prepare('SELECT id FROM access_blocks WHERE ip_hash=?').bind(context.hash).first())fail(403,'Cette adresse IP est bloquée dans WolfGuard.',{code:'ACCESS_BLOCKED'});
}
export async function connectionStatement(env,request,tokenHash,now,context){
  return env.DB.prepare('INSERT INTO access_connections (token_hash,id,created_at,ip_hash,ip_cipher,device_cipher) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sessions WHERE token_hash=?) ON CONFLICT(token_hash) DO UPDATE SET ip_hash=excluded.ip_hash,ip_cipher=excluded.ip_cipher,device_cipher=excluded.device_cipher')
    .bind(tokenHash,random(),now,context.hash,context.ip?await seal(context.ip,'WolfGuard access v1:ip:'+context.hash,env):null,await seal(deviceName(request),'WolfGuard access v1:device:'+tokenHash,env),tokenHash);
}
export async function rememberConnection(env,request,tokenHash,now,context){await (await connectionStatement(env,request,tokenHash,now,context)).run();}
async function stopRemoteOwners(env,owners,now){
  for(const owner of owners){
    const rows=await env.DB.prepare("SELECT id FROM remote_sessions WHERE owner_hash=? AND status IN ('requested','preparing','active')").bind(owner.token_hash).all();
    for(const row of rows.results)await closeRemote(env,row.id,'closed',now,'Session déconnectée depuis la gestion des accès.',{seal:(value,aad)=>seal(value,'WolfGuard agent v1:'+aad,env)});
  }
}
export async function handleAccessAPI(request,env,now,session,h){
  const path=new URL(request.url).pathname,{fail,json,body}=h;
  if(path==='/api/access'&&request.method==='GET'){
    await env.DB.prepare('DELETE FROM access_connections WHERE NOT EXISTS(SELECT 1 FROM sessions WHERE sessions.token_hash=access_connections.token_hash AND expires_at>? AND active_at>?)').bind(now,now-IDLE_MS).run();
    const rows=await env.DB.prepare('SELECT s.token_hash,s.active_at,s.expires_at,c.id,c.created_at,c.ip_hash,c.ip_cipher,c.device_cipher FROM sessions s LEFT JOIN access_connections c ON c.token_hash=s.token_hash WHERE s.generation=? AND s.expires_at>? AND s.active_at>? ORDER BY s.active_at DESC').bind(session.generation,now,now-IDLE_MS).all();
    const blocked=await env.DB.prepare('SELECT * FROM access_blocks ORDER BY created_at DESC').all();
    const connections=[];
    for(const row of rows.results){
      if(!row.id){
        const inserted=await env.DB.prepare('INSERT INTO access_connections (token_hash,id,created_at,device_cipher) VALUES (?,?,0,?) ON CONFLICT(token_hash) DO NOTHING RETURNING id').bind(row.token_hash,random(),await seal('Session antérieure','WolfGuard access v1:device:'+row.token_hash,env)).first();
        row.id=inserted?.id||(await env.DB.prepare('SELECT id FROM access_connections WHERE token_hash=?').bind(row.token_hash).first())?.id;
      }
      connections.push({id:row.id||null,current:row.token_hash===session.hash,ip:await open(row.ip_cipher,'WolfGuard access v1:ip:'+row.ip_hash,env),device:await open(row.device_cipher,'WolfGuard access v1:device:'+row.token_hash,env)||'Session antérieure',createdAt:row.created_at||null,lastSeen:row.active_at,expiresAt:row.expires_at,online:row.active_at>now-90000,sameIP:!!session.access.hash&&session.access.hash===row.ip_hash});
    }
    const blocks=[];for(const row of blocked.results)blocks.push({id:row.id,ip:await open(row.ip_cipher,'WolfGuard access v1:ip:'+row.ip_hash,env),createdAt:row.created_at});
    return json({connections,blocks,currentIP:session.access.ip});
  }
  if(request.method!=='POST')fail(404,'Adresse d’accès inconnue.');
  const data=await body();
  if(path==='/api/access/disconnect'){
    if(typeof data.id!=='string'||!/^[a-f0-9]{32}$/.test(data.id))fail(400,'Connexion invalide.');
    const owners=await env.DB.prepare('DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM access_connections WHERE id=?) AND generation=? RETURNING token_hash').bind(data.id,session.generation).all();
    if(!owners.results.length)fail(404,'Cette connexion est déjà terminée.');
    await stopRemoteOwners(env,owners.results,now);
    await env.DB.prepare('DELETE FROM access_connections WHERE id=?').bind(data.id).run();
    return json({ok:true,current:owners.results.some(row=>row.token_hash===session.hash)});
  }
  if(path==='/api/access/block'){
    const ip=normalizeIP(data.ip);if(!ip||ip==='2a06:98c0:3600::103')fail(400,'Saisis une adresse IPv4 ou IPv6 valide.');
    const hash=await addressHash(ip,env),own=await env.DB.prepare('SELECT ip_hash FROM access_connections WHERE token_hash=?').bind(session.hash).first();
    if(hash===session.access.hash||hash===own?.ip_hash)fail(409,'Tu ne peux pas bloquer ta propre adresse IP. Déconnecte uniquement la session concernée.');
    const owners=await env.DB.prepare('SELECT s.token_hash FROM sessions s JOIN access_connections c ON c.token_hash=s.token_hash WHERE c.ip_hash=?').bind(hash).all();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO access_blocks (id,ip_hash,ip_cipher,created_at) VALUES (?,?,?,?) ON CONFLICT(ip_hash) DO NOTHING').bind(random(),hash,await seal(ip,'WolfGuard access v1:ip:'+hash,env),now),
      env.DB.prepare('DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM access_connections WHERE ip_hash=?)').bind(hash)
    ]);
    await stopRemoteOwners(env,owners.results,now);
    await env.DB.prepare('DELETE FROM access_connections WHERE ip_hash=?').bind(hash).run();
    return json({ok:true,disconnected:owners.results.length});
  }
  if(path==='/api/access/unblock'){
    if(typeof data.id!=='string'||!/^[a-f0-9]{32}$/.test(data.id))fail(400,'Blocage invalide.');
    await env.DB.prepare('DELETE FROM access_blocks WHERE id=?').bind(data.id).run();return json({ok:true});
  }
  fail(404,'Adresse d’accès inconnue.');
}
