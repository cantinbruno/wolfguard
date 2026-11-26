import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './endpoint-fixture.mjs';
import {can,canRecord,normalizePolicy,profilePolicy,recordLevel,canManagePolicy} from '../server/lib/wolfguard/permissions.mjs';

async function fixture(){
  const s=await setup();await s.initialize();s.owner=await s.login('cantin.bruno@gmx.fr','09876543');
  const member=await s.createMember('nested@example.test','12345678',s.owner.token),other=await s.createMember('other@example.test','12345679',s.owner.token);
  await s.api('agents/groups/bootstrap',{legacy:{}},s.owner.token);let state=await(await s.api('users/groups/bootstrap',{},s.owner.token)).json();
  async function change(operation,value){const response=await s.api('users/groups/'+operation,{...value,revision:state.revision},s.owner.token);assert.equal(response.status,200,await response.clone().text());state=await response.json();return state;}
  async function create(name,policy){await change('create',{name});const group=state.groups.find(group=>group.name===name);if(policy)await change('policy',{id:group.id,policy});return group;}
  for(const account of [member,other])await change('memberships',{userId:account.user.id,groupIds:[]});
  return {...s,member,other,change,create,state:()=>state,loginMember:()=>s.login('nested@example.test','12345678')};
}
const blank=()=>({...profilePolicy('guest'),groupLevels:{}});

test('action rules are validated, explicit refusals override grants and only the owner bypasses refusals',()=>{
  const policy={...profilePolicy('admin'),actionRules:{'library.delete':'deny','users.reset':'deny'}};
  const user={role:'member',permissions:normalizePolicy(policy)};
  assert.equal(can(user,'library.edit'),true);assert.equal(can(user,'library.delete'),false);assert.equal(can(user,'users.reset'),false);
  assert.equal(can({...user,role:'admin'},'library.delete'),true);
  assert.equal(canManagePolicy(user,profilePolicy('admin')),false);
  for(const rules of [{'users.unknown':'allow'},{'users.read':'write'},{'vault.all':'allow'},[]])assert.throws(()=>normalizePolicy({...blank(),actionRules:rules}));
  const precise={...blank(),actionRules:{'library.read':'allow','library.edit':'allow'}};
  assert.equal(can({permissions:precise},'library.write'),true);assert.equal(can({permissions:precise},'library.create'),false);assert.equal(can({permissions:precise},'library.delete'),false);
  assert.equal(can({permissions:{...blank(),actionRules:{'users.manage':'allow'}}},'users.reset'),true,'old management grants retain their operations');
});

test('nested business groups inherit resource rights, reject cycles and revoke all indirect members',async()=>{
  const s=await fixture();try{
    const team=await s.create('GG_Equipe_Techniciens'),site=await s.create('GG_Equipe_Paris'),read=s.state().groups.find(group=>group.name==='GG_Acces_Memo_lecture');
    await s.change('assign',{id:team.id,userIds:[s.member.user.id]});await s.change('nest',{id:site.id,groupIds:[team.id]});await s.change('nest',{id:read.id,groupIds:[site.id]});
    const auth=await s.loginMember(),other=await s.login('other@example.test','12345679');
    assert.equal(can(auth.user,'library.read'),true);assert.equal(can(auth.user,'library.edit'),false);
    assert.deepEqual(auth.user.permissions.accessGroup.directIds,[team.id]);assert.ok(auth.user.permissions.accessGroup.inheritedIds.includes(read.id));
    const resource=s.state().groups.find(group=>group.id===read.id);assert.deepEqual(resource.memberIds,[]);assert.deepEqual(resource.effectiveMemberIds,[s.member.user.id]);
    let response=await s.api('users/groups/nest',{id:team.id,groupIds:[read.id],revision:s.state().revision},s.owner.token);assert.equal(response.status,400);
    response=await s.api('users/groups/nest',{id:team.id,groupIds:[team.id],revision:s.state().revision},s.owner.token);assert.equal(response.status,400);
    response=await s.api('users/groups/nest',{id:read.id,groupIds:[team.id],revision:s.state().revision-1},s.owner.token);assert.equal(response.status,409);
    const effective=await(await s.api('users/groups/effective?userId='+s.member.user.id,undefined,s.owner.token)).json();
    assert.ok(effective.groups.some(group=>group.id===read.id&&!group.direct));assert.equal(effective.actions.find(action=>action.key==='library.read').allowed,true);
    await s.change('unnest',{id:read.id,groupIds:[site.id]});
    assert.equal((await s.api('me',undefined,auth.token)).status,401);assert.equal((await s.api('me',undefined,other.token)).status,200);
    assert.equal(can((await s.loginMember()).user,'library.read'),false);
    assert.equal((await s.api('me',undefined,s.owner.token)).status,200);
    assert.equal((await s.api('users/groups/remove',{id:team.id,revision:s.state().revision},s.owner.token)).status,409,'nested/occupied groups are protected');
  }finally{s.env.DB.db.close();}
});

test('refusals survive multiple groups, apply to the API and appear with their source in effective rights',async()=>{
  const s=await fixture();try{
    const team=await s.create('GG_Team'),deny=await s.create('GG_Sans_creation',{...blank(),actionRules:{'users.create':'deny'}}),write=s.state().groups.find(group=>group.name==='GG_Acces_Utilisateurs_et_droits_ecriture');
    await s.change('assign',{id:team.id,userIds:[s.member.user.id]});await s.change('nest',{id:write.id,groupIds:[team.id]});await s.change('nest',{id:deny.id,groupIds:[team.id]});
    let auth=await s.loginMember();assert.equal(can(auth.user,'users.create'),false);assert.equal(can(auth.user,'users.reset'),true);
    assert.equal((await s.api('users/create',{username:'forged@example.test'},auth.token)).status,403);
    const effective=await(await s.api('users/groups/effective?userId='+s.member.user.id,undefined,s.owner.token)).json(),action=effective.actions.find(action=>action.key==='users.create');
    assert.equal(action.allowed,false);assert.equal(action.denied,true);assert.ok(action.sources.some(source=>source.id===deny.id&&source.effect==='deny'));
    await s.change('policy',{id:deny.id,policy:{...blank(),actionRules:{'users.reset':'deny'}}});
    assert.equal((await s.api('me',undefined,auth.token)).status,401,'indirect policy changes revoke every member');auth=await s.loginMember();assert.equal(can(auth.user,'users.create'),true);assert.equal(can(auth.user,'users.reset'),false);
  }finally{s.env.DB.db.close();}
});

test('account creation can be delegated without deletion, resets, disabling or rights management',async()=>{
  const s=await fixture();try{
    const create=s.state().groups.find(group=>group.action==='users.create');assert.ok(create);
    await s.change('memberships',{userId:s.member.user.id,groupIds:[create.id]});const auth=await s.loginMember();
    assert.equal((await s.api('users',undefined,auth.token)).status,200);
    const response=await s.api('users/create',{username:'invited-by-team@example.test'},auth.token);assert.equal(response.status,201,await response.clone().text());
    for(const route of ['delete','reset-code','reset-otp','disconnect'])assert.equal((await s.api('users/'+route,{id:s.other.user.id},auth.token)).status,403,route);
    assert.equal((await s.api('users/update',{id:s.other.user.id,username:'other@example.test',disabled:true},auth.token)).status,403);
    assert.equal((await s.api('users/update',{id:s.other.user.id,username:'renamed@example.test',disabled:false},auth.token)).status,403);
    assert.equal((await s.api('users/groups',undefined,auth.token)).status,403);
  }finally{s.env.DB.db.close();}
});

test('delegation checks every ancestor so an empty nested group cannot escalate privileges',async()=>{
  const s=await fixture();try{
    const team=await s.create('GG_Protected_Child'),admin=s.state().groups.find(group=>group.presetKind==='admin'),rights=s.state().groups.find(group=>group.action==='users.permissions');
    await s.change('nest',{id:admin.id,groupIds:[team.id]});await s.change('memberships',{userId:s.member.user.id,groupIds:[rights.id]});const auth=await s.loginMember();
    assert.equal((await s.api('users/groups/assign',{id:team.id,userIds:[s.other.user.id],revision:s.state().revision},auth.token)).status,403);
    assert.equal((await s.api('users/groups/memberships',{userId:s.other.user.id,groupIds:[team.id],revision:s.state().revision},auth.token)).status,403);
    assert.equal((await s.api('users/groups/nest',{id:team.id,groupIds:[rights.id],revision:s.state().revision},auth.token)).status,403);
    const snapshot=await(await s.api('users/groups',undefined,auth.token)).json();assert.equal(snapshot.groups.some(group=>group.id===team.id),false);
  }finally{s.env.DB.db.close();}
});

test('combining an unrelated group preserves inherited folder restrictions without exposing hidden data',async()=>{
  const s=await fixture();try{
    const scoped=normalizePolicy({version:1,grants:['library.read','library.edit'],agents:null,expiresAt:null,scopes:{library:{mode:'selected',folders:{team:'write'},items:{}},vault:{mode:'selected',folders:{},items:{}}}});
    scoped.groupLevels={};const group=await s.create('GG_Dossier_Equipe',scoped),tools=s.state().groups.find(group=>group.action==='tools.use');
    await s.change('memberships',{userId:s.member.user.id,groupIds:[group.id,tools.id]});const auth=await s.loginMember();
    const folders=[{id:'team',section:'library',parentId:null},{id:'private',section:'library',parentId:null}];
    assert.equal(recordLevel(auth.user,{id:'visible',folderId:'team'},'items',folders),'write');
    assert.equal(recordLevel(auth.user,{id:'hidden',folderId:'private'},'items',folders),'deny');
    assert.equal(canManagePolicy(auth.user,{...blank(),sections:{...blank().sections,library:'write'}}),false,'restricted folder grants cannot delegate an unrestricted section');
    const creator=await s.create('GG_Creation_Libre',{...blank(),actionRules:{'library.read':'allow','library.create':'allow'}});
    await s.change('memberships',{userId:s.member.user.id,groupIds:[group.id,creator.id]});const combined=(await s.loginMember()).user;
    assert.equal(canRecord(combined,{id:'hidden',folderId:'private'},'items',folders,'create'),true);
    assert.equal(canRecord(combined,{id:'hidden',folderId:'private'},'items',folders,'edit'),false,'an unrestricted create grant must not broaden a scoped edit grant');
    assert.equal(canRecord(combined,{id:'visible',folderId:'team'},'items',folders,'edit'),true);
    const unscopedEditor={...blank(),actionRules:{'library.read':'allow','library.edit':'allow'}};
    assert.equal(canManagePolicy(combined,unscopedEditor),false);
  }finally{s.env.DB.db.close();}
});

test('remote modes, pairing and scan starts check precise actions instead of any write permission',async()=>{
  const s=await fixture();try{
    const ticket=await(await s.api('agents/pair',{},s.owner.token)).json(),agent=await(await s.api('agent/enroll',{code:ticket.code,name:'Permission fixture',platform:'win32'})).json();
    await s.api('agent/poll',{capabilities:['remote-consent-v1','remote-terminal-v1','remote-desktop-v1','remote-files-v1','network-scan-v3','network-target-v1']},null,{Authorization:'Agent '+agent.token});
    const policy={...blank(),groupLevels:{ungrouped:'write'},actionRules:{'agents.read':'allow','agents.revoke':'allow','remote.read':'allow','remote.terminal':'allow','scan.active.read':'allow','scan.active.cancel':'allow'}};
    const group=await s.create('GG_Terminal_Seulement',policy);await s.change('memberships',{userId:s.member.user.id,groupIds:[group.id]});const auth=await s.loginMember();
    assert.equal((await s.api('agents/pair',{},auth.token)).status,403,'revoking an agent does not grant pairing');
    assert.equal((await s.api('scans',{agentId:agent.id,strategy:'active',target:'192.0.2.9',ports:'443'},auth.token)).status,403,'scan cancellation does not grant scan execution');
    for(const mode of ['desktop','files'])assert.equal((await s.api('remote/start',{agentId:agent.id,mode},auth.token)).status,403,mode);
    const response=await s.api('remote/start',{agentId:agent.id,mode:'terminal'},auth.token);assert.equal(response.status,201,await response.clone().text());
  }finally{s.env.DB.db.close();}
});

test('automatic resource groups retain nesting when fleet sections are synchronized',async()=>{
  const s=await fixture();try{
    const team=await s.create('GG_Operations'),read=s.state().groups.find(group=>group.name==='GG_Acces_Memo_lecture');
    await s.change('nest',{id:read.id,groupIds:[team.id]});await s.change('assign',{id:team.id,userIds:[s.member.user.id]});
    const fleet=await(await s.api('agents/groups',undefined,s.owner.token)).json();assert.equal((await s.api('agents/groups/create',{revision:fleet.revision,name:'Atelier'},s.owner.token)).status,200);
    const state=await(await s.api('users/groups',undefined,s.owner.token)).json();assert.deepEqual(state.groups.find(group=>group.id===read.id).includedGroupIds,[team.id]);assert.equal(can((await s.loginMember()).user,'library.read'),true);
  }finally{s.env.DB.db.close();}
});
