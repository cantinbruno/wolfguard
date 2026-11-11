import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './endpoint-fixture.mjs';
import {profilePolicy,can} from '../server/lib/wolfguard/permissions.mjs';
import {endpointSnapshot,endpointHealth} from '../server/lib/wolfguard/endpoint-spec.mjs';
import {collectEndpoint,executeEndpointAction,runEndpointProtection} from '../agent/endpoint.mjs';
import {collectPosixEndpoint} from '../agent/endpoint-posix.mjs';

const snapshot=(now,extra={})=>({collectedAt:now,platform:'win32',provider:'Microsoft Defender',supported:true,canEnforce:true,antivirus:'enabled',realtime:'enabled',firewall:'enabled',signatures:'enabled',activeThreats:0,events:[],...extra});
async function fixture(){
  const s=await setup();await s.initialize();s.owner=await s.login('cantin.bruno@gmx.fr','09876543');
  s.agentAPI=(path,data,agent)=>s.api('agent/'+path,data,null,{Authorization:'Agent '+agent.token});
  s.pair=async(platform='win32')=>{const ticket=await(await s.api('agents/pair',{},s.owner.token)).json();const agent=await(await s.api('agent/enroll',{code:ticket.code,name:'Poste '+platform,platform})).json();assert.ok(agent.token);await s.agentAPI('poll',{capabilities:['endpoint-protection-v1','network-scan-v3']},agent);return agent;};
  return s;
}
test('endpoint reports are encrypted, deduplicated, timestamped, scoped and independently acknowledged',async()=>{
  const s=await fixture();try{
    const agent=await s.pair(),event={id:'native-detection-1',occurredAt:s.clock(),title:'Sensitive threat',resource:'/private/file',detail:'Native confirmed result',provider:'Defender',status:'alert',severity:'high'};
    assert.equal((await s.api('edr')).status,401);
    for(const platform of ['win32','linux','darwin'])assert.equal(endpointSnapshot(snapshot(s.clock(),{platform})).platform,platform);
    let data=snapshot(s.clock(),{activeThreats:1,events:[event]});
    assert.equal((await s.agentAPI('edr/report',data,agent)).status,200);
    assert.equal((await s.agentAPI('edr/report',data,agent)).status,200);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM endpoint_events').get().n,1);
    const disk=JSON.stringify(s.env.DB.db.prepare('SELECT * FROM endpoint_events').all());assert.ok(!disk.includes('Sensitive threat')&&!disk.includes('/private/file'));
    let posts=await(await s.api('edr',undefined,s.owner.token)).json();assert.equal(posts.endpoints[0].health,'attention');assert.equal(posts.endpoints[0].alerts,1);assert.equal(posts.endpoints[0].blocks,0);
    let detail=await(await s.api('edr/events?agentId='+agent.id,undefined,s.owner.token)).json();assert.equal(detail.events[0].resource,'/private/file');
    assert.equal((await s.api('edr/acknowledge',{agentId:agent.id,key:detail.events[0].key},s.owner.token)).status,200);
    s.advance(10);event.status='quarantined';event.occurredAt=s.clock();data=snapshot(s.clock(),{events:[event]});await s.agentAPI('edr/report',data,agent);
    detail=await(await s.api('edr/events?agentId='+agent.id,undefined,s.owner.token)).json();assert.equal(detail.events[0].acknowledgedAt,null);
    posts=await(await s.api('edr',undefined,s.owner.token)).json();assert.equal(posts.endpoints[0].blocks,1);assert.equal(posts.endpoints[0].health,'protected');
    await s.agentAPI('edr/report',snapshot(s.clock()-100,{firewall:'disabled'}),agent);posts=await(await s.api('edr',undefined,s.owner.token)).json();assert.equal(posts.endpoints[0].snapshot.firewall,'enabled');
    s.advance(130000);await s.agentAPI('poll',{},agent);posts=await(await s.api('edr',undefined,s.owner.token)).json();assert.equal(posts.endpoints[0].health,'unknown');
    const member=await s.createMember('endpoint-reader@example.test','12345678',s.owner.token);let login=await s.login('endpoint-reader@example.test','12345678');assert.equal((await s.api('edr',undefined,login.token)).status,403);
    const policy=profilePolicy('reader');policy.agents=[];
    assert.equal((await s.api('users/permissions',{id:member.user.id,revision:1,policy},s.owner.token)).status,200);login=await s.login('endpoint-reader@example.test','12345678');
    assert.equal((await(await s.api('edr',undefined,login.token)).json()).endpoints.length,0);assert.equal((await s.api('edr/events?agentId='+agent.id,undefined,login.token)).status,403);
  }finally{s.env.DB.db.close();}
});
test('endpoint policies use revisions; commands require current rights and a single leased result',async()=>{
  const s=await fixture();try{
    const agent=await s.pair(),policy={mode:'observe',realtime:true,firewall:true};
    assert.equal((await s.api('edr/policy',{agentId:agent.id,revision:0,policy},s.owner.token)).status,200);
    assert.equal((await s.api('edr/policy',{agentId:agent.id,revision:0,policy},s.owner.token)).status,409);
    assert.equal((await s.api('edr/policy',{agentId:agent.id,revision:1,policy},s.owner.token)).status,200);
    assert.equal((await s.api('edr/command',{agentId:agent.id,action:'arbitrary-shell'},s.owner.token)).status,400);
    const queued=await s.api('edr/command',{agentId:agent.id,action:'quick-scan'},s.owner.token);assert.equal(queued.status,201);
    let report=await(await s.agentAPI('edr/report',snapshot(s.clock(),{canEnforce:false}),agent)).json();assert.equal(report.command,null);
    report=await(await s.agentAPI('edr/report',snapshot(s.clock()),agent)).json();assert.equal(report.command.action,'quick-scan');
    const result={...report.command,ok:true,message:'Native scan completed'};
    assert.equal((await s.agentAPI('edr/result',{...result,lease:'b'.repeat(64)},agent)).status,409);
    assert.equal((await s.agentAPI('edr/result',result,agent)).status,200);assert.equal((await s.agentAPI('edr/result',result,agent)).status,409);
    const detail=await(await s.api('edr/events?agentId='+agent.id,undefined,s.owner.token)).json();assert.equal(detail.commands[0].status,'completed');
    const added=await s.createMember('fleet@example.test','12345678',s.owner.token);assert.equal((await s.api('users/permissions',{id:added.user.id,revision:1,policy:profilePolicy('endpoint-manager')},s.owner.token)).status,200);
    const manager=await s.login('fleet@example.test','12345678');assert.equal((await s.api('edr/command',{agentId:agent.id,action:'refresh'},manager.token)).status,201);
    await s.api('users/permissions',{id:added.user.id,revision:2,policy:profilePolicy('reader')},s.owner.token);
    report=await(await s.agentAPI('edr/report',snapshot(s.clock()),agent)).json();assert.equal(report.command,null);assert.equal(s.env.DB.db.prepare("SELECT status FROM endpoint_commands WHERE requested_by=?").get(added.user.id).status,'cancelled');
    await s.api('edr/command',{agentId:agent.id,action:'refresh'},s.owner.token);s.advance(16*60000);report=await(await s.agentAPI('edr/report',snapshot(s.clock()),agent)).json();assert.equal(report.command,null);
    await s.api('agents/revoke',{id:agent.id},s.owner.token);assert.equal((await s.agentAPI('edr/report',snapshot(s.clock()),agent)).status,401);
  }finally{s.env.DB.db.close();}
});
test('health never reports a missing, stale or partially observable protection as protected',()=>{
  const now=Date.now();assert.equal(endpointHealth(endpointSnapshot(snapshot(now))),'protected');
  assert.equal(endpointHealth(endpointSnapshot(snapshot(now)),false),'unknown');assert.equal(endpointHealth(endpointSnapshot(snapshot(now,{signatures:'unknown'}))),'unknown');
  assert.equal(endpointHealth(endpointSnapshot(snapshot(now,{activeThreats:1}))),'attention');assert.throws(()=>endpointSnapshot(snapshot(now+600000)));assert.throws(()=>endpointSnapshot(snapshot(now,{events:[{status:'allowed'}]})));
});
test('native collection uses fixed commands and preserves confirmed dispositions without running host actions',async()=>{
  const calls=[],now=Date.now();const native=snapshot(now,{events:[{id:'native-id',occurredAt:new Date(now).toISOString(),status:'blocked',title:'Native block'}]});
  const win=await collectEndpoint({platform:'win32',run:async(file,args)=>{calls.push([file,args]);return JSON.stringify(native);}});assert.equal(win.events[0].status,'blocked');assert.match(win.events[0].id,/^[a-f0-9]{64}$/);assert.equal(calls[0][0],'powershell.exe');
  await assert.rejects(executeEndpointAction('rm -rf /',{},{run:()=>assert.fail('No execution')}));
  const missing=()=>{throw new Error('Unavailable');};
  const linux=await collectPosixEndpoint({platform:'linux',run:missing,read:missing,metadata:missing});assert.equal(endpointHealth(endpointSnapshot(linux)),'unknown');assert.ok(linux.warnings.length);
  const mac=await collectPosixEndpoint({platform:'darwin',run:async(file)=>file.includes('spctl')?'assessments enabled':file.includes('socketfilterfw')?'Firewall is enabled. (State = 1)':missing(),metadata:async()=>({isDirectory:()=>true,uid:1,mode:0o644})});assert.equal(mac.antivirus,'enabled');assert.equal(mac.signatures,'unknown');assert.equal(endpointHealth(endpointSnapshot(mac)),'unknown');
});
test('POSIX providers preserve native dispositions, disclose incomplete evidence and ignore clean Apple messages',async()=>{
  const now=Date.now(),missing=()=>{throw new Error('Unavailable');},metadata=async()=>({uid:1,mode:0o644,isDirectory:()=>true});
  const defender=await collectPosixEndpoint({platform:'linux',metadata,run:async(file,args)=>{
    if(file.endsWith('mdatp'))return JSON.stringify(args[0]==='health'?{healthy:true,licensed:true,real_time_protection_enabled:true,definitions_status:'up_to_date'}:[{id:'one',name:'Fixture detection',status:'detected',detection_time:new Date(now).toISOString()},{id:'two',name:'Fixture quarantine',status:'quarantined',detection_time:new Date(now).toISOString()}]);
    if(file.endsWith('ufw'))return 'Status: active';missing();
  }});assert.deepEqual(defender.events.map(row=>row.status),['alert','quarantined']);assert.equal(defender.realtime,'enabled');assert.equal(endpointHealth(endpointSnapshot(defender)),'attention');
  const apple=await collectPosixEndpoint({platform:'darwin',metadata,run:async(file)=>{
    if(file.endsWith('/log'))return JSON.stringify([{timestamp:new Date(now).toISOString(),eventMessage:'No malware detected'},{timestamp:new Date(now).toISOString(),eventMessage:'Malware blocked by XProtect'}]);
    if(file.endsWith('spctl'))return 'assessments enabled';if(file.endsWith('socketfilterfw'))return 'State = 1';missing();
  }});assert.equal(apple.events.length,1);assert.equal(apple.events[0].status,'blocked');assert.equal(endpointHealth(endpointSnapshot(apple)),'unknown');
  const config='OnAccessPrevention yes\nOnAccessIncludePath /srv/files\nOnAccessExcludeUname clamav\n';
  const clam=await collectPosixEndpoint({platform:'linux',metadata,read:async()=>config,run:async(file,args)=>{
    if(file.endsWith('clamdscan'))return 'ClamAV 1.4/123/'+new Date(now).toISOString();if(file.endsWith('systemctl'))return 'active';if(file.endsWith('ufw'))return 'Status: active';
    if(file.endsWith('journalctl'))return JSON.stringify({MESSAGE:'FixtureVirus FOUND',__REALTIME_TIMESTAMP:String(now*1000),__CURSOR:'one'})+'\n'+JSON.stringify({MESSAGE:'access denied: FixtureVirus',__REALTIME_TIMESTAMP:String(now*1000),__CURSOR:'two'});missing();
  }});assert.equal(clam.realtime,'enabled');assert.deepEqual(clam.events.map(row=>row.status),['alert','blocked']);assert.ok(clam.warnings.some(row=>row.includes('chemins')));
});
test('background reporting sends event deltas and keeps the protection loop cancellable',async()=>{
  const controller=new AbortController(),reports=[],event={id:'id',occurredAt:Date.now(),status:'alert',title:'Detection'};let actions=0;
  const client={async post(path,body){assert.equal(path,'edr/report');reports.push(body);if(reports.length===2)controller.abort();return {revision:1,policy:{mode:'observe',realtime:true,firewall:true}};}};
  await runEndpointProtection(client,{signal:controller.signal,intervalMs:1,collect:async()=>snapshot(Date.now(),{events:[event]}),execute:()=>{actions++;}});
  assert.equal(reports.length,2);assert.equal(reports[0].events.length,1);assert.equal(reports[1].events.length,0);assert.equal(actions,0);
});
test('initial invitation profiles are retained, while delegated account managers cannot escalate or take over the owner',async()=>{
  const s=await fixture();try{
    const invitation=await(await s.api('users/invite',{profile:'endpoint-manager'},s.owner.token)).json();
    const complete=await s.api('account/complete',{ticket:invitation.invitation.ticket,username:'invited-fleet@example.test',code:'12345678'});assert.equal(complete.status,200);
    const fleet=await s.login('invited-fleet@example.test','12345678');assert.equal(fleet.user.permissions.profile,'endpoint-manager');assert.ok(can(fleet.user,'edr.manage'));assert.ok(!can(fleet.user,'remote.terminal'));assert.ok(!can(fleet.user,'vault.secrets'));
    assert.equal((await s.api('users/create',{username:'forbidden@example.test',profile:'full'},fleet.token)).status,403);
    const added=await s.createMember('delegate@example.test','24681357',s.owner.token),policy=profilePolicy('none');policy.sections.users='write';policy.sections.agents='read';policy.sections.edr='read';
    assert.equal((await s.api('users/permissions',{id:added.user.id,revision:1,policy},s.owner.token)).status,200);const delegate=await s.login('delegate@example.test','24681357');
    assert.equal((await s.api('users/create',{username:'overreach@example.test',profile:'full'},delegate.token)).status,403);
    assert.equal((await s.api('users/create',{username:'allowed@example.test',profile:'none'},delegate.token)).status,201);
    assert.equal((await s.api('users/reset-code',{id:s.owner.user.id},delegate.token)).status,403);
    assert.equal((await s.api('users/permissions',{id:added.user.id,revision:2,policy:profilePolicy('full')},delegate.token)).status,403);
    const users=await(await s.api('users',undefined,s.owner.token)).json();assert.ok(users.users.every(row=>Number.isSafeInteger(row.sessions)));
    const personal=profilePolicy('reader');assert.ok(can({role:'member',permissions:personal},'vault.secrets'));assert.ok(!can({role:'member',permissions:personal},'vault.all'));
  }finally{s.env.DB.db.close();}
});
