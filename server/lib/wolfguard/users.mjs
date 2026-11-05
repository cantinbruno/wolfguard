import {seal,open,stopRemoteOwners} from './access.mjs';
const encoder=new TextEncoder();
const codeOK=value=>typeof value==='string'&&/^[0-9]{8}$/.test(value);
const bytes=value=>Uint8Array.from(value.match(/../g)||[],n=>parseInt(n,16));
const hex=value=>[...new Uint8Array(value)].map(n=>n.toString(16).padStart(2,'0')).join('');
export const normalizeUsername=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9._-]{2,31}$/.test(value.trim().normalize('NFKC').toLowerCase())?value.trim().normalize('NFKC').toLowerCase():null;
export async function usernameHash(name,env){const key=await crypto.subtle.importKey('raw',bytes(env.AUTH_PEPPER),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,encoder.encode('WolfGuard username v1:'+name)));}
export async function findUser(name,env){const normalized=normalizeUsername(name);return normalized?env.DB.prepare('SELECT * FROM users WHERE name_hash=?').bind(await usernameHash(normalized,env)).first():null;}
export async function publicUser(row,env){return {id:row.id,username:await open(row.name_cipher,'WolfGuard users v1:name:'+row.id,env),role:row.role,disabled:row.disabled_at!==null,createdAt:row.created_at,lastLogin:row.last_login};}
export async function workspaceMaterial(row,env){return row.users_enabled?open(row.workspace_key_cipher,'WolfGuard users v1:workspace-key',env):null;}
export async function revokeUserSessions(env,id,now){
  const rows=await env.DB.prepare('DELETE FROM sessions WHERE user_id=? RETURNING token_hash').bind(id).all();
  await stopRemoteOwners(env,rows.results,now);
  await env.DB.prepare('DELETE FROM access_connections WHERE NOT EXISTS(SELECT 1 FROM sessions WHERE sessions.token_hash=access_connections.token_hash)').run();
}
function validMaterial(value){try{return value&&typeof value.key==='string'&&typeof value.salt==='string'&&btoa(atob(value.key))===value.key&&atob(value.key).length===32&&btoa(atob(value.salt))===value.salt&&atob(value.salt).length===16;}catch{return false;}}
export async function handleUsersAPI(request,env,now,session,h){
  const {fail,json,body,random,pinHash,verifyPIN}=h,path=new URL(request.url).pathname;
  const vault=await env.DB.prepare('SELECT * FROM vault WHERE id=1').first();
  if(path==='/api/me'&&request.method==='GET')return json({user:session.user,usersEnabled:!!vault.users_enabled});
  if(path==='/api/users/initialize'&&request.method==='POST'){
    if(vault.users_enabled)fail(409,'Les utilisateurs sont déjà configurés. Recharge la connexion.');
    const data=await body(),name=normalizeUsername(data.username);
    if(!name)fail(400,'Le nom doit contenir 3 à 32 lettres, chiffres, points, tirets ou traits de soulignement.');
    if(!codeOK(data.code)||data.code===data.oldCode)fail(400,'Choisis un nouveau code administrateur de 8 chiffres, différent de l’ancien code commun.');
    if(!validMaterial(data.workspace)||data.version!==vault.version||!vault.object_key)fail(409,'La copie partagée a changé. Recharge la connexion pour configurer les utilisateurs.');
    await verifyPIN(data.oldCode,env,now);
    const id=random(16),salt=random(16),nameHash=await usernameHash(name,env),nameCipher=await seal(name,'WolfGuard users v1:name:'+id,env);
    const result=await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id,name_hash,name_cipher,role,pin_salt,pin_hash,code_version,created_at,updated_at,last_login) SELECT ?,?,?,'admin',?,?,1,?,?,? WHERE EXISTS(SELECT 1 FROM vault WHERE id=1 AND users_enabled=0 AND version=? AND generation=?) AND EXISTS(SELECT 1 FROM sessions WHERE token_hash=?)").bind(id,nameHash,nameCipher,salt,await pinHash(data.code,salt,env),now,now,now,data.version,session.generation,session.hash),
      env.DB.prepare('UPDATE vault SET users_enabled=1,workspace_key_cipher=? WHERE id=1 AND users_enabled=0 AND version=? AND EXISTS(SELECT 1 FROM users WHERE id=?)').bind(await seal(data.workspace,'WolfGuard users v1:workspace-key',env),data.version,id),
      env.DB.prepare('UPDATE sessions SET user_id=?,user_version=1 WHERE token_hash=? AND EXISTS(SELECT 1 FROM users WHERE id=?)').bind(id,session.hash,id),
      env.DB.prepare('DELETE FROM sessions WHERE token_hash<>? AND EXISTS(SELECT 1 FROM users WHERE id=?)').bind(session.hash,id)
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
    const name=normalizeUsername(data.username),role=data.role;
    if(!name||!['admin','member'].includes(role)||!codeOK(data.code))fail(400,'Vérifie le nom, le rôle et le code de 8 chiffres.');
    if(await findUser(name,env))fail(409,'Ce nom d’utilisateur est déjà utilisé.');
    const id=random(16),salt=random(16);
    const added=await env.DB.prepare('INSERT INTO users (id,name_hash,name_cipher,role,pin_salt,pin_hash,created_at,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM users)<100 ON CONFLICT(name_hash) DO NOTHING RETURNING *').bind(id,await usernameHash(name,env),await seal(name,'WolfGuard users v1:name:'+id,env),role,salt,await pinHash(data.code,salt,env),now,now).first();
    if(!added)fail(409,'Ce nom est déjà utilisé ou la limite de 100 comptes est atteinte.');return json({user:await publicUser(added,env)},201);
  }
  if(typeof data.id!=='string'||!/^[a-f0-9]{32}$/.test(data.id))fail(400,'Utilisateur invalide.');
  const target=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(data.id).first();if(!target)fail(404,'Utilisateur introuvable.');
  const lastAdmin="(role<>'admin' OR disabled_at IS NOT NULL OR EXISTS(SELECT 1 FROM users other WHERE other.id<>users.id AND other.role='admin' AND other.disabled_at IS NULL))";
  if(path==='/api/users/update'){
    const name=normalizeUsername(data.username),role=data.role,disabled=data.disabled;
    if(!name||!['admin','member'].includes(role)||typeof disabled!=='boolean')fail(400,'Paramètres utilisateur invalides.');
    const duplicate=await findUser(name,env);if(duplicate&&duplicate.id!==target.id)fail(409,'Ce nom d’utilisateur est déjà utilisé.');
    const updated=await env.DB.prepare('UPDATE users SET name_hash=?,name_cipher=?,role=?,disabled_at=?,updated_at=? WHERE id=? AND (?=1 OR '+lastAdmin+') RETURNING *').bind(await usernameHash(name,env),await seal(name,'WolfGuard users v1:name:'+target.id,env),role,disabled?now:null,now,target.id,role==='admin'&&!disabled?1:0).first();
    if(!updated)fail(409,'Il faut conserver au moins un administrateur actif.');
    if(disabled||target.role!==role)await revokeUserSessions(env,target.id,now);
    return json({user:await publicUser(updated,env),reconnect:target.id===session.user.id&&(disabled||target.role!==role)});
  }
  if(path==='/api/users/reset-code'){
    if(!codeOK(data.code))fail(400,'Le code doit contenir 8 chiffres.');
    const salt=random(16);await env.DB.prepare('UPDATE users SET pin_salt=?,pin_hash=?,code_version=code_version+1,updated_at=? WHERE id=?').bind(salt,await pinHash(data.code,salt,env),now,target.id).run();await revokeUserSessions(env,target.id,now);return json({ok:true,reconnect:target.id===session.user.id});
  }
  if(path==='/api/users/disconnect'){await revokeUserSessions(env,target.id,now);return json({ok:true,reconnect:target.id===session.user.id});}
  if(path==='/api/users/delete'){
    const removed=await env.DB.prepare('DELETE FROM users WHERE id=? AND '+lastAdmin+' RETURNING id').bind(target.id).first();
    if(!removed)fail(409,'Il faut conserver au moins un administrateur actif.');await revokeUserSessions(env,target.id,now);return json({ok:true,reconnect:target.id===session.user.id});
  }
  fail(404,'Adresse utilisateur inconnue.');
}
