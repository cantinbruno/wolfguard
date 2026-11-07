import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {AgentClient,runAgent} from '../agent/agent.mjs';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {desktopInput,desktopFrame} from '../server/lib/wolfguard/remote-spec.mjs';
import {executeRemoteSession} from '../agent/remote.mjs';
import {openDesktop as windowsDesktop} from '../agent/remote-windows.mjs';

class D1 {
  constructor(){this.db=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../server/drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())this.db.exec(readFileSync(new URL('../server/drizzle/'+file,import.meta.url),'utf8'));}
  prepare(sql){const statement=this.db.prepare(sql);let args=[];return {bind(...values){args=values;return this;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){return {meta:{changes:Number(statement.run(...args).changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const values=[];for(const value of statements)values.push(await value.run());this.db.exec('COMMIT');return values;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
async function setup(){
  const activation=randomBytes(32).toString('hex'),objects=new Map();let now=Date.now();
  const env={DB:new D1(),BUCKET:{async put(key,data){objects.set(key,String(data));},async get(key){return objects.has(key)?{text:async()=>objects.get(key)}:null;},async delete(key){objects.delete(key);}},AUTH_PEPPER:'1'.repeat(64),STORAGE_KEY:'2'.repeat(64),BOOTSTRAP_HASH:createHash('sha256').update(activation).digest('hex')};
  const api=(route,body,credential,method=body===undefined?'GET':'POST',origin='https://wolfguard.wavetools.fr')=>handleAPI(new Request('https://test.invalid/api/'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',...(credential?{Authorization:credential}:{}),'X-WG-Activation':activation},...(body===undefined?{}:{body:JSON.stringify(body)})}),env,()=>now);
  const user='Bearer '+(await (await api('setup',{code:'07942685'})).json()).token;
  async function pair(capabilities=['remote-desktop-v1','network-scan-v3','network-target-v1']){const ticket=await (await api('agents/pair',{},user)).json(),agent=await (await api('agent/enroll',{code:ticket.code,name:'Poste test',platform:'win32'})).json();agent.auth='Agent '+agent.token;await api('agent/poll',{capabilities},agent.auth);return agent;}
  async function start(agent){const response=await api('remote/start',{agentId:agent.id},user);assert.equal(response.status,201);const session=await response.json(),claim=await (await api('agent/poll',{},agent.auth)).json();assert.equal(claim.remote.id,session.id);return {...session,lease:claim.remote.lease};}
  const exchange=(agent,session,change={})=>api('agent/remote/exchange',{id:session.id,lease:session.lease,status:'active',ack:0,...change},agent.auth);
  return {env,api,user,pair,start,exchange,objects,clock:()=>now,advance:value=>{now+=value;}};
}
const frame={width:10,height:10,jpeg:'/9j/2Q=='};

test('remote input accepts only finite pointer, keyboard and text events',()=>{
  for(const value of [{type:'exec',command:'whoami'},{type:'key',key:'$(cmd)',down:true},{type:'move',x:Infinity,y:0},{type:'button',x:0,y:0,button:9,down:true},{type:'wheel',x:0,y:0,delta:50},{type:'text',text:'x\u0000y'}])assert.throws(()=>desktopInput(value));
  assert.deepEqual(desktopInput({type:'key',key:'KeyC',down:true,command:'ignored'}),{type:'key',key:'KeyC',down:true});
  assert.deepEqual(desktopInput({type:'move',x:0,y:1}),{type:'move',x:0,y:1});
  assert.throws(()=>desktopFrame({...frame,jpeg:'<script>'}));assert.throws(()=>desktopFrame({...frame,width:9000}));
});

test('Windows adapter uses native encoding, valid Win32 input layout and releases held keys and buttons',async()=>{
  let accepted=false,stopped=0,pixels;const sent=[],positions=[],bgra=Buffer.from([10,20,30,0,40,50,60,0]);
  const ffi={view:value=>value,load:()=>({func(signature){
    if(signature.includes('GetSystemMetrics'))return dimension=>dimension===0?2:1;
    if(signature.includes('CreateDIBSection'))return (_screen,_info,_flags,out)=>{out[0]=bgra;return 1;};
    if(signature.includes('SendInput'))return (count,buffer,size)=>{assert.equal(size,40);sent.push(Buffer.from(buffer));return count;};
    if(signature.includes('SetCursorPos'))return (x,y)=>{positions.push([x,y]);return true;};
    return ()=>1;
  }})};
  const adapter=await windowsDesktop({ffi,encoderFactory:async()=>{accepted=true;return {encode(value){pixels=value;return frame;},close(){stopped++;}};}});
  assert.equal(accepted,true);await adapter.capture();assert.deepEqual([...pixels],[10,20,30,0,40,50,60,0]);
  await adapter.input({type:'button',x:1,y:0,button:0,down:true});await adapter.input({type:'key',key:'Control',down:true});
  await adapter.input({type:'text',text:'é\n'});await adapter.close();
  assert.deepEqual(positions,[[1,0]]);assert.equal(stopped,1);
  assert.ok(sent.some(value=>value.readUInt32LE(0)===1&&value.readUInt16LE(10)===233&&value.readUInt32LE(12)===4));
  assert.ok(sent.some(value=>value.readUInt32LE(0)===1&&value.readUInt16LE(8)===13&&value.readUInt32LE(12)===0));
  assert.ok(sent.some(value=>value.readUInt32LE(0)===1&&value.readUInt16LE(8)===17&&value.readUInt32LE(12)===2));
  assert.ok(sent.some(value=>value.readUInt32LE(0)===0&&value.readUInt32LE(20)===4));
});

test('Windows closes the sharing indicator if setup fails or cancellation arrives during its launch',async()=>{
  for(const reason of ['native-load','cancelled']){
    const cancel=new AbortController();let stopped=0;
    await assert.rejects(windowsDesktop({
      signal:cancel.signal,
      ffi:{load(){throw new Error('Native desktop unavailable');}},
      encoderFactory:async()=>{if(reason==='cancelled')cancel.abort();return {close(){stopped++;}};}
    }));
    assert.equal(stopped,1,reason);
  }
});

test('desktop relay authenticates both peers, encrypts images and input, orders and acknowledges actions without replay',async()=>{
  const s=await setup();try{
    const a=await s.pair(),b=await s.pair();
    assert.equal((await s.api('remote/start',{agentId:a.id})).status,401);
    assert.equal((await s.api('remote/start',{agentId:a.id},a.auth)).status,401);
    const old=await s.pair([]);assert.equal((await s.api('remote/start',{agentId:old.id},s.user)).status,409);
    const session=await s.start(a);
    assert.equal((await s.exchange(a,session,{status:'preparing',frame})).status,409);assert.equal(s.objects.size,0);
    assert.equal((await s.api('remote/start',{agentId:a.id},s.user)).status,409);
    assert.equal((await s.api('scans',{agentId:a.id,strategy:'active',target:'127.0.0.1',ports:'22'},s.user)).status,409);
    assert.equal((await s.exchange(b,session)).status,404);
    assert.equal((await s.exchange(a,{...session,lease:'0'.repeat(64)})).status,403);
    assert.equal((await s.exchange(a,session,{frame})).status,200);
    assert.ok(![...s.objects.values()].join('').includes(frame.jpeg));
    const view=await (await s.api('remote/session?id='+session.id,undefined,s.user)).json();assert.deepEqual(view.frame,frame);assert.equal(view.status,'active');
    const other='Bearer '+(await (await s.api('login',{code:'07942685'})).json()).token;
    assert.equal((await s.api('remote/session?id='+session.id,undefined,other)).status,404);
    const event={type:'text',text:'synthetic-private-text'};
    assert.equal((await s.api('remote/input',{id:session.id,seq:1,events:[{type:'exec',command:'cmd'}]},s.user)).status,400);
    assert.equal((await s.api('remote/input',{id:session.id,seq:2,events:[event]},s.user)).status,409);
    assert.equal((await s.api('remote/input',{id:session.id,seq:1,events:[event]},s.user)).status,200);
    assert.ok(!JSON.stringify(s.env.DB.db.prepare('SELECT * FROM remote_inputs').all()).includes(event.text));
    const first=await (await s.exchange(a,session)).json();assert.deepEqual(first.inputs,[{seq:1,events:[event]}]);
    assert.equal((await s.exchange(a,session,{ack:1})).status,200);assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM remote_inputs').get().n,0);
    assert.equal((await (await s.api('remote/input',{id:session.id,seq:1,events:[event]},s.user)).json()).accepted,false);
    assert.equal((await (await s.exchange(a,session,{ack:1})).json()).inputs.length,0);
    await s.api('remote/stop',{id:session.id},s.user);assert.equal(s.objects.size,0);
    assert.equal((await (await s.exchange(a,session,{ack:1})).json()).status,'closed');
    assert.equal((await s.api('remote/input',{id:session.id,seq:2,events:[event]},s.user)).status,409);
  }finally{s.env.DB.db.close();}
});

test('stale viewers, input delays, refusal, revocation and logout end sharing and remove transient data',async()=>{
  for(const reason of ['viewer','lag','denied','revoke','logout']){
    const s=await setup();try{
      const a=await s.pair(),session=await s.start(a);await s.exchange(a,session,{frame});
      if(reason==='viewer'){s.advance(15001);assert.equal((await (await s.exchange(a,session)).json()).status,'closed');}
      if(reason==='lag'){await s.api('remote/input',{id:session.id,seq:1,events:[{type:'key',key:'Enter',down:true}]},s.user);s.advance(4001);assert.equal((await (await s.exchange(a,session)).json()).status,'closed');}
      if(reason==='denied')assert.equal((await (await s.exchange(a,session,{status:'denied'})).json()).status,'denied');
      if(reason==='revoke'){await s.api('agents/revoke',{id:a.id},s.user);assert.equal((await s.exchange(a,session)).status,401);}
      if(reason==='logout'){await s.api('logout',{},s.user);assert.equal((await (await s.exchange(a,session)).json()).status,'closed');}
      assert.equal(s.objects.size,0,reason);assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM remote_inputs').get().n,0);
    }finally{s.env.DB.db.close();}
  }
});

test('agent waits for local consent, validates ordered actions and closes the native adapter on cancellation',async()=>{
  const cancel=new AbortController(),calls=[],inputs=[],states=[];let ready=false,closed=0;
  const client={async post(route,data){assert.equal(route,'remote/exchange');calls.push(data);if(data.status==='active'){assert.equal(ready,true);if(!inputs.length)return {status:'active',inputs:[{seq:1,events:[{type:'key',key:'Enter',down:true}]}]};cancel.abort();}return {status:data.status,inputs:[]};}};
  await executeRemoteSession(client,{id:'a'.repeat(32),lease:'b'.repeat(64),expiresAt:Date.now()+10000},{signal:cancel.signal,onStatus:(message,detail)=>states.push({message,...detail}),intervalMs:2,prepare:async()=>({}),openDesktop:async()=>{assert.equal(states.at(-1).state,'remote-preparing');await new Promise(resolve=>setTimeout(resolve,8));ready=true;return {capture:async()=>frame,input:async value=>inputs.push(value),close:async()=>closed++};}});
  assert.ok(calls.some(value=>value.status==='preparing'&&!value.frame));assert.equal(inputs.length,1);assert.equal(closed,1);assert.equal(calls.at(-1).status,'closed');assert.equal(calls.at(-1).ack,1);
  assert.deepEqual(states.map(value=>value.state),['remote-preparing','remote','connected']);
});

test('a busy relay receives the freshest capture without queueing old desktop frames',async()=>{
  const cancel=new AbortController(),sent=[];let captures=0,release,closed=0;
  const blocked=new Promise(resolve=>{release=resolve;});
  const client={async post(_route,data){
    if(data.frame){sent.push(data.frame.width);if(sent.length===1)await blocked;else cancel.abort();}
    return {status:data.status,inputs:[]};
  }};
  const until=async predicate=>{const end=Date.now()+2000;while(!predicate()){if(Date.now()>end)throw new Error('Fresh frame timeout');await new Promise(resolve=>setTimeout(resolve,2));}};
  const work=executeRemoteSession(client,{id:'a'.repeat(32),lease:'b'.repeat(64),expiresAt:Date.now()+10000},{
    signal:cancel.signal,intervalMs:1,captureIntervalMs:2,prepare:async()=>({}),
    openDesktop:async()=>({capture:async()=>({...frame,width:++captures}),input:async()=>{},close:async()=>{closed++;}})
  });
  try{
    await until(()=>sent.length===1);await until(()=>captures>=sent[0]+4);
    const latest=captures;release();await until(()=>sent.length===2);await work;
    assert.ok(sent[1]>=latest,'The relay received an obsolete queued frame');
    assert.equal(closed,1);
  }finally{release();cancel.abort();await work;}
});

test('real HTTP agent polling connects the desktop relay only after consent, delivers input and stops the adapter',async()=>{
  const s=await setup(),cancel=new AbortController();let allow,closed=0,requested=false,work;const inputs=[];
  const consent=new Promise(resolve=>{allow=resolve;});
  const server=createServer(async(req,res)=>{try{const request=new Request('http://127.0.0.1'+req.url,{method:req.method,headers:req.headers,...(req.method==='GET'?{}:{body:Readable.toWeb(req),duplex:'half'})});const response=await handleAPI(request,s.env,s.clock);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());}catch{res.writeHead(500);res.end('{}');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const until=async predicate=>{const end=Date.now()+5000;while(!predicate()){if(Date.now()>end)throw new Error('Desktop integration timeout');await new Promise(resolve=>setTimeout(resolve,10));}};
  try{
    const agent=await s.pair(),client=new AgentClient('http://127.0.0.1:'+server.address().port,{allowLoopback:true});client.token=agent.token;
    const created=await (await s.api('remote/start',{agentId:agent.id},s.user)).json();
    work=runAgent(client,{protectionRunner:async()=>{},signal:cancel.signal,pollMs:20,remoteRunner:(client,session,options)=>executeRemoteSession(client,session,{...options,intervalMs:20,prepare:async()=>({}),openDesktop:async()=>{requested=true;await consent;return {capture:async()=>frame,input:async event=>inputs.push(event),close:async()=>closed++};}})});
    await until(()=>requested);assert.equal(s.objects.size,0);
    assert.equal((await (await s.api('remote/session?id='+created.id,undefined,s.user)).json()).status,'preparing');
    allow();await until(()=>s.objects.size===1);
    const view=await (await s.api('remote/session?id='+created.id,undefined,s.user)).json();assert.deepEqual(view.frame,frame);
    await s.api('remote/input',{id:created.id,seq:1,events:[{type:'text',text:'fixture'}]},s.user);await until(()=>inputs.length===1);
    assert.deepEqual(inputs,[{type:'text',text:'fixture'}]);
    await s.api('remote/stop',{id:created.id},s.user);await until(()=>closed===1);assert.equal(s.objects.size,0);
  }finally{allow();cancel.abort();if(work)await work;await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});s.env.DB.db.close();}
});
