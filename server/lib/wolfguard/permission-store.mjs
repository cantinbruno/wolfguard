import {seal,open} from './access.mjs';
import {PERMISSION_SECTIONS,PERMISSION_PROFILES,SECTION_LEVELS,normalizePolicy,profilePolicy,can,canManagePolicy} from './permissions.mjs';
export async function userPolicy(row,env){return row.permissions_cipher?normalizePolicy(await open(row.permissions_cipher,'WolfGuard permissions v1:'+row.id,env)):profilePolicy('legacy');}
export async function policyCipher(policy,id,env){return seal(normalizePolicy(policy),'WolfGuard permissions v1:'+id,env);}
export async function permissionAPI(path,request,env,now,session,vault,h){
  const {fail,json,body,random,revokeUserSessions}=h;
  if(!can(session.user,'users.permissions',now))fail(403,'Ton profil ne permet pas d’attribuer les droits.');
  if(request.method==='GET'){
    if(path==='/api/users/permissions')return json({sections:PERMISSION_SECTIONS,levels:SECTION_LEVELS,profiles:PERMISSION_PROFILES,defaultProfile:'reader'});
    if(path==='/api/users/permissions/audit'){
      const rows=await env.DB.prepare('SELECT id,created_at,details_cipher FROM permission_audit ORDER BY created_at DESC,id DESC LIMIT 100').all(),events=[];
      for(const row of rows.results)events.push({id:row.id,createdAt:row.created_at,...await open(row.details_cipher,'WolfGuard permissions audit v1:'+row.id,env)});
      return json({events});
    }
  }
  if(path!=='/api/users/permissions'||request.method!=='POST')fail(404,'Adresse de droits inconnue.');
  const data=await body();if(typeof data.id!=='string'||!/^[a-f0-9]{32}$/.test(data.id))fail(400,'Compte invalide.');
  const target=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(data.id).first();if(!target)fail(404,'Utilisateur introuvable.');
  if(target.id===vault.owner_user_id||target.role==='admin')fail(409,'Le propriétaire conserve tous les droits.');
  if(data.revision!==target.permission_revision)fail(409,'Les droits ont changé. Recharge ce compte avant de réessayer.');
  let policy;try{policy=normalizePolicy(data.policy);}catch(error){fail(400,error.message);}
  const before=await userPolicy(target,env),id=random(16),revision=target.permission_revision+1;
  if(!canManagePolicy(session.user,before)||!canManagePolicy(session.user,policy))fail(403,'Ce changement dépasse ton propre périmètre de droits.');
  const details={actorId:session.user.id,actor:session.user.username,userId:target.id,user:await open(target.name_cipher,'WolfGuard users v1:name:'+target.id,env),before,after:policy,revision,reason:typeof data.reason==='string'?data.reason.trim().slice(0,500):''};
  const result=await env.DB.batch([
    env.DB.prepare('UPDATE users SET permissions_cipher=?,permission_revision=permission_revision+1,code_version=code_version+1,updated_at=? WHERE id=? AND permission_revision=? AND EXISTS(SELECT 1 FROM sessions WHERE token_hash=?)').bind(await policyCipher(policy,target.id,env),now,target.id,data.revision,session.hash),
    env.DB.prepare('INSERT INTO permission_audit(id,created_at,details_cipher) SELECT ?,?,? WHERE changes()=1 AND EXISTS(SELECT 1 FROM users WHERE id=? AND permission_revision=? AND updated_at=?)').bind(id,now,await seal(details,'WolfGuard permissions audit v1:'+id,env),target.id,revision,now)
  ]);
  if(Number(result[0]?.meta?.changes)!==1)fail(409,'Les droits ont changé. Recharge ce compte.');
  await revokeUserSessions(env,target.id,now);
  await env.DB.prepare("UPDATE scan_jobs SET status='cancelled',updated_at=?,revision=revision+1 WHERE created_by=? AND status IN ('queued','running')").bind(now,target.id).run();
  await env.DB.prepare('DELETE FROM permission_audit WHERE id NOT IN (SELECT id FROM permission_audit ORDER BY created_at DESC,id DESC LIMIT 2000)').run();
  return json({ok:true,revision,sessionsRevoked:true,reconnect:target.id===session.user.id});
}
