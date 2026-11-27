import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {setup} from './endpoint-fixture.mjs';
import {rememberStatus,collectAgentLogs,redact,clearRecentStatus,agentLogFiles} from '../agent/recent-log.mjs';
import {executeEndpointAction} from '../agent/endpoint.mjs';

const snapshot=now=>({collectedAt:now,platform:'win32',provider:'Microsoft Defender',supported:true,canEnforce:true,antivirus:'enabled',realtime:'enabled',firewall:'enabled',signatures:'enabled',activeThreats:0,events:[]});

test('the agent journal keeps recent messages, appends the Windows log tail and masks secrets',async()=>{
  clearRecentStatus();
  for(let i=0;i<450;i++)rememberStatus('Message '+i);
  rememberStatus('Connexion avec Agent '+'a'.repeat(64)+' et token=SuperSecret');
  const folder=await mkdtemp(path.join(tmpdir(),'wg-log-'));
  try{
    const file=path.join(folder,'agent.log');
    await writeFile(file,'x'.repeat(40000)+'\nLAST LINE password=hunter2 Bearer abcdefghijklmnop');
    const text=await collectAgentLogs({platform:'win32',version:'f'.repeat(64),files:[file,path.join(folder,'missing.log')]});
    assert.ok(text.startsWith('WolfGuard · journal de l’agent'));
    assert.ok(!text.includes('Message 0\n')&&text.includes('Message 449'),'only the 400 most recent messages are kept');
    assert.ok(text.includes('LAST LINE')&&text.includes('…'),'the end of the log file is appended');
    for(const secret of ['a'.repeat(64),'SuperSecret','hunter2','abcdefghijklmnop','f'.repeat(64)])assert.ok(!text.includes(secret),secret);
    assert.ok(text.length<=64000);
  }finally{await rm(folder,{recursive:true,force:true});}
  assert.equal(redact('code: 12345678'),'code: ‹masqué›');
  assert.deepEqual(agentLogFiles({platform:'linux',env:{}}),[]);
  assert.equal(agentLogFiles({platform:'win32',env:{ProgramData:'C:/ProgramData',LOCALAPPDATA:'C:/Users/u/AppData/Local'}}).length,2);
  const result=await executeEndpointAction('collect-logs',undefined,{platform:'linux'});
  assert.equal(result.ok,true);assert.match(result.logs,/Messages récents/);
});

test('a manager asks for the journal; the console lists it without its content and reads it on demand',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const agentAPI=(route,data,agent)=>s.api('agent/'+route,data,null,{Authorization:'Agent '+agent.token});
    const ticket=await(await s.api('agents/pair',{},owner.token)).json();
    const agent=await(await s.api('agent/enroll',{code:ticket.code,name:'Poste journal',platform:'win32'})).json();
    await agentAPI('poll',{capabilities:['endpoint-protection-v1','agent-logs-v1']},agent);
    const listed=(await(await s.api('agents',undefined,owner.token)).json()).agents.find(row=>row.id===agent.id);
    assert.ok(listed.capabilities.includes('agent-logs-v1'),'the capability is kept by the server');
    assert.equal((await s.api('edr/command',{agentId:agent.id,action:'collect-logs'},owner.token)).status,201);
    const report=await(await agentAPI('edr/report',snapshot(s.clock()),agent)).json();
    assert.equal(report.command.action,'collect-logs');
    const logs='JOURNAL-LINE\n'+'y'.repeat(70000);
    assert.equal((await agentAPI('edr/result',{...report.command,ok:true,message:'Journal envoyé.',logs},agent)).status,200);
    const detail=await(await s.api('edr/events?agentId='+agent.id,undefined,owner.token)).json();
    const command=detail.commands.find(row=>row.action==='collect-logs');
    assert.equal(command.status,'completed');assert.equal(command.result.hasLogs,true);assert.equal(command.result.logs,undefined,'the list never carries the journal');
    const read=await s.api('edr/command-logs?id='+command.id,undefined,owner.token);assert.equal(read.status,200);
    const body=await read.json();assert.equal(body.logs.length,64000,'the stored journal is bounded');assert.ok(body.logs.endsWith('y'));
    assert.ok(!JSON.stringify(s.env.DB.db.prepare('SELECT * FROM endpoint_commands').all()).includes('JOURNAL-LINE'),'encrypted at rest');
    assert.equal((await s.api('edr/command-logs?id='+command.id)).status,401);
    assert.equal((await s.api('edr/command-logs?id='+'0'.repeat(32),undefined,owner.token)).status,404);
    await s.createMember('logs-reader@example.test','12345678',owner.token);const member=await s.login('logs-reader@example.test','12345678');
    assert.ok([403,404].includes((await s.api('edr/command-logs?id='+command.id,undefined,member.token)).status),'a member without edr.manage cannot read it');
  }finally{s.env.DB.db.close();}
});

test('an idle agent polls less often after a quiet period',async()=>{
  const {runAgent}=await import('../agent/agent.mjs');
  const times=[],client={origin:'https://example.invalid',async post(){times.push(Date.now());return {job:null,remote:null,ai:null};}};
  const controller=new AbortController();
  const run=runAgent(client,{signal:controller.signal,pollMs:20,idleAfterMs:150,idlePollMs:200,protectionRunner:async()=>{},updateChecker:null,onStatus(){}});
  await new Promise(resolve=>setTimeout(resolve,1100));
  controller.abort();await run;
  const gaps=times.slice(1).map((time,index)=>time-times[index]);
  assert.ok(gaps[0]<120,'fast polling at the start: '+gaps.slice(0,3));
  assert.ok(gaps.at(-1)>=170,'slow polling once idle: '+gaps.slice(-3));
  assert.ok(times.length<30,'far fewer polls than the fast rate would give: '+times.length);
});
