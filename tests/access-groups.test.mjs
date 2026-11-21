import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './endpoint-fixture.mjs';
import {profilePolicy} from '../server/lib/wolfguard/permissions.mjs';
import {open,seal} from '../server/lib/wolfguard/access.mjs';

test('section access groups combine, default to invisible and preserve previous policies',async()=>{
  const s=await setup();try{
    await s.initialize();s.owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const first=await s.createMember('first-group@example.test','12345678',s.owner.token),second=await s.createMember('second-group@example.test','12345679',s.owner.token);
    for(const member of [first,second])assert.equal((await s.api('users/permissions',{id:member.user.id,revision:1,policy:profilePolicy('observer')},s.owner.token)).status,200);
    assert.equal((await s.api('agents/groups/bootstrap',{legacy:{}},s.owner.token)).status,200);
    let response=await s.api('users/groups/bootstrap',{},s.owner.token);assert.equal(response.status,200,await response.clone().text());let state=await response.json();
    assert.equal(state.prepared,true);assert.ok(state.groups.some(group=>group.name==='GG_Acces_Application_administrateur'));
    const memoRead=state.groups.find(group=>group.name==='GG_Acces_Memo_lecture'),vaultWrite=state.groups.find(group=>group.name==='GG_Acces_Coffre_fort_ecriture');assert.ok(memoRead&&vaultWrite);
    const preserved=state.groups.find(group=>group.memberIds.includes(first.user.id));assert.equal(preserved.name,'GG_Acces_conserve');assert.ok(preserved.memberIds.includes(second.user.id));
    let firstAuth=await s.login('first-group@example.test','12345678'),secondAuth=await s.login('second-group@example.test','12345679');assert.equal(firstAuth.user.permissions.sections.library,'read');
    response=await s.api('users/groups/memberships',{userId:first.user.id,groupIds:[memoRead.id,vaultWrite.id],revision:state.revision-1},s.owner.token);assert.equal(response.status,409);
    response=await s.api('users/groups/memberships',{userId:first.user.id,groupIds:[memoRead.id,vaultWrite.id],revision:state.revision},s.owner.token);assert.equal(response.status,200,await response.clone().text());state=await response.json();
    assert.equal((await s.api('me',undefined,firstAuth.token)).status,401);assert.equal((await s.api('me',undefined,secondAuth.token)).status,200);
    firstAuth=await s.login('first-group@example.test','12345678');assert.equal(firstAuth.user.permissions.sections.library,'read');assert.equal(firstAuth.user.permissions.sections.vault,'write');assert.equal(firstAuth.user.permissions.sections.agents,'deny');assert.deepEqual(new Set(firstAuth.user.permissions.accessGroup.ids),new Set([memoRead.id,vaultWrite.id]));
    const policy={...profilePolicy('editor'),groupLevels:{ungrouped:'read'}};response=await s.api('users/groups/policy',{id:preserved.id,revision:state.revision,policy},s.owner.token);assert.equal(response.status,200);state=await response.json();assert.equal((await s.api('me',undefined,secondAuth.token)).status,401);
    const newer=await s.createMember('new-group@example.test','12345670',s.owner.token),newAuth=await s.login('new-group@example.test','12345670');assert.equal(newAuth.user.permissions.sections.library,'deny');assert.deepEqual(newAuth.user.permissions.accessGroup.ids,[]);
    response=await s.api('users/groups/assign',{id:memoRead.id,userIds:[newer.user.id],revision:state.revision},s.owner.token);assert.equal(response.status,200);state=await response.json();assert.ok(state.groups.find(group=>group.id===memoRead.id).memberIds.includes(newer.user.id));
    response=await s.api('users/groups/unassign',{id:memoRead.id,userIds:[newer.user.id],revision:state.revision},s.owner.token);assert.equal(response.status,200);state=await response.json();
    assert.equal((await s.api('users/groups/policy',{id:memoRead.id,revision:state.revision,policy},s.owner.token)).status,409,'automatic groups cannot be edited');
    assert.equal((await s.api('users/groups/remove',{id:memoRead.id,revision:state.revision},s.owner.token)).status,409,'automatic groups follow their section');
    const vault=await s.api('vault',undefined,firstAuth.token);assert.equal(vault.status,200);assert.equal(firstAuth.user.vaultHome.id,'vault-user-'+first.user.id);
    const disk=JSON.stringify(s.env.DB.db.prepare('SELECT * FROM access_groups').all());assert.equal(disk.includes('GG_Acces_Memo_lecture'),false);assert.equal(disk.includes(first.user.id),false);
    const audit=await(await s.api('users/permissions/audit',undefined,s.owner.token)).json();assert.ok(audit.events.some(event=>event.kind==='access-group'&&event.operation==='memberships'));
  }finally{s.env.DB.db.close();}
});

test('existing single memberships upgrade once to cumulative section groups',async()=>{
  const s=await setup();try{
    await s.initialize();s.owner=await s.login('cantin.bruno@gmx.fr','09876543');const member=await s.createMember('legacy-groups@example.test','12345678',s.owner.token);
    assert.equal((await s.api('agents/groups/bootstrap',{legacy:{}},s.owner.token)).status,200);let state=await(await s.api('users/groups/bootstrap',{},s.owner.token)).json();const preserved=state.groups.find(group=>group.memberIds.includes(member.user.id));
    const row=s.env.DB.db.prepare('SELECT * FROM access_groups WHERE id=1').get(),legacy=await open(row.config_cipher,'WolfGuard access groups v1',s.env);legacy.members={[member.user.id]:preserved.id};delete legacy.memberships;delete legacy.model;legacy.groups=[{id:'default',name:'Invités',policy:profilePolicy('guest')},preserved];
    s.env.DB.db.prepare('UPDATE access_groups SET config_cipher=? WHERE id=1').run(await seal(legacy,'WolfGuard access groups v1',s.env));state=await(await s.api('users/groups',undefined,s.owner.token)).json();assert.equal(state.prepared,false);
    let response=await s.api('users/groups/prepare',{revision:state.revision},s.owner.token);assert.equal(response.status,200,await response.clone().text());state=await response.json();assert.equal(state.prepared,true);assert.ok(state.groups.find(group=>group.id===preserved.id).memberIds.includes(member.user.id));assert.ok(state.groups.some(group=>group.name==='GG_Acces_Memo_ecriture'));
    const revision=state.revision;state=await(await s.api('users/groups/prepare',{revision},s.owner.token)).json();assert.equal(state.revision,revision);
  }finally{s.env.DB.db.close();}
});
