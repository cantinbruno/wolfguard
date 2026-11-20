import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './endpoint-fixture.mjs';
import {profilePolicy} from '../server/lib/wolfguard/permissions.mjs';

test('shared authorization groups replace individual policies, revoke all members and preserve vault isolation',async()=>{
  const s=await setup();try{
    await s.initialize();s.owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const first=await s.createMember('first-group@example.test','12345678',s.owner.token),second=await s.createMember('second-group@example.test','12345679',s.owner.token);
    for(const member of [first,second])assert.equal((await s.api('users/permissions',{id:member.user.id,revision:1,policy:profilePolicy('observer')},s.owner.token)).status,200);
    assert.equal((await s.api('agents/groups/bootstrap',{legacy:{}},s.owner.token)).status,200);
    let response=await s.api('users/groups/bootstrap',{},s.owner.token);assert.equal(response.status,200,await response.clone().text());let state=await response.json();
    const old=state.groups.find(group=>group.memberIds.includes(first.user.id));assert.ok(old.memberIds.includes(second.user.id),'identical old rights form one shared group');
    s.env.DB.db.prepare('UPDATE users SET permissions_cipher=? WHERE id=?').run('obsolete-individual-policy-is-ignored',first.user.id);
    let firstAuth=await s.login('first-group@example.test','12345678'),secondAuth=await s.login('second-group@example.test','12345679');
    assert.equal(firstAuth.user.permissions.sections.library,'read');assert.equal(firstAuth.user.permissions.accessGroup.id,old.id);
    assert.equal((await s.api('users/permissions',{id:first.user.id,revision:2,policy:profilePolicy('admin')},s.owner.token)).status,409);
    const policy={...profilePolicy('editor'),groupLevels:{ungrouped:'read'}};
    response=await s.api('users/groups/policy',{id:old.id,revision:state.revision,policy},s.owner.token);assert.equal(response.status,200,await response.clone().text());state=await response.json();
    for(const auth of [firstAuth,secondAuth])assert.equal((await s.api('me',undefined,auth.token)).status,401,'every member loses old sessions');
    firstAuth=await s.login('first-group@example.test','12345678');secondAuth=await s.login('second-group@example.test','12345679');
    for(const auth of [firstAuth,secondAuth])assert.equal(auth.user.permissions.sections.library,'write');
    assert.equal((await s.api('users/groups/create',{name:'Escalation',revision:state.revision},firstAuth.token)).status,403);
    response=await s.api('users/groups/create',{name:'Support',revision:state.revision},s.owner.token);assert.equal(response.status,200);state=await response.json();const support=state.groups.find(group=>group.name==='Support');
    assert.equal((await s.api('users/groups/assign',{id:support.id,userIds:[first.user.id],revision:state.revision-1},s.owner.token)).status,409);
    response=await s.api('users/groups/assign',{id:support.id,userIds:[first.user.id],revision:state.revision},s.owner.token);assert.equal(response.status,200);state=await response.json();
    assert.equal((await s.api('me',undefined,firstAuth.token)).status,401);assert.equal((await s.api('me',undefined,secondAuth.token)).status,200,'other group remains connected');
    firstAuth=await s.login('first-group@example.test','12345678');assert.equal(firstAuth.user.permissions.sections.library,'deny');
    assert.equal((await s.api('users/groups/assign',{id:support.id,userIds:[s.owner.user.id],revision:state.revision},s.owner.token)).status,409);
    assert.equal((await s.api('users/groups/remove',{id:support.id,revision:state.revision},s.owner.token)).status,409,'occupied group cannot disappear');
    assert.equal((await s.api('users/groups/policy',{id:'default',revision:state.revision,policy},s.owner.token)).status,409,'initial invitations stay without rights');
    const newer=await s.createMember('new-group@example.test','12345670',s.owner.token);state=await(await s.api('users/groups',undefined,s.owner.token)).json();assert.ok(state.groups.find(group=>group.id==='default').memberIds.includes(newer.user.id));
    response=await s.api('users/groups/duplicate',{id:old.id,name:'Copie',revision:state.revision},s.owner.token);assert.equal(response.status,200);state=await response.json();const copy=state.groups.find(group=>group.name==='Copie');assert.equal(copy.memberIds.length,0);assert.equal(copy.policy.sections.library,'write');
    response=await s.api('users/groups/policy',{id:old.id,revision:state.revision,policy:{...profilePolicy('admin'),groupLevels:{}}},s.owner.token);assert.equal(response.status,200);
    secondAuth=await s.login('second-group@example.test','12345679');
    const vault=await s.api('vault',undefined,secondAuth.token);assert.equal(vault.status,200);assert.equal(secondAuth.user.vaultHome.id,'vault-user-'+second.user.id);assert.notEqual(secondAuth.user.vaultHome.id,firstAuth.user.vaultHome.id);
    const disk=JSON.stringify(s.env.DB.db.prepare('SELECT * FROM access_groups').all());assert.equal(disk.includes('Support'),false);assert.equal(disk.includes(first.user.id),false);
    const audit=await(await s.api('users/permissions/audit',undefined,s.owner.token)).json();assert.ok(audit.events.some(event=>event.kind==='access-group'&&event.operation==='policy'&&event.count===2));
  }finally{s.env.DB.db.close();}
});
