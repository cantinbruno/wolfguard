// Single-owner WolfGuard storage. Secrets are supplied by the host, never Git.
import {handleAgentAPI} from './agents.mjs';
import {scanSpec} from './scan-spec.mjs';
import {addressContext,assertAddressAllowed,connectionStatement,rememberConnection,handleAccessAPI} from './access.mjs';
import {findUser,publicUser,workspaceMaterial,handleUsersAPI,handleAccountAPI,ensureOwnerAccount,provisionOwnerAccount,usersMatchingCode,revokeUserSessions} from './users.mjs';
import {consumeOTP,requiresMFA,prepareOTPEnrollment,confirmOTPEnrollment} from './otp.mjs';
import {browserPushEnabled,pushDevice,startPush,handlePushLogin,requiresPhone,phoneEnrollment,handlePhoneEnrollment} from './push.mjs';
import {open as openRecord} from './access.mjs';
import {userPolicy} from './permission-store.mjs';
import {handleChatAPI} from './chat-api.mjs';
import {handleChatHistory} from './chat-history.mjs';
import {deliveryMaterial,canonicalMaterial,openEnvelope,sealEnvelope,projectWorkspace,mergeScopedWorkspace} from './workspace-access.mjs';
const encoder = new TextEncoder();
const MAX_BYTES = 46 * 1024 * 1024, BLOCK = 65536;
const SESSION_MS = 8 * 60 * 60000, IDLE_MS = 60 * 60000;
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2,'0')).join('');
const bytes = value => Uint8Array.from(value.match(/../g) || [], x => parseInt(x,16));
const random = length => hex(crypto.getRandomValues(new Uint8Array(length)));
const digest = async value => hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const equal = (a,b) => { let diff=a.length^b.length; for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0); return diff===0; };
class Failure extends Error { constructor(status,message,extra={}) { super(message);this.status=status;this.extra=extra; } }
const fail = (status,message,extra) => { throw new Failure(status,message,extra); };
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8'}});
async function smallJSON(request,limit=2048) {
  let length=0;const parts=[];
  if(!request.body)fail(400,'Requête vide.');
  for await(const part of request.body){length+=part.byteLength;if(length>limit)fail(413,'Requête trop volumineuse.');parts.push(part);}
  const all=new Uint8Array(length);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));}catch{fail(400,'Requête invalide.');}
}
const codeOK = code => typeof code==='string' && /^[0-9]{8}$/.test(code);
export async function pinHash(code,salt,env) {
  const pepper=await crypto.subtle.importKey('raw',bytes(env.AUTH_PEPPER),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const input=await crypto.subtle.sign('HMAC',pepper,encoder.encode('WolfGuard PIN v1:'+code));
  const material=await crypto.subtle.importKey('raw',input,'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(salt),iterations:100000},material,256));
}
async function state(env) { return env.DB.prepare('SELECT * FROM vault WHERE id = 1').first(); }
async function verifyPIN(code,env,now,verifier,pinVerifier) {
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
  let valid=false,result;
  try {
    if(typeof verifier==='function'){
      const pinValid=!pinVerifier||equal(await pinHash(code,pinVerifier.pin_salt,env),pinVerifier.pin_hash);
      result=pinValid?await verifier():false;valid=!!result;
    }else valid=equal(await pinHash(code,verifier===undefined?row.pin_salt:verifier?.pin_salt||'0'.repeat(32),env),verifier===undefined?row.pin_hash:verifier?.pin_hash||'0'.repeat(64));
  }
  finally {
    const deadline=now+row.failures*5000;
    await env.DB.prepare('UPDATE vault SET failures=?, blocked_until=?, lease=NULL, lease_until=0 WHERE id=1 AND lease=?')
      .bind(valid?(result?.partial?row.failures-1:0):row.failures,valid?0:deadline,lease).run();
  }
  if(!valid)fail(401,'Code personnel ou OTP incorrect.',{retryAfter:row.failures*5});
  return {...row,...(typeof result==='object'?{loginUser:result.user,otpRequired:!!result.partial&&!result.setupRequired&&!result.pushRequired,otpSetupRequired:!!result.setupRequired,recoveryCodes:result.recoveryCodes,pushRequired:!!result.pushRequired,pushDevice:result.device,backupUsed:!!result.backupUsed}:{})};
}
async function issueSession(env,generation,now,request,user=null) {
  if(requiresMFA(env)&&user&&!user.otp_secret_cipher)fail(403,'Configure Authenticator pour ouvrir une session.',{code:'MFA_SETUP_REQUIRED'});
  if(requiresPhone(env)&&user){const device=await pushDevice(env,user.id);if(!device)fail(403,'Associe ton téléphone pour terminer la configuration MFA.');if(!Object.hasOwn(user,'push_device_id'))user.push_device_id=device.id;}
  const token=random(32), hash=await digest(token);
  const context=await addressContext(request,env);await assertAddressAllowed(env,context,fail);
  const issued=await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at<=? OR active_at<=? OR generation<>?').bind(now,now-IDLE_MS,generation),
    env.DB.prepare('INSERT INTO sessions (token_hash,generation,expires_at,active_at,user_id,user_version) SELECT ?,?,?,?,?,? WHERE (SELECT generation FROM vault WHERE id=1)=? AND (? IS NULL OR EXISTS(SELECT 1 FROM users WHERE id=? AND code_version=? AND disabled_at IS NULL AND credential_pending=0 AND otp_secret_cipher IS ? AND (?=0 OR (SELECT id FROM push_devices WHERE user_id=users.id) IS ?)))').bind(hash,generation,now+SESSION_MS,now,user?.id||null,user?.code_version||0,generation,user?.id||null,user?.id||null,user?.code_version||0,user?.otp_secret_cipher||null,user&&Object.hasOwn(user,'push_device_id')?1:0,user?.push_device_id||null),
    await connectionStatement(env,request,hash,now,context)
  ]);
  if(Number(issued[1]?.meta?.changes)!==1){await env.DB.prepare('DELETE FROM access_connections WHERE token_hash=?').bind(hash).run();fail(401,'Ce compte a changé. Reconnecte-toi.');}
  try{await assertAddressAllowed(env,context,fail);}catch(error){await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(hash),env.DB.prepare('DELETE FROM access_connections WHERE token_hash=?').bind(hash)]);throw error;}
  return token;
}
async function authorize(request,env,now) {
  const token=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization')||'')?.[1];
  if(!token)fail(401,'Saisis à nouveau ton code.');
  const hash=await digest(token),context=await addressContext(request,env);
  const session=await env.DB.prepare('UPDATE sessions SET active_at=? WHERE token_hash=? AND expires_at>? AND active_at>? AND generation=(SELECT generation FROM vault WHERE id=1) AND NOT EXISTS(SELECT 1 FROM access_blocks WHERE ip_hash=?) AND ((SELECT users_enabled FROM vault WHERE id=1)=0 OR EXISTS(SELECT 1 FROM users WHERE id=sessions.user_id AND disabled_at IS NULL AND credential_pending=0 AND code_version=sessions.user_version)) RETURNING *, (SELECT role FROM users WHERE id=sessions.user_id) AS user_role, (SELECT name_cipher FROM users WHERE id=sessions.user_id) AS user_name, (SELECT otp_secret_cipher IS NOT NULL FROM users WHERE id=sessions.user_id) AS user_otp, EXISTS(SELECT 1 FROM push_devices WHERE user_id=sessions.user_id) AS user_push')
    .bind(now,hash,now,now-IDLE_MS,context.hash||'').first();
  if(!session){await assertAddressAllowed(env,context,fail);fail(401,'Session expirée ou déconnectée. Saisis à nouveau ton code.');}
  if(!browserPushEnabled(env))session.user_push=0;
  const path=new URL(request.url).pathname;
  if(path==='/api/touch'||path.startsWith('/api/access'))await rememberConnection(env,request,hash,now,context);
  if(requiresMFA(env)&&session.user_id&&!session.user_otp)fail(401,'Configure Authenticator pour ouvrir une session.',{code:'MFA_SETUP_REQUIRED'});
  if(requiresPhone(env)&&session.user_id&&!session.user_push)fail(401,'Associe ton téléphone pour terminer la configuration MFA.',{code:'MFA_SETUP_REQUIRED'});
  const user=session.user_id?{id:session.user_id,username:await openRecord(session.user_name,'WolfGuard users v1:name:'+session.user_id,env),role:session.user_role,mfa:{authenticator:!!session.user_otp,phone:!!session.user_push,complete:!!session.user_otp&&(!requiresPhone(env)||!!session.user_push),required:requiresMFA(env),primary:requiresPhone(env)||session.user_push?'push':'authenticator',backup:'authenticator'}}:{id:null,username:'Configuration initiale',role:'admin'};
  if(session.user_id){const rights=await env.DB.prepare('SELECT id,permissions_cipher,permission_revision FROM users WHERE id=?').bind(session.user_id).first();user.permissions=await userPolicy(rights,env);user.permission_revision=rights.permission_revision;}
  return {...session,hash,access:context,user};
}
async function storageKey(env) { return crypto.subtle.importKey('raw',bytes(env.STORAGE_KEY),'AES-GCM',false,['encrypt','decrypt']); }
async function finishLogin(request,env,now,row,user,extra={}){
  if(user.disabled_at!==null)fail(403,'Ce compte est désactivé. Contacte un administrateur.',{code:'ACCOUNT_DISABLED'});
  if(!row.users_enabled&&user.id!==row.owner_user_id)fail(403,'Ce compte est indisponible.');
  const token=await issueSession(env,row.generation,now,request,user);
  await env.DB.prepare('UPDATE users SET last_login=? WHERE id=?').bind(now,user.id).run();
  return json({token,version:row.version,exists:!!row.object_key,user:await publicUser(user,env),usersEnabled:!!row.users_enabled,...(row.users_enabled?{workspace:await deliveryMaterial(row,user,env)}:{}),...extra});
}
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
const SCOPED_MAX_BYTES=8*1024*1024;
async function boundedJSON(stream,limit=SCOPED_MAX_BYTES){
  const reader=stream.getReader(),parts=[];let length=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();fail(413,'La copie partagée dépasse la limite de 8 Mo pour les accès restreints. Le propriétaire peut réduire les pièces jointes.');}parts.push(value);}}
  finally{reader.releaseLock();}
  try{const data=new Uint8Array(length);let offset=0;for(const part of parts){data.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));}catch{fail(400,'Copie partagée invalide.');}
}
async function scopedSnapshot(row,env,user,now){
  const object=await env.BUCKET.get(row.object_key);if(!object?.body)fail(503,'Copie distante indisponible.');
  const stream=await decryptedStream(object,env);if(stream.length>SCOPED_MAX_BYTES){await stream.body.cancel();fail(413,'La copie partagée dépasse la limite de 8 Mo pour les accès restreints. Le propriétaire peut réduire les pièces jointes.');}
  const envelope=await boundedJSON(stream.body),master=await canonicalMaterial(row,env),delivery=await deliveryMaterial(row,user,env);
  let source;try{source=await openEnvelope(envelope,master);}catch{fail(409,'Le propriétaire doit ouvrir et mettre à jour la copie partagée.');}
  let visible;try{visible=await projectWorkspace(source,user,master,delivery,now);}catch{fail(409,'Le propriétaire doit ouvrir et mettre à jour la copie partagée.');}
  return {source,visible,master,delivery,revision:envelope.revision};
}
async function putSnapshot(request,env,session,now) {
  const expected=Number(request.headers.get('X-WG-Version'));
  let length=Number(request.headers.get('X-WG-Size')),incoming=request.body;
  if(!Number.isSafeInteger(expected)||expected<0||!Number.isSafeInteger(length)||length<1||length>MAX_BYTES||!request.body)fail(400,'Taille ou version invalide.');
  const row=await state(env);if(row.version!==expected)fail(409,'Une autre copie a changé. Verrouille puis rouvre WolfGuard pour la récupérer.');
  let rotation=null;
  const rotationToken=request.headers.get('X-WG-Rotation');
  if(row.users_enabled&&session.user.role!=='admin'){
    if(rotationToken)fail(403,'Seul le propriétaire peut changer le chiffrement partagé.');
    const scoped=await scopedSnapshot(row,env,session.user,now);
    let wanted;try{wanted=await openEnvelope(await boundedJSON(request.body),scoped.delivery);}catch(error){if(error instanceof Failure)throw error;fail(400,'Copie chiffrée invalide.');}
    const merged=await mergeScopedWorkspace(scoped.source,scoped.visible,wanted,session.user,scoped.master,scoped.delivery,now,fail);
    const text=JSON.stringify(await sealEnvelope(merged,scoped.master,scoped.revision+1));length=encoder.encode(text).length;incoming=new Response(text).body;
  }
  if(rotationToken){rotation=await env.DB.prepare('SELECT * FROM rotations WHERE token_hash=? AND generation=? AND version=? AND expires_at>?').bind(await digest(rotationToken),session.generation,expected,now).first();if(!rotation)fail(409,'Changement de code expiré. Réessaie.');}
  const objectKey='snapshots/'+random(32), nonce=random(8);
  const body=await encryptedStream(incoming,length,nonce,env), cipherLength=length+Math.ceil(length/BLOCK)*16;
  try {
    // Workers require known-length streams for R2 uploads.
    let upload=body,pump;
    if(typeof FixedLengthStream==='function'){const fixed=new FixedLengthStream(cipherLength);pump=body.pipeTo(fixed.writable);upload=fixed.readable;}
    await Promise.all([env.BUCKET.put(objectKey,upload,{customMetadata:{format:'1',nonce,size:String(length)},httpMetadata:{contentType:'application/octet-stream'}}),pump]);
    const generation=rotation?session.generation+1:session.generation;
    const changed=await env.DB.prepare('UPDATE vault SET object_key=?,version=version+1,generation=?,pin_salt=?,pin_hash=? WHERE id=1 AND version=? AND generation=? AND EXISTS(SELECT 1 FROM sessions s WHERE token_hash=? AND (vault.users_enabled=0 OR EXISTS(SELECT 1 FROM users u WHERE u.id=s.user_id AND u.disabled_at IS NULL AND u.credential_pending=0 AND u.code_version=s.user_version))) AND NOT EXISTS(SELECT 1 FROM access_blocks WHERE ip_hash=?) RETURNING version')
      .bind(objectKey,generation,rotation?.pin_salt||row.pin_salt,rotation?.pin_hash||row.pin_hash,expected,session.generation,session.hash,session.access.hash||'').first();
    if(!changed){await env.BUCKET.delete(objectKey);await authorize(request,env,now);fail(409,'Une autre copie a changé. Verrouille puis rouvre WolfGuard pour la récupérer.');}
    // Previous immutable objects remain available as encrypted recovery history.
    if(rotation)await env.DB.batch([env.DB.prepare('DELETE FROM rotations'),env.DB.prepare('DELETE FROM sessions WHERE generation<>?').bind(generation)]);
    return json({version:changed.version,...(rotation?{token:await issueSession(env,generation,now,request)}:{})});
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
    else if(new URL(request.url).pathname==='/api/entry') {
      const token=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization')||'')?.[1];
      if(request.method!=='POST'||!token||!/^[a-f0-9]{64}$/.test(env.ENTRY_LINK_HASH||'')||!equal(await digest(token),env.ENTRY_LINK_HASH))fail(404,'Adresse inconnue.');
      response=new Response(null,{status:204});
    } else {
      if(!env.DB||!env.BUCKET||!/^[a-f0-9]{64}$/.test(env.AUTH_PEPPER||'')||!/^[a-f0-9]{64}$/.test(env.STORAGE_KEY||'')||!/^[a-f0-9]{64}$/.test(env.BOOTSTRAP_HASH||''))fail(503,'Stockage partagé indisponible.');
      const path=new URL(request.url).pathname,now=clock();
      if(!path.startsWith('/api/agent/'))await ensureOwnerAccount(env,now);
      if(path==='/api/status'&&request.method==='GET'){await provisionOwnerAccount(env,now);response=json({initialized:!!(await state(env))});}
      else if(path.startsWith('/api/account/')){
        await assertAddressAllowed(env,await addressContext(request,env),fail);
        response=await handleAccountAPI(request,env,now,{fail,json,body:()=>smallJSON(request),digest,pinHash,random});
      }else if(path.startsWith('/api/duo/')){
        fail(410,'La connexion utilise maintenant le code MFA de ton Authenticator.');
      }else if(path.startsWith('/api/push/')){
        if(!browserPushEnabled(env))fail(410,'Les notifications du navigateur ont été retirées.');
        await assertAddressAllowed(env,await addressContext(request,env),fail);
        response=await handlePushLogin(request,env,now,{fail,json,body:()=>smallJSON(request),finish:async(user,deviceId,generation)=>{const current=await state(env);if(current.generation!==generation)fail(401,'Ce compte a changé. Reconnecte-toi.');user.push_device_id=deviceId;return finishLogin(request,env,now,current,user);}});
      }else if(path.startsWith('/api/mfa/phone/')){
        await assertAddressAllowed(env,await addressContext(request,env),fail);
        response=await handlePhoneEnrollment(request,env,now,{fail,json,body:()=>smallJSON(request)});
      }else if(path==='/api/setup'&&request.method==='POST'){
        await assertAddressAllowed(env,await addressContext(request,env),fail);
        const activation=request.headers.get('X-WG-Activation')||'';
        if(!/^[a-f0-9]{64}$/.test(activation)||!equal(await digest(activation),env.BOOTSTRAP_HASH))fail(403,'Lien d’activation invalide.');
        const {code}=await smallJSON(request);if(!codeOK(code))fail(400,'Choisis un code de 8 chiffres.');
        const salt=random(16),hash=await pinHash(code,salt,env);
        const inserted=await env.DB.prepare('INSERT INTO vault (id,pin_salt,pin_hash,generation,version,failures,blocked_until,lease_until) VALUES (1,?,?,1,0,0,0,0) ON CONFLICT(id) DO NOTHING RETURNING id').bind(salt,hash).first();
        if(!inserted)fail(409,'Le partage est déjà activé. Saisis ton code habituel.');
        response=json({token:await issueSession(env,1,now,request),version:0,exists:false});
      }else if(path==='/api/login'&&request.method==='POST'){
        await assertAddressAllowed(env,await addressContext(request,env),fail);
        const {code,username,otp}=await smallJSON(request),current=await state(env);
        if(current?.users_enabled||current?.owner_user_id){
          const row=await verifyPIN(code,env,now,async()=>{
            // Keep legacy clients compatible; new clients send only the code.
            let user,lookup;
            if(username!==undefined){user=await findUser(username,env);if(!user||user.credential_pending||!equal(await pinHash(code,user.pin_salt,env),user.pin_hash))return false;}
            else {const found=await usersMatchingCode(code,env,pinHash);lookup=found.lookup;if(found.matches.length!==1)return false;user=found.matches[0];}
            if(requiresMFA(env)&&!user.otp_secret_cipher&&user.disabled_at===null){
              if(otp===undefined)return {user,partial:true,setupRequired:true};
              return await confirmOTPEnrollment(user,otp,env,now)||false;
            }
            const device=await pushDevice(env,user.id);if(browserPushEnabled(env))user.push_device_id=device?.id||null;
            if(user.disabled_at===null&&device&&otp===undefined)return {user,partial:true,pushRequired:true,device};
            if(user.otp_secret_cipher&&otp===undefined)return {user,partial:true};
            if(user.disabled_at===null&&!await consumeOTP(user,otp,env,now))return false;
            if(lookup&&!user.pin_lookup)await env.DB.prepare('UPDATE users SET pin_lookup=? WHERE id=? AND pin_lookup IS NULL').bind(lookup,user.id).run();
            return {user,backupUsed:!!device&&otp!==undefined};
          }),user=row.loginUser;
          if(row.otpSetupRequired){response=json({otpSetupRequired:true,...await prepareOTPEnrollment(user,env,now),username:(await publicUser(user,env)).username});}
          else if(row.otpRequired){response=json({otpRequired:true,...(requiresPhone(env)?{phoneEnrollment:true}:{})});}
          else if(row.pushRequired){response=await startPush(request,env,now,row,user,row.pushDevice,{fail,json});}
          else {
          if(row.recoveryCodes)await revokeUserSessions(env,user.id,now);
          if(row.backupUsed)await env.DB.prepare("UPDATE push_requests SET state='cancelled' WHERE user_id=? AND state IN ('pending','approved')").bind(user.id).run();
          if(requiresPhone(env)&&user.disabled_at===null&&!await pushDevice(env,user.id))response=json({...await phoneEnrollment(env,user,row.generation,now),...(row.recoveryCodes?{recoveryCodes:row.recoveryCodes}:{})});
          else response=await finishLogin(request,env,now,row,user,row.recoveryCodes?{recoveryCodes:row.recoveryCodes}:{});
          }
        }else{const row=await verifyPIN(code,env,now);response=json({token:await issueSession(env,row.generation,now,request),version:row.version,exists:!!row.object_key,usersEnabled:false});}
      }else if(path.startsWith('/api/agents')||path.startsWith('/api/agent/')||path.startsWith('/api/remote/')||path==='/api/scans'||path.startsWith('/api/scans/')||path==='/api/ai'||path.startsWith('/api/ai/')){
        response=await handleAgentAPI(request,env,now,{fail,json,random,digest,authorize,storageKey,scanSpec});
      }else{
        const session=await authorize(request,env,now);
        if(path==='/api/users/duo')fail(410,'La configuration Duo a été retirée. Utilise les paramètres Authenticator.');
        else if(path==='/api/me'||path==='/api/users'||path.startsWith('/api/users/'))response=await handleUsersAPI(request,env,now,session,{fail,json,body:()=>smallJSON(request,path==='/api/users/permissions'?256*1024:2048),random,pinHash,verifyPIN,issueSession,digest});
        else if(path==='/api/chat/history'||path.startsWith('/api/chat/history/'))response=await handleChatHistory(request,env,now,session,{fail,json,body:()=>smallJSON(request,160*1024)});
        else if(path==='/api/chat/settings'||path==='/api/chat/completions')response=await handleChatAPI(request,env,now,session,{fail,json,body:()=>smallJSON(request,80*1024)});
        else if(path==='/api/access'||path.startsWith('/api/access/'))response=await handleAccessAPI(request,env,now,session,{fail,json,body:()=>smallJSON(request)});
        else if(path==='/api/logout'&&request.method==='POST'){await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(session.hash).run();response=json({ok:true});}
        else if(path==='/api/touch'&&request.method==='POST')response=json({ok:true,user:session.user});
        else if(path==='/api/vault'&&request.method==='GET'){
          const row=await state(env);if(!row.object_key)fail(404,'Ouvre d’abord WolfGuard sur ton appareil principal pour transférer tes données.');
          if(row.users_enabled&&session.user.role!=='admin'){
            const scoped=await scopedSnapshot(row,env,session.user,now);
            response=json(await sealEnvelope(scoped.visible,scoped.delivery,scoped.revision));response.headers.set('X-WG-Version',String(row.version));
          }else{
          const object=await env.BUCKET.get(row.object_key);if(!object?.body)fail(503,'Copie distante indisponible.');
          const {body,length}=await decryptedStream(object,env);
          response=new Response(body,{headers:{'Content-Type':'application/json','Content-Length':String(length),'X-WG-Version':String(row.version)}});
          }
        }else if(path==='/api/vault'&&request.method==='PUT')response=await putSnapshot(request,env,session,now);
        else if(path==='/api/rotation'&&request.method==='POST'){
          if((await state(env)).owner_user_id)fail(409,'Modifie ton code personnel depuis les paramètres de sécurité.');
          const {oldCode,newCode,version}=await smallJSON(request);if(!codeOK(newCode))fail(400,'Choisis un code de 8 chiffres.');
          const row=await verifyPIN(oldCode,env,now);if(row.version!==version||row.generation!==session.generation)fail(409,'La copie distante a changé. Rouvre WolfGuard.');
          const token=random(32),salt=random(16),hash=await pinHash(newCode,salt,env);
          await env.DB.batch([env.DB.prepare('DELETE FROM rotations WHERE expires_at<=?').bind(now),env.DB.prepare('INSERT INTO rotations (token_hash,pin_salt,pin_hash,generation,version,expires_at) VALUES (?,?,?,?,?,?)').bind(await digest(token),salt,hash,row.generation,row.version,now+60000)]);
          response=json({rotation:token});
        }else fail(404,'Adresse inconnue.');
      }
    }
  } catch(error){const duplicate=/UNIQUE constraint failed: users.pin_lookup/.test(String(error?.message));response=json({error:duplicate?'Ce code personnel n’est pas disponible. Choisis-en un autre.':error instanceof Failure?error.message:'Stockage partagé temporairement indisponible.',...(error instanceof Failure?error.extra:{})},duplicate?409:error instanceof Failure?error.status:503);}
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','no-store, max-age=0');headers.set('Pragma','no-cache');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('Vary','Origin');
  headers.set('X-Robots-Tag','noindex, nofollow, noarchive, nosnippet');
  if(cors){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS');headers.set('Access-Control-Allow-Headers','Authorization, Content-Type, X-WG-Version, X-WG-Size, X-WG-Rotation, X-WG-Activation');headers.set('Access-Control-Expose-Headers','X-WG-Version, Retry-After');}
  if(response.status===429||response.status===401){const data=await response.clone().json();if(data.retryAfter)headers.set('Retry-After',String(data.retryAfter));}
  return new Response(response.body,{status:response.status,headers});
}
