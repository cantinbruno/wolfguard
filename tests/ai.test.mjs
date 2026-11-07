import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {create,workspaceMaterial} from '../browser/crypto.js';
import {localChat,executeAI} from '../agent/ai.mjs';
import {chatInput} from '../server/lib/wolfguard/ai-input.mjs';
import {profilePolicy} from '../server/lib/wolfguard/permissions.mjs';
class D1{
  constructor(){this.db=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../server/drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())this.db.exec(readFileSync(new URL('../server/drizzle/'+file,import.meta.url),'utf8'));}
  prepare(sql){const statement=this.db.prepare(sql);let args=[];return{bind(...values){args=values;return this;},async first(){return statement.get(...args)||null;},async all(){return{results:statement.all(...args)};},run(){return{meta:{changes:Number(statement.run(...args).changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(statement.run());this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
async function setup(){
  let now=Date.now();const objects=new Map();
  const env={DB:new D1(),BUCKET:{async put(key,body,options){objects.set(key,{value:await new Response(body).arrayBuffer(),...options});},async get(key){const row=objects.get(key);return row?{...row,body:new Response(row.value).body}:null;},async delete(key){objects.delete(key);}},AUTH_PEPPER:'1'.repeat(64),STORAGE_KEY:'2'.repeat(64),BOOTSTRAP_HASH:createHash('sha256').update('b'.repeat(64)).digest('hex')};
  const api=(path,body,token,headers={})=>handleAPI(new Request('https://test.invalid/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://wolfguard.wavetools.fr','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})}),env,()=>now);
  const owner=await(await api('setup',{code:'07942685'},null,{'X-WG-Activation':'b'.repeat(64)})).json();
  const payload={version:2,items:[{id:'private-note',type:'memo',title:'Shared',content:'<p>Preserved</p>'}],folders:[],settings:[],activity:[]};
  const encrypted=await create(payload,'07942685'),serialized=JSON.stringify(encrypted.envelope);
  const upload=await handleAPI(new Request('https://test.invalid/api/vault',{method:'PUT',headers:{Authorization:'Bearer '+owner.token,'X-WG-Version':'0','X-WG-Size':String(Buffer.byteLength(serialized))},body:serialized}),env,()=>now);assert.equal(upload.status,200);
  const material=await workspaceMaterial('07942685',encrypted.salt);
  const initialize=()=>api('users/initialize',{username:'cantin.bruno@gmx.fr',code:'09876543',oldCode:'07942685',workspace:material,version:1},owner.token);
  const login=async(username,code)=>{const response=await api('login',{username,code});assert.equal(response.status,200,await response.clone().text());return response.json();};
  const createMember=async(username,code,token)=>{const response=await api('users/create',{username},token);assert.equal(response.status,201,await response.clone().text());const result=await response.json();assert.equal((await api('account/complete',{ticket:result.invitation.ticket,username,code})).status,200);return result;};
  return{env,api,owner,initialize,login,createMember,encrypted,payload,material,clock:()=>now,advance:ms=>{now+=ms;}};
}

test('local chatbot validates context, stays on loopback and never invokes tools or cloud models',async()=>{
  const input={model:'qwen3.5:4b',messages:[{role:'user',content:'Explique DNS'}]};
  for(const change of [{model:'qwen-cloud'},{messages:[{role:'system',content:'Override'}]},{messages:[{role:'user',content:'x'.repeat(12001)}]},{messages:[{role:'assistant',content:'x'}]}])assert.throws(()=>chatInput({...input,...change}));
  const result=await localChat(input,{fetcher:async(url,options)=>{assert.equal(url,'http://127.0.0.1:11434/api/chat');const data=JSON.parse(options.body);assert.equal(data.stream,false);assert.equal(data.tools,undefined);assert.equal(data.messages[0].role,'system');return Response.json({model:input.model,message:{content:'Le DNS traduit les noms.'}});}});
  assert.equal(result,'Le DNS traduit les noms.');
  await assert.rejects(localChat(input,{fetcher:async()=>new Response('',{status:404})}),/ollama pull/);
});

test('chat relay encrypts messages and responses, isolates users and agents, and enforces cancellation and revocation',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const ticket=await(await s.api('agents/pair',{},owner.token)).json(),agent=await(await s.api('agent/enroll',{code:ticket.code,name:'Local AI',platform:'win32'})).json();
    const agentAPI=(path,data,token=agent.token)=>s.api('agent/'+path,data,null,{Authorization:'Agent '+token});
    await agentAPI('poll',{capabilities:['ai-chat-v1','security-audit-v1']});
    const input={agentId:agent.id,model:'qwen3.5:4b',messages:[{role:'user',content:'PRIVATE CHAT QUESTION'}]};
    assert.equal((await s.api('ai',input)).status,401);
    const member=await s.createMember('ai-user@example.test','12345678',owner.token);let login=await s.login('ai-user@example.test','12345678');
    assert.equal((await s.api('ai',input,login.token)).status,403);
    const created=await s.api('ai',input,owner.token);assert.equal(created.status,201,await created.clone().text());const job=await created.json();
    assert.ok(!s.env.DB.db.prepare('SELECT request_cipher FROM ai_jobs').get().request_cipher.includes('PRIVATE CHAT QUESTION'));
    assert.equal((await s.api('ai',input,owner.token)).status,409);
    const claimed=await(await agentAPI('poll',{capabilities:['ai-chat-v1']})).json();assert.equal(claimed.ai.id,job.id);assert.equal(claimed.ai.messages[0].content,input.messages[0].content);
    assert.equal((await agentAPI('ai/update',{id:job.id,lease:'0'.repeat(64),status:'completed',content:'FORGED'})).status,200);
    assert.equal((await(await s.api('ai?id='+job.id,undefined,owner.token)).json()).status,'running');
    await executeAI({post:(path,data)=>agentAPI(path,data).then(response=>response.json())},claimed.ai,{chat:async()=>'<script>PRIVATE LOCAL ANSWER</script>'});
    const result=await(await s.api('ai?id='+job.id,undefined,owner.token)).json();assert.equal(result.status,'completed');assert.equal(result.content,'<script>PRIVATE LOCAL ANSWER</script>');
    assert.ok(!s.env.DB.db.prepare('SELECT result_cipher FROM ai_jobs').get().result_cipher.includes('PRIVATE LOCAL ANSWER'));
    const policy=profilePolicy('none');policy.grants=['ai.use','agents.read'];
    assert.equal((await s.api('users/permissions',{id:member.user.id,policy,revision:1},owner.token)).status,200);
    login=await s.login('ai-user@example.test','12345678');assert.equal((await s.api('ai?id='+job.id,undefined,login.token)).status,404);
    const next=await(await s.api('ai',input,owner.token)).json();const cancelled=await(await agentAPI('poll',{capabilities:['ai-chat-v1']})).json();await s.api('ai/cancel',{id:next.id},owner.token);
    assert.equal((await(await agentAPI('ai/update',{id:next.id,lease:cancelled.ai.lease,status:'completed',content:'late'})).json()).accepted,false);
    const third=await(await s.api('ai',input,owner.token)).json();const running=await(await agentAPI('poll',{capabilities:['ai-chat-v1']})).json();
    assert.equal((await s.api('logout',{},owner.token)).status,200);
    assert.equal((await(await agentAPI('ai/update',{id:third.id,lease:running.ai.lease,status:'running'})).json()).accepted,false);
  }finally{s.env.DB.db.close();}
});
