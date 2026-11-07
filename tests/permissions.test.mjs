import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import * as browserCrypto from '../browser/crypto.js';
import {profilePolicy,normalizePolicy,can,recordLevel,canManagePolicy} from '../server/lib/wolfguard/permissions.mjs';
import {openEnvelope,sealEnvelope,projectWorkspace,mergeScopedWorkspace} from '../server/lib/wolfguard/workspace-access.mjs';
import {policyCipher} from '../server/lib/wolfguard/permission-store.mjs';
import {seal as sealRecord} from '../server/lib/wolfguard/access.mjs';

class D1{
  constructor(){this.db=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../server/drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())this.db.exec(readFileSync(new URL('../server/drizzle/'+file,import.meta.url),'utf8'));}
  prepare(sql){const statement=this.db.prepare(sql);let args=[];return{bind(...values){args=values;return this;},async first(){return statement.get(...args)||null;},async all(){return{results:statement.all(...args)};},async run(){return{meta:{changes:Number(statement.run(...args).changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.db.exec('COMMIT');return results;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
const payload=()=>({version:2,items:[{id:'public',type:'memo',title:'Équipe',folderId:'team',content:'<p>Visible</p>',linkedItemIds:['hidden']},{id:'hidden',type:'memo',title:'Dossier confidentiel',folderId:'private',content:'secret direction'},{id:'credential',type:'vault',title:'Production',folderId:'vault-folder'}],folders:[{id:'team',name:'Équipe',section:'library',parentId:null},{id:'private',name:'Direction',section:'library',parentId:null},{id:'vault-folder',name:'Serveurs',section:'vault',parentId:null}],settings:[{key:'theme',value:'dark'},{key:'private-key',value:'owner-only'}],activity:[{id:'private-event',itemId:'hidden',message:'secret direction'}]});
async function blob(text,key){const iv=crypto.getRandomValues(new Uint8Array(12));return{iv:[...iv],data:[...new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text)))]};}
async function secret(value,key){return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(value.iv)},key,new Uint8Array(value.data)));}
async function setup(){
  let now=Date.now();const objects=new Map(),env={DB:new D1(),AUTH_PEPPER:'1'.repeat(64),STORAGE_KEY:'2'.repeat(64),BOOTSTRAP_HASH:createHash('sha256').update('b'.repeat(64)).digest('hex'),BUCKET:{async put(key,body,options){objects.set(key,{value:await new Response(body).arrayBuffer(),...options});},async get(key){const row=objects.get(key);return row?{...row,body:new Response(row.value).body}:null;},async delete(key){objects.delete(key);}}};
  const api=(path,data,token,method=data===undefined?'GET':'POST',headers={})=>handleAPI(new Request('https://test.invalid/api/'+path,{method,headers:{Origin:'https://wolfguard.wavetools.fr',...(token?{Authorization:'Bearer '+token}:{}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})}),env,()=>now);
  const upload=(envelope,version,token)=>api('vault',envelope,token,'PUT',{'X-WG-Version':String(version),'X-WG-Size':String(Buffer.byteLength(JSON.stringify(envelope)))});
  const initial=await(await api('setup',{code:'07942685'},null,'POST',{'X-WG-Activation':'b'.repeat(64)})).json();
  const source=payload(),encrypted=await browserCrypto.create(source,'07942685');source.items[2].vaultBlobEnc=await blob(JSON.stringify({username:'root',password:'production-secret'}),encrypted.key);const master=await browserCrypto.workspaceMaterial('07942685',encrypted.salt);
  assert.equal((await upload(await browserCrypto.seal(source,encrypted.key,encrypted.salt,1),0,initial.token)).status,200);
  assert.equal((await api('users/initialize',{username:'cantin.bruno@gmx.fr',code:'09876543',oldCode:'07942685',workspace:master,version:1},initial.token)).status,200);
  const login=async(code='09876543')=>{const response=await api('login',{code});assert.equal(response.status,200,await response.clone().text());return response.json();},owner=await login();
  const added=await(await api('users/create',{username:'member@example.test'},owner.token)).json();assert.equal((await api('account/complete',{ticket:added.invitation.ticket,username:'member@example.test',code:'12345678'})).status,200);
  const assign=async(policy,revision)=>api('users/permissions',{id:added.user.id,revision:revision??env.DB.db.prepare('SELECT permission_revision FROM users WHERE id=?').get(added.user.id).permission_revision,policy,reason:'Test d’intervention'},owner.token);
  const load=async auth=>{const response=await api('vault',undefined,auth.token);assert.equal(response.status,200,await response.clone().text());const material=await browserCrypto.importWorkspaceMaterial(auth.workspace);return {...await browserCrypto.openWithKey(await response.json(),material.key,material.salt),version:Number(response.headers.get('X-WG-Version'))};};
  return {env,api,upload,login,owner,added,assign,load,source,master,advance:ms=>{now+=ms;}};
}
const user=policy=>({role:'member',permissions:policy});
test('permission normalization rejects unknown grants, prototype keys, invalid scopes and expiry; owner cannot be locked out',()=>{
  const policy=profilePolicy('none');assert.equal(can(user(policy),'library.read'),false);assert.equal(can({role:'admin'},'library.read'),true);
  for(const change of [{grants:['admin']},{agents:['../escape']},{expiresAt:NaN},{scopes:{library:{mode:'wildcard'}}}])assert.throws(()=>normalizePolicy({...policy,...change}));
  const poisoned=structuredClone(policy);poisoned.scopes.library.folders=JSON.parse('{"__proto__":"write"}');assert.throws(()=>normalizePolicy(poisoned));
  const read=profilePolicy('reader');read.expiresAt=10;assert.equal(can(user(read),'library.read',9),true);assert.equal(can(user(read),'library.read',10),false);
});
test('folder inheritance and item overrides require module read and never loop on malformed ancestry',()=>{
  const policy=profilePolicy('collaborator');policy.scopes.library={mode:'selected',folders:{team:'write',private:'deny'},items:{hidden:'read'}};const data=payload();
  assert.equal(recordLevel(user(policy),data.items[0],'items',data.folders),'write');assert.equal(recordLevel(user(policy),data.items[1],'items',data.folders),'read');
  policy.grants=[];assert.equal(recordLevel(user(policy),data.items[1],'items',data.folders),'deny');
});
test('a folder literally named root is an ordinary folder and cannot grant access to unrelated data',()=>{
  const policy=profilePolicy('reader');policy.scopes.library={mode:'selected',folders:{root:'read'},items:{}};
  const folders=[{id:'root',section:'library',parentId:null},{id:'other',section:'library',parentId:null}];
  assert.equal(recordLevel(user(policy),{id:'inside',type:'memo',folderId:'root'},'items',folders),'read');
  assert.equal(recordLevel(user(policy),{id:'outside',type:'memo',folderId:'other'},'items',folders),'deny');
  assert.equal(recordLevel(user(policy),{id:'loose',type:'memo',folderId:null},'items',folders),'deny');
});
test('server envelopes interoperate with browser crypto and authenticate headers',async()=>{
  const data=payload(),value=await browserCrypto.create(data,'12345678'),material=await browserCrypto.workspaceMaterial('12345678',value.salt);
  assert.deepEqual(await openEnvelope(value.envelope,material),data);const wrapped=await sealEnvelope(data,material,3);assert.deepEqual((await browserCrypto.openWithKey(wrapped,value.key,value.salt)).payload,data);
  await assert.rejects(openEnvelope({...wrapped,revision:4},material));
});
test('new users and new invitation accounts have no rights, get individual keys and receive no private data',async()=>{
  const s=await setup();try{
    const member=await s.login('12345678');assert.deepEqual(member.user.permissions.grants,[]);assert.notDeepEqual(member.workspace,s.master);const loaded=await s.load(member);assert.deepEqual(loaded.payload.items,[]);assert.deepEqual(loaded.payload.folders,[]);assert.deepEqual(loaded.payload.activity,[]);assert.ok(!JSON.stringify(loaded.payload).includes('owner-only'));
    const invite=await(await s.api('users/invite',{},s.owner.token)).json();await s.api('account/complete',{ticket:invite.invitation.ticket,username:'invited@example.test',code:'23456789'});const invited=await s.login('23456789');assert.deepEqual(invited.user.permissions.grants,[]);assert.notDeepEqual(invited.workspace,member.workspace);
    const oldInvite=await(await s.api('users/invite',{},s.owner.token)).json();s.env.DB.db.prepare('UPDATE user_invitations SET permissions_cipher=NULL WHERE id=?').run(oldInvite.invitation.id);await s.api('account/complete',{ticket:oldInvite.invitation.ticket,username:'old-invite@example.test',code:'34567890'});assert.deepEqual((await s.login('34567890')).user.permissions.grants,[]);
    for(const route of ['users/permissions','users/permissions/audit','users','access'])assert.equal((await s.api(route,undefined,member.token)).status,403);
  }finally{s.env.DB.db.close();}
});
test('existing accounts retain legacy rights without a master-key disclosure',async()=>{
  const s=await setup();try{s.env.DB.db.prepare('UPDATE users SET permissions_cipher=NULL WHERE id=?').run(s.added.user.id);const member=await s.login('12345678');assert.equal(member.user.permissions.profile,'legacy');assert.notDeepEqual(member.workspace,s.master);assert.equal((await s.load(member)).payload.items.length,3);}finally{s.env.DB.db.close();}
});
test('folder and record restrictions filter API output, cross-links, activity and secrets before encryption',async()=>{
  const s=await setup();try{
    const policy=profilePolicy('reader');policy.scopes.library={mode:'selected',folders:{team:'read'},items:{}};assert.equal((await s.assign(policy)).status,200);
    const auth=await s.login('12345678'),loaded=await s.load(auth);assert.deepEqual(loaded.payload.items.map(r=>r.id),['public','credential']);assert.deepEqual(loaded.payload.items[0].linkedItemIds,[]);assert.equal(loaded.payload.items[1].secretsRestricted,true);assert.equal(loaded.payload.items[1].vaultBlobEnc,undefined);assert.ok(!JSON.stringify(loaded.payload).includes('secret direction'));
    const master=await browserCrypto.importWorkspaceMaterial(s.master);await assert.rejects(browserCrypto.openWithKey(loaded.envelope,master.key,master.salt));
    const second=await s.load(auth);assert.deepEqual(second.payload,loaded.payload);
  }finally{s.env.DB.db.close();}
});
test('direct forged edits are refused for readers even with a valid personal delivery key',async()=>{
  const s=await setup();try{
    await s.assign(profilePolicy('reader'));const member=await s.login('12345678'),loaded=await s.load(member);loaded.payload.items[0].title='Unauthorized';const envelope=await browserCrypto.seal(loaded.payload,loaded.key,loaded.salt,2);assert.equal((await s.upload(envelope,loaded.version,member.token)).status,403);assert.equal((await s.load(s.owner)).payload.items[0].title,'Équipe');
    assert.equal((await s.api('users/permissions',{id:s.owner.user.id,revision:1,policy:profilePolicy('legacy')},member.token)).status,403);
  }finally{s.env.DB.db.close();}
});
test('allowed edits merge into canonical data while hidden records, folders, secrets and shared settings survive',async()=>{
  const s=await setup();try{
    const policy=profilePolicy('collaborator');policy.grants=policy.grants.filter(k=>!k.startsWith('vault.'));policy.scopes.library={mode:'selected',folders:{team:'write'},items:{}};await s.assign(policy);
    const member=await s.login('12345678'),loaded=await s.load(member);loaded.payload.items[0].title='Autorisé';loaded.payload.items.push({id:'new',type:'memo',title:'Ajout',folderId:'team'});loaded.payload.settings=[{key:'private-key',value:'attack'}];
    const response=await s.upload(await browserCrypto.seal(loaded.payload,loaded.key,loaded.salt,2),loaded.version,member.token);assert.equal(response.status,200,await response.clone().text());
    const canonical=await s.load(s.owner);assert.equal(canonical.payload.items[0].title,'Autorisé');assert.equal(canonical.payload.items.length,4);assert.deepEqual(canonical.payload.items[0].linkedItemIds,['hidden']);assert.equal(canonical.payload.items.find(r=>r.id==='hidden').content,'secret direction');assert.equal(canonical.payload.settings.find(r=>r.key==='private-key').value,'owner-only');assert.equal((await secret(canonical.payload.items.find(r=>r.id==='credential').vaultBlobEnc,canonical.key)).includes('production-secret'),true);
    const latest=await s.load(member);latest.payload.items.push({id:'hidden',type:'memo',title:'Collision'});assert.equal((await s.upload(await browserCrypto.seal(latest.payload,latest.key,latest.salt,3),latest.version,member.token)).status,403);
  }finally{s.env.DB.db.close();}
});
test('vault secrets are rewrapped for each user, stable across reads and safely rewrapped on edits',async()=>{
  const s=await setup();try{
    await s.assign(profilePolicy('collaborator'));const member=await s.login('12345678'),loaded=await s.load(member),record=loaded.payload.items.find(r=>r.id==='credential');assert.match(await secret(record.vaultBlobEnc,loaded.key),/production-secret/);assert.notDeepEqual(record.vaultBlobEnc,s.source.items[2].vaultBlobEnc);assert.deepEqual((await s.load(member)).payload.items.find(r=>r.id===record.id).vaultBlobEnc,record.vaultBlobEnc);
    record.vaultBlobEnc=await blob(JSON.stringify({password:'new-production-secret'}),loaded.key);assert.equal((await s.upload(await browserCrypto.seal(loaded.payload,loaded.key,loaded.salt,2),loaded.version,member.token)).status,200);
    const canonical=await s.load(s.owner);assert.match(await secret(canonical.payload.items[2].vaultBlobEnc,canonical.key),/new-production-secret/);
    const metadata=profilePolicy('collaborator');metadata.grants=metadata.grants.filter(k=>k!=='vault.secrets');await s.assign(metadata);const limited=await s.login('12345678'),copy=await s.load(limited);copy.payload.items[2].vaultBlobEnc=await blob('injected',copy.key);assert.equal((await s.upload(await browserCrypto.seal(copy.payload,copy.key,copy.salt,3),copy.version,limited.token)).status,403);
  }finally{s.env.DB.db.close();}
});
test('permission changes revoke sessions, rotate delivery keys, protect owner, detect stale revisions and create encrypted audit events',async()=>{
  const s=await setup();try{
    const before=await s.login('12345678');assert.equal((await s.assign(profilePolicy('reader'),1)).status,200);assert.equal((await s.api('touch',{},before.token)).status,401);const after=await s.login('12345678');assert.notDeepEqual(before.workspace,after.workspace);assert.equal((await s.assign(profilePolicy('none'),1)).status,409);
    assert.equal((await s.api('users/permissions',{id:s.owner.user.id,revision:1,policy:profilePolicy('none')},s.owner.token)).status,409);const audit=await(await s.api('users/permissions/audit',undefined,s.owner.token)).json();assert.equal(audit.events.length,1);assert.equal(audit.events[0].after.profile,'reader');assert.equal(audit.events[0].actor,s.owner.user.username);assert.equal(audit.events[0].reason,'Test d’intervention');assert.ok(!s.env.DB.db.prepare('SELECT details_cipher FROM permission_audit').get().details_cipher.includes('member@example.test'));
  }finally{s.env.DB.db.close();}
});
test('restricted users cannot start scans, pair, revoke or open terminal/desktop through direct API calls',async()=>{
  const s=await setup();try{
    await s.assign(profilePolicy('reader'));const auth=await s.login('12345678'),id='a'.repeat(32);
    for(const [path,data]of [['agents/pair',{}],['agents/revoke',{id}],['scans',{agentId:id,strategy:'active',workspace:'active',target:'192.0.2.1'}],['remote/start',{agentId:id,mode:'desktop'}],['remote/start',{agentId:id,mode:'terminal'}]])assert.equal((await s.api(path,data,auth.token)).status,403,path);
    const policy=profilePolicy('technician');policy.agents=[];await s.assign(policy);const restricted=await s.login('12345678');assert.deepEqual((await(await s.api('agents',undefined,restricted.token)).json()).agents,[]);assert.equal((await s.api('remote/start',{agentId:id,mode:'terminal'},restricted.token)).status,403);
  }finally{s.env.DB.db.close();}
});
test('time-limited grants expire on the server independently of browser state',async()=>{
  const s=await setup();try{const policy=profilePolicy('reader');policy.expiresAt=Date.now()+10000;await s.assign(policy);const member=await s.login('12345678');assert.ok((await s.load(member)).payload.items.length);s.advance(11000);assert.deepEqual((await s.load(member)).payload.items,[]);}finally{s.env.DB.db.close();}
});
test('delegated account management cannot reset credentials or MFA outside its own permission scope',async()=>{
  const actor=profilePolicy('reader');actor.grants.push('users.manage');const own=user(actor),higher=profilePolicy('technician');assert.equal(canManagePolicy(own,higher),false);assert.equal(canManagePolicy(own,profilePolicy('none')),true);assert.equal(canManagePolicy(own,profilePolicy('reader')),true);
  actor.agents=[];assert.equal(canManagePolicy(own,profilePolicy('reader')),false);actor.agents=null;actor.scopes.library.mode='selected';actor.scopes.library.folders.team='read';assert.equal(canManagePolicy(own,profilePolicy('reader')),false);
});
async function enroll(s,name){
  const pairing=await(await s.api('agents/pair',{},s.owner.token)).json(),agent=await(await s.api('agent/enroll',{code:pairing.code,name,platform:'linux'})).json();
  const agentAPI=(path,data)=>s.api(path,data,null,'POST',{Authorization:'Agent '+agent.token});
  assert.equal((await agentAPI('agent/poll',{capabilities:['network-scan-v3','network-target-v1','remote-desktop-v1','remote-terminal-v1']})).status,200);
  return {...agent,api:agentAPI};
}
test('scan history, result lookup and cancellation enforce both scan type and agent scope',async()=>{
  const s=await setup();try{
    const a=await enroll(s,'Allowed'),b=await enroll(s,'Private');
    const aJob=await(await s.api('scans',{agentId:a.id,workspace:'active',strategy:'active',target:'192.0.2.1',ports:'443'},s.owner.token)).json();
    const bJob=await(await s.api('scans',{agentId:b.id,workspace:'active',strategy:'active',target:'192.0.2.2',ports:'443'},s.owner.token)).json();
    const policy=profilePolicy('analyst');policy.agents=[a.id];policy.grants=policy.grants.filter(key=>key!=='scan.active.cancel');await s.assign(policy);const auth=await s.login('12345678');
    const agents=await(await s.api('agents',undefined,auth.token)).json();assert.deepEqual(agents.agents.map(row=>row.id),[a.id]);const history=await(await s.api('scans?history=1',undefined,auth.token)).json();assert.deepEqual(history.jobs.map(row=>row.id),[aJob.id]);
    assert.equal((await s.api('scans/result?id='+aJob.id,undefined,auth.token)).status,200);assert.equal((await s.api('scans/result?id='+bJob.id,undefined,auth.token)).status,403);assert.equal((await s.api('scans/cancel',{id:aJob.id},auth.token)).status,403);assert.equal((await s.api('scans/delete',{id:bJob.id},auth.token)).status,403);
    policy.grants=policy.grants.filter(key=>key!=='scan.active.read');await s.assign(policy);const noReports=await s.login('12345678');assert.deepEqual((await(await s.api('scans?history=1',undefined,noReports.token)).json()).jobs,[]);
  }finally{s.env.DB.db.close();}
});
test('permission expiry cancels an issued scan and closes remote sessions even when the browser is offline',async()=>{
  const s=await setup();try{
    const a=await enroll(s,'Allowed'),b=await enroll(s,'Terminal');const policy=profilePolicy('technician');policy.agents=[a.id,b.id];policy.expiresAt=Date.now()+10000;await s.assign(policy);const auth=await s.login('12345678');
    const started=await s.api('scans',{agentId:a.id,workspace:'active',strategy:'active',target:'192.0.2.1',ports:'443'},auth.token);assert.equal(started.status,201,await started.clone().text());const job=await started.json();
    const remote=await s.api('remote/start',{agentId:b.id,mode:'terminal'},auth.token);assert.equal(remote.status,201);const session=await remote.json();
    s.advance(11000);assert.equal((await a.api('agent/poll',{})).status,200);assert.equal(s.env.DB.db.prepare('SELECT status FROM scan_jobs WHERE id=?').get(job.id).status,'cancelled');assert.equal(s.env.DB.db.prepare('SELECT status FROM remote_sessions WHERE id=?').get(session.id).status,'closed');
  }finally{s.env.DB.db.close();}
});
test('permission changes stop the member jobs and remote session while preserving the owner session',async()=>{
  const s=await setup();try{
    const a=await enroll(s,'Scan'),b=await enroll(s,'Desktop');await s.assign(profilePolicy('technician'));const auth=await s.login('12345678');
    const job=await(await s.api('scans',{agentId:a.id,workspace:'active',strategy:'active',target:'192.0.2.1',ports:'443'},auth.token)).json();const remote=await(await s.api('remote/start',{agentId:b.id,mode:'desktop'},auth.token)).json();
    assert.equal((await s.assign(profilePolicy('none'))).status,200);assert.equal(s.env.DB.db.prepare('SELECT status FROM scan_jobs WHERE id=?').get(job.id).status,'cancelled');assert.equal(s.env.DB.db.prepare('SELECT status FROM remote_sessions WHERE id=?').get(remote.id).status,'closed');assert.equal((await s.api('touch',{},s.owner.token)).status,200);
  }finally{s.env.DB.db.close();}
});
