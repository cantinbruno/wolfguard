import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './endpoint-fixture.mjs';
import {profilePolicy} from '../server/lib/wolfguard/permissions.mjs';
const native=(now,extra={})=>({collectedAt:now,platform:'win32',provider:'Microsoft Defender',supported:true,canEnforce:true,antivirus:'enabled',realtime:'enabled',firewall:'enabled',signatures:'enabled',events:[],...extra});
const antivirus=now=>({version:1,capable:true,installed:true,enabled:true,state:'ready',engineVersion:'ClamAV fixture',signatureVersion:'123',signatureAt:now,quarantine:[],scope:['C:\\Users\\Fixture\\Downloads']});
async function fixture(){
  const s=await setup();await s.initialize();s.owner=await s.login('cantin.bruno@gmx.fr','09876543');
  const ticket=await(await s.api('agents/pair',{},s.owner.token)).json();s.agent=await(await s.api('agent/enroll',{code:ticket.code,name:'Antivirus fixture',platform:'win32'})).json();
  s.agentAPI=(route,data)=>s.api('agent/'+route,data,null,{Authorization:'Agent '+s.agent.token});
  await s.agentAPI('poll',{capabilities:['endpoint-protection-v1']});
  s.report=(extra={})=>s.agentAPI('edr/report',native(s.clock(),extra));
  return s;
}
test('own-engine commands require new telemetry and are never leased to a legacy reporter',async()=>{
  const s=await fixture();try{
    assert.equal((await s.api('edr/command',{agentId:s.agent.id,action:'av-install'},s.owner.token)).status,409);
    await s.report({wolfguardAntivirus:antivirus(s.clock())});
    for(const action of ['av-restore:../etc','av-delete:'+('x'.repeat(32)),'av-shell'])assert.equal((await s.api('edr/command',{agentId:s.agent.id,action},s.owner.token)).status,400);
    const queued=await s.api('edr/command',{agentId:s.agent.id,action:'av-install'},s.owner.token);assert.equal(queued.status,201);
    assert.equal((await(await s.report()).json()).command,null);
    const own=await(await s.report({canEnforce:false,wolfguardAntivirus:antivirus(s.clock())})).json();assert.equal(own.command.action,'av-install');
    assert.equal((await s.agentAPI('edr/result',{id:own.command.id,lease:own.command.lease,ok:true,message:'Fixture installed'})).status,200);
    const rows=await(await s.api('edr',undefined,s.owner.token)).json();assert.equal(rows.endpoints[0].snapshot.wolfguardAntivirus.engineVersion,'ClamAV fixture');assert.equal(rows.endpoints[0].snapshot.provider,'Microsoft Defender');
  }finally{s.env.DB.db.close();}
});
test('pause cancels running antivirus work and the old lease cannot record a success',async()=>{
  const s=await fixture();try{
    await s.report({wolfguardAntivirus:antivirus(s.clock())});await s.api('edr/command',{agentId:s.agent.id,action:'av-scan'},s.owner.token);
    const first=(await(await s.report({wolfguardAntivirus:antivirus(s.clock())})).json()).command;
    assert.equal((await s.api('edr/command',{agentId:s.agent.id,action:'av-pause'},s.owner.token)).status,201);
    const cancelled=await(await s.report({wolfguardAntivirus:{...antivirus(s.clock()),commandId:first.id}})).json();assert.equal(cancelled.command,null);assert.equal(cancelled.cancelCommand,first.id);
    assert.equal((await s.agentAPI('edr/result',{id:first.id,lease:first.lease,ok:true})).status,409);
    const pause=(await(await s.report({wolfguardAntivirus:antivirus(s.clock())})).json()).command;assert.equal(pause.action,'av-pause');
  }finally{s.env.DB.db.close();}
});
test('per-post read rights cannot restore files and a revoked issuer cannot complete a running scan',async()=>{
  const s=await fixture();try{
    await s.report({wolfguardAntivirus:antivirus(s.clock())});
    const added=await s.createMember('antivirus-manager@example.test','12345678',s.owner.token),policy=profilePolicy('endpoint-manager');
    policy.agentLevels={[s.agent.id]:'read'};
    await s.api('users/permissions',{id:added.user.id,revision:1,policy},s.owner.token);
    let manager=await s.login('antivirus-manager@example.test','12345678');
    assert.equal((await s.api('edr/command',{agentId:s.agent.id,action:'av-restore:'+('a'.repeat(32))},manager.token)).status,403);
    policy.agentLevels={[s.agent.id]:'write'};await s.api('users/permissions',{id:added.user.id,revision:2,policy},s.owner.token);manager=await s.login('antivirus-manager@example.test','12345678');
    assert.equal((await s.api('edr/command',{agentId:s.agent.id,action:'av-scan'},manager.token)).status,201);
    const command=(await(await s.report({wolfguardAntivirus:antivirus(s.clock())})).json()).command;assert.equal(command.action,'av-scan');
    policy.agentLevels={[s.agent.id]:'deny'};await s.api('users/permissions',{id:added.user.id,revision:3,policy},s.owner.token);
    const report=await(await s.report({wolfguardAntivirus:{...antivirus(s.clock()),commandId:command.id}})).json();assert.equal(report.command,null);assert.equal(report.cancelCommand,command.id);
    assert.equal((await s.agentAPI('edr/result',{id:command.id,lease:command.lease,ok:true})).status,409);
  }finally{s.env.DB.db.close();}
});
test('expired antivirus work is cancelled during reporting and malformed quarantine states are refused',async()=>{
  const s=await fixture();try{
    await s.report({wolfguardAntivirus:antivirus(s.clock())});await s.api('edr/command',{agentId:s.agent.id,action:'av-update'},s.owner.token);
    const command=(await(await s.report({wolfguardAntivirus:antivirus(s.clock())})).json()).command;s.advance(16*60000);
    const report=await(await s.report({wolfguardAntivirus:{...antivirus(s.clock()),commandId:command.id}})).json();assert.equal(report.cancelCommand,command.id);assert.equal(report.command,null);
    assert.equal((await s.report({wolfguardAntivirus:{...antivirus(s.clock()),quarantine:[{id:'../escape',status:'quarantined'}]}})).status,400);
  }finally{s.env.DB.db.close();}
});
