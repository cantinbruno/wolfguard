import {seal,open} from './access.mjs';
import {retainRecentLogs} from './retention.mjs';
import {normalizePolicy,profilePolicy,can,canManagePolicy,grantsOf,PERMISSION_SECTIONS,PERMISSION_ACTIONS} from './permissions.mjs';
import {directGroupIds,effectiveGroupIds,groupClosure,validateGroupNesting} from './group-membership.mjs';

const cache=Symbol('access-groups'),levelOrder={deny:0,read:1,write:2};
const guest=()=>({...profilePolicy('guest'),groupLevels:{}});
const fleetModule=()=>import('./fleet-groups.mjs');
const membershipIds=directGroupIds;
const maxLevel=(left='deny',right='deny')=>levelOrder[right]>levelOrder[left]?right:left;
function token(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'')||'Sans_nom';}
function preset(id,name,policy,kind,extra={}){return {id,name,policy:normalizePolicy(policy),preset:true,presetKind:kind,...extra};}
export function accessPresets(fleet){
  const groups=[],allFleet=Object.fromEntries(fleet.groups.map(section=>[section.id,'write']));
  groups.push(preset('preset-application-admin','GG_Acces_Application_administrateur',{...profilePolicy('admin'),groupLevels:allFleet},'admin'));
  for(const [section,label]of PERMISSION_SECTIONS)for(const [level,suffix]of [['read','lecture'],['write','ecriture']]){
    const policy=guest();policy.profile='custom';policy.sections[section]=level;
    groups.push(preset('preset-section-'+token(section)+'-'+level,'GG_Acces_'+token(label)+'_'+suffix,policy,'section',{section,level}));
  }
  for(const section of fleet.groups)for(const [level,suffix]of [['read','lecture'],['write','ecriture']]){
    const policy=guest();policy.profile='custom';policy.groupLevels={[section.id]:level};
    groups.push(preset('preset-fleet-'+section.id+'-'+level,'GG_Acces_'+token(section.id==='ungrouped'?'Sans section':section.name)+'_'+suffix,policy,'fleet',{fleetSection:section.id,level}));
  }
  for(const [action,label,section,sectionLabel]of PERMISSION_ACTIONS){
    const policy=guest();policy.profile='custom';policy.actionRules={[action]:'allow'};
    if(PERMISSION_ACTIONS.some(([key])=>key===section+'.read'))policy.actionRules[section+'.read']='allow';
    groups.push(preset('preset-action-'+token(action),'GG_Acces_'+token(sectionLabel)+'_'+token(label),policy,'action',{action,actionLabel:label,section}));
  }
  return groups;
}
function combinedPolicy(groups,now){
  const active=groups.map(group=>normalizePolicy(group.policy)).filter(policy=>policy.expiresAt===null||policy.expiresAt>now),accessGroup={ids:groups.map(group=>group.id),names:groups.map(group=>group.name),name:groups.length?groups.map(group=>group.name).join(', '):'Aucun groupe'};
  if(!active.length)return {...normalizePolicy(guest()),accessGroup};
  if(active.length===1)return {...active[0],accessGroup};
  const sections=Object.fromEntries(PERMISSION_SECTIONS.map(([id])=>[id,'deny'])),groupLevels={},grants=new Set(),actionRules={};let admin=false;
  for(const policy of active){admin||=policy.admin;for(const id of Object.keys(sections))sections[id]=maxLevel(sections[id],policy.sections[id]);for(const [id,level]of Object.entries(policy.groupLevels||{}))groupLevels[id]=maxLevel(groupLevels[id],level);for(const key of grantsOf(policy))grants.add(key);for(const [key,rule]of Object.entries(policy.actionRules||{}))if(rule==='deny')actionRules[key]='deny';}
  const expiries=active.map(policy=>policy.expiresAt).filter(value=>value!==null),expiresAt=expiries.length?Math.min(...expiries):null;
  return {...normalizePolicy({version:2,profile:admin?'admin':'custom',admin,sections,groupLevels,expiresAt,legacyGrants:[...grants],actionRules}),resourcePolicies:active,accessGroup};
}
function normalizedState(config,revision){return {...config,memberships:config.memberships||Object.fromEntries(Object.entries(config.members||{}).map(([id,group])=>[id,group==='default'?[]:[group]])),revision};}
export const clearAccessGroups=env=>{delete env[cache];};
export async function accessGroupState(env){
  return env[cache]??=(async()=>{
    const row=await env.DB.prepare('SELECT a.* FROM access_groups a JOIN vault v ON v.id=1 AND v.generation=a.generation WHERE a.id=1').first();if(!row)return null;
    const state=normalizedState(await open(row.config_cipher,'WolfGuard access groups v1',env),row.revision),fleet=await (await fleetModule()).fleetState(env);
    if(fleet)for(const group of state.groups)group.policy.groupLevels=Object.fromEntries(Object.entries(group.policy.groupLevels||{}).filter(([id])=>fleet.groups.some(section=>section.id===id)));
    return state;
  })();
}
export async function inheritedPolicy(row,env,fallback){
  const state=await accessGroupState(env);if(!state||row.role==='admin'||row.id===state.ownerId)return fallback;
  const directIds=membershipIds(state,row.id),ids=new Set(effectiveGroupIds(state,row.id)),groups=state.groups.filter(group=>ids.has(group.id)),policy=combinedPolicy(groups,Date.now());policy.accessGroup.directIds=directIds;policy.accessGroup.inheritedIds=[...ids].filter(id=>!directIds.includes(id));policy.accessGroup.revision=state.revision;return policy;
}
export async function reconcileFleetAccessGroups(env,fleet,now){
  const row=await env.DB.prepare('SELECT * FROM access_groups WHERE id=1 AND generation=(SELECT generation FROM vault WHERE id=1)').first();if(!row)return [];
  const current=normalizedState(await open(row.config_cipher,'WolfGuard access groups v1',env),row.revision);if(current.model!==2)return [];
  const desired=accessPresets(fleet).map(group=>({...group,...(current.groups.find(row=>row.id===group.id)?.includedGroupIds?{includedGroupIds:current.groups.find(row=>row.id===group.id).includedGroupIds}:{})})),custom=current.groups.filter(group=>!group.preset&&group.id!=='default'),next={...current,groups:[...desired,...custom],memberships:{...current.memberships},model:2};delete next.members;delete next.revision;
  const allowed=new Set(next.groups.map(group=>group.id)),affected=[];
  for(const group of next.groups)if(group.includedGroupIds)group.includedGroupIds=group.includedGroupIds.filter(id=>allowed.has(id));
  for(const [id,ids]of Object.entries(next.memberships)){const filtered=ids.filter(groupId=>allowed.has(groupId));next.memberships[id]=filtered;if(JSON.stringify(effectiveGroupIds(current,id).sort())!==JSON.stringify(effectiveGroupIds(next,id).sort()))affected.push(id);}
  const before={...current};delete before.revision;delete before.members;if(JSON.stringify(before)===JSON.stringify(next))return [];
  const auditId=crypto.randomUUID().replace(/-/g,''),details={kind:'access-group',actor:'Système',user:'Groupes par section de postes',revision:row.revision+1,operation:'reconcile',count:affected.length};
  const result=await env.DB.batch([
    env.DB.prepare('UPDATE access_groups SET config_cipher=?,revision=revision+1,updated_at=? WHERE id=1 AND generation=? AND revision=?').bind(await seal(next,'WolfGuard access groups v1',env),now,row.generation,row.revision),
    env.DB.prepare('INSERT INTO permission_audit(id,created_at,details_cipher) SELECT ?,?,? WHERE changes()=1').bind(auditId,now,await seal(details,'WolfGuard permissions audit v1:'+auditId,env)),
    env.DB.prepare('UPDATE users SET permission_revision=permission_revision+1,code_version=code_version+1,updated_at=? WHERE id IN (SELECT value FROM json_each(?)) AND EXISTS(SELECT 1 FROM permission_audit WHERE id=?)').bind(now,JSON.stringify(affected),auditId)
  ]);
  if(!result[0]?.meta?.changes)throw new Error('Les groupes d’accès ont changé pendant la synchronisation.');clearAccessGroups(env);return affected;
}
export async function accessGroupAPI(request,env,now,session,h){
  const {fail,json,body,random,revokeUserSessions}=h,url=new URL(request.url),operation=url.pathname.slice('/api/users/groups'.length).replace(/^\//,'');
  if(!can(session.user,'users.permissions',now))fail(403,'La gestion des groupes nécessite le droit Utilisateurs et droits en écriture.');
  await retainRecentLogs(env,now);
  let state=await accessGroupState(env),fleet=await (await fleetModule()).fleetState(env);
  const registered=(await env.DB.prepare('SELECT id,role FROM users').all()).results;
  if(state)state={...state,memberships:Object.fromEntries(Object.entries(state.memberships||{}).filter(([id])=>registered.some(user=>user.id===id&&user.role!=='admin')).map(([id,ids])=>[id,ids.filter(groupId=>state.groups.some(group=>group.id===groupId))]))};
  const ready=()=>!!state&&state.model===2&&!!fleet&&accessPresets(fleet).every(preset=>state.groups.some(group=>group.id===preset.id&&group.name===preset.name));
  const snapshot=()=>({initialized:!!state,prepared:ready(),revision:state?.revision||0,groups:(state?.groups||[]).filter(group=>groupClosure(state,[group.id]).every(id=>canManagePolicy(session.user,state.groups.find(row=>row.id===id).policy,now))).map(group=>({...group,includedGroupIds:group.includedGroupIds||[],parentGroupIds:state.groups.filter(row=>row.includedGroupIds?.includes(group.id)).map(row=>row.id),policy:normalizePolicy(group.policy),memberIds:registered.filter(user=>user.role!=='admin'&&membershipIds(state,user.id).includes(group.id)).map(user=>user.id),effectiveMemberIds:registered.filter(user=>user.role!=='admin'&&effectiveGroupIds(state,user.id).includes(group.id)).map(user=>user.id)}))});
  if(request.method==='GET'&&operation==='effective'){
    if(!state)fail(409,'Le propriétaire doit initialiser les groupes.');
    const target=registered.find(row=>row.id===url.searchParams.get('userId'));if(!target)fail(404,'Utilisateur introuvable.');
    const ids=target.role==='admin'?[]:effectiveGroupIds(state,target.id),sources=state.groups.filter(group=>ids.includes(group.id));
    if(target.role!=='admin'&&sources.some(group=>!canManagePolicy(session.user,group.policy,now)))fail(403,'Ce compte dépasse ton périmètre de gestion.');
    if(target.role==='admin'&&session.user.role!=='admin')fail(403,'Le propriétaire conserve tous les droits.');
    const policy=target.role==='admin'?profilePolicy('admin'):combinedPolicy(sources,now),user={...target,permissions:policy};
    return json({userId:target.id,owner:target.role==='admin',directIds:membershipIds(state,target.id),groups:sources.map(group=>({id:group.id,name:group.name,direct:membershipIds(state,target.id).includes(group.id),expired:group.policy.expiresAt!==null&&group.policy.expiresAt<=now})),actions:PERMISSION_ACTIONS.map(([key,label,section,sectionLabel])=>({key,label,section,sectionLabel,allowed:can(user,key,now),denied:sources.some(group=>group.policy.actionRules?.[key]==='deny'&&(group.policy.expiresAt===null||group.policy.expiresAt>now)),sources:sources.filter(group=>group.policy.expiresAt===null||group.policy.expiresAt>now).filter(group=>group.policy.actionRules?.[key]==='deny'||can({role:'member',permissions:group.policy},key,now)).map(group=>({id:group.id,name:group.name,effect:group.policy.actionRules?.[key]==='deny'?'deny':'allow'}))})),fleet:(fleet?.groups||[]).map(group=>({id:group.id,name:group.name,level:policy.admin?'write':policy.groupLevels?.[group.id]||'deny'}))});
  }
  if(request.method==='GET'&&!operation)return json(snapshot());if(request.method!=='POST')fail(404,'Action de groupe inconnue.');const data=await body();
  if(operation==='bootstrap'){
    if(state)return json(snapshot());if(session.user.role!=='admin')fail(403,'Le propriétaire doit initialiser les groupes d’autorisations.');if(!fleet)fail(409,'Initialise les sections de postes avant les groupes d’autorisations.');
    const users=(await env.DB.prepare('SELECT id,role,permissions_cipher,permission_revision FROM users ORDER BY id').all()).results,groups=accessPresets(fleet),memberships={};
    for(const user of users){if(user.role==='admin')continue;const old=user.permissions_cipher?normalizePolicy(await open(user.permissions_cipher,'WolfGuard permissions v1:'+user.id,env)):profilePolicy('legacy'),policy=normalizePolicy(await (await fleetModule()).applyFleetPolicy(old,user,env));if(JSON.stringify(policy)===JSON.stringify(normalizePolicy(guest()))){memberships[user.id]=[];continue;}let group=groups.find(group=>JSON.stringify(group.policy)===JSON.stringify(policy));if(!group){let name='GG_Acces_conserve',index=2;while(groups.some(group=>group.name===name))name='GG_Acces_conserve_'+index++;group={id:'access-'+crypto.randomUUID(),name,policy};groups.push(group);}memberships[user.id]=[group.id];}
    const next={groups,memberships,ownerId:session.user.id,model:2},signature=users.map(user=>user.id+':'+user.permission_revision).join(','),encrypted=await encode(next);
    const result=await env.DB.prepare("INSERT INTO access_groups(id,generation,revision,config_cipher,updated_at) SELECT 1,?,1,?,? WHERE NOT EXISTS(SELECT 1 FROM access_groups WHERE id=1 AND generation=?) AND COALESCE((SELECT GROUP_CONCAT(signature,',') FROM (SELECT id||':'||permission_revision AS signature FROM users ORDER BY id)),'')=? AND (SELECT revision FROM fleet_groups WHERE id=1 AND generation=?)=? ON CONFLICT(id) DO UPDATE SET generation=excluded.generation,revision=1,config_cipher=excluded.config_cipher,updated_at=excluded.updated_at WHERE access_groups.generation<>excluded.generation").bind(session.generation,encrypted,now,session.generation,signature,session.generation,fleet.revision).run();
    if(!result.meta?.changes)fail(409,'Les accès ont changé pendant la reprise. Recharge les groupes.');clearAccessGroups(env);state={...next,revision:1};return json(snapshot());
  }
  if(!state)fail(409,'Le propriétaire doit initialiser les groupes.');if(data.revision!==state.revision)fail(409,'Les groupes ont changé. Recharge avant de réessayer.');
  const next=structuredClone(state),group=next.groups.find(group=>group.id===data.id),affected=new Set();delete next.members;
  const permit=policy=>{if(!canManagePolicy(session.user,policy,now))fail(403,'Ce changement dépasse les droits de tes groupes.');};
  const name=()=>{const value=typeof data.name==='string'?data.name.trim():'';if(!value||value.length>100)fail(400,'Nom de groupe invalide.');if(next.groups.some(row=>(operation!=='rename'||row.id!==data.id)&&row.name.toLocaleLowerCase()===value.toLocaleLowerCase()))fail(409,'Ce nom existe déjà.');return value;};
  const validUser=id=>{const user=registered.find(row=>row.id===id);if(!user||user.role==='admin')fail(409,'Le propriétaire ne peut pas être affecté à un groupe.');return user;};
  if(operation==='prepare'){
    if(session.user.role!=='admin')fail(403,'Le propriétaire doit préparer les groupes d’accès.');if(!fleet)fail(409,'Initialise les sections de postes avant les groupes d’accès.');if(ready())return json(snapshot());
    const presets=accessPresets(fleet).map(group=>({...group,...(state.groups.find(row=>row.id===group.id)?.includedGroupIds?{includedGroupIds:state.groups.find(row=>row.id===group.id).includedGroupIds}:{})})),used=new Set(presets.map(group=>group.name.toLocaleLowerCase()));for(const existing of next.groups.filter(group=>!group.preset&&group.id!=='default')){let base=existing.name,index=2;while(used.has(existing.name.toLocaleLowerCase()))existing.name=base+'_conserve_'+index++;used.add(existing.name.toLocaleLowerCase());presets.push(existing);}next.groups=presets;next.memberships=Object.fromEntries(registered.filter(user=>user.role!=='admin').map(user=>[user.id,membershipIds(state,user.id).filter(id=>id!=='default')]));next.model=2;
  }else if(operation==='memberships'){
    validUser(data.userId);if(!Array.isArray(data.groupIds)||data.groupIds.length>256)fail(400,'Liste de groupes invalide.');const ids=[...new Set(data.groupIds)];if(ids.some(id=>typeof id!=='string'||!next.groups.some(group=>group.id===id)))fail(409,'Un groupe a changé. Recharge les droits.');for(const id of new Set([...(next.memberships[data.userId]||[]),...ids]))permit(next.groups.find(group=>group.id===id).policy);next.memberships[data.userId]=ids;affected.add(data.userId);
  }else if(operation==='create'||operation==='duplicate'){
    if(next.groups.length>=512)fail(409,'Maximum 512 groupes d’autorisations.');if(operation==='duplicate'&&!group)fail(404,'Groupe introuvable.');const policy=operation==='duplicate'?group.policy:guest();permit(policy);next.groups.push({id:'access-'+crypto.randomUUID(),name:name(),policy});
  }else{
    if(!group)fail(404,'Groupe introuvable.');permit(group.policy);
    if(operation==='assign'||operation==='unassign'){if(!Array.isArray(data.userIds)||!data.userIds.length||data.userIds.length>100)fail(400,'Sélection de comptes invalide.');for(const id of new Set(data.userIds)){validUser(id);const current=new Set(next.memberships[id]||[]);operation==='assign'?current.add(group.id):current.delete(group.id);next.memberships[id]=[...current];affected.add(id);}}
    else if(operation==='nest'||operation==='unnest'){
      if(!Array.isArray(data.groupIds)||!data.groupIds.length||data.groupIds.length>256||data.groupIds.some(id=>typeof id!=='string'||!next.groups.some(row=>row.id===id)))fail(400,'Sélection de groupes invalide.');
      const children=new Set(group.includedGroupIds||[]);for(const id of data.groupIds){permit(next.groups.find(row=>row.id===id).policy);operation==='nest'?children.add(id):children.delete(id);}group.includedGroupIds=[...children];
    }
    else if(group.preset)fail(409,'Ce groupe automatique suit sa section et ne peut pas être modifié manuellement.');
    else if(operation==='rename')group.name=name();
    else if(operation==='policy'){let policy;try{policy=normalizePolicy(data.policy);}catch(error){fail(400,error.message);}if(policy.groupLevels===undefined||data.policy?.agentLevels!==undefined||policy.agents!==null)fail(400,'Les accès aux postes doivent être définis par section.');if(Object.keys(policy.groupLevels).some(id=>!fleet.groups.some(section=>section.id===id)))fail(409,'Une section de postes a changé. Recharge les droits.');permit(policy);group.policy=policy;for(const [id,ids]of Object.entries(next.memberships))if(ids.includes(group.id))affected.add(id);}
    else if(operation==='remove'){if(Object.values(next.memberships).some(ids=>ids.includes(group.id))||group.includedGroupIds?.length||next.groups.some(row=>row.includedGroupIds?.includes(group.id)))fail(409,'Retire les membres et les appartenances de ce groupe avant de le supprimer.');next.groups=next.groups.filter(row=>row.id!==group.id);}
    else fail(404,'Action de groupe inconnue.');
  }
  try{validateGroupNesting(next);}catch(error){fail(400,error.message);}
  if(operation!=='prepare'){
    // Changing a child affects its parents' rights too. Delegation must cover
    // every old/new ancestor, even when the child itself has no permissions.
    const touched=[...new Set([data.id,...(data.groupIds||[]),...(data.userId?membershipIds(state,data.userId):[])].filter(Boolean))];
    for(const config of [state,next])for(const id of groupClosure(config,touched))permit(config.groups.find(row=>row.id===id).policy);
  }
  for(const user of registered.filter(row=>row.role!=='admin')){
    const signature=config=>effectiveGroupIds(config,user.id).sort().map(id=>[id,config.groups.find(group=>group.id===id).policy]);
    if(JSON.stringify(signature(state))!==JSON.stringify(signature(next))){
      for(const config of [state,next]){const ids=new Set(effectiveGroupIds(config,user.id));permit(combinedPolicy(config.groups.filter(group=>ids.has(group.id)),now));}
      affected.add(user.id);
    }
  }
  const before=id=>membershipIds(state,id),after=id=>next.memberships[id]||[],auditId=random(16),details={kind:'access-group',actor:session.user.username,user:operation==='prepare'?'Groupes par section':group?.name||data.userId||next.groups.at(-1)?.name||'',revision:state.revision+1,operation,count:affected.size,reason:typeof data.reason==='string'?data.reason.trim().slice(0,500):'',...(operation==='policy'?{beforePolicy:state.groups.find(row=>row.id===data.id).policy,afterPolicy:group.policy}:{}),...(['assign','unassign','memberships'].includes(operation)?{members:[...affected].map(id=>({id,before:before(id),after:after(id)}))}:{})};
  const result=await env.DB.batch([env.DB.prepare('UPDATE access_groups SET config_cipher=?,revision=revision+1,updated_at=? WHERE id=1 AND generation=? AND revision=? AND EXISTS(SELECT 1 FROM sessions WHERE token_hash=?)').bind(await encode(next),now,session.generation,state.revision,session.hash),env.DB.prepare('INSERT INTO permission_audit(id,created_at,details_cipher) SELECT ?,?,? WHERE changes()=1').bind(auditId,now,await seal(details,'WolfGuard permissions audit v1:'+auditId,env)),env.DB.prepare('UPDATE users SET permission_revision=permission_revision+1,code_version=code_version+1,updated_at=? WHERE id IN (SELECT value FROM json_each(?)) AND EXISTS(SELECT 1 FROM permission_audit WHERE id=?)').bind(now,JSON.stringify([...affected]),auditId)]);
  if(!result[0]?.meta?.changes)fail(409,'Les groupes ont changé. Recharge avant de réessayer.');clearAccessGroups(env);state={...next,revision:state.revision+1};for(const id of affected)await revokeUserSessions(env,id,now);return json({...snapshot(),reconnect:affected.has(session.user.id)});
  async function encode(config){if(new TextEncoder().encode(JSON.stringify(config)).length>1000000)fail(413,'La configuration des groupes est trop volumineuse.');return seal(config,'WolfGuard access groups v1',env);}
}
