import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {create,workspaceMaterial,importWorkspaceMaterial,openWithKey} from '../browser/crypto.js';
import {normalizeUsername,usernameHash} from '../server/lib/wolfguard/users.mjs';
import {seal} from '../server/lib/wolfguard/access.mjs';

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
  return{env,api,owner,initialize,login,createMember,encrypted,payload,material,advance:ms=>{now+=ms;}};
}

test('first admin migration retains the encrypted workspace, requires a distinct code, and closes the shared-code path',async()=>{
  const s=await setup();try{
    const old=await(await s.api('login',{code:'07942685'})).json();
    const result=await s.initialize();assert.equal(result.status,200);const admin=await result.json();assert.equal(admin.user.role,'admin');
    const login=await s.login('CANTIN.BRUNO@GMX.FR','09876543');const imported=await importWorkspaceMaterial(login.workspace);
    assert.equal(imported.key.extractable,false);assert.deepEqual((await openWithKey(s.encrypted.envelope,imported.key,imported.salt)).payload,s.payload);
    assert.equal((await s.api('touch',{},old.token)).status,401);
    assert.equal((await s.api('login',{code:'07942685'})).status,401);s.advance(5001);
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
    assert.deepEqual((await s.login('alice@example.test','23456789')).workspace,s.material);
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
    assert.equal((await s.api('login',{code:'07942685'})).status,401);s.advance(5001);
    const owner=await s.login('cantin.bruno@gmx.fr','07942685');assert.equal(owner.usersEnabled,false);assert.equal(owner.user.id,rows[0].id);
    const response=await s.api('users/initialize',{username:'cantin.bruno@gmx.fr',code:'07942685',oldCode:'07942685',workspace:s.material,version:1},owner.token);assert.equal(response.status,200);
    const active=await s.login('cantin.bruno@gmx.fr','07942685');assert.equal(active.usersEnabled,true);assert.deepEqual(active.workspace,s.material);
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
    const member=await s.login('new@example.test','12345678');assert.deepEqual(member.workspace,s.material);assert.equal(member.user.role,'member');assert.equal(member.user.credentialPending,false);
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
    const active=await s.login('alice@example.test','23456789');assert.deepEqual(active.workspace,s.material);assert.equal((await s.api('touch',{},owner.token)).status,200);
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
    const member=await s.login('member@example.test','12345678');assert.equal(member.user.role,'member');assert.deepEqual(member.workspace,s.material);
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
    assert.equal((await s.api('account/complete',{ticket:rollback.ticket,username:'rollback@example.test',code:'12345678'})).status,503);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM users').get().n,2);
    s.env.DB.db.exec('DROP TRIGGER fail_invite_consume');assert.equal((await s.api('account/inspect',{ticket:rollback.ticket})).status,200);
    assert.equal((await s.api('users/revoke-invitation',{id:rollback.id},owner.token)).status,200);
    assert.equal((await s.api('account/complete',{ticket:rollback.ticket,username:'rollback@example.test',code:'12345678'})).status,410);
    const expired=await invite();s.advance(24*60*60000+1);
    assert.equal((await s.api('account/inspect',{ticket:expired.ticket})).status,410);
    assert.equal((await s.api('account/complete',{ticket:expired.ticket,username:'expired@example.test',code:'12345678'})).status,410);
  }finally{s.env.DB.db.close();}
});

test('unbound invitation issuance and redemption respect the account limit',async()=>{
  const s=await setup();try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const {invitation}=await(await s.api('users/invite',{},owner.token)).json();
    const seed=s.env.DB.db.prepare("INSERT INTO users(id,name_hash,name_cipher,role,pin_salt,pin_hash,created_at,updated_at) VALUES (?,?,'synthetic','member','salt','hash',0,0)");
    for(let i=0;i<99;i++)seed.run('synthetic-'+i,'synthetic-'+i);
    assert.equal((await s.api('users/invite',{},owner.token)).status,409);
    assert.equal((await s.api('account/complete',{ticket:invitation.ticket,username:'full@example.test',code:'12345678'})).status,409);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM users').get().n,100);
    assert.equal((await s.api('account/inspect',{ticket:invitation.ticket})).status,200);
  }finally{s.env.DB.db.close();}
});
