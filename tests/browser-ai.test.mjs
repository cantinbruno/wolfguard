import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {can} from '../server/lib/wolfguard/permissions.mjs';

test('browser inference assets match the pinned vendor manifest, including the binary WASM engine',()=>{
  const base=new URL('../app/vendor/browser-ai/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));
  assert.equal(manifest.wllama,'3.8.1');
  for(const [name,hash]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(readFileSync(new URL(name,base))).digest('hex'),hash,name);
  assert.equal(readFileSync(new URL('wllama.wasm',base)).subarray(0,4).toString('hex'),'0061736d');
});

function client(){
  const workers=[],timers=new Map();let clock=0;
  class Worker{constructor(url,options){this.url=url;this.options=options;workers.push(this);}postMessage(value){this.message=value;}terminate(){this.terminated=true;}reply(value){this.onmessage({data:{id:this.message.id,...value}});}}
  const context={window:{Worker},Worker,WebAssembly,URL,DOMException,document:{querySelector:()=>({src:'https://wolfguard.wavetools.fr/js/ai/client.js?wg=release123'})},setTimeout:fn=>{timers.set(++clock,fn);return clock;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(readFileSync(new URL('../app/js/ai/client.js',import.meta.url),'utf8'),context);
  return {api:context.window.WolfGuardBrowserAI,workers,timers};
}
test('browser chat uses its own module worker, streams replies and needs no agent or server',async()=>{
  const {api,workers,timers}=client(),updates=[],messages=[{role:'user',content:'PRIVATE QUESTION'}];
  const pending=api.generate(messages,update=>updates.push(update));const worker=workers[0];
  assert.equal(worker.url.origin,'https://wolfguard.wavetools.fr');assert.equal(worker.url.pathname,'/js/ai/worker.js');assert.equal(worker.options.type,'module');
  assert.deepEqual(worker.message.messages,messages);worker.reply({type:'token',content:'Réponse'});assert.equal(updates[0].content,'Réponse');
  worker.reply({type:'complete',content:'Réponse complète'});assert.equal((await pending).content,'Réponse complète');assert.equal(api.ready,true);assert.equal(timers.size,0);
  const second=api.generate(messages);assert.equal(workers.length,1);api.cancel();await assert.rejects(second,{name:'AbortError'});assert.equal(worker.terminated,true);assert.equal(api.ready,false);
});
test('locking releases model memory, cancels in-flight downloads and ignores late replies',async()=>{
  const {api,workers,timers}=client();const pending=api.prepare();const worker=workers[0];api.dispose();await assert.rejects(pending,{name:'AbortError'});
  worker.reply({type:'ready'});assert.equal(api.ready,false);assert.equal(timers.size,0);
  const next=api.prepare();worker.onerror({preventDefault(){}});assert.ok(!workers[1].terminated);workers[1].reply({type:'ready'});await next;assert.equal(api.ready,true);api.dispose();assert.equal(workers[1].terminated,true);
});

test('chat permission is independent of agent read, pairing and online presence',()=>{
  const user={role:'member',permissions:{grants:['ai.use'],expiresAt:null}};
  const window={addEventListener(){}},context={window,WolfGuardCloud:{enabled:true,hasUsers:()=>true,currentUser:()=>user},WolfGuardPermissions:{can},document:{body:{}},MutationObserver:class{observe(){}}};
  vm.runInNewContext(readFileSync(new URL('../browser/access-control.js',import.meta.url),'utf8'),context);
  assert.equal(window.WolfGuardAccess.allows('chatbot'),true);
  assert.equal(window.WolfGuardAccess.allows('edr'),false);
  assert.equal(window.WolfGuardAccess.can('agents.read'),false);
  user.permissions.grants=[];assert.equal(window.WolfGuardAccess.allows('chatbot'),false);
});
