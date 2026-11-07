import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {desktopAgent} from '../agent/agent.mjs';
import {executeTerminalSession,runTerminalCommand} from '../agent/terminal.mjs';
import {terminalCommand,terminalResult,TERMINAL_OUTPUT} from '../server/lib/wolfguard/terminal-spec.mjs';
import {PassThrough} from 'node:stream';

class D1 {
  constructor(){this.db=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../server/drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())this.db.exec(readFileSync(new URL('../server/drizzle/'+file,import.meta.url),'utf8'));}
  prepare(sql){const statement=this.db.prepare(sql);let args=[];return {bind(...values){args=values;return this;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){return {meta:{changes:Number(statement.run(...args).changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const values=[];for(const value of statements)values.push(await value.run());this.db.exec('COMMIT');return values;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
async function setup(){
  const activation=randomBytes(32).toString('hex');let now=Date.now();
  const env={DB:new D1(),BUCKET:{async delete(){}},AUTH_PEPPER:'1'.repeat(64),STORAGE_KEY:'2'.repeat(64),BOOTSTRAP_HASH:createHash('sha256').update(activation).digest('hex')};
  const api=(route,body,credential)=>handleAPI(new Request('https://test.invalid/api/'+route,{method:body===undefined?'GET':'POST',headers:{Origin:'https://wolfguard.wavetools.fr','Content-Type':'application/json',...(credential?{Authorization:credential}:{}),'X-WG-Activation':activation},...(body===undefined?{}:{body:JSON.stringify(body)})}),env,()=>now);
  const user='Bearer '+(await (await api('setup',{code:'07942685'})).json()).token;
  const ticket=await (await api('agents/pair',{},user)).json(),agent=await (await api('agent/enroll',{code:ticket.code,name:'Synthetic terminal',platform:process.platform})).json();agent.auth='Agent '+agent.token;
  await api('agent/poll',{capabilities:['remote-terminal-v1','remote-desktop-v1']},agent.auth);
  const client={origin:'https://test.invalid',token:agent.token,async post(route,data){const response=await api('agent/'+route,data,agent.auth);const value=await response.json();if(!response.ok){const error=new Error(value.error);error.status=response.status;throw error;}return value;}};
  const created=await api('remote/start',{agentId:agent.id,mode:'terminal'},user);assert.equal(created.status,201);
  const session=await created.json(),claim=await client.post('poll',{});Object.assign(session,claim.remote);
  const exchange=(change={})=>api('agent/remote/terminal/exchange',{id:session.id,lease:session.lease,status:'active',...change},agent.auth);
  const view=async()=>await (await api('remote/session?id='+session.id,undefined,user)).json();
  return {env,api,user,agent,client,session,exchange,view,advance:value=>{now+=value;}};
}
async function until(predicate){const end=Date.now()+8000;while(!await predicate()){if(Date.now()>end)throw new Error('Terminal fixture timeout');await new Promise(resolve=>setTimeout(resolve,20));}}
const result={seq:1,revision:1,status:'running',stdout:'',stderr:'',cwd:homedir(),exitCode:null,reason:''};

test('terminal commands and output enforce finite size, shape and explicit status',()=>{
  for(const command of ['',null,'x\0y','x'.repeat(8001)])assert.throws(()=>terminalCommand(command));
  assert.equal(terminalCommand('Get-Date\nwhoami'),'Get-Date\nwhoami');
  for(const value of [{...result,seq:0},{...result,revision:Infinity},{...result,stdout:'x'.repeat(TERMINAL_OUTPUT+1)},{...result,status:'exec'},{...result,exitCode:1.5},{...result,reason:'arbitrary'}])assert.throws(()=>terminalResult(value));
});

test('terminal relay binds session, lease and owner, encrypts commands/output and prevents replay',async()=>{
  const s=await setup();try{
    assert.equal(s.session.mode,'terminal');
    const id=s.session.id;
    assert.equal((await s.api('remote/terminal/command',{id,seq:1,command:'synthetic-command'})).status,401);
    const other='Bearer '+(await (await s.api('login',{code:'07942685'})).json()).token;
    assert.equal((await s.api('remote/terminal/command',{id,seq:1,command:'synthetic-command'},other)).status,404);
    assert.equal((await s.exchange({lease:'0'.repeat(64)})).status,403);
    await s.exchange({info:{shell:'PowerShell',cwd:'C:\\synthetic'}});
    assert.equal((await s.api('remote/input',{id,seq:1,events:[{type:'release'}]},s.user)).status,409);
    assert.equal((await s.api('remote/terminal/command',{id,seq:2,command:'wrong-order'},s.user)).status,409);
    assert.equal((await s.api('remote/terminal/command',{id,seq:1,command:'synthetic-command'},s.user)).status,201);
    assert.deepEqual(await (await s.api('remote/terminal/command',{id,seq:1,command:'not-replayed'},s.user)).json(),{accepted:false});
    assert.equal((await s.api('remote/terminal/command',{id,seq:2,command:'overlap'},s.user)).status,409);
    assert.equal((await s.exchange({result:{...result,stdout:'synthetic-output'}})).status,200);
    const stored=s.env.DB.db.prepare('SELECT * FROM terminal_commands').get();assert.ok(!stored.spec_cipher.includes('synthetic-command'));assert.ok(!stored.result_cipher.includes('synthetic-output'));
    let view=await s.view();assert.equal(view.commands[0].command,'synthetic-command');assert.equal(view.commands[0].stdout,'synthetic-output');
    await s.exchange({result:{...result,revision:2,status:'completed',exitCode:0,stdout:'final-output'}});
    await s.exchange({result:{...result,revision:1,stdout:'obsolete'}});
    view=await s.view();assert.equal(view.commands[0].stdout,'final-output');assert.equal(view.commands[0].status,'completed');
    assert.equal((await s.api('remote/terminal/command',{id,seq:2,command:'cancel-before-start'},s.user)).status,201);
    await s.api('remote/terminal/cancel',{id,seq:2},s.user);
    assert.equal((await (await s.exchange()).json()).command,null);
    await s.api('remote/stop',{id},s.user);assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM terminal_commands').get().n,0);
    assert.equal((await (await s.exchange()).json()).status,'closed');
  }finally{s.env.DB.db.close();}
});

test('terminal expires on viewer loss and refuses an old agent capability',async()=>{
  const s=await setup();try{
    await s.exchange();await s.api('remote/terminal/command',{id:s.session.id,seq:1,command:'never-execute'},s.user);s.advance(16000);
    assert.equal((await (await s.exchange()).json()).status,'closed');
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM terminal_commands').get().n,0);
    await s.client.post('poll',{capabilities:['remote-desktop-v1']});
    assert.equal((await s.api('remote/start',{agentId:s.agent.id,mode:'terminal'},s.user)).status,409);
  }finally{s.env.DB.db.close();}
});

test('real background shell streams unicode, preserves directory and reports errors without opening a window',async()=>{
  const updates=[];
  const value=await runTerminalCommand(process.platform==='win32'?'Set-Location -LiteralPath $env:TEMP; Write-Output "terminal-é-✓"':'cd /tmp; printf "terminal-é-✓\\n"',{onUpdate:state=>updates.push(state.stdout)});
  assert.equal(value.status,'completed');assert.equal(value.exitCode,0);assert.ok(value.stdout.includes('terminal-é-✓'));assert.ok(updates.some(text=>text.includes('terminal-é-✓')));assert.ok(!value.stdout.includes('WGT_'));assert.notEqual(value.cwd,homedir());
  const failure=await runTerminalCommand(process.platform==='win32'?'Write-Error "synthetic-terminal-error"':'printf "synthetic-terminal-error\\n" >&2; exit 3');
  assert.equal(failure.status,'failed');assert.notEqual(failure.exitCode,0);assert.ok(failure.stderr.includes('synthetic-terminal-error'));
});

test('real background shell enforces cancellation, timeout and output bounds',async()=>{
  const cancel=new AbortController(),long=process.platform==='win32'?'Write-Output "started"; Start-Sleep -Seconds 30':'printf "started\\n"; sleep 30';
  const work=runTerminalCommand(long,{signal:cancel.signal,onUpdate:value=>{if(value.stdout.includes('started'))cancel.abort();}});
  assert.equal((await work).status,'cancelled');
  assert.equal((await runTerminalCommand(long,{timeoutMs:250})).reason,'timeout');
  const limit=await runTerminalCommand(process.platform==='win32'?'[Console]::Out.Write(("x" * 70000))':'head -c 70000 /dev/zero | tr "\\000" x');
  assert.equal(limit.reason,'output-limit');assert.equal(limit.stdout.length+limit.stderr.length,TERMINAL_OUTPUT);
});

test('end-to-end authenticated terminal executes once, streams output and cancels the running process',async()=>{
  const s=await setup(),cancel=new AbortController(),states=[];let executions=0;
  const work=executeTerminalSession(s.client,s.session,{signal:cancel.signal,intervalMs:20,onStatus:(_message,value)=>states.push(value.state),runCommand:(command,options)=>{executions++;return runTerminalCommand(command,options);}});
  try{
    await until(()=>states.includes('terminal'));
    const command=process.platform==='win32'?'Write-Output "relay-started"; Start-Sleep -Seconds 30':'printf "relay-started\\n"; sleep 30';
    await s.api('remote/terminal/command',{id:s.session.id,seq:1,command},s.user);
    await until(async()=>(await s.view()).commands[0]?.stdout?.includes('relay-started'));
    assert.equal(executions,1);await s.api('remote/terminal/cancel',{id:s.session.id,seq:1},s.user);
    await until(async()=>(await s.view()).commands[0]?.status==='cancelled');
    assert.equal(executions,1);await s.api('remote/stop',{id:s.session.id},s.user);await work;
    assert.equal(states.at(-1),'connected');
  }finally{cancel.abort();await work;s.env.DB.db.close();}
});

test('agent terminal branch advertises capability and native stop-remote closes it without ending polling',async()=>{
  const input=new PassThrough(),events=[];let polls=0,stopped=false;
  const client={origin:'https://test.invalid',token:'',async post(route,body){assert.equal(route,'poll');assert.ok(body.capabilities.includes('remote-terminal-v1'));polls++;return polls===1?{remote:{id:'a'.repeat(32),mode:'terminal'}}:{job:null};}};
  const work=desktopAgent({protectionRunner:async()=>{},client,input,store:{async load(){return {api:client.origin,token:'b'.repeat(64)};}},pollMs:5,emit:event=>events.push(event),remoteRunner:async(_client,session,{signal,onStatus})=>{assert.equal(session.mode,'terminal');onStatus('Synthetic terminal',{state:'terminal'});await new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}));stopped=true;}});
  try{await until(()=>events.some(value=>value.state==='terminal'));input.write('{"type":"stop-remote"}\n');await until(()=>stopped&&events.at(-1)?.state==='connected');assert.ok(polls>1);input.write('{"type":"shutdown"}\n');await work;}
  finally{input.end();await work;}
});
