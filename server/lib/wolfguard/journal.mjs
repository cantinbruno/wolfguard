// Application journal: security and error events shown in Settings → Journal.
// Details are encrypted at rest; retention.mjs removes rows after 30 days.
import {seal,open} from './access.mjs';

const LEVELS=new Set(['info','warning','error']);
const KINDS=new Set(['login','login-failed','logout','ip-blocked','ip-unblocked','session-revoked','share-created','share-opened','error']);
const hex=bytes=>[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(16)));

// Never throws: a journal failure must not break the request it describes.
export async function logEvent(env,now,{level='info',kind,details={}}){
  if(!env?.DB||!env.STORAGE_KEY||!LEVELS.has(level)||!KINDS.has(kind))return null;
  const id=random();
  try{
    await env.DB.prepare('INSERT INTO app_logs(id,created_at,level,kind,details_cipher) VALUES(?,?,?,?,?)')
      .bind(id,now,level,kind,await seal(details,'WolfGuard journal v1:'+id,env)).run();
    return id;
  }catch{return null;}
}

export async function listEvents(env,{before=null,limit=100,kind=null}={}){
  const conditions=[],values=[];
  if(Number.isSafeInteger(before)){conditions.push('created_at<?');values.push(before);}
  if(kind&&KINDS.has(kind)){conditions.push('kind=?');values.push(kind);}
  const rows=await env.DB.prepare('SELECT * FROM app_logs'+(conditions.length?' WHERE '+conditions.join(' AND '):'')+' ORDER BY created_at DESC,id DESC LIMIT ?')
    .bind(...values,Math.min(200,Math.max(1,limit))).all();
  const events=[];
  for(const row of rows.results){
    let details={};try{details=await open(row.details_cipher,'WolfGuard journal v1:'+row.id,env)||{};}catch{}
    events.push({id:row.id,createdAt:row.created_at,level:row.level,kind:row.kind,details});
  }
  return events;
}
