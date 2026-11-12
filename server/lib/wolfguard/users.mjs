import {seal,open,stopRemoteOwners} from './access.mjs';
import {handleOTP,requiresMFA} from './otp.mjs';
import {handlePushSettings,requiresPhone,pushDevice} from './push.mjs';
import {userPolicy,policyCipher,permissionAPI} from './permission-store.mjs';
import {profilePolicy,requirePermission,canManagePolicy} from './permissions.mjs';
import {vaultHome,addVaultIdentity} from './personal-vault.mjs';
import {deliveryMaterial} from './workspace-access.mjs';
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
export async function codeLookup(code,env){return usernameHash('personal-code-v1:'+code,env);}
// Old salted verifiers cannot be converted without the user's code. Check only
// unconverted rows during migration; indexed accounts keep their salted check.
export async function usersMatchingCode(code,env,pinHash){
  const lookup=await codeLookup(code,env),rows=await env.DB.prepare('SELECT * FROM users WHERE credential_pending=0 AND (pin_lookup=? OR pin_lookup IS NULL)').bind(lookup).all(),matches=[];
  for(const row of rows.results)if(await pinHash(code,row.pin_salt,env)===row.pin_hash)matches.push(row);
  return {lookup,matches};
}
async function availableCode(code,id,env,pinHash,fail){
  return codeLookup(code,env);
}
export async function publicUser(row,env,viewer){
  const phone=Object.hasOwn(row,'has_phone')?!!row.has_phone:!!await pushDevice(env,row.id);
  const username=await open(row.name_cipher,'WolfGuard users v1:name:'+row.id,env);
  const base={id:row.id,username,vaultHome:vaultHome({id:row.id,username}),role:row.role,permissions:await userPolicy(row,env),permission_revision:row.permission_revision||1,disabled:row.disabled_at!==null,credentialPending:!!row.credential_pending,inviteExpiresAt:row.invite_expires_at,createdAt:row.created_at,lastLogin:row.last_login,mfa:{authenticator:!!row.otp_secret_cipher,phone,complete:!!row.otp_secret_cipher&&(!requiresPhone(env)||phone),required:requiresMFA(env),primary:requiresPhone(env)||phone?'push':'authenticator',backup:'authenticator'}};

  return base;
}
export async function handleAccountAPI(request,env,now,h){
  const {fail,json,body,digest,pinHash,random}=h,path=new URL(request.url).pathname;
  if(request.method!=='POST'||!['/api/account/inspect','/api/account/complete'].includes(path))fail(404,'Adresse inconnue.');
  const data=await body();
  if(!data||typeof data!=='object')fail(400,'Requête invalide.');
  if(typeof data.ticket!=='string'||!/^[a-f0-9]{64}$/.test(data.ticket))fail(410,'Ce lien n’est plus valide. Demande un nouveau lien à l’administrateur.');
  const hash=await digest(data.ticket);
  const invitation=await env.DB.prepare('SELECT * FROM user_invitations WHERE ticket_hash=? AND expires_at>? AND (SELECT users_enabled FROM vault WHERE id=1)=1').bind(hash,now).first();
  if(invitation){
    if(path.endsWith('/inspect'))return json({expiresAt:invitation.expires_at});
    if(!codeOK(data.code))fail(400,'Choisis un code personnel de 8 chiffres.');
    const name=normalizeUsername(data.username);
    if(!name)fail(400,'Vérifie ton adresse e-mail.');
    const id=random(16),salt=random(16),nameHash=await usernameHash(name,env),lookup=await availableCode(data.code,null,env,pinHash,fail);
    const invitedPolicy=invitation.permissions_cipher?await open(invitation.permissions_cipher,'WolfGuard invitation permissions v1:'+invitation.id,env):profilePolicy('none');
    // D1 batches are transactional: insertion and consumption succeed together.
    // A second redemption cannot insert after the first has removed the ticket.
    const result=await env.DB.batch([
      env.DB.prepare("INSERT INTO users(id,name_hash,name_cipher,role,pin_salt,pin_hash,created_at,updated_at,pin_lookup,permissions_cipher) SELECT ?,?,?,'member',?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM user_invitations WHERE ticket_hash=? AND expires_at>?) AND (SELECT users_enabled FROM vault WHERE id=1)=1 AND (SELECT COUNT(*) FROM users)<100 ON CONFLICT DO NOTHING").bind(id,nameHash,await seal(name,'WolfGuard users v1:name:'+id,env),salt,await pinHash(data.code,salt,env),now,now,lookup,await policyCipher(invitedPolicy,id,env),hash,now),
      env.DB.prepare('DELETE FROM user_invitations WHERE ticket_hash=? AND EXISTS(SELECT 1 FROM users WHERE id=?)').bind(hash,id)
    ]);
    if(Number(result[0]?.meta?.changes)!==1){
      const valid=await env.DB.prepare('SELECT id FROM user_invitations WHERE ticket_hash=? AND expires_at>?').bind(hash,now).first();
      if(valid)fail(409,'Cette adresse e-mail ou ce code est déjà utilisé, ou la limite de 100 comptes est atteinte.');
      fail(410,'Ce lien n’est plus valide. Demande un nouveau lien à l’administrateur.');
    }
    return json({ok:true});
  }
  const user=await env.DB.prepare('SELECT * FROM users WHERE invite_hash=? AND invite_expires_at>? AND credential_pending=1 AND disabled_at IS NULL AND (SELECT users_enabled FROM vault WHERE id=1)=1').bind(hash,now).first();
  if(!user)fail(410,'Ce lien n’est plus valide. Demande un nouveau lien à l’administrateur.');
  if(path.endsWith('/inspect'))return json({expiresAt:user.invite_expires_at});
  if(!codeOK(data.code))fail(400,'Choisis un code personnel de 8 chiffres.');
  const name=normalizeUsername(data.username);
  if(!name||await usernameHash(name,env)!==user.name_hash)fail(400,'Vérifie ton adresse e-mail.');
  const lookup=await availableCode(data.code,user.id,env,pinHash,fail);
  const salt=random(16),changed=await env.DB.prepare('UPDATE users SET pin_salt=?,pin_hash=?,pin_lookup=?,code_version=code_version+1,credential_pending=0,invite_hash=NULL,invite_expires_at=NULL,updated_at=? WHERE id=? AND invite_hash=? AND invite_expires_at>? AND credential_pending=1 AND disabled_at IS NULL AND code_version=? RETURNING id').bind(salt,await pinHash(data.code,salt,env),lookup,now,user.id,hash,now,user.code_version).first();
  if(!changed)fail(410,'Ce lien n’est plus valide. Demande un nouveau lien à l’administrateur.');
  return json({ok:true});
}
export async function workspaceMaterial(row,env){return row.users_enabled?open(row.workspace_key_cipher,'WolfGuard users v1:workspace-key',env):null;}
export async function revokeUserSessions(env,id,now){
  const rows=await env.DB.prepare('DELETE FROM sessions WHERE user_id=? RETURNING token_hash').bind(id).all();
  await stopRemoteOwners(env,rows.results,now);
  await env.DB.prepare("UPDATE scan_jobs SET status='cancelled',updated_at=?,revision=revision+1 WHERE created_by=? AND status IN ('queued','running')").bind(now,id).run();
  await env.DB.prepare('DELETE FROM access_connections WHERE NOT EXISTS(SELECT 1 FROM sessions WHERE sessions.token_hash=access_connections.token_hash)').run();
}
async function revokeOthers(env,id,keep,now){
  const rows=await env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>? RETURNING token_hash').bind(id,keep).all();
  await stopRemoteOwners(env,rows.results,now);
  await env.DB.prepare('DELETE FROM access_connections WHERE NOT EXISTS(SELECT 1 FROM sessions WHERE sessions.token_hash=access_connections.token_hash)').run();
}
function validMaterial(value){try{return value&&typeof value.key==='string'&&typeof value.salt==='string'&&btoa(atob(value.key))===value.key&&atob(value.key).length===32&&btoa(atob(value.salt))===value.salt&&atob(value.salt).length===16;}catch{return false;}}
export async function handleUsersAPI(request,env,now,session,h){
  const {fail,json,body,random,pinHash,verifyPIN,digest}=h,path=new URL(request.url).pathname;
  const vault=await env.DB.prepare('SELECT * FROM vault WHERE id=1').first();
  if(path==='/api/me'&&request.method==='GET')return json({user:session.user,usersEnabled:!!vault.users_enabled,...(vault.users_enabled&&new URL(request.url).searchParams.get('workspace')==='1'?{workspace:await deliveryMaterial(vault,session.user,env)}:{})});
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
      env.DB.prepare('UPDATE users SET pin_salt=?,pin_hash=?,pin_lookup=?,last_login=?,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM vault WHERE workspace_key_cipher=?)').bind(salt,codeHash,await codeLookup(data.code,env),now,now,id,keyCipher),
      env.DB.prepare('UPDATE sessions SET user_id=?,user_version=1 WHERE token_hash=? AND EXISTS(SELECT 1 FROM vault WHERE workspace_key_cipher=?)').bind(id,session.hash,keyCipher),
      env.DB.prepare('DELETE FROM sessions WHERE token_hash<>? AND EXISTS(SELECT 1 FROM vault WHERE workspace_key_cipher=?)').bind(session.hash,keyCipher)
    ]);
    if(Number(result[1]?.meta?.changes)!==1)fail(409,'La configuration a changé. Recharge la connexion.');
    const orphaned=await env.DB.prepare("SELECT DISTINCT owner_hash AS token_hash FROM remote_sessions WHERE status IN ('requested','preparing','active') AND NOT EXISTS(SELECT 1 FROM sessions WHERE token_hash=owner_hash)").all();await stopRemoteOwners(env,orphaned.results,now);
    return json({user:{id,username:name,role:'admin'},usersEnabled:true});
  }
  if(!vault.users_enabled)fail(409,'Crée d’abord le compte administrateur à la connexion.');
  if(path==='/api/users/otp'||path.startsWith('/api/users/otp/'))return handleOTP(request,env,now,session,{...h,revokeOthers});
  if(path==='/api/users/push'||path.startsWith('/api/users/push/'))return handlePushSettings(request,env,now,session,{...h,revokeOthers});
  if(path==='/api/users/change-code'&&request.method==='POST'){
    const data=await body(),row=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(session.user.id).first();
    if(!codeOK(data.code))fail(400,'Le nouveau code doit contenir 8 chiffres.');
    await verifyPIN(data.oldCode,env,now,row);
    const lookup=await availableCode(data.code,row.id,env,pinHash,fail);
    const salt=random(16),changed=await env.DB.prepare('UPDATE users SET pin_salt=?,pin_hash=?,pin_lookup=?,code_version=code_version+1,updated_at=? WHERE id=? AND code_version=? AND disabled_at IS NULL RETURNING *').bind(salt,await pinHash(data.code,salt,env),lookup,now,row.id,row.code_version).first();
    if(!changed)fail(409,'Ce compte a changé. Reconnecte-toi.');
    await revokeUserSessions(env,row.id,now);
    const token=await h.issueSession(env,session.generation,now,request,changed);
    return json({token,user:await addVaultIdentity(await publicUser(changed,env,session.user),env,now),usersEnabled:true});
  }
  if(path==='/api/users/verify-code'&&request.method==='POST'){
    const data=await body(),row=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(session.user.id).first();await verifyPIN(data.code,env,now,row);return json({ok:true});
  }
  if(path==='/api/users/permissions'||path.startsWith('/api/users/permissions/'))return permissionAPI(path,request,env,now,session,vault,{...h,revokeUserSessions});
  requirePermission(session.user,request.method==='GET'?'users.read':'users.manage',fail,now);
  if(path==='/api/users'&&request.method==='GET'){
    const rows=await env.DB.prepare(`SELECT u.*,EXISTS(SELECT 1 FROM push_devices p WHERE p.user_id=u.id) AS has_phone,
      (SELECT COUNT(*) FROM sessions s WHERE s.user_id=u.id AND s.user_version=u.code_version AND s.active_at IS NOT NULL AND s.generation=?) AS session_count
      FROM users u ORDER BY u.created_at,u.id`).bind(session.generation).all(),users=[];
    for(const row of rows.results)users.push({...await publicUser(row,env,session.user),current:row.id===session.user.id,sessions:row.session_count});
    const invitations=await env.DB.prepare('SELECT id,created_at AS createdAt,expires_at AS expiresAt FROM user_invitations WHERE expires_at>? ORDER BY created_at DESC,id').bind(now).all();
    return json({users,invitations:invitations.results});
  }
  if(request.method!=='POST')fail(404,'Adresse utilisateur inconnue.');
  const data=await body();
  let initialPolicy=profilePolicy('none');
  if(['/api/users/create','/api/users/invite'].includes(path)&&data.profile!==undefined){
    try{initialPolicy=profilePolicy(data.profile);}catch(error){fail(400,error.message);}
    if(data.profile!=='none'){requirePermission(session.user,'users.permissions',fail,now);if(!canManagePolicy(session.user,initialPolicy,now))fail(403,'Ce profil dépasse tes propres droits.');}
  }
  if(path==='/api/users/invite'){
    const id=random(16),ticket=random(32),expiresAt=now+24*60*60000;
    await env.DB.prepare('DELETE FROM user_invitations WHERE expires_at<=?').bind(now).run();
    const added=await env.DB.prepare('INSERT INTO user_invitations(id,ticket_hash,created_at,expires_at,permissions_cipher) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM users)+(SELECT COUNT(*) FROM user_invitations)<100 RETURNING id').bind(id,await digest(ticket),now,expiresAt,await seal(initialPolicy,'WolfGuard invitation permissions v1:'+id,env)).first();
    if(!added)fail(409,'La limite de 100 comptes et invitations en attente est atteinte.');
    return json({invitation:{id,ticket,expiresAt}},201);
  }
  if(path==='/api/users/revoke-invitation'){
    if(typeof data.id!=='string'||!/^[a-f0-9]{32}$/.test(data.id))fail(400,'Invitation invalide.');
    await env.DB.prepare('DELETE FROM user_invitations WHERE id=?').bind(data.id).run();
    return json({ok:true});
  }
  if(path==='/api/users/create'){
    const name=normalizeUsername(data.username),role='member';
    if(data.role!==undefined&&data.role!=='member')fail(403,'Seul '+OWNER_EMAIL+' est administrateur.');
    if(name===OWNER_EMAIL)fail(409,'Cette adresse est réservée au compte administrateur.');
    if(!name)fail(400,'Vérifie l’adresse mail.');
    if(data.code!==undefined)fail(400,'Le code doit être choisi par l’utilisateur à sa première connexion.');
    if(await findUser(name,env))fail(409,'Ce nom d’utilisateur est déjà utilisé.');
    const id=random(16),ticket=random(32),expiresAt=now+24*60*60000;
    const added=await env.DB.prepare('INSERT INTO users (id,name_hash,name_cipher,role,pin_salt,pin_hash,created_at,updated_at,credential_pending,invite_hash,invite_expires_at,permissions_cipher) SELECT ?,?,?,?,?,?,?,?,1,?,?,? WHERE (SELECT COUNT(*) FROM users)<100 ON CONFLICT(name_hash) DO NOTHING RETURNING *').bind(id,await usernameHash(name,env),await seal(name,'WolfGuard users v1:name:'+id,env),role,random(16),random(32),now,now,await digest(ticket),expiresAt,await policyCipher(initialPolicy,id,env)).first();
    if(!added)fail(409,'Ce nom est déjà utilisé ou la limite de 100 comptes est atteinte.');return json({user:await publicUser(added,env,session.user),invitation:{ticket,expiresAt}},201);
  }
  if(typeof data.id!=='string'||!/^[a-f0-9]{32}$/.test(data.id))fail(400,'Utilisateur invalide.');
  const target=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(data.id).first();if(!target)fail(404,'Utilisateur introuvable.');
  const isOwner=target.id===vault.owner_user_id;
  if(session.user.role!=='admin'&&(isOwner||target.id===session.user.id))fail(403,'Un gestionnaire ne peut pas modifier son propre compte ni le propriétaire.');
  if(!canManagePolicy(session.user,await userPolicy(target,env),now))fail(403,'Un gestionnaire peut uniquement gérer les membres dont les droits restent dans son propre périmètre.');
  if(path==='/api/users/update'){
    const name=normalizeUsername(data.username),role=isOwner?'admin':'member',disabled=data.disabled;
    if(!name||typeof disabled!=='boolean')fail(400,'Vérifie l’adresse mail et les paramètres du compte.');
    if(isOwner&&(name!==OWNER_EMAIL||disabled||data.role!==undefined&&data.role!=='admin'))fail(409,'Le compte administrateur '+OWNER_EMAIL+' est protégé.');
    if(!isOwner&&(name===OWNER_EMAIL||data.role!==undefined&&data.role!=='member'))fail(403,'Seul '+OWNER_EMAIL+' est administrateur.');
    const duplicate=await findUser(name,env);if(duplicate&&duplicate.id!==target.id)fail(409,'Ce nom d’utilisateur est déjà utilisé.');
    const updated=await env.DB.prepare('UPDATE users SET name_hash=?,name_cipher=?,role=?,disabled_at=?,updated_at=? WHERE id=? RETURNING *').bind(await usernameHash(name,env),await seal(name,'WolfGuard users v1:name:'+target.id,env),role,disabled?now:null,now,target.id).first();
    if(!updated)fail(409,'Il faut conserver au moins un administrateur actif.');
    if(disabled||target.role!==role)await revokeUserSessions(env,target.id,now);
    return json({user:await publicUser(updated,env,session.user),reconnect:target.id===session.user.id&&(disabled||target.role!==role)});
  }
  if(path==='/api/users/reset-code'){
    if(target.id===session.user.id)fail(409,'Pour ton propre compte, modifie ton code dans les paramètres de sécurité.');
    if(data.code!==undefined)fail(400,'Le nouveau code doit être choisi par l’utilisateur.');
    const ticket=random(32),expiresAt=now+24*60*60000;
    await env.DB.prepare('UPDATE users SET pin_salt=?,pin_hash=?,pin_lookup=NULL,code_version=code_version+1,credential_pending=1,invite_hash=?,invite_expires_at=?,updated_at=? WHERE id=?').bind(random(16),random(32),await digest(ticket),expiresAt,now,target.id).run();await revokeUserSessions(env,target.id,now);return json({ok:true,invitation:{ticket,expiresAt}});
  }
  if(path==='/api/users/reset-otp'){
    if(isOwner)fail(409,'Désactive ton Authenticator dans Sécurité avec ton code OTP.');
    await env.DB.prepare('UPDATE users SET otp_secret_cipher=NULL,otp_pending_cipher=NULL,otp_pending_until=NULL,otp_last_step=-1,otp_recovery_cipher=NULL,code_version=code_version+1 WHERE id=?').bind(target.id).run();
    await env.DB.batch([env.DB.prepare('DELETE FROM push_requests WHERE user_id=?').bind(target.id),env.DB.prepare('DELETE FROM push_devices WHERE user_id=?').bind(target.id)]);
    await revokeUserSessions(env,target.id,now);return json({ok:true});
  }
  if(path==='/api/users/disconnect'){await revokeUserSessions(env,target.id,now);return json({ok:true,reconnect:target.id===session.user.id});}
  if(path==='/api/users/delete'){
    if(isOwner)fail(409,'Le compte administrateur '+OWNER_EMAIL+' est protégé.');
    await revokeUserSessions(env,target.id,now);
    await h.purgeVault(target.id);
    const removed=await env.DB.prepare('DELETE FROM users WHERE id=? AND id<>(SELECT owner_user_id FROM vault WHERE id=1) RETURNING id').bind(target.id).first();
    if(!removed)fail(409,'Il faut conserver au moins un administrateur actif.');
    await env.DB.batch([env.DB.prepare('DELETE FROM push_requests WHERE user_id=?').bind(target.id),env.DB.prepare('DELETE FROM push_devices WHERE user_id=?').bind(target.id)]);
    await revokeUserSessions(env,target.id,now);
    // The personal vault belongs to the deleted account: its home folder and
    // all records inside disappear with the user.
    return json({ok:true,reconnect:target.id===session.user.id,purgeVaultHome:'vault-user-'+target.id});
  }
  fail(404,'Adresse utilisateur inconnue.');
}
