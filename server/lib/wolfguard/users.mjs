import {seal,open,stopRemoteOwners} from './access.mjs';
const encoder=new TextEncoder();
const codeOK=value=>typeof value==='string'&&/^[0-9]{8}$/.test(value);
const bytes=value=>Uint8Array.from(value.match(/../g)||[],n=>parseInt(n,16));
const hex=value=>[...new Uint8Array(value)].map(n=>n.toString(16).padStart(2,'0')).join('');
export const OWNER_EMAIL='cantin.bruno@gmx.fr';
export function normalizeUsername(value){
  if(typeof value!=='string')return null;
  const email=value.trim().toLowerCase(),parts=email.split('@');
  if(email.length>254||parts.length!==2)return null;
  const [local,domain]=parts;
  return local.length>0&&local.length<=64&&/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)&&!local.startsWith('.')&&!local.endsWith('.')&&!local.includes('..')&&domain.includes('.')&&domain.split('.').every(label=>label.length<=63&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))?email:null;
}
// Pre-create the owner's account using the existing verifier, without knowing
// or changing the code. The browser binds the existing key on first sign-in.
export async function provisionOwnerAccount(env,now){
  const vault=await env.DB.prepare('SELECT * FROM vault WHERE id=1').first();
  if(!vault||vault.users_enabled||vault.owner_user_id||!vault.object_key)return;
  const id=hex(crypto.getRandomValues(new Uint8Array(16))),nameHash=await usernameHash(OWNER_EMAIL,env);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users(id,name_hash,name_cipher,role,pin_salt,pin_hash,created_at,updated_at) SELECT ?,?,?,'admin',pin_salt,pin_hash,?,? FROM vault WHERE id=1 AND users_enabled=0 AND owner_user_id IS NULL ON CONFLICT(name_hash) DO NOTHING").bind(id,nameHash,await seal(OWNER_EMAIL,'WolfGuard users v1:name:'+id,env),now,now),
    env.DB.prepare('UPDATE vault SET owner_user_id=(SELECT id FROM users WHERE name_hash=?) WHERE id=1 AND users_enabled=0 AND owner_user_id IS NULL').bind(nameHash)
  ]);
}
// Bind the original administrator to the owner's requested email once. Preserve
// its ID, verifier, data and session; revoke any other former administrator.
export async function ensureOwnerAccount(env,now){
  const vault=await env.DB.prepare('SELECT users_enabled,owner_user_id FROM vault WHERE id=1').first();
  if(!vault?.users_enabled||vault.owner_user_id)return;
  const nameHash=await usernameHash(OWNER_EMAIL,env);
  const owner=await env.DB.prepare("SELECT id FROM users WHERE name_hash=? OR role='admin' ORDER BY CASE WHEN name_hash=? THEN 0 ELSE 1 END,created_at,id LIMIT 1").bind(nameHash,nameHash).first();
  if(!owner)throw new Error('Owner account unavailable');
  const former=await env.DB.prepare("SELECT id FROM users WHERE role='admin' AND id<>?").bind(owner.id).all();
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET name_hash=?,name_cipher=?,role='admin',disabled_at=NULL,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM vault WHERE id=1 AND owner_user_id IS NULL)").bind(nameHash,await seal(OWNER_EMAIL,'WolfGuard users v1:name:'+owner.id,env),now,owner.id),
    env.DB.prepare("UPDATE users SET role='member',updated_at=? WHERE id<>? AND role='admin' AND EXISTS(SELECT 1 FROM vault WHERE id=1 AND owner_user_id IS NULL)").bind(now,owner.id),
    env.DB.prepare('UPDATE vault SET owner_user_id=? WHERE id=1 AND owner_user_id IS NULL').bind(owner.id)
  ]);
  for(const user of former.results)await revokeUserSessions(env,user.id,now);
}
export async function usernameHash(name,env){const key=await crypto.subtle.importKey('raw',bytes(env.AUTH_PEPPER),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,encoder.encode('WolfGuard username v1:'+name)));}
export async function findUser(name,env){const normalized=normalizeUsername(name);return normalized?env.DB.prepare('SELECT * FROM users WHERE name_hash=?').bind(await usernameHash(normalized,env)).first():null;}
export async function publicUser(row,env){return {id:row.id,username:await open(row.name_cipher,'WolfGuard users v1:name:'+row.id,env),role:row.role,disabled:row.disabled_at!==null,credentialPending:!!row.credential_pending,inviteExpiresAt:row.invite_expires_at,createdAt:row.created_at,lastLogin:row.last_login};}
export async function handleAccountAPI(request,env,now,h){
  const {fail,json,body,digest,pinHash,random}=h,path=new URL(request.url).pathname;
  if(request.method!=='POST'||!['/api/account/inspect','/api/account/complete'].includes(path))fail(404,'Adresse inconnue.');
  const data=await body();
  if(!data||typeof data!=='object')fail(400,'Requête invalide.');
  if(typeof data.ticket!=='string'||!/^[a-f0-9]{64}$/.test(data.ticket))fail(410,'Ce lien n’est plus valide. Demande un nouveau lien à l’administrateur.');
  const hash=await digest(data.ticket),user=await env.DB.prepare('SELECT * FROM users WHERE invite_hash=? AND invite_expires_at>? AND credential_pending=1 AND disabled_at IS NULL AND (SELECT users_enabled FROM vault WHERE id=1)=1').bind(hash,now).first();
  if(!user)fail(410,'Ce lien n’est plus valide. Demande un nouveau lien à l’administrateur.');
  if(path.endsWith('/inspect'))return json({expiresAt:user.invite_expires_at});
  if(!codeOK(data.code))fail(400,'Choisis un code personnel de 8 chiffres.');
  const name=normalizeUsername(data.username);
  if(!name||await usernameHash(name,env)!==user.name_hash)fail(400,'Vérifie ton nom d’utilisateur.');
  const salt=random(16),changed=await env.DB.prepare('UPDATE users SET pin_salt=?,pin_hash=?,code_version=code_version+1,credential_pending=0,invite_hash=NULL,invite_expires_at=NULL,updated_at=? WHERE id=? AND invite_hash=? AND invite_expires_at>? AND credential_pending=1 AND disabled_at IS NULL AND code_version=? RETURNING id').bind(salt,await pinHash(data.code,salt,env),now,user.id,hash,now,user.code_version).first();
  if(!changed)fail(410,'Ce lien n’est plus valide. Demande un nouveau lien à l’administrateur.');
  return json({ok:true});
}
export async function workspaceMaterial(row,env){return row.users_enabled?open(row.workspace_key_cipher,'WolfGuard users v1:workspace-key',env):null;}
export async function revokeUserSessions(env,id,now){
  const rows=await env.DB.prepare('DELETE FROM sessions WHERE user_id=? RETURNING token_hash').bind(id).all();
  await stopRemoteOwners(env,rows.results,now);
  await env.DB.prepare('DELETE FROM access_connections WHERE NOT EXISTS(SELECT 1 FROM sessions WHERE sessions.token_hash=access_connections.token_hash)').run();
}
function validMaterial(value){try{return value&&typeof value.key==='string'&&typeof value.salt==='string'&&btoa(atob(value.key))===value.key&&atob(value.key).length===32&&btoa(atob(value.salt))===value.salt&&atob(value.salt).length===16;}catch{return false;}}
export async function handleUsersAPI(request,env,now,session,h){
  const {fail,json,body,random,pinHash,verifyPIN,digest}=h,path=new URL(request.url).pathname;
  const vault=await env.DB.prepare('SELECT * FROM vault WHERE id=1').first();
  if(path==='/api/me'&&request.method==='GET')return json({user:session.user,usersEnabled:!!vault.users_enabled});
  if(path==='/api/users/initialize'&&request.method==='POST'){
    if(vault.users_enabled)fail(409,'Les utilisateurs sont déjà configurés. Recharge la connexion.');
    const data=await body(),name=normalizeUsername(data.username);
    if(name!==OWNER_EMAIL)fail(400,'Le compte administrateur est réservé à '+OWNER_EMAIL+'.');
    if(!codeOK(data.code)||!vault.owner_user_id&&data.code===data.oldCode)fail(400,'Choisis un nouveau code administrateur de 8 chiffres, différent de l’ancien code commun.');
    if(!validMaterial(data.workspace)||data.version!==vault.version||!vault.object_key)fail(409,'La copie partagée a changé. Recharge la connexion pour configurer les utilisateurs.');
    await verifyPIN(data.oldCode,env,now);
    const id=vault.owner_user_id||random(16),salt=random(16),nameHash=await usernameHash(name,env),nameCipher=await seal(name,'WolfGuard users v1:name:'+id,env),keyCipher=await seal(data.workspace,'WolfGuard users v1:workspace-key',env),codeHash=await pinHash(data.code,salt,env);
    const result=await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id,name_hash,name_cipher,role,pin_salt,pin_hash,code_version,created_at,updated_at,last_login) SELECT ?,?,?,'admin',?,?,1,?,?,? WHERE EXISTS(SELECT 1 FROM vault WHERE id=1 AND users_enabled=0 AND owner_user_id IS NULL AND version=? AND generation=?) AND EXISTS(SELECT 1 FROM sessions WHERE token_hash=?)").bind(id,nameHash,nameCipher,salt,codeHash,now,now,now,data.version,session.generation,session.hash),
      env.DB.prepare('UPDATE vault SET users_enabled=1,workspace_key_cipher=?,owner_user_id=? WHERE id=1 AND users_enabled=0 AND version=? AND generation=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND name_hash=?) AND EXISTS(SELECT 1 FROM sessions WHERE token_hash=?)').bind(keyCipher,id,data.version,session.generation,id,nameHash,session.hash),
      env.DB.prepare('UPDATE users SET pin_salt=?,pin_hash=?,last_login=?,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM vault WHERE workspace_key_cipher=?)').bind(salt,codeHash,now,now,id,keyCipher),
      env.DB.prepare('UPDATE sessions SET user_id=?,user_version=1 WHERE token_hash=? AND EXISTS(SELECT 1 FROM vault WHERE workspace_key_cipher=?)').bind(id,session.hash,keyCipher),
      env.DB.prepare('DELETE FROM sessions WHERE token_hash<>? AND EXISTS(SELECT 1 FROM vault WHERE workspace_key_cipher=?)').bind(session.hash,keyCipher)
    ]);
    if(Number(result[1]?.meta?.changes)!==1)fail(409,'La configuration a changé. Recharge la connexion.');
    const orphaned=await env.DB.prepare("SELECT DISTINCT owner_hash AS token_hash FROM remote_sessions WHERE status IN ('requested','preparing','active') AND NOT EXISTS(SELECT 1 FROM sessions WHERE token_hash=owner_hash)").all();await stopRemoteOwners(env,orphaned.results,now);
    return json({user:{id,username:name,role:'admin'},usersEnabled:true});
  }
  if(!vault.users_enabled)fail(409,'Crée d’abord le compte administrateur à la connexion.');
  if(path==='/api/users/change-code'&&request.method==='POST'){
    const data=await body(),row=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(session.user.id).first();
    if(!codeOK(data.code))fail(400,'Le nouveau code doit contenir 8 chiffres.');
    await verifyPIN(data.oldCode,env,now,row);
    const salt=random(16),changed=await env.DB.prepare('UPDATE users SET pin_salt=?,pin_hash=?,code_version=code_version+1,updated_at=? WHERE id=? AND code_version=? AND disabled_at IS NULL RETURNING *').bind(salt,await pinHash(data.code,salt,env),now,row.id,row.code_version).first();
    if(!changed)fail(409,'Ce compte a changé. Reconnecte-toi.');
    await revokeUserSessions(env,row.id,now);
    const token=await h.issueSession(env,session.generation,now,request,changed);
    return json({token,user:await publicUser(changed,env),usersEnabled:true});
  }
  if(path==='/api/users/verify-code'&&request.method==='POST'){
    const data=await body(),row=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(session.user.id).first();await verifyPIN(data.code,env,now,row);return json({ok:true});
  }
  if(session.user.role!=='admin')fail(403,'Cette gestion est réservée aux administrateurs.');
  if(path==='/api/users'&&request.method==='GET'){
    const rows=await env.DB.prepare('SELECT * FROM users ORDER BY created_at,id').all(),users=[];
    for(const row of rows.results){const count=await env.DB.prepare('SELECT COUNT(*) AS count FROM sessions WHERE user_id=? AND user_version=? AND expires_at>? AND active_at>? AND generation=?').bind(row.id,row.code_version,now,now-15*60000,session.generation).first();users.push({...await publicUser(row,env),current:row.id===session.user.id,sessions:count.count});}
    return json({users});
  }
  if(request.method!=='POST')fail(404,'Adresse utilisateur inconnue.');
  const data=await body();
  if(path==='/api/users/create'){
    const name=normalizeUsername(data.username),role='member';
    if(data.role!==undefined&&data.role!=='member')fail(403,'Seul '+OWNER_EMAIL+' est administrateur.');
    if(name===OWNER_EMAIL)fail(409,'Cette adresse est réservée au compte administrateur.');
    if(!name)fail(400,'Vérifie l’adresse mail.');
    if(data.code!==undefined)fail(400,'Le code doit être choisi par l’utilisateur à sa première connexion.');
    if(await findUser(name,env))fail(409,'Ce nom d’utilisateur est déjà utilisé.');
    const id=random(16),ticket=random(32),expiresAt=now+24*60*60000;
    const added=await env.DB.prepare('INSERT INTO users (id,name_hash,name_cipher,role,pin_salt,pin_hash,created_at,updated_at,credential_pending,invite_hash,invite_expires_at) SELECT ?,?,?,?,?,?,?,?,1,?,? WHERE (SELECT COUNT(*) FROM users)<100 ON CONFLICT(name_hash) DO NOTHING RETURNING *').bind(id,await usernameHash(name,env),await seal(name,'WolfGuard users v1:name:'+id,env),role,random(16),random(32),now,now,await digest(ticket),expiresAt).first();
    if(!added)fail(409,'Ce nom est déjà utilisé ou la limite de 100 comptes est atteinte.');return json({user:await publicUser(added,env),invitation:{ticket,expiresAt}},201);
  }
  if(typeof data.id!=='string'||!/^[a-f0-9]{32}$/.test(data.id))fail(400,'Utilisateur invalide.');
  const target=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(data.id).first();if(!target)fail(404,'Utilisateur introuvable.');
  const isOwner=target.id===vault.owner_user_id;
  if(path==='/api/users/update'){
    const name=normalizeUsername(data.username),role=isOwner?'admin':'member',disabled=data.disabled;
    if(!name||typeof disabled!=='boolean')fail(400,'Vérifie l’adresse mail et les paramètres du compte.');
    if(isOwner&&(name!==OWNER_EMAIL||disabled||data.role!==undefined&&data.role!=='admin'))fail(409,'Le compte administrateur '+OWNER_EMAIL+' est protégé.');
    if(!isOwner&&(name===OWNER_EMAIL||data.role!==undefined&&data.role!=='member'))fail(403,'Seul '+OWNER_EMAIL+' est administrateur.');
    const duplicate=await findUser(name,env);if(duplicate&&duplicate.id!==target.id)fail(409,'Ce nom d’utilisateur est déjà utilisé.');
    const updated=await env.DB.prepare('UPDATE users SET name_hash=?,name_cipher=?,role=?,disabled_at=?,updated_at=? WHERE id=? RETURNING *').bind(await usernameHash(name,env),await seal(name,'WolfGuard users v1:name:'+target.id,env),role,disabled?now:null,now,target.id).first();
    if(!updated)fail(409,'Il faut conserver au moins un administrateur actif.');
    if(disabled||target.role!==role)await revokeUserSessions(env,target.id,now);
    return json({user:await publicUser(updated,env),reconnect:target.id===session.user.id&&(disabled||target.role!==role)});
  }
  if(path==='/api/users/reset-code'){
    if(target.id===session.user.id)fail(409,'Pour ton propre compte, modifie ton code dans les paramètres de sécurité.');
    if(data.code!==undefined)fail(400,'Le nouveau code doit être choisi par l’utilisateur.');
    const ticket=random(32),expiresAt=now+24*60*60000;
    await env.DB.prepare('UPDATE users SET pin_salt=?,pin_hash=?,code_version=code_version+1,credential_pending=1,invite_hash=?,invite_expires_at=?,updated_at=? WHERE id=?').bind(random(16),random(32),await digest(ticket),expiresAt,now,target.id).run();await revokeUserSessions(env,target.id,now);return json({ok:true,invitation:{ticket,expiresAt}});
  }
  if(path==='/api/users/disconnect'){await revokeUserSessions(env,target.id,now);return json({ok:true,reconnect:target.id===session.user.id});}
  if(path==='/api/users/delete'){
    if(isOwner)fail(409,'Le compte administrateur '+OWNER_EMAIL+' est protégé.');
    const removed=await env.DB.prepare('DELETE FROM users WHERE id=? AND id<>(SELECT owner_user_id FROM vault WHERE id=1) RETURNING id').bind(target.id).first();
    if(!removed)fail(409,'Il faut conserver au moins un administrateur actif.');await revokeUserSessions(env,target.id,now);return json({ok:true,reconnect:target.id===session.user.id});
  }
  fail(404,'Adresse utilisateur inconnue.');
}
