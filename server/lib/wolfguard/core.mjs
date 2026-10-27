// Single-owner WolfGuard storage. Secrets are supplied by the host, never Git.
const encoder = new TextEncoder();
const MAX_BYTES = 46 * 1024 * 1024, BLOCK = 65536;
const SESSION_MS = 15 * 60000, IDLE_MS = 60000;
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2,'0')).join('');
const bytes = value => Uint8Array.from(value.match(/../g) || [], x => parseInt(x,16));
const random = length => hex(crypto.getRandomValues(new Uint8Array(length)));
const digest = async value => hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const equal = (a,b) => { let diff=a.length^b.length; for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0); return diff===0; };
class Failure extends Error { constructor(status,message,extra={}) { super(message);this.status=status;this.extra=extra; } }
const fail = (status,message,extra) => { throw new Failure(status,message,extra); };
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8'}});
async function smallJSON(request) {
  let length=0;const parts=[];
  if(!request.body)fail(400,'Requête vide.');
  for await(const part of request.body){length+=part.byteLength;if(length>2048)fail(413,'Requête trop volumineuse.');parts.push(part);}
  const all=new Uint8Array(length);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));}catch{fail(400,'Requête invalide.');}
}
const codeOK = code => typeof code==='string' && /^[0-9]{8}$/.test(code);
async function pinHash(code,salt,env) {
  const pepper=await crypto.subtle.importKey('raw',bytes(env.AUTH_PEPPER),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const input=await crypto.subtle.sign('HMAC',pepper,encoder.encode('WolfGuard PIN v1:'+code));
  const material=await crypto.subtle.importKey('raw',input,'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(salt),iterations:100000},material,256));
}
async function state(env) { return env.DB.prepare('SELECT * FROM vault WHERE id = 1').first(); }
async function verifyPIN(code,env,now) {
  if(!codeOK(code))fail(400,'Saisis les 8 chiffres du code.');
  const lease=random(16);
  // Count attempts before expensive verification, including crashed requests.
  const row=await env.DB.prepare('UPDATE vault SET failures=failures+1, blocked_until=?+(failures+1)*5000, lease=?, lease_until=? WHERE id=1 AND blocked_until<=? AND lease_until<=? RETURNING *')
    .bind(now,lease,now+30000,now,now).first();
  if(!row){
    const current=await state(env);if(!current)fail(428,'Active d’abord le partage sur ton appareil principal.');
    const until=Math.max(current.blocked_until,current.lease_until);
    fail(429,'Patiente avant de réessayer.',{retryAfter:Math.max(1,Math.ceil((until-now)/1000))});
  }
  let valid=false;
  try { valid=equal(await pinHash(code,row.pin_salt,env),row.pin_hash); }
  finally {
    const deadline=now+row.failures*5000;
    await env.DB.prepare('UPDATE vault SET failures=?, blocked_until=?, lease=NULL, lease_until=0 WHERE id=1 AND lease=?')
      .bind(valid?0:row.failures,valid?0:deadline,lease).run();
  }
  if(!valid)fail(401,'Code incorrect.',{retryAfter:row.failures*5});
  return row;
}
async function issueSession(env,generation,now) {
  const token=random(32), hash=await digest(token);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at<=? OR active_at<=? OR generation<>?').bind(now,now-IDLE_MS,generation),
    env.DB.prepare('INSERT INTO sessions (token_hash,generation,expires_at,active_at) VALUES (?,?,?,?)').bind(hash,generation,now+SESSION_MS,now)
  ]);
  return token;
}
async function authorize(request,env,now) {
  const token=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization')||'')?.[1];
  if(!token)fail(401,'Saisis à nouveau ton code.');
  const hash=await digest(token);
  const session=await env.DB.prepare('UPDATE sessions SET active_at=? WHERE token_hash=? AND expires_at>? AND active_at>? AND generation=(SELECT generation FROM vault WHERE id=1) RETURNING *')
    .bind(now,hash,now,now-IDLE_MS).first();
  if(!session)fail(401,'Session expirée. Saisis à nouveau ton code.');
  return {...session,hash};
}
async function storageKey(env) { return crypto.subtle.importKey('raw',bytes(env.STORAGE_KEY),'AES-GCM',false,['encrypt','decrypt']); }
function ivFor(nonce,index){ const iv=new Uint8Array(12);iv.set(bytes(nonce));new DataView(iv.buffer).setUint32(8,index);return iv; }
// Fixed-sized frames keep the Worker below its memory limit even for attachments.
async function* blocks(stream,size) {
  let buffer=new Uint8Array(size), used=0;
  for await(const part of stream){let offset=0;while(offset<part.length){const n=Math.min(size-used,part.length-offset);buffer.set(part.subarray(offset,offset+n),used);offset+=n;used+=n;if(used===size){yield buffer;buffer=new Uint8Array(size);used=0;}}}
  if(used)yield buffer.slice(0,used);
}
function streamed(iterator){return new ReadableStream({async pull(controller){try{const next=await iterator.next();if(next.done)controller.close();else controller.enqueue(next.value);}catch(error){controller.error(error);}},async cancel(){await iterator.return?.();}});}
async function encryptedStream(body,length,nonce,env) {
  const key=await storageKey(env);
  async function* transform(){let index=0,total=0;for await(const block of blocks(body,BLOCK)){total+=block.length;if(total>length)throw new Error('Invalid size');yield new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:ivFor(nonce,index),additionalData:encoder.encode('WolfGuard storage v1:'+length+':'+index++)},key,block));}if(total!==length)throw new Error('Invalid size');}
  return streamed(transform());
}
async function decryptedStream(object,env) {
  const {nonce,size,format}=object.customMetadata||{};
  const length=Number(size);if(format!=='1'|| !/^[a-f0-9]{16}$/.test(nonce||'') || !Number.isSafeInteger(length)||length<1||length>MAX_BYTES)fail(503,'Copie distante illisible.');
  const key=await storageKey(env);
  async function* transform(){let index=0,total=0;for await(const block of blocks(object.body,BLOCK+16)){const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:ivFor(nonce,index),additionalData:encoder.encode('WolfGuard storage v1:'+length+':'+index++)},key,block));total+=plain.length;yield plain;}if(total!==length)throw new Error('Incomplete data');}
  return {body:streamed(transform()),length};
}
async function putSnapshot(request,env,session,now) {
  const expected=Number(request.headers.get('X-WG-Version'));
  const length=Number(request.headers.get('X-WG-Size'));
  if(!Number.isSafeInteger(expected)||expected<0||!Number.isSafeInteger(length)||length<1||length>MAX_BYTES||!request.body)fail(400,'Taille ou version invalide.');
  const row=await state(env);if(row.version!==expected)fail(409,'Une autre copie a changé. Verrouille puis rouvre WolfGuard pour la récupérer.');
  let rotation=null;
  const rotationToken=request.headers.get('X-WG-Rotation');
  if(rotationToken){rotation=await env.DB.prepare('SELECT * FROM rotations WHERE token_hash=? AND generation=? AND version=? AND expires_at>?').bind(await digest(rotationToken),session.generation,expected,now).first();if(!rotation)fail(409,'Changement de code expiré. Réessaie.');}
  const objectKey='snapshots/'+random(32), nonce=random(8);
  const body=await encryptedStream(request.body,length,nonce,env), cipherLength=length+Math.ceil(length/BLOCK)*16;
  try {
    // Workers require known-length streams for R2 uploads.
    let upload=body,pump;
    if(typeof FixedLengthStream==='function'){const fixed=new FixedLengthStream(cipherLength);pump=body.pipeTo(fixed.writable);upload=fixed.readable;}
    await Promise.all([env.BUCKET.put(objectKey,upload,{customMetadata:{format:'1',nonce,size:String(length)},httpMetadata:{contentType:'application/octet-stream'}}),pump]);
    const generation=rotation?session.generation+1:session.generation;
    const changed=await env.DB.prepare('UPDATE vault SET object_key=?,version=version+1,generation=?,pin_salt=?,pin_hash=? WHERE id=1 AND version=? AND generation=? RETURNING version')
      .bind(objectKey,generation,rotation?.pin_salt||row.pin_salt,rotation?.pin_hash||row.pin_hash,expected,session.generation).first();
    if(!changed){await env.BUCKET.delete(objectKey);fail(409,'Une autre copie a changé. Verrouille puis rouvre WolfGuard pour la récupérer.');}
    // Previous immutable objects remain available as encrypted recovery history.
    if(rotation)await env.DB.batch([env.DB.prepare('DELETE FROM rotations'),env.DB.prepare('DELETE FROM sessions WHERE generation<>?').bind(generation)]);
    return json({version:changed.version,...(rotation?{token:await issueSession(env,generation,now)}:{})});
  }catch(error){
    // Delete only if this request did not commit its object as the current vault.
    const current=await state(env);if(current?.object_key!==objectKey)await env.BUCKET.delete(objectKey).catch(()=>{});
    throw error;
  }
}
export async function handleAPI(request,env,clock=Date.now) {
  const origin=request.headers.get('Origin'), own=new URL(request.url).origin;
  const allowed=new Set(['https://wolfguard.wavetools.fr','https://cantinbruno.github.io',own]);
  // Loopback is enabled only in a local test environment, never hosted config.
  if(env.LOCAL_TEST_ORIGIN)allowed.add(env.LOCAL_TEST_ORIGIN);
  const cors=origin && allowed.has(origin);
  let response;
  try {
    if(origin && !cors)fail(403,'Origine non autorisée.');
    if(request.method==='OPTIONS')response=new Response(null,{status:204});
    else {
      if(!env.DB||!env.BUCKET||!/^[a-f0-9]{64}$/.test(env.AUTH_PEPPER||'')||!/^[a-f0-9]{64}$/.test(env.STORAGE_KEY||'')||!/^[a-f0-9]{64}$/.test(env.BOOTSTRAP_HASH||''))fail(503,'Stockage partagé indisponible.');
      const path=new URL(request.url).pathname,now=clock();
      if(path==='/api/status'&&request.method==='GET')response=json({initialized:!!(await state(env))});
      else if(path==='/api/setup'&&request.method==='POST'){
        const activation=request.headers.get('X-WG-Activation')||'';
        if(!/^[a-f0-9]{64}$/.test(activation)||!equal(await digest(activation),env.BOOTSTRAP_HASH))fail(403,'Lien d’activation invalide.');
        const {code}=await smallJSON(request);if(!codeOK(code))fail(400,'Choisis un code de 8 chiffres.');
        const salt=random(16),hash=await pinHash(code,salt,env);
        const inserted=await env.DB.prepare('INSERT INTO vault (id,pin_salt,pin_hash,generation,version,failures,blocked_until,lease_until) VALUES (1,?,?,1,0,0,0,0) ON CONFLICT(id) DO NOTHING RETURNING id').bind(salt,hash).first();
        if(!inserted)fail(409,'Le partage est déjà activé. Saisis ton code habituel.');
        response=json({token:await issueSession(env,1,now),version:0,exists:false});
      }else if(path==='/api/login'&&request.method==='POST'){
        const {code}=await smallJSON(request);const row=await verifyPIN(code,env,now);
        response=json({token:await issueSession(env,row.generation,now),version:row.version,exists:!!row.object_key});
      }else{
        const session=await authorize(request,env,now);
        if(path==='/api/logout'&&request.method==='POST'){await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(session.hash).run();response=json({ok:true});}
        else if(path==='/api/touch'&&request.method==='POST')response=json({ok:true});
        else if(path==='/api/vault'&&request.method==='GET'){
          const row=await state(env);if(!row.object_key)fail(404,'Ouvre d’abord WolfGuard sur ton appareil principal pour transférer tes données.');
          const object=await env.BUCKET.get(row.object_key);if(!object?.body)fail(503,'Copie distante indisponible.');
          const {body,length}=await decryptedStream(object,env);
          response=new Response(body,{headers:{'Content-Type':'application/json','Content-Length':String(length),'X-WG-Version':String(row.version)}});
        }else if(path==='/api/vault'&&request.method==='PUT')response=await putSnapshot(request,env,session,now);
        else if(path==='/api/rotation'&&request.method==='POST'){
          const {oldCode,newCode,version}=await smallJSON(request);if(!codeOK(newCode))fail(400,'Choisis un code de 8 chiffres.');
          const row=await verifyPIN(oldCode,env,now);if(row.version!==version||row.generation!==session.generation)fail(409,'La copie distante a changé. Rouvre WolfGuard.');
          const token=random(32),salt=random(16),hash=await pinHash(newCode,salt,env);
          await env.DB.batch([env.DB.prepare('DELETE FROM rotations WHERE expires_at<=?').bind(now),env.DB.prepare('INSERT INTO rotations (token_hash,pin_salt,pin_hash,generation,version,expires_at) VALUES (?,?,?,?,?,?)').bind(await digest(token),salt,hash,row.generation,row.version,now+60000)]);
          response=json({rotation:token});
        }else fail(404,'Adresse inconnue.');
      }
    }
  } catch(error){response=json({error:error instanceof Failure?error.message:'Stockage partagé temporairement indisponible.',...(error instanceof Failure?error.extra:{})},error instanceof Failure?error.status:503);}
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','no-store, max-age=0');headers.set('Pragma','no-cache');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('Vary','Origin');
  if(cors){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS');headers.set('Access-Control-Allow-Headers','Authorization, Content-Type, X-WG-Version, X-WG-Size, X-WG-Rotation, X-WG-Activation');headers.set('Access-Control-Expose-Headers','X-WG-Version, Retry-After');}
  if(response.status===429||response.status===401){const data=await response.clone().json();if(data.retryAfter)headers.set('Retry-After',String(data.retryAfter));}
  return new Response(response.body,{status:response.status,headers});
}
