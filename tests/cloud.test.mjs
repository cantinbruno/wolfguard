import {test} from 'node:test';
import assert from 'node:assert/strict';

// Exercise the real cloud client with synthetic responses and a controllable deadline.
async function client(run){
  const names=['location','window','fetch','setTimeout','clearTimeout'];
  const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  const deadlines=new Map();let timer=0;
  try{
    globalThis.location=new URL('http://localhost/?sync-test');
    globalThis.window={addEventListener(){}};
    globalThis.setTimeout=(callback,delay)=>{assert.equal(delay,45000);deadlines.set(++timer,callback);return timer;};
    globalThis.clearTimeout=id=>deadlines.delete(id);
    const cloud=await import('../browser/cloud.js?test='+crypto.randomUUID());
    cloud.restoreSession({token:'a'.repeat(64),version:1});
    await run(cloud,deadlines);
    assert.equal(deadlines.size,0,'request deadline must be released');
  }finally{
    for(const [name,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
  }
}

test('invitation creation and cancellation pass through the authenticated client',()=>client(async cloud=>{
  const calls=[];
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,headers:new Headers(),json:async()=>({ok:true})};};
  await cloud.agentRequest('users/invite',{});
  await cloud.agentRequest('users/revoke-invitation',{id:'b'.repeat(32)});
  assert.deepEqual(calls.map(call=>new URL(call.url).pathname),['/api/users/invite','/api/users/revoke-invitation']);
  for(const {options}of calls){assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer '+'a'.repeat(64));}
  assert.deepEqual(JSON.parse(calls[1].options.body),{id:'b'.repeat(32)});
  await assert.rejects(cloud.agentRequest('users/arbitrary',{}),/Adresse agent invalide/);
  assert.equal(calls.length,2);
}));

test('cloud deadline covers a response whose headers arrive but body stalls',()=>client(async(cloud,deadlines)=>{
  let reading;
  const started=new Promise(resolve=>reading=resolve);
  globalThis.fetch=async(_url,{signal})=>({ok:true,headers:new Headers(),json:()=>new Promise((_resolve,reject)=>{
    signal.addEventListener('abort',()=>reject(new DOMException('Body aborted','AbortError')),{once:true});reading();
  })});
  const pending=cloud.agentRequest('scans?history=1');
  const rejected=assert.rejects(pending,/Connexion au stockage partagé impossible/);
  await started;
  assert.equal(deadlines.size,1);
  [...deadlines.values()][0]();
  await rejected;
}));

test('export cancellation aborts the actual network response without invalidating the session',()=>client(async(cloud)=>{
  let reading,requestSignal;
  const started=new Promise(resolve=>reading=resolve);
  globalThis.fetch=async(_url,{signal})=>{requestSignal=signal;return {ok:true,headers:new Headers(),json:()=>new Promise((_resolve,reject)=>{
    signal.addEventListener('abort',()=>reject(new DOMException('Body aborted','AbortError')),{once:true});reading();
  })};};
  const controller=new AbortController();
  const pending=cloud.agentRequest('scans/result?id='+('b'.repeat(32)),undefined,{signal:controller.signal});
  const rejected=assert.rejects(pending,{name:'AbortError'});
  await started;controller.abort();await rejected;
  assert.equal(requestSignal.aborted,true);assert.equal(cloud.hasSession(),true);
  globalThis.fetch=async()=>({ok:true,headers:new Headers(),json:async()=>({jobs:[]})});
  assert.deepEqual(await cloud.agentRequest('scans?history=1'),{jobs:[]});
}));

test('already cancelled calls do not contact the server',()=>client(async(cloud)=>{
  let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Unexpected network access');};
  const controller=new AbortController();controller.abort();
  await assert.rejects(cloud.agentRequest('agents',undefined,{signal:controller.signal}),{name:'AbortError'});
  assert.equal(calls,0);
}));

test('shared refresh cancels an unchanged body and accepts the caller snapshot version',()=>client(async(cloud)=>{
  let cancelled=0,read=0;
  globalThis.fetch=async()=>({ok:true,headers:new Headers({'X-WG-Version':'1'}),body:{async cancel(){cancelled++;}},async json(){read++;throw new Error('Unchanged snapshot must not be read');}});
  assert.equal(await cloud.refresh(1),null);assert.equal(cancelled,1);assert.equal(read,0);
  globalThis.fetch=async()=>({ok:true,headers:new Headers({'X-WG-Version':'2'}),json:async()=>({format:'newer'})});
  assert.deepEqual(await cloud.refresh(1),{format:'newer'});assert.equal(cloud.currentVersion(),2);
  // A deferred editor still owns version 1 even if another read saw version 2.
  assert.deepEqual(await cloud.refresh(1),{format:'newer'});
}));

test('revoked sessions and blocked IPs notify the app, while a wrong login code does not',()=>client(async cloud=>{
  const events=[];window.dispatchEvent=event=>events.push(event.type);
  globalThis.fetch=async()=>({ok:false,status:403,json:async()=>({error:'IP bloquée',code:'ACCESS_BLOCKED'})});
  await assert.rejects(cloud.agentRequest('access'),{code:'CLOUD_ACCESS'});assert.deepEqual(events,['wolfguard-access-revoked']);
  globalThis.fetch=async()=>({ok:false,status:401,json:async()=>({error:'Code incorrect'})});
  await assert.rejects(cloud.login('00000000'),{code:'CLOUD_ACCESS'});assert.equal(events.length,1);
  await assert.rejects(cloud.agentRequest('access'),{code:'CLOUD_ACCESS'});assert.equal(events.length,2);
}));

test('cloud keeps authorization, version headers and conflict errors intact',()=>client(async(cloud)=>{
  const calls=[];
  globalThis.fetch=async(url,options)=>{calls.push({url,...options});return {ok:true,headers:new Headers({'X-WG-Version':'2'}),json:async()=>url.endsWith('/status')?{initialized:true}:url.endsWith('/vault')&&options.method==='PUT'?{version:3}:{format:'synthetic'}};};
  assert.equal(await cloud.status(),true);assert.equal(calls[0].headers.Authorization,undefined);
  assert.deepEqual(await cloud.load(),{format:'synthetic'});assert.equal(cloud.currentVersion(),2);
  await cloud.save({format:'synthetic'});assert.equal(cloud.currentVersion(),3);
  assert.equal(calls[2].headers['X-WG-Version'],'2');assert.equal(calls[2].headers.Authorization,'Bearer '+'a'.repeat(64));
  globalThis.fetch=async()=>({ok:false,status:409,json:async()=>({error:'Version plus récente',retryAfter:4})});
  await assert.rejects(cloud.agentRequest('agents'),{code:'CLOUD_CONFLICT',retryAfter:4});
}));
