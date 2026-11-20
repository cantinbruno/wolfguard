import {seal,open} from './access.mjs';
import {normalizePolicy,profilePolicy,can,canManagePolicy} from './permissions.mjs';
import {applyFleetPolicy,fleetState} from './fleet-groups.mjs';

const cache=Symbol('access-groups');
const guest=()=>({...profilePolicy('guest'),groupLevels:{}});
export const clearAccessGroups=env=>{delete env[cache];};
export async function accessGroupState(env){
  return env[cache]??=(async()=>{
    const row=await env.DB.prepare('SELECT a.* FROM access_groups a JOIN vault v ON v.id=1 AND v.generation=a.generation WHERE a.id=1').first();if(!row)return null;
    const state={...await open(row.config_cipher,'WolfGuard access groups v1',env),revision:row.revision},fleet=await fleetState(env);
    if(fleet)for(const group of state.groups)group.policy.groupLevels=Object.fromEntries(Object.entries(group.policy.groupLevels||{}).filter(([id])=>fleet.groups.some(group=>group.id===id)));
    return state;
  })();
}
export async function inheritedPolicy(row,env,fallback){
  const state=await accessGroupState(env);if(!state||row.role==='admin'||row.id===state.ownerId)return fallback;
  const group=state.groups.find(group=>group.id===(state.members[row.id]||'default'))||state.groups.find(group=>group.id==='default');
  return {...normalizePolicy(group.policy),accessGroup:{id:group.id,name:group.name,revision:state.revision}};
}
export async function accessGroupAPI(request,env,now,session,h){
  const {fail,json,body,random,revokeUserSessions}=h,url=new URL(request.url),operation=url.pathname.slice('/api/users/groups'.length).replace(/^\//,'');
  if(!can(session.user,'users.permissions',now))fail(403,'La gestion des groupes nécessite le droit Utilisateurs et droits en écriture.');
  let state=await accessGroupState(env);
  const registered=(await env.DB.prepare('SELECT id,role FROM users').all()).results;
  if(state)state={...state,members:Object.fromEntries(Object.entries(state.members).filter(([id])=>registered.some(user=>user.id===id&&user.role!=='admin')))};
  const snapshot=()=>({initialized:!!state,revision:state?.revision||0,groups:(state?.groups||[]).filter(group=>canManagePolicy(session.user,group.policy,now)).map(group=>({...group,policy:normalizePolicy(group.policy),memberIds:registered.filter(user=>user.role!=='admin'&&(state.members[user.id]||'default')===group.id).map(user=>user.id)}))});
  if(request.method==='GET'&&!operation)return json(snapshot());
  if(request.method!=='POST')fail(404,'Action de groupe inconnue.');
  const data=await body();
  if(operation==='bootstrap'){
    if(state)return json(snapshot());
    if(session.user.role!=='admin')fail(403,'Le propriétaire doit initialiser les groupes d’autorisations.');
    const fleet=await fleetState(env);if(!fleet)fail(409,'Initialise les groupes de postes avant les groupes d’autorisations.');
    const users=(await env.DB.prepare('SELECT id,role,permissions_cipher,permission_revision FROM users ORDER BY id').all()).results;
    const groups=[{id:'default',name:'Invités',policy:guest()}],members={};
    for(const user of users){
      if(user.role==='admin')continue;
      const old=user.permissions_cipher?normalizePolicy(await open(user.permissions_cipher,'WolfGuard permissions v1:'+user.id,env)):profilePolicy('legacy');
      const policy=normalizePolicy(await applyFleetPolicy(old,user,env));
      let group=groups.find(group=>JSON.stringify(group.policy)===JSON.stringify(policy));
      if(!group){const label=policy.admin?'Administrateurs':policy.profile==='editor'?'Éditeurs':policy.profile==='observer'?'Observateurs':'Accès conservés';group={id:'access-'+crypto.randomUUID(),name:label+(groups.some(group=>group.name===label)?' '+groups.length:''),policy};groups.push(group);}
      members[user.id]=group.id;
    }
    const next={groups,members,ownerId:session.user.id},signature=users.map(user=>user.id+':'+user.permission_revision).join(',');
    const encrypted=await encode(next);
    const result=await env.DB.prepare("INSERT INTO access_groups(id,generation,revision,config_cipher,updated_at) SELECT 1,?,1,?,? WHERE NOT EXISTS(SELECT 1 FROM access_groups WHERE id=1 AND generation=?) AND COALESCE((SELECT GROUP_CONCAT(signature,',') FROM (SELECT id||':'||permission_revision AS signature FROM users ORDER BY id)),'')=? AND (SELECT revision FROM fleet_groups WHERE id=1 AND generation=?)=? ON CONFLICT(id) DO UPDATE SET generation=excluded.generation,revision=1,config_cipher=excluded.config_cipher,updated_at=excluded.updated_at WHERE access_groups.generation<>excluded.generation").bind(session.generation,encrypted,now,session.generation,signature,session.generation,fleet.revision).run();
    if(!result.meta?.changes)fail(409,'Les accès ont changé pendant la reprise. Recharge les groupes.');
    clearAccessGroups(env);state={...next,revision:1};return json(snapshot());
  }
  if(!state)fail(409,'Le propriétaire doit initialiser les groupes.');
  if(data.revision!==state.revision)fail(409,'Les groupes ont changé. Recharge avant de réessayer.');
  const next=structuredClone(state),group=next.groups.find(group=>group.id===data.id),affected=new Set();
  const permit=policy=>{if(!canManagePolicy(session.user,policy,now))fail(403,'Ce changement dépasse les droits de ton groupe.');};
  const name=()=>{const value=typeof data.name==='string'?data.name.trim():'';if(!value||value.length>60)fail(400,'Nom de groupe invalide.');if(next.groups.some(group=>(operation!=='rename'||group.id!==data.id)&&group.name.toLocaleLowerCase()===value.toLocaleLowerCase()))fail(409,'Ce nom existe déjà.');return value;};
  if(operation==='create'||operation==='duplicate'){
    if(next.groups.length>=128)fail(409,'Maximum 128 groupes d’autorisations.');
    if(operation==='duplicate'&&!group)fail(404,'Groupe introuvable.');
    const policy=operation==='duplicate'?group.policy:guest();permit(policy);
    next.groups.push({id:'access-'+crypto.randomUUID(),name:name(),policy});
  }else{
    if(!group)fail(404,'Groupe introuvable.');permit(group.policy);
    if(operation==='assign'){
      if(!Array.isArray(data.userIds)||!data.userIds.length||data.userIds.length>100)fail(400,'Sélection de comptes invalide.');
      const rows=registered;
      for(const id of new Set(data.userIds)){
        const user=rows.find(row=>row.id===id);if(!user||user.role==='admin')fail(409,'Le propriétaire ne peut pas changer de groupe.');
        const previous=next.groups.find(group=>group.id===(next.members[id]||'default'));permit(previous.policy);
        next.members[id]=group.id;affected.add(id);
      }
    }else{
      if(group.id==='default')fail(409,'Le groupe initial des invités reste sans accès.');
      if(operation==='rename')group.name=name();
      else if(operation==='policy'){
        let policy;try{policy=normalizePolicy(data.policy);}catch(error){fail(400,error.message);}
        const fleet=await fleetState(env);
        if(policy.groupLevels===undefined||data.policy?.agentLevels!==undefined||policy.agents!==null)fail(400,'Les accès aux postes doivent être définis par groupe.');
        if(Object.keys(policy.groupLevels).some(id=>!fleet.groups.some(group=>group.id===id)))fail(409,'Un groupe de postes a changé. Recharge les droits.');
        permit(policy);group.policy=policy;
        for(const [id,value]of Object.entries(next.members))if(value===group.id)affected.add(id);
      }else if(operation==='remove'){
        if(Object.values(next.members).includes(group.id))fail(409,'Déplace les membres dans un autre groupe avant de le supprimer.');
        next.groups=next.groups.filter(row=>row.id!==group.id);
      }else fail(404,'Action de groupe inconnue.');
    }
  }
  const auditId=random(16),details={kind:'access-group',actor:session.user.username,user:group?.name||next.groups.at(-1).name,revision:state.revision+1,operation,count:affected.size,reason:typeof data.reason==='string'?data.reason.trim().slice(0,500):'',...(operation==='policy'?{beforePolicy:state.groups.find(group=>group.id===data.id).policy,afterPolicy:group.policy}:{}),...(operation==='assign'?{members:[...affected].map(id=>({id,before:state.members[id]||'default',after:next.members[id]}))}:{})};
  const updates=[env.DB.prepare('UPDATE access_groups SET config_cipher=?,revision=revision+1,updated_at=? WHERE id=1 AND generation=? AND revision=? AND EXISTS(SELECT 1 FROM sessions WHERE token_hash=?)').bind(await encode(next),now,session.generation,state.revision,session.hash),env.DB.prepare('INSERT INTO permission_audit(id,created_at,details_cipher) SELECT ?,?,? WHERE changes()=1').bind(auditId,now,await seal(details,'WolfGuard permissions audit v1:'+auditId,env))];
  updates.push(env.DB.prepare('UPDATE users SET permission_revision=permission_revision+1,code_version=code_version+1,updated_at=? WHERE id IN (SELECT value FROM json_each(?)) AND EXISTS(SELECT 1 FROM permission_audit WHERE id=?)').bind(now,JSON.stringify([...affected]),auditId));
  updates.push(env.DB.prepare('DELETE FROM permission_audit WHERE id NOT IN (SELECT id FROM permission_audit ORDER BY created_at DESC,id DESC LIMIT 2000) AND EXISTS(SELECT 1 FROM permission_audit WHERE id=?)').bind(auditId));
  const result=await env.DB.batch(updates);if(!result[0]?.meta?.changes)fail(409,'Les groupes ont changé. Recharge avant de réessayer.');
  clearAccessGroups(env);state={...next,revision:state.revision+1};
  for(const id of affected)await revokeUserSessions(env,id,now);
  return json({...snapshot(),reconnect:affected.has(session.user.id)});
  async function encode(config){if(new TextEncoder().encode(JSON.stringify(config)).length>1000000)fail(413,'La configuration des groupes est trop volumineuse.');return seal(config,'WolfGuard access groups v1',env);}
}
