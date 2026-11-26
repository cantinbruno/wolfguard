import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './endpoint-fixture.mjs';
import {profilePolicy,canAgent,normalizePolicy,canManagePolicy} from '../server/lib/wolfguard/permissions.mjs';
import {migrateFleet} from '../server/lib/wolfguard/fleet-groups.mjs';

const account=policy=>({role:'member',permissions:policy});
test('migration splits legacy groups without broadening scopes or reserved machine rights',()=>{
  const ids=['1','2','3','4'].map(value=>value.repeat(32)),users=[{id:'reader',role:'member',policy:{...profilePolicy('editor'),agents:[ids[0],ids[1]],agentLevels:{[ids[0]]:'read'}}},{id:'writer',role:'member',policy:profilePolicy('editor')}];
  const state=migrateFleet({groups:[{id:'atelier',name:'Atelier'}],assignments:Object.fromEntries(ids.map(id=>[id,'atelier']))},ids.map((id,index)=>({id,restricted:index===3})),users);
  assert.equal(state.groups.filter(group=>group.id!=='ungrouped').length,4);
  for(const user of users)for(const [index,id]of ids.entries()){
    const actual=state.grants[user.id][state.assignments[id]],expected=index===3?'deny':user.id==='writer'?'write':index===0?'read':index===1?'write':'deny';
    assert.equal(actual,expected);
  }
  assert.equal(state.grants.reader.ungrouped,'deny');assert.equal(state.grants.writer.ungrouped,'write');
});

test('group levels are deny by default, cannot forge assignments and bound delegated grants',()=>{
  const id='1'.repeat(32),policy={...profilePolicy('editor'),groupLevels:{atelier:'read'},agentGroups:{[id]:'atelier'}};
  assert.equal(canAgent(account(policy),id),true);assert.equal(canAgent(account(policy),id,Date.now(),'remote.terminal'),false);
  assert.equal(canAgent(account(policy),'2'.repeat(32)),false);
  assert.equal(normalizePolicy(policy).agentGroups,undefined);
  const manager={...profilePolicy('editor'),groupLevels:{atelier:'read'}};manager.sections.users='write';
  assert.equal(canManagePolicy(account(manager),{...profilePolicy('observer'),groupLevels:{atelier:'write'}}),false);
  assert.throws(()=>normalizePolicy({...policy,groupLevels:JSON.parse('{"__proto__":"write"}')}));
});

test('bootstrap refuses a concurrent permission edit without activating a partial migration',async()=>{
  const s=await setup();try{
    await s.initialize();s.owner=await s.login('cantin.bruno@gmx.fr','09876543');
    await s.createMember('concurrent-group@example.test','12345678',s.owner.token);
    const prepare=s.env.DB.prepare.bind(s.env.DB);let raced=false;
    s.env.DB.prepare=sql=>{if(!raced&&sql.startsWith('INSERT INTO fleet_groups')){raced=true;s.env.DB.db.exec("UPDATE users SET permission_revision=permission_revision+1 WHERE role='member'");}return prepare(sql);};
    const response=await s.api('agents/groups/bootstrap',{legacy:{}},s.owner.token);assert.equal(response.status,409,await response.clone().text());
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) count FROM fleet_groups').get().count,0);
    const retry=await s.api('agents/groups/bootstrap',{legacy:{}},s.owner.token);assert.equal(retry.status,200);
  }finally{s.env.DB.db.close();}
});

test('machine sections create, rename and remove their read/write access groups',async()=>{
  const s=await setup();try{
    await s.initialize();s.owner=await s.login('cantin.bruno@gmx.fr','09876543');const member=await s.createMember('section-groups@example.test','12345678',s.owner.token);
    let response=await s.api('agents/groups/bootstrap',{legacy:{}},s.owner.token);assert.equal(response.status,200);let fleet=await response.json();
    response=await s.api('users/groups/bootstrap',{},s.owner.token);assert.equal(response.status,200);let access=await response.json();assert.ok(access.groups.some(group=>group.name==='GG_Acces_Sans_section_lecture'));
    response=await s.api('agents/groups/create',{name:'Bureau Paris',revision:fleet.revision},s.owner.token);assert.equal(response.status,200,await response.clone().text());fleet=await response.json();const section=fleet.groups.find(group=>group.name==='Bureau Paris');
    access=await(await s.api('users/groups',undefined,s.owner.token)).json();let read=access.groups.find(group=>group.name==='GG_Acces_Bureau_Paris_lecture');assert.ok(read);assert.ok(access.groups.some(group=>group.name==='GG_Acces_Bureau_Paris_ecriture'));
    response=await s.api('users/groups/memberships',{userId:member.user.id,groupIds:[read.id],revision:access.revision},s.owner.token);assert.equal(response.status,200);let auth=await s.login('section-groups@example.test','12345678');
    response=await s.api('agents/groups/rename',{id:section.id,name:'Serveurs',revision:fleet.revision},s.owner.token);assert.equal(response.status,200);fleet=await response.json();access=await(await s.api('users/groups',undefined,s.owner.token)).json();assert.equal(access.groups.some(group=>group.name==='GG_Acces_Bureau_Paris_lecture'),false);read=access.groups.find(group=>group.name==='GG_Acces_Serveurs_lecture');assert.ok(read.memberIds.includes(member.user.id));
    response=await s.api('agents/groups/remove',{id:section.id,revision:fleet.revision},s.owner.token);assert.equal(response.status,200);access=await(await s.api('users/groups',undefined,s.owner.token)).json();assert.equal(access.groups.some(group=>group.name==='GG_Acces_Serveurs_lecture'),false);assert.equal((await s.api('me',undefined,auth.token)).status,401,'removing a section revokes members of its generated groups');
  }finally{s.env.DB.db.close();}
});

test('shared group CRUD and moves enforce access in direct APIs and cancel issued remote/scans',async()=>{
  const s=await setup();try{
    await s.initialize();s.owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const pair=async name=>{const ticket=await(await s.api('agents/pair',{},s.owner.token)).json();const result=await s.api('agent/enroll',{code:ticket.code,name,platform:'win32'});assert.equal(result.status,200);const agent=await result.json();await s.api('agent/poll',{capabilities:['remote-consent-v1','network-scan-v3','network-target-v1','remote-terminal-v1','endpoint-protection-v1']},null,{Authorization:'Agent '+agent.token});return agent;};
    const a=await pair('Synthetic A'),b=await pair('Synthetic B');
    const member=await s.createMember('group-reader@example.test','12345678',s.owner.token);
    const old={...profilePolicy('editor'),agents:[a.id],agentLevels:{[a.id]:'read'}};
    assert.equal((await s.api('users/permissions',{id:member.user.id,revision:1,policy:old},s.owner.token)).status,200);
    let auth=await s.login('group-reader@example.test','12345678');
    let response=await s.api('agents/groups/bootstrap',{legacy:{groups:[{id:'atelier',name:'Atelier'}],assignments:{[a.id]:'atelier',[b.id]:'atelier'}}},s.owner.token);assert.equal(response.status,200,await response.clone().text());
    let state=await response.json();const readGroup=state.assignments[a.id],hiddenGroup=state.assignments[b.id];assert.notEqual(readGroup,hiddenGroup);
    let visible=await(await s.api('agents',undefined,auth.token)).json();assert.deepEqual(visible.agents.map(row=>row.id),[a.id]);
    const groups=await(await s.api('agents/groups',undefined,auth.token)).json();assert.deepEqual(groups.groups.map(row=>row.id),[readGroup]);assert.equal(JSON.stringify(groups).includes(b.id),false);
    const me=await(await s.api('me',undefined,auth.token)).json();assert.equal(JSON.stringify(me).includes(b.id),false);
    assert.equal((await s.api('agents/groups/move',{ids:[b.id],target:readGroup,revision:state.revision},auth.token)).status,403);
    assert.equal((await s.api('scans',{agentId:a.id,strategy:'active',target:'192.0.2.9'},auth.token)).status,403);
    assert.equal((await s.api('remote/start',{agentId:a.id,mode:'terminal'},auth.token)).status,403);
    assert.equal((await s.api('edr/events?agentId='+b.id,undefined,auth.token)).status,403);
    assert.equal((await s.api('agents/restricted',{id:a.id,restricted:false},s.owner.token)).status,409);
    assert.equal((await s.api('users/permissions',{id:member.user.id,revision:2,policy:old},s.owner.token)).status,409,'old clients cannot restore individual rights');
    // New explicit group grants replace all legacy per-machine exceptions.
    const policy={...profilePolicy('editor'),groupLevels:{[readGroup]:'write',[hiddenGroup]:'deny'}};
    response=await s.api('users/permissions',{id:member.user.id,revision:2,policy},s.owner.token);assert.equal(response.status,200,await response.clone().text());
    assert.equal((await s.api('agents',undefined,auth.token)).status,401);auth=await s.login('group-reader@example.test','12345678');
    response=await s.api('scans',{agentId:a.id,strategy:'active',target:'192.0.2.9',ports:'443'},auth.token);assert.equal(response.status,201,await response.clone().text());
    const job=await response.json();
    response=await s.api('agents/groups/move',{ids:[a.id],target:hiddenGroup,revision:state.revision},s.owner.token);assert.equal(response.status,200,await response.clone().text());state=await response.json();
    assert.equal((await(await s.api('agents',undefined,auth.token)).json()).agents.length,0);
    assert.equal((await s.api('scans/result?id='+job.id,undefined,auth.token)).status,403);
    assert.equal(s.env.DB.db.prepare('SELECT status FROM scan_jobs WHERE id=?').get(job.id).status,'cancelled');
    assert.equal((await s.api('agents/groups/move',{ids:[a.id],target:readGroup,revision:state.revision-1},s.owner.token)).status,409);
    response=await s.api('agents/groups/move',{ids:[a.id],target:readGroup,revision:state.revision},s.owner.token);assert.equal(response.status,200);state=await response.json();
    response=await s.api('remote/start',{agentId:a.id,mode:'terminal'},auth.token);assert.equal(response.status,201,await response.clone().text());const remote=await response.json();
    response=await s.api('agents/groups/move',{ids:[a.id],target:hiddenGroup,revision:state.revision},s.owner.token);assert.equal(response.status,200);state=await response.json();
    assert.equal(s.env.DB.db.prepare('SELECT status FROM remote_sessions WHERE id=?').get(remote.id).status,'closed');
    response=await s.api('agents/groups/duplicate',{id:readGroup,name:'Atelier copie',revision:state.revision},s.owner.token);assert.equal(response.status,200);state=await response.json();
    const duplicate=state.groups.find(group=>group.name==='Atelier copie');assert.ok(duplicate);assert.ok(!Object.values(state.assignments).includes(duplicate.id));
    response=await s.api('agents/groups/rename',{id:duplicate.id,name:'Serveurs',revision:state.revision},s.owner.token);assert.equal(response.status,200);state=await response.json();
    response=await s.api('agents/groups/remove',{id:duplicate.id,revision:state.revision},s.owner.token);assert.equal(response.status,200);
    assert.equal(JSON.stringify(s.env.DB.db.prepare('SELECT * FROM fleet_groups').all()).includes('Atelier'),false,'metadata encrypted at rest');
    assert.equal((await s.api('agents/groups/create',{name:'No escalation',revision:state.revision},auth.token)).status,403);
  }finally{s.env.DB.db.close();}
});
