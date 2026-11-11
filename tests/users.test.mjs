import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {create,workspaceMaterial,importWorkspaceMaterial,openWithKey} from '../browser/crypto.js';
import {normalizeUsername,usernameHash} from '../server/lib/wolfguard/users.mjs';
import {seal} from '../server/lib/wolfguard/access.mjs';
import {encodeSecret,otpAt,matchingStep} from '../server/lib/wolfguard/otp.mjs';
import {validSubscription,decisionMessage,inspectMessage} from '../server/lib/wolfguard/push.mjs';
import {buildPushPayload} from '../server/vendor/webpush.mjs';
import {profilePolicy} from '../server/lib/wolfguard/permissions.mjs';

test('remote chat uses a fixed model without an agent and keeps the provider key server-side',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const added=await s.createMember('api-chat@example.test','12345678',owner.token);let member=await s.login('api-chat@example.test','12345678');
    assert.equal((await s.api('chat/settings')).status,401);
    assert.equal((await s.api('chat/settings',undefined,member.token)).status,403);
    const policy=profilePolicy('none');policy.sections.tools='write';
    await s.api('users/permissions',{id:added.user.id,revision:1,policy},owner.token);member=await s.login('api-chat@example.test','12345678');
    assert.equal((await s.api('chat/settings',{key:'x'.repeat(32),revision:0},member.token)).status,403);
    assert.equal((await s.api('chat/completions',{messages:[{role:'user',content:'Hi'}]},member.token)).status,503);
    const key='synthetic_private_provider_key_123456789',calls=[];let providerStatus=200;
    s.env.LOCAL_TEST_ORIGIN='http://127.0.0.1:4178';
    s.env.CHAT_TEST_FETCH=async(url,options)=>{
      calls.push({url,options,data:JSON.parse(options.body)});
      if(providerStatus!==200)return Response.json({error:key},{status:providerStatus});
      if(!calls.at(-1).data.stream)return Response.json({choices:[{message:{content:'OK'}}]});
      return new Response('data: {"choices":[{"delta":{"reasoning":"PRIVATE REASONING","content":"Bonjour"}}]}\n\ndata: {"choices":[{"delta":{"content":" été"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
    };
    providerStatus=401;const rejected=await s.api('chat/settings',{key,revision:0},owner.token);assert.equal(rejected.status,502);assert.ok(!(await rejected.text()).includes(key));
    assert.equal((await(await s.api('chat/settings',undefined,owner.token)).json()).configured,false);
    providerStatus=200;const configured=await(await s.api('chat/settings',{key,revision:0},owner.token)).json();assert.equal(configured.configured,true);assert.ok(!JSON.stringify(configured).includes(key));
    const disk=JSON.stringify(s.env.DB.db.prepare('SELECT * FROM chat_api_config').get());assert.ok(!disk.includes(key));
    const input={messages:[{role:'user',content:'PRIVATE QUESTION',attachment:'PRIVATE VAULT'}],model:'arbitrary',url:'https://evil.invalid',key:'ATTACKER KEY'};
    const response=await s.api('chat/completions',input,member.token);assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),/text\/event-stream/);
    const blocked=await s.api('chat/completions',input,member.token);assert.equal(blocked.status,429);
    const stream=await response.text();assert.ok(stream.includes('Bonjour'));assert.ok(stream.includes('été'));assert.ok(stream.includes('"type":"done"'));assert.ok(!stream.includes(key)&&!stream.includes('PRIVATE REASONING'));
    const upstream=calls.at(-1);assert.equal(upstream.url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(upstream.options.headers.Authorization,'Bearer '+key);assert.equal(upstream.data.model,'openai/gpt-oss-120b');assert.equal(upstream.data.include_reasoning,false);assert.deepEqual(upstream.data.messages.at(-1),{role:'user',content:'PRIVATE QUESTION'});assert.ok(!JSON.stringify(upstream.data).includes('PRIVATE VAULT'));assert.ok(!JSON.stringify(upstream.data).includes(member.user.id));
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM scan_agents').get().n,0);
    assert.equal(s.env.DB.db.prepare('SELECT lease_until FROM chat_api_usage WHERE user_id=?').get(member.user.id).lease_until,0);
    providerStatus=429;const quota=await s.api('chat/completions',input,member.token);assert.equal(quota.status,429);assert.ok(!(await quota.text()).includes(key));
    providerStatus=200;const cancelled=await s.api('chat/completions',input,member.token);await cancelled.body.cancel();assert.equal(s.env.DB.db.prepare('SELECT lease_until FROM chat_api_usage WHERE user_id=?').get(member.user.id).lease_until,0);
    for(let i=0;i<7;i++){const r=await s.api('chat/completions',input,member.token);if(r.ok)await r.text();}
    assert.equal((await s.api('chat/completions',input,member.token)).status,429);
    assert.equal((await s.api('chat/settings',{remove:true,revision:0},owner.token)).status,409);
    assert.equal((await s.api('chat/settings',{remove:true,revision:1},owner.token)).status,200);
    assert.equal((await(await s.api('chat/settings',undefined,member.token)).json()).configured,false);
  }finally{s.env.DB.db.close();}
});

test('classic MFA uses the existing six-digit code even when a previous Duo setup and browser phone exist',async()=>{
  const s=await setup();try{
    const phone=await phoneSetup(s),stored=s.env.DB.db.prepare('SELECT otp_secret_cipher FROM users WHERE id=?').get(phone.owner.user.id).otp_secret_cipher;
    s.env.MFA_REQUIRED='1';s.env.MFA_BROWSER_PUSH_ENABLED='0';s.env.MFA_PHONE_REQUIRED='1';
    s.env.DB.db.prepare("UPDATE duo_config SET enabled=1,config_cipher='retired-provider-must-not-be-read',revision=1 WHERE id=1").run();
    s.advance(30001);
    const challenge=await(await s.api('login',{code:'09876543'})).json();assert.equal(challenge.otpRequired,true);assert.ok(!challenge.token&&!challenge.duoRequired&&!challenge.pushRequired&&!challenge.phoneSetupRequired&&!challenge.phoneEnrollment);
    const valid=await otpAt(phone.secret,Math.floor(s.clock()/30000));
    assert.equal((await s.api('login',{code:'09876543',otp:valid==='000000'?'111111':'000000'})).status,401);s.advance(10001);
    const response=await s.api('login',{code:'09876543',otp:await otpAt(phone.secret,Math.floor(s.clock()/30000))});assert.equal(response.status,200,await response.clone().text());const result=await response.json();assert.ok(result.token);assert.equal(result.user.mfa.primary,'authenticator');assert.equal(result.user.mfa.phone,false);assert.equal(result.user.mfa.complete,true);
    assert.equal(s.env.DB.db.prepare('SELECT otp_secret_cipher FROM users WHERE id=?').get(phone.owner.user.id).otp_secret_cipher,stored);
    assert.equal((await s.api('users/duo',undefined,result.token)).status,410);assert.equal((await s.api('duo/poll',{ticket:'old-request'})).status,410);assert.equal((await s.api('duo/callback?state=old&code=old')).status,410);
    assert.equal((await s.api('users/push',undefined,result.token)).status,410);
  }finally{s.env.DB.db.close();}
});

test('chat histories are private per user, encrypted, resumable and only the admin can purge them',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const added=await s.createMember('chat@example.test','12345678',owner.token),member=await s.login('chat@example.test','12345678');
    assert.equal((await s.api('chat/history')).status,401);
    assert.equal((await s.api('chat/history',undefined,member.token)).status,403);
    const policy=profilePolicy('none');policy.sections.tools='write';
    assert.equal((await s.api('users/permissions',{id:added.user.id,revision:1,policy},owner.token)).status,200);
    member.token=(await s.login('chat@example.test','12345678')).token;
    const data={id:'c'.repeat(32),epoch:0,revision:0,messages:[{role:'user',content:'PRIVATE CHAT TITLE'},{role:'assistant',content:'PRIVATE ANSWER'}]};
    assert.equal((await s.api('chat/history/save',data,member.token)).status,200);
    const list=await(await s.api('chat/history',undefined,member.token)).json();assert.equal(list.conversations[0].title,'PRIVATE CHAT TITLE');
    assert.equal((await(await s.api('chat/history',undefined,owner.token)).json()).conversations.length,0);
    assert.equal((await s.api('chat/history?id='+data.id,undefined,owner.token)).status,404);
    assert.equal((await s.api('chat/history/save',data,owner.token)).status,409);
    const relogin=await s.login('chat@example.test','12345678');
    const detail=await(await s.api('chat/history?id='+data.id,undefined,relogin.token)).json();assert.deepEqual(detail.messages,data.messages);assert.equal(detail.revision,1);
    const disk=JSON.stringify(s.env.DB.db.prepare('SELECT * FROM chat_conversations').all());assert.ok(!disk.includes('PRIVATE CHAT TITLE')&&!disk.includes('PRIVATE ANSWER'));
    assert.equal((await s.api('chat/history/save',data,relogin.token)).status,409);
    assert.equal((await s.api('chat/history/save',{...data,revision:1,messages:[...data.messages,{role:'user',content:'Suite'},{role:'assistant',content:'La suite'}]},member.token)).status,200);
    assert.equal((await s.api('chat/history/purge',{confirm:'DELETE_ALL_CHAT_HISTORY'},member.token)).status,403);
    assert.equal((await s.api('chat/history/purge',{},owner.token)).status,400);
    assert.equal((await s.api('chat/history/save',{...data,id:'d'.repeat(32)},owner.token)).status,200);
    assert.equal((await s.api('chat/history/purge',{confirm:'DELETE_ALL_CHAT_HISTORY'},owner.token)).status,200);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM chat_conversations').get().n,0);
    assert.equal((await s.api('chat/history/save',{...data,revision:2},member.token)).status,409);
    assert.equal((await s.api('chat/history/save',{...data,id:'e'.repeat(32)},owner.token)).status,409);
    const epoch=(await(await s.api('chat/history',undefined,member.token)).json()).epoch;assert.equal(epoch,1);
    assert.equal((await s.api('chat/history/save',{...data,epoch},member.token)).status,200);
    assert.equal((await s.api('chat/history/delete',{id:data.id,epoch,revision:1},owner.token)).status,409);
    assert.equal((await s.api('chat/history/delete',{id:data.id,epoch,revision:1},member.token)).status,200);
    assert.equal((await s.api('chat/history/save',{...data,epoch,revision:1},member.token)).status,409);
  }finally{s.env.DB.db.close();}
});

test('a purge racing history encryption prevents the old write from committing',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const prepare=s.env.DB.prepare.bind(s.env.DB);let intercepted=false;
    s.env.DB.prepare=sql=>{const statement=prepare(sql);if(sql.startsWith('INSERT INTO chat_conversations')){const run=statement.run.bind(statement);statement.run=async()=>{intercepted=true;assert.equal((await s.api('chat/history/purge',{confirm:'DELETE_ALL_CHAT_HISTORY'},owner.token)).status,200);return run();};}return statement;};
    const response=await s.api('chat/history/save',{id:'c'.repeat(32),epoch:0,revision:0,messages:[{role:'user',content:'Effacer'},{role:'assistant',content:'Ancienne réponse'}]},owner.token);
    assert.ok(intercepted);assert.equal(response.status,409);assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM chat_conversations').get().n,0);
    assert.equal((await s.api('chat/history/save',{id:'a'.repeat(32),epoch:1,revision:0,messages:[{role:'user',content:'Only a question'}]},owner.token)).status,400);
  }finally{s.env.DB.db.close();}
});

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

test('first admin migration retains the encrypted workspace, requires a distinct code, and closes the shared-code path',async()=>{
  const s=await setup();try{
    const old=await(await s.api('login',{code:'07942685'})).json();
    const result=await s.initialize();assert.equal(result.status,200);const admin=await result.json();assert.equal(admin.user.role,'admin');
    const login=await s.login('CANTIN.BRUNO@GMX.FR','09876543');const imported=await importWorkspaceMaterial(login.workspace);
    assert.equal(imported.key.extractable,false);assert.deepEqual((await openWithKey(await(await s.api('vault',undefined,login.token)).json(),imported.key,imported.salt)).payload.items,s.payload.items.map(item=>({...item,accessLevel:'write'})));
    assert.equal((await s.api('touch',{},old.token)).status,401);
    assert.equal((await s.api('login',{code:'07942685'})).status,401);
    assert.equal((await s.api('users/initialize',{username:'takeover'},login.token)).status,409);
    const disk=JSON.stringify(s.env.DB.db.prepare('SELECT * FROM users').all())+JSON.stringify(s.env.DB.db.prepare('SELECT workspace_key_cipher FROM vault').get());
    for(const value of ['cantin.bruno@gmx.fr','09876543',s.material.key])assert.ok(!disk.includes(value));
  }finally{s.env.DB.db.close();}
});

test('members have independent credentials and can read the workspace but cannot manage users, sessions or associations',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    await s.createMember('Alice@example.test','12345678',owner.token);
    const member=await s.login('alice@example.test','12345678');assert.equal(member.user.username,'alice@example.test');
    assert.equal((await s.api('vault',undefined,member.token)).status,200);assert.equal((await s.api('agents',undefined,member.token)).status,200);
    for(const [path,body]of[['users',undefined],['users/create',{username:'rogue',code:'23456789',role:'admin'}],['access',undefined],['access/block',{ip:'192.0.2.5'}],['agents/pair',{}],['agents/revoke',{id:'a'.repeat(32)}]])assert.equal((await s.api(path,body,member.token)).status,403,path);
    const rows=await(await s.api('access',undefined,owner.token)).json();assert.ok(rows.connections.some(row=>row.username==='alice@example.test'));
  }finally{s.env.DB.db.close();}
});

test('admin can disable, enable, rename, reset and remove a user without changing shared data or other accounts',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const added=await s.createMember('alice@example.test','12345678',owner.token),id=added.user.id;
    const member=await s.login('alice@example.test','12345678');
    assert.equal((await s.api('users/update',{id,username:'alice@example.test',role:'member',disabled:true},owner.token)).status,200);
    assert.equal((await s.api('touch',{},member.token)).status,401);assert.equal((await s.api('login',{username:'alice@example.test',code:'12345678'})).status,403);
    assert.equal((await s.api('users/update',{id,username:'alicia@example.test',role:'member',disabled:false},owner.token)).status,200);
    const active=await s.login('alicia@example.test','12345678');
    const reset=await(await s.api('users/reset-code',{id},owner.token)).json();assert.equal((await s.api('touch',{},active.token)).status,401);assert.equal((await s.api('account/complete',{ticket:reset.invitation.ticket,username:'alicia@example.test',code:'23456789'})).status,200);
    await s.login('alicia@example.test','23456789');assert.equal((await s.api('touch',{},owner.token)).status,200);
    assert.equal(s.env.DB.db.prepare('SELECT version FROM vault').get().version,1);
    assert.equal((await s.api('users/delete',{id},owner.token)).status,200);assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM users').get().n,1);
  }finally{s.env.DB.db.close();}
});

test('personal code changes retain the non-extractable workspace key and revoke only that account sessions',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    await s.createMember('alice@example.test','12345678',owner.token);
    const a=await s.login('alice@example.test','12345678'),b=await s.login('alice@example.test','12345678');
    const response=await s.api('users/change-code',{oldCode:'12345678',code:'23456789'},a.token);assert.equal(response.status,200);const changed=await response.json();
    assert.equal((await s.api('touch',{},a.token)).status,401);assert.equal((await s.api('touch',{},b.token)).status,401);
    assert.equal((await s.api('touch',{},changed.token)).status,200);assert.equal((await s.api('touch',{},owner.token)).status,200);
    assert.deepEqual((await s.login('alice@example.test','23456789')).workspace,a.workspace);assert.notDeepEqual(a.workspace,s.material);
  }finally{s.env.DB.db.close();}
});

test('email identifiers are validated and normalized without accepting legacy names',()=>{
  assert.equal(normalizeUsername(' CANTIN.BRUNO@GMX.FR '),'cantin.bruno@gmx.fr');
  assert.equal(normalizeUsername('alice+wolf@example.test'),'alice+wolf@example.test');
  for(const name of ['admin','alice','a@@example.test','a@localhost','a..b@example.test','.a@example.test','a@-example.test','a@example..test','a@ex ample.test','a\n@example.test'])assert.equal(normalizeUsername(name),null,name);
});

test('the owner is the sole immutable administrator and every other account remains a member',async()=>{
  const s=await setup();try{
    assert.equal((await s.api('users/initialize',{username:'other@example.test',code:'09876543',oldCode:'07942685',workspace:s.material,version:1},s.owner.token)).status,400);
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543'),id=owner.user.id;
    assert.equal((await s.api('users/create',{username:'second@example.test',code:'87654321',role:'admin'},owner.token)).status,403);
    assert.equal((await s.api('users/create',{username:'cantin.bruno@gmx.fr',code:'87654321'},owner.token)).status,409);
    assert.equal((await s.api('users/create',{username:'not-an-email',code:'87654321'},owner.token)).status,400);
    const member=await(await s.api('users/create',{username:'second@example.test'},owner.token)).json();assert.equal(member.user.role,'member');
    assert.equal((await s.api('users/update',{id:member.user.id,username:'second@example.test',role:'admin',disabled:false},owner.token)).status,403);
    assert.equal((await s.api('users/update',{id:member.user.id,username:'cantin.bruno@gmx.fr',role:'member',disabled:false},owner.token)).status,403);
    for(const change of [{username:'other@example.test',role:'admin',disabled:false},{username:'cantin.bruno@gmx.fr',role:'member',disabled:false},{username:'cantin.bruno@gmx.fr',role:'admin',disabled:true}])assert.equal((await s.api('users/update',{id,...change},owner.token)).status,409);
    assert.equal((await s.api('users/delete',{id},owner.token)).status,409);
    assert.equal(s.env.DB.db.prepare("SELECT COUNT(*) n FROM users WHERE role='admin'").get().n,1);
  }finally{s.env.DB.db.close();}
});

test('the previous first admin is renamed once, retaining its code and data; other admins lose their sessions and rights',async()=>{
  const s=await setup();try{
    await s.initialize();const ownerId=s.env.DB.db.prepare('SELECT id FROM users').get().id;
    s.env.DB.db.prepare('UPDATE vault SET owner_user_id=NULL').run();
    s.env.DB.db.prepare('UPDATE users SET name_hash=?,name_cipher=? WHERE id=?').run(await usernameHash('old-admin',s.env),await seal('old-admin','WolfGuard users v1:name:'+ownerId,s.env),ownerId);
    const otherId='b'.repeat(32),otherToken='c'.repeat(64),otherHash=createHash('sha256').update(otherToken).digest('hex');
    s.env.DB.db.prepare("INSERT INTO users(id,name_hash,name_cipher,role,pin_salt,pin_hash,created_at,updated_at) SELECT ?,?,?,'admin',pin_salt,pin_hash,created_at+1,updated_at FROM users WHERE id=?").run(otherId,await usernameHash('other@example.test',s.env),await seal('other@example.test','WolfGuard users v1:name:'+otherId,s.env),ownerId);
    s.env.DB.db.prepare('INSERT INTO sessions(token_hash,generation,expires_at,active_at,user_id,user_version) SELECT ?,generation,expires_at,active_at,?,user_version FROM sessions LIMIT 1').run(otherHash,otherId);
    const me=await(await s.api('me',undefined,s.owner.token)).json();assert.equal(me.user.id,ownerId);assert.equal(me.user.username,'cantin.bruno@gmx.fr');assert.equal(me.user.role,'admin');
    assert.equal((await s.api('touch',{},otherToken)).status,401);
    const former=await s.login('other@example.test','09876543');assert.equal(former.user.role,'member');assert.equal((await s.api('access',undefined,former.token)).status,403);
    assert.equal((await s.login('cantin.bruno@gmx.fr','09876543')).user.id,ownerId);
    assert.equal(s.env.DB.db.prepare('SELECT version,owner_user_id FROM vault').get().version,1);
    assert.equal(s.env.DB.db.prepare("SELECT COUNT(*) n FROM users WHERE role='admin'").get().n,1);
  }finally{s.env.DB.db.close();}
});

test('provisioning creates exactly one owner from the existing verifier; first login binds the shared key without changing the code',async()=>{
  const s=await setup();try{
    const before=s.env.DB.db.prepare('SELECT * FROM vault').get();
    await Promise.all([s.api('status'),s.api('status')]);
    const rows=s.env.DB.db.prepare('SELECT * FROM users').all();assert.equal(rows.length,1);assert.equal(rows[0].role,'admin');assert.equal(rows[0].pin_hash,before.pin_hash);assert.equal(rows[0].pin_salt,before.pin_salt);
    assert.equal(s.env.DB.db.prepare('SELECT owner_user_id FROM vault').get().owner_user_id,rows[0].id);
    assert.equal((await s.api('login',{code:'07942685'})).status,200);
    const owner=await s.login('cantin.bruno@gmx.fr','07942685');assert.equal(owner.usersEnabled,false);assert.equal(owner.user.id,rows[0].id);
    const response=await s.api('users/initialize',{username:'cantin.bruno@gmx.fr',code:'07942685',oldCode:'07942685',workspace:s.material,version:1},owner.token);assert.equal(response.status,200);
    const active=await s.login('cantin.bruno@gmx.fr','07942685');assert.equal(active.usersEnabled,true);assert.notDeepEqual(active.workspace,s.material);
    assert.equal((await s.api('touch',{},s.owner.token)).status,401);
    const after=s.env.DB.db.prepare('SELECT * FROM vault').get();assert.equal(after.object_key,before.object_key);assert.equal(after.version,before.version);assert.equal(after.generation,before.generation);
    await s.api('status');assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM users').get().n,1);
  }finally{s.env.DB.db.close();}
});

test('only one of two concurrent first logins can bind the key; the losing session is revoked',async()=>{
  const s=await setup();try{
    await s.api('status');const a=await s.login('cantin.bruno@gmx.fr','07942685'),b=await s.login('cantin.bruno@gmx.fr','07942685');
    const data={username:'cantin.bruno@gmx.fr',code:'07942685',oldCode:'07942685',workspace:s.material,version:1};
    const result=await Promise.all([s.api('users/initialize',data,a.token),s.api('users/initialize',data,b.token)]);
    assert.deepEqual(result.map(r=>r.status).sort(),[200,429]);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM sessions').get().n,1);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM users').get().n,1);
  }finally{s.env.DB.db.close();}
});

test('admin supplies only an email; a one-time invitation lets its user choose the code and unlock the common base',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    assert.equal((await s.api('users/create',{username:'new@example.test',code:'12345678'},owner.token)).status,400);
    const response=await s.api('users/create',{username:'new@example.test'},owner.token);assert.equal(response.status,201);const added=await response.json(),ticket=added.invitation.ticket;
    assert.equal(added.user.credentialPending,true);assert.match(ticket,/^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(s.env.DB.db.prepare('SELECT * FROM users').all()).includes(ticket));
    const inspection=await(await s.api('account/inspect',{ticket})).json();assert.deepEqual(Object.keys(inspection),['expiresAt']);
    assert.equal((await s.api('login',{username:'new@example.test',code:'12345678'})).status,401);s.advance(5001);
    assert.equal((await s.api('account/complete',{ticket,username:'wrong@example.test',code:'12345678'})).status,400);
    assert.equal((await s.api('account/complete',{ticket,username:'new@example.test',code:'short'})).status,400);
    assert.deepEqual(await(await s.api('account/complete',{ticket,username:'new@example.test',code:'12345678'})).json(),{ok:true});
    assert.equal((await s.api('account/inspect',{ticket})).status,410);assert.equal((await s.api('account/complete',{ticket,username:'new@example.test',code:'23456789'})).status,410);
    const member=await s.login('new@example.test','12345678');assert.notDeepEqual(member.workspace,s.material);assert.equal(member.user.permissions.admin,false);assert.equal(Object.values(member.user.permissions.sections).every(level=>level==='deny'),true);assert.equal(member.user.role,'member');assert.equal(member.user.credentialPending,false);
    assert.equal((await s.api('access',undefined,member.token)).status,403);
    assert.equal(s.env.DB.db.prepare('SELECT version FROM vault').get().version,1);
  }finally{s.env.DB.db.close();}
});

test('reset immediately revokes sessions and the old code, invalidates previous links, and requires a new user-chosen code',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543'),added=await s.createMember('alice@example.test','12345678',owner.token),id=added.user.id;
    const member=await s.login('alice@example.test','12345678');
    assert.equal((await s.api('users/reset-code',{id,code:'23456789'},owner.token)).status,400);
    const reset=await(await s.api('users/reset-code',{id},owner.token)).json();assert.match(reset.invitation.ticket,/^[a-f0-9]{64}$/);
    assert.equal((await s.api('touch',{},member.token)).status,401);
    assert.equal((await s.api('login',{username:'alice@example.test',code:'12345678'})).status,401);s.advance(5001);
    const next=await(await s.api('users/reset-code',{id},owner.token)).json();assert.equal((await s.api('account/inspect',{ticket:reset.invitation.ticket})).status,410);
    assert.equal((await s.api('account/complete',{ticket:next.invitation.ticket,username:'alice@example.test',code:'23456789'})).status,200);
    const active=await s.login('alice@example.test','23456789');assert.notDeepEqual(active.workspace,s.material);assert.equal((await s.api('touch',{},owner.token)).status,200);
    assert.equal((await s.api('users/reset-code',{id:owner.user.id},owner.token)).status,409);
  }finally{s.env.DB.db.close();}
});

test('expired, disabled, deleted or concurrently consumed invitations never grant access',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const add=async name=>(await(await s.api('users/create',{username:name},owner.token)).json());
    const disabled=await add('disabled@example.test');await s.api('users/update',{id:disabled.user.id,username:'disabled@example.test',disabled:true},owner.token);
    assert.equal((await s.api('account/inspect',{ticket:disabled.invitation.ticket})).status,410);
    assert.equal((await s.api('account/complete',{ticket:disabled.invitation.ticket,username:'disabled@example.test',code:'12345678'})).status,410);
    const deleted=await add('deleted@example.test');await s.api('users/delete',{id:deleted.user.id},owner.token);assert.equal((await s.api('account/inspect',{ticket:deleted.invitation.ticket})).status,410);
    const race=await add('race@example.test'),codes=['12345678','23456789'];
    const responses=await Promise.all(codes.map(code=>s.api('account/complete',{ticket:race.invitation.ticket,username:'race@example.test',code})));
    assert.deepEqual(responses.map(r=>r.status).sort(),[200,410]);await s.login('race@example.test',codes[responses.findIndex(r=>r.status===200)]);
    const expired=await add('expired@example.test');s.advance(24*60*60000+1);assert.equal((await s.api('account/inspect',{ticket:expired.invitation.ticket})).status,410);
    assert.equal((await s.api('account/complete',{ticket:expired.invitation.ticket,username:'expired@example.test',code:'12345678'})).status,410);
  }finally{s.env.DB.db.close();}
});

test('an unbound invitation creates a member with their chosen email and code exactly once',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    assert.equal((await s.api('users/invite',{})).status,401);
    const response=await s.api('users/invite',{},owner.token);assert.equal(response.status,201);
    const {invitation}=await response.json(),ticket=invitation.ticket;
    assert.match(ticket,/^[a-f0-9]{64}$/);assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM users').get().n,1);
    assert.ok(!JSON.stringify(s.env.DB.db.prepare('SELECT * FROM user_invitations').all()).includes(ticket));
    const listed=await(await s.api('users',undefined,owner.token)).json();assert.equal(listed.invitations[0].id,invitation.id);assert.ok(!JSON.stringify(listed).includes(ticket));
    for(let i=0;i<2;i++)assert.deepEqual(await(await s.api('account/inspect',{ticket})).json(),{expiresAt:invitation.expiresAt});
    for(const data of [{username:'invalid',code:'12345678'},{username:'member@example.test',code:'short'}])assert.equal((await s.api('account/complete',{ticket,...data})).status,400);
    assert.equal((await s.api('account/complete',{ticket,username:'cantin.bruno@gmx.fr',code:'12345678'})).status,409);
    assert.equal((await s.api('account/inspect',{ticket})).status,200);
    assert.equal((await s.api('account/complete',{ticket,username:' MEMBER@EXAMPLE.TEST ',code:'12345678',role:'admin'})).status,200);
    const member=await s.login('member@example.test','12345678');assert.equal(member.user.role,'member');assert.notDeepEqual(member.workspace,s.material);assert.equal(member.user.permissions.admin,false);assert.equal(Object.values(member.user.permissions.sections).every(level=>level==='deny'),true);
    assert.equal((await s.api('users/invite',{},member.token)).status,403);
    assert.equal((await s.api('users/revoke-invitation',{id:invitation.id},member.token)).status,403);
    assert.equal((await s.api('account/inspect',{ticket})).status,410);
    assert.equal((await s.api('account/complete',{ticket,username:'other@example.test',code:'23456789'})).status,410);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM users').get().n,2);
    assert.equal((await(await s.api('users',undefined,owner.token)).json()).invitations.length,0);
  }finally{s.env.DB.db.close();}
});

test('unbound invitations reject replay races, cancellation and expiry and roll back on failure',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const invite=async()=>(await(await s.api('users/invite',{},owner.token)).json()).invitation;
    const race=await invite(),emails=['race-a@example.test','race-b@example.test'];
    const responses=await Promise.all(emails.map(username=>s.api('account/complete',{ticket:race.ticket,username,code:'12345678'})));
    assert.deepEqual(responses.map(row=>row.status).sort(),[200,410]);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM users').get().n,2);
    await s.login(emails[responses.findIndex(row=>row.status===200)],'12345678');
    const rollback=await invite();s.env.DB.db.exec("CREATE TRIGGER fail_invite_consume BEFORE DELETE ON user_invitations BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
    assert.equal((await s.api('account/complete',{ticket:rollback.ticket,username:'rollback@example.test',code:'23456789'})).status,503);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM users').get().n,2);
    s.env.DB.db.exec('DROP TRIGGER fail_invite_consume');assert.equal((await s.api('account/inspect',{ticket:rollback.ticket})).status,200);
    assert.equal((await s.api('users/revoke-invitation',{id:rollback.id},owner.token)).status,200);
    assert.equal((await s.api('account/complete',{ticket:rollback.ticket,username:'rollback@example.test',code:'23456789'})).status,410);
    const expired=await invite();s.advance(24*60*60000+1);
    assert.equal((await s.api('account/inspect',{ticket:expired.ticket})).status,410);
    assert.equal((await s.api('account/complete',{ticket:expired.ticket,username:'expired@example.test',code:'12345678'})).status,410);
  }finally{s.env.DB.db.close();}
});

test('unbound invitation issuance and redemption respect the account limit',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const {invitation}=await(await s.api('users/invite',{},owner.token)).json();
    const seed=s.env.DB.db.prepare("INSERT INTO users(id,name_hash,name_cipher,role,pin_salt,pin_hash,created_at,updated_at) VALUES (?,?,?,'member','salt','hash',0,0)");
    for(let i=0;i<99;i++){const id=i.toString(16).padStart(32,'0');seed.run(id,'synthetic-'+i,await seal('synthetic-'+i+'@example.test','WolfGuard users v1:name:'+id,s.env));}
    assert.equal((await s.api('users/invite',{},owner.token)).status,409);
    assert.equal((await s.api('account/complete',{ticket:invitation.ticket,username:'full@example.test',code:'12345678'})).status,409);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM users').get().n,100);
    assert.equal((await s.api('account/inspect',{ticket:invitation.ticket})).status,200);
  }finally{s.env.DB.db.close();}
});

test('identical codes select the account by its own MFA and reject replay or ambiguous factors',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const a=await s.createMember('alice@example.test','12345678',owner.token),b=await s.createMember('bob@example.test','12345678',owner.token);
    const secrets=[encodeSecret(new Uint8Array(20).fill(1)),encodeSecret(new Uint8Array(20).fill(2))];
    for(const [i,account] of [a,b].entries())s.env.DB.db.prepare('UPDATE users SET otp_secret_cipher=? WHERE id=?').run(await seal(secrets[i],'WolfGuard OTP v1:'+account.user.id,s.env),account.user.id);
    assert.deepEqual(await(await s.api('login',{code:'12345678'})).json(),{otpRequired:true});
    for(let i=0;i<2;i++){s.advance(60000);const otp=await otpAt(secrets[i],Math.floor(s.clock()/30000)),reply=await s.api('login',{code:'12345678',otp});assert.equal(reply.status,200);assert.equal((await reply.json()).user.id,[a,b][i].user.id);assert.equal((await s.api('login',{code:'12345678',otp})).status,401);s.advance(5001);}
    s.env.DB.db.prepare('UPDATE users SET otp_secret_cipher=? WHERE id=?').run(await seal(secrets[0],'WolfGuard OTP v1:'+b.user.id,s.env),b.user.id);s.advance(60000);
    assert.equal((await s.api('login',{code:'12345678',otp:await otpAt(secrets[0],Math.floor(s.clock()/30000))})).status,401);
  }finally{s.env.DB.db.close();}
});
test('TOTP matches RFC 6238 SHA-1 vectors including dates beyond 2038, with limited clock drift',async()=>{
  const secret=encodeSecret(new TextEncoder().encode('12345678901234567890'));
  for(const [seconds,code]of [[59,'287082'],[1111111109,'081804'],[1111111111,'050471'],[1234567890,'005924'],[2000000000,'279037'],[20000000000,'353130']])assert.equal(await otpAt(secret,Math.floor(seconds/30)),code);
  const step=1000000,code=await otpAt(secret,step);
  assert.equal(await matchingStep(secret,code,(step+1)*30000),step);
  assert.equal(await matchingStep(secret,code,(step+2)*30000),null);
  assert.equal(await matchingStep(secret,code,step*30000,step),null);
});

test('Authenticator enrollment, encrypted secrets, OTP gates, replay protection and recovery codes',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const other=await s.login('cantin.bruno@gmx.fr','09876543');
    const setupResponse=await s.api('users/otp/setup',{code:'09876543'},owner.token);assert.equal(setupResponse.status,200);
    const enrollment=await setupResponse.json();assert.match(enrollment.secret,/^[A-Z2-7]{32}$/);assert.match(enrollment.uri,/^otpauth:\/\/totp\//);
    let step=Math.floor(s.clock()/30000),otp=await otpAt(enrollment.secret,step);
    const enabled=await s.api('users/otp/enable',{code:'09876543',otp},owner.token);assert.equal(enabled.status,200);
    const {recoveryCodes}=await enabled.json();assert.equal(recoveryCodes.length,8);assert.equal(new Set(recoveryCodes).size,8);
    const disk=JSON.stringify(s.env.DB.db.prepare('SELECT * FROM users').all());assert.ok(!disk.includes(enrollment.secret));for(const code of recoveryCodes)assert.ok(!disk.includes(code));
    assert.equal((await s.api('touch',{},other.token)).status,200);
    assert.deepEqual(await(await s.api('login',{code:'09876543'})).json(),{otpRequired:true});
    // A password-only success never clears failures from wrong OTP attempts.
    assert.equal((await s.api('login',{code:'09876543',otp})).status,401);s.advance(5001);
    assert.deepEqual(await(await s.api('login',{code:'09876543'})).json(),{otpRequired:true});
    assert.equal((await s.api('login',{code:'09876543',otp:'invalid'})).status,401);
    assert.equal(s.env.DB.db.prepare('SELECT failures FROM vault').get().failures,2);s.advance(10001);
    s.advance(60000);step=Math.floor(s.clock()/30000);otp=await otpAt(enrollment.secret,step);
    const good=await s.api('login',{code:'09876543',otp});assert.equal(good.status,200);const logged=await good.json();assert.ok(logged.token);assert.notDeepEqual(logged.workspace,s.material);
    assert.equal((await s.api('login',{code:'09876543',otp})).status,401);s.advance(5001);
    const recovery=await s.api('login',{code:'09876543',otp:recoveryCodes[0]});assert.equal(recovery.status,200);
    assert.equal((await s.api('login',{code:'09876543',otp:recoveryCodes[0]})).status,401);s.advance(5001);
    assert.equal((await s.api('users/otp/disable',{code:'09876543',otp:recoveryCodes[1]},logged.token)).status,200);
    assert.equal((await s.api('login',{code:'09876543'})).status,200);
  }finally{s.env.DB.db.close();}
});

test('mandatory MFA enrolls every account before issuing a session and each new session verifies its own factor',async()=>{
  const s=await setup();try{
    await s.initialize();const legacy=await s.login('cantin.bruno@gmx.fr','09876543');
    s.env.MFA_REQUIRED='1';s.env.MFA_PUSH_PRIMARY='1';
    assert.equal((await s.api('me',undefined,legacy.token)).status,401);
    const count=s.env.DB.db.prepare('SELECT COUNT(*) n FROM sessions').get().n;
    const challenge=await(await s.api('login',{code:'09876543'})).json();assert.equal(challenge.otpSetupRequired,true);assert.ok(!challenge.token&&!challenge.workspace);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM sessions').get().n,count);
    assert.equal((await s.api('login',{code:'09876543',otp:'invalid'})).status,401);s.advance(5001);
    const activated=await s.api('login',{code:'09876543',otp:await otpAt(challenge.secret,Math.floor(s.clock()/30000))});assert.equal(activated.status,200);
    const owner=await activated.json();assert.ok(owner.token);assert.equal(owner.recoveryCodes.length,8);
    assert.deepEqual(owner.user.mfa,{authenticator:true,phone:false,complete:true,required:true,primary:'authenticator',backup:'authenticator'});
    assert.deepEqual((await(await s.api('me',undefined,owner.token)).json()).user.mfa,owner.user.mfa);
    assert.deepEqual((await(await s.api('touch',{},owner.token)).json()).user.mfa,owner.user.mfa);
    assert.equal((await s.api('users/otp/disable',{code:'09876543',otp:owner.recoveryCodes[0]},owner.token)).status,409);
    await s.createMember('own-mfa@example.test','12345678',owner.token);
    const other=await(await s.api('login',{code:'12345678'})).json();assert.equal(other.otpSetupRequired,true);assert.notEqual(other.secret,challenge.secret);assert.ok(!other.token&&!other.workspace);
    const users=await(await s.api('users',undefined,owner.token)).json();assert.equal(users.users.find(user=>user.username==='own-mfa@example.test').mfa.authenticator,false);
    s.advance(30000);let step=Math.floor(s.clock()/30000);
    const member=await(await s.api('login',{code:'12345678',otp:await otpAt(other.secret,step)})).json();assert.ok(member.token);assert.equal(member.user.mfa.required,true);
    assert.deepEqual(await(await s.api('login',{code:'12345678'})).json(),{otpRequired:true});
    assert.equal((await s.api('login',{code:'12345678',otp:await otpAt(other.secret,step)})).status,401);s.advance(5001);
    s.advance(30000);step=Math.floor(s.clock()/30000);
    const ownOTP=await otpAt(other.secret,step),ownerOTP=await otpAt(challenge.secret,step);
    if(ownOTP!==ownerOTP){assert.equal((await s.api('login',{code:'12345678',otp:ownerOTP})).status,401);s.advance(10001);}
    const renewed=await s.api('login',{code:'12345678',otp:await otpAt(other.secret,Math.floor(s.clock()/30000))});assert.equal(renewed.status,200);assert.equal((await renewed.json()).token,member.token);
    // An already verified session survives a refresh without a new OTP.
    assert.equal((await s.api('me',undefined,member.token)).status,200);
    assert.equal((await s.api('users/reset-otp',{id:member.user.id},owner.token)).status,200);
    assert.equal((await s.api('me',undefined,member.token)).status,401);
    const reset=await(await s.api('login',{code:'12345678'})).json();assert.equal(reset.otpSetupRequired,true);
    s.advance(600001);assert.equal((await s.api('login',{code:'12345678',otp:await otpAt(reset.secret,Math.floor(s.clock()/30000))})).status,401);
  }finally{s.env.DB.db.close();}
});

test('OTP setup expires, rejects wrong passwords and cannot be managed for another user',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    await s.createMember('alice@example.test','12345678',owner.token);const member=await s.login('alice@example.test','12345678');
    assert.equal((await s.api('users/otp/setup',{code:'00000000'},member.token)).status,401);s.advance(5001);
    const enrollment=await(await s.api('users/otp/setup',{code:'12345678',id:owner.user.id},member.token)).json();
    assert.equal(s.env.DB.db.prepare('SELECT otp_pending_cipher FROM users WHERE id=?').get(owner.user.id).otp_pending_cipher,null);
    s.advance(600001);const otp=await otpAt(enrollment.secret,Math.floor(s.clock()/30000));
    assert.equal((await s.api('users/otp/enable',{code:'12345678',otp},member.token)).status,401);s.advance(5001);
    assert.equal((await s.api('users/reset-otp',{id:owner.user.id},member.token)).status,403);
    assert.equal((await s.api('users/reset-otp',{id:owner.user.id},owner.token)).status,409);
  }finally{s.env.DB.db.close();}
});

test('concurrent invitations may assign the same eight digit code to separate accounts',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543'),invitations=[];
    for(const username of ['alice@example.test','bob@example.test'])invitations.push({username,...await(await s.api('users/create',{username},owner.token)).json()});
    const results=await Promise.all(invitations.map(({username,invitation})=>s.api('account/complete',{username,ticket:invitation.ticket,code:'12345678'})));
    assert.deepEqual(results.map(reply=>reply.status),[200,200]);assert.deepEqual(await(await s.api('login',{code:'12345678'})).json(),{otpRequired:true});
    for(const code of ['abcdefgh','1234567','123456789','12 34567'])assert.equal((await s.api('login',{code})).status,400);
  }finally{s.env.DB.db.close();}
});
test('resetting a member password retains OTP; only the owner can explicitly reset their Authenticator',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    await s.createMember('alice@example.test','12345678',owner.token);const alice=await s.login('alice@example.test','12345678');
    const setup=await(await s.api('users/otp/setup',{code:'12345678'},alice.token)).json();
    assert.equal((await s.api('users/otp/enable',{code:'12345678',otp:await otpAt(setup.secret,Math.floor(s.clock()/30000))},alice.token)).status,200);
    const reset=await(await s.api('users/reset-code',{id:alice.user.id},owner.token)).json();
    assert.equal((await s.api('account/complete',{ticket:reset.invitation.ticket,username:'alice@example.test',code:'23456789'})).status,200);
    assert.deepEqual(await(await s.api('login',{code:'23456789'})).json(),{otpRequired:true});
    assert.equal((await s.api('users/reset-otp',{id:alice.user.id},owner.token)).status,200);
    const logged=await(await s.api('login',{code:'23456789'})).json();assert.equal(logged.user.username,'alice@example.test');
    assert.equal((await s.api('users/otp',undefined,logged.token)).status,200);
    assert.equal((await s.api('users/otp',undefined,alice.token)).status,401);
  }finally{s.env.DB.db.close();}
});

const b64=value=>Buffer.from(value).toString('base64url');
test('mandatory push enrollment cannot access the workspace, cannot replace a phone and binds approval to its own account',async()=>{
  const s=await setup();try{
    const ownerPhone=await phoneSetup(s);s.env.MFA_REQUIRED='1';s.env.MFA_PUSH_PRIMARY='1';s.env.MFA_PHONE_REQUIRED='1';
    await s.createMember('push-user@example.test','12345678',ownerPhone.owner.token);
    const challenge=await(await s.api('login',{code:'12345678'})).json();assert.equal(challenge.otpSetupRequired,true);
    const start=await(await s.api('login',{code:'12345678',otp:await otpAt(challenge.secret,Math.floor(s.clock()/30000))})).json();
    assert.ok(start.phoneSetupRequired&&start.enrollmentTicket&&!start.token&&!start.workspace);assert.equal(start.recoveryCodes.length,8);
    assert.equal((await s.api('vault',undefined,start.enrollmentTicket)).status,401);
    const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']),publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey),deviceId='e'.repeat(32);
    const material={enrollmentTicket:start.enrollmentTicket,subscription:ownerPhone.subscription,publicKey,deviceId};
    const [payload,sig]=start.enrollmentTicket.split('.'),wrong=payload+'.'+(sig[0]==='0'?'1':'0')+sig.slice(1);
    assert.equal((await s.api('mfa/phone/register',{...material,enrollmentTicket:wrong})).status,410);
    const registration=await(await s.api('mfa/phone/register',material)).json();assert.ok(registration.registered&&!registration.token);
    assert.equal((await s.api('mfa/phone/register',material)).status,409);
    const request=await(await s.api('login',{code:'12345678'})).json();assert.ok(request.pushRequired&&!request.otpRequired&&!request.token);
    const row=s.env.DB.db.prepare('SELECT * FROM push_requests WHERE device_id=?').get(deviceId);
    assert.equal((await s.api('push/decision',{id:row.id,deviceId,decision:'approve',signature:await ownerPhone.sign(decisionMessage(row,'approve'))})).status,403);
    const signature=b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,new TextEncoder().encode(decisionMessage(row,'approve'))));
    assert.equal((await s.api('push/decision',{id:row.id,deviceId,decision:'approve',signature})).status,200);
    const login=await(await s.api('push/poll',{ticket:request.ticket})).json();assert.ok(login.token);assert.equal(login.user.username,'push-user@example.test');assert.equal(login.user.mfa.complete,true);assert.equal(login.user.mfa.primary,'push');assert.equal(login.user.mfa.backup,'authenticator');
    const settings=await(await s.api('users/push',undefined,login.token)).json();assert.equal(settings.required,true);assert.equal(settings.primary,'push');
    assert.equal((await s.api('push/poll',{ticket:request.ticket})).status,410);
    s.advance(30001);s.env.PUSH_TEST_SEND=async()=>{throw new Error('Synthetic unavailable phone');};
    const unavailable=await(await s.api('login',{code:'12345678'})).json();assert.ok(unavailable.pushRequired&&unavailable.deliveryFailed&&!unavailable.token);
    const fallback=await(await s.api('login',{code:'12345678',otp:await otpAt(challenge.secret,Math.floor(s.clock()/30000))})).json();assert.ok(fallback.token&&!fallback.pushRequired);
    assert.equal((await s.api('login',{code:'12345678',otp:await otpAt(challenge.secret,Math.floor(s.clock()/30000))})).status,401);
  }finally{s.env.DB.db.close();}
});

async function phoneSetup(s){
  await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
  const otpSetup=await(await s.api('users/otp/setup',{code:'09876543'},owner.token)).json();
  const enabled=await(await s.api('users/otp/enable',{code:'09876543',otp:await otpAt(otpSetup.secret,Math.floor(s.clock()/30000))},owner.token)).json();
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
  const encryption=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',expirationTime:null,keys:{p256dh:b64(await crypto.subtle.exportKey('raw',encryption.publicKey)),auth:b64(crypto.getRandomValues(new Uint8Array(16)))}};
  const publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey),deviceId='d'.repeat(32),messages=[];
  s.env.LOCAL_TEST_ORIGIN='http://localhost';s.env.PUSH_TEST_SEND=async message=>messages.push(message);
  s.advance(30000);
  const register=await s.api('users/push/register',{code:'09876543',otp:await otpAt(otpSetup.secret,Math.floor(s.clock()/30000)),publicKey,subscription,deviceId},owner.token);
  assert.equal(register.status,200,await register.clone().text());
  const sign=async message=>b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,new TextEncoder().encode(message)));
  const login=async()=>{s.advance(30000);const r=await s.api('login',{code:'09876543'});assert.equal(r.status,200,await r.clone().text());return r.json();};
  return{owner,deviceId,messages,sign,login,secret:otpSetup.secret,recoveryCodes:enabled.recoveryCodes,subscription};
}

test('Push approval is primary without a preceding OTP and gates sessions and gives each request one use',async()=>{
  const s=await setup();try{
    const p=await phoneSetup(s),request=await p.login();assert.equal(request.pushRequired,true);assert.equal(request.token,undefined);assert.equal(request.workspace,undefined);
    assert.equal((await(await s.api('login',{code:'09876543'})).json()).pushRequired,true);
    const row=s.env.DB.db.prepare('SELECT * FROM push_requests').get();
    assert.equal((await s.api('push/poll',{ticket:'0'.repeat(64)})).status,410);
    assert.equal((await(await s.api('push/poll',{ticket:request.ticket})).json()).pending,true);
    assert.equal((await s.api('push/decision',{id:row.id,deviceId:p.deviceId,decision:'approve',signature:'A'.repeat(86)})).status,403);
    const inspected=await s.api('push/inspect',{id:row.id,deviceId:p.deviceId,signature:await p.sign(inspectMessage(row.id))});assert.equal(inspected.status,200);
    assert.equal((await inspected.json()).displayCode,request.displayCode);
    const decision={id:row.id,deviceId:p.deviceId,decision:'approve',signature:await p.sign(decisionMessage(row,'approve'))};
    assert.equal((await s.api('push/decision',decision)).status,200);
    assert.equal((await s.api('push/decision',decision)).status,410);
    const polled=await s.api('push/poll',{ticket:request.ticket});assert.equal(polled.status,200);const logged=await polled.json();assert.ok(logged.token);assert.notDeepEqual(logged.workspace,s.material);
    assert.equal((await s.api('push/poll',{ticket:request.ticket})).status,410);
    assert.equal((await s.api('vault',undefined,logged.token)).status,200);
    const disk=JSON.stringify(s.env.DB.db.prepare('SELECT * FROM push_requests').all())+JSON.stringify(s.env.DB.db.prepare('SELECT * FROM push_devices').all());
    assert.ok(!disk.includes(request.ticket));assert.ok(!disk.includes(p.subscription.endpoint));
    assert.ok(!disk.includes(p.subscription.keys.auth));
  }finally{s.env.DB.db.close();}
});

test('phone refusals, cancellation, expiry, throttling, revocation and recovery remain fail closed',async()=>{
  const s=await setup();try{
    const p=await phoneSetup(s);let request=await p.login(),row=s.env.DB.db.prepare("SELECT * FROM push_requests WHERE state='pending'").get();
    assert.equal((await s.api('push/decision',{id:row.id,deviceId:p.deviceId,decision:'deny',signature:await p.sign(decisionMessage(row,'deny'))})).status,200);
    assert.equal((await s.api('push/poll',{ticket:request.ticket})).status,403);
    request=await p.login();row=s.env.DB.db.prepare("SELECT * FROM push_requests WHERE state='pending'").get();
    s.advance(30000);const repeat=await s.api('login',{code:'09876543',otp:await otpAt(p.secret,Math.floor(s.clock()/30000))});assert.equal((await repeat.json()).token!==undefined,true);
    assert.equal(p.messages.filter(message=>message.type==='login').length,2);
    assert.equal((await s.api('push/cancel',{ticket:request.ticket})).status,200);
    assert.equal((await s.api('push/decision',{id:row.id,deviceId:p.deviceId,decision:'approve',signature:await p.sign(decisionMessage(row,'approve'))})).status,410);
    request=await p.login();s.advance(120001);assert.equal((await s.api('push/poll',{ticket:request.ticket})).status,410);
    const recovered=await s.api('login',{code:'09876543',otp:p.recoveryCodes[0]});assert.equal(recovered.status,200);assert.ok((await recovered.json()).token);
    request=await p.login();row=s.env.DB.db.prepare("SELECT * FROM push_requests WHERE state='pending'").get();
    await s.api('users/change-code',{oldCode:'09876543',code:'87654321'},p.owner.token);
    assert.equal((await s.api('push/decision',{id:row.id,deviceId:p.deviceId,decision:'approve',signature:await p.sign(decisionMessage(row,'approve'))})).status,410);
    assert.equal((await s.api('push/poll',{ticket:request.ticket})).status,410);
  }finally{s.env.DB.db.close();}
});

test('push enrollment requires OTP and fixed push-service endpoints; the encrypted payload contains no plaintext',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    assert.equal((await s.api('users/push/register',{code:'09876543'},owner.token)).status,409);
    for(const endpoint of ['http://fcm.googleapis.com/a','https://127.0.0.1/a','https://fcm.googleapis.com.evil.test/a','https://fcm.googleapis.com:8443/a','https://user@fcm.googleapis.com/a'])assert.equal(validSubscription({endpoint,keys:{}}),false);
    const encryption=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
    const vapid=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
    const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',expirationTime:null,keys:{p256dh:b64(await crypto.subtle.exportKey('raw',encryption.publicKey)),auth:b64(crypto.getRandomValues(new Uint8Array(16)))}};
    const payload=await buildPushPayload({data:{message:'confidential approval nonce'},options:{ttl:120}},subscription,{subject:'mailto:test@example.test',publicKey:b64(await crypto.subtle.exportKey('raw',vapid.publicKey)),privateKey:(await crypto.subtle.exportKey('jwk',vapid.privateKey)).d});
    assert.equal(payload.headers['Content-Encoding']||payload.headers['content-encoding'],'aes128gcm');assert.ok(!new TextDecoder().decode(payload.body).includes('confidential approval nonce'));
  }finally{s.env.DB.db.close();}
});
