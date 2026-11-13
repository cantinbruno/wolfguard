import {test} from 'node:test';
import assert from 'node:assert/strict';
import {objectJSON} from '../server/lib/wolfguard/request.mjs';
import {canManagePolicy,profilePolicy} from '../server/lib/wolfguard/permissions.mjs';
import {seal,open} from '../server/lib/wolfguard/access.mjs';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {setup} from './endpoint-fixture.mjs';
import {createHash} from 'node:crypto';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const request=(body,headers={})=>new Request('https://api.test/api/login',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});

test('API parser rejects non-objects, malformed UTF-8, excessive nesting and non-JSON media types',async()=>{
  for(const body of ['null','[]','true','42','"text"','{bad}'])await assert.rejects(objectJSON(request(body),2048,fail),{status:400});
  await assert.rejects(objectJSON(request(new Uint8Array([0xff,0xfe])),2048,fail),{status:400});
  await assert.rejects(objectJSON(request('{"a":'.repeat(65)+'0'+'}'.repeat(65)),2048,fail),{status:400});
  await assert.rejects(objectJSON(request('{}',{'Content-Type':'text/plain'}),2048,fail),{status:415});
  await assert.rejects(objectJSON(request('{}',{'Content-Type':'application/x-www-form-urlencoded'}),2048,fail),{status:415});
  const value={message:'é " '+ '['.repeat(1000)+' \\ \"',nested:{array:[1,true,null]}};
  assert.deepEqual(await objectJSON(request(JSON.stringify(value),{'Content-Type':'application/json; charset=utf-8'}),4096,fail),value);
});

test('API parser bounds declared and streamed UTF-8 byte lengths and cancels oversized streams',async()=>{
  let cancelled=false;
  const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(100));},cancel(){cancelled=true;}});
  await assert.rejects(objectJSON(new Request('https://api.test/',{method:'POST',body,duplex:'half',headers:{'Content-Type':'application/json'}}),32,fail),{status:413});
  assert.equal(cancelled,true);
  await assert.rejects(objectJSON(request('{}',{'Content-Length':'999999'}),32,fail),{status:413});
  await assert.rejects(objectJSON(request('{}',{'Content-Length':'invalid'}),32,fail),{status:400});
  await assert.rejects(objectJSON(request(JSON.stringify({value:'é'.repeat(16)})),32,fail),{status:413});
});

test('malformed objects fail consistently through both authentication and agent routes',async()=>{
  const s=await setup();
  try{
    for(const path of ['login','agent/enroll'])for(const body of ['null','[]','"bad"']){
      const response=await handleAPI(new Request('https://test.invalid/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body}),s.env,s.clock);
      assert.equal(response.status,400,path+': '+body);
    }
    assert.equal(s.env.DB.db.prepare('SELECT failures FROM vault').get().failures,0);
  }finally{s.env.DB.db.close();}
});

test('temporary delegated administrators cannot make permissions permanent, extend their deadline or grant after expiry',()=>{
  const now=Date.now(),permissions=profilePolicy('admin');permissions.expiresAt=now+10000;
  const actor={role:'member',permissions},target=profilePolicy('admin');
  assert.equal(canManagePolicy(actor,target,now),false);
  target.expiresAt=permissions.expiresAt+1;assert.equal(canManagePolicy(actor,target,now),false);
  target.expiresAt=permissions.expiresAt;assert.equal(canManagePolicy(actor,target,now),true);
  assert.equal(canManagePolicy(actor,target,permissions.expiresAt),false);
  assert.equal(canManagePolicy({role:'admin'},profilePolicy('admin'),now),true);
  const permanent={role:'member',permissions:profilePolicy('admin')};
  assert.equal(canManagePolicy(permanent,profilePolicy('admin'),now),true);
});

test('large authorized permission and audit records encrypt without argument-stack overflow',async()=>{
  const env={WORKSPACE_KEY_ENCRYPTION_KEY:'4'.repeat(64),STORAGE_KEY:'2'.repeat(64)},value={reason:'Donnée privée é'.repeat(16000)};
  const cipher=await seal(value,'large-record-test',env);
  assert.deepEqual(await open(cipher,'large-record-test',env),value);
  await assert.rejects(open(cipher,'wrong-context',env));
});

test('the permission API prevents a temporary administrator from extending their own account',async()=>{
  const s=await setup();
  try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const member=await s.createMember('temporary-admin@example.test','12345678',owner.token);
    const policy=profilePolicy('admin');policy.expiresAt=s.clock()+30000;
    const initial=s.env.DB.db.prepare('SELECT permission_revision FROM users WHERE id=?').get(member.user.id).permission_revision;
    const granted=await s.api('users/permissions',{id:member.user.id,revision:initial,policy},owner.token);assert.equal(granted.status,200);
    const auth=await s.login('temporary-admin@example.test','12345678');
    const revision=s.env.DB.db.prepare('SELECT permission_revision FROM users WHERE id=?').get(member.user.id).permission_revision;
    const response=await s.api('users/permissions',{id:member.user.id,revision,policy:profilePolicy('admin')},auth.token);
    assert.equal(response.status,403);
    assert.equal(s.env.DB.db.prepare('SELECT permission_revision FROM users WHERE id=?').get(member.user.id).permission_revision,revision);
    assert.equal((await s.api('users/invite',{profile:'admin'},auth.token)).status,403);
  }finally{s.env.DB.db.close();}
});

async function remote(s,mode){
  const ticket=await(await s.api('agents/pair',{},s.auth.token)).json();
  const agent=await(await s.api('agent/enroll',{code:ticket.code,name:'Synthetic '+mode,platform:'linux'})).json();
  const call=(path,value)=>s.api('agent/'+path,value,null,{Authorization:'Agent '+agent.token});
  await call('poll',{capabilities:['remote-desktop-v1','remote-terminal-v1','remote-files-v1']});
  const response=await s.api('remote/start',{agentId:agent.id,mode},s.auth.token);assert.equal(response.status,201);
  const session=await response.json(),claim=(await(await call('poll',{})).json()).remote;
  return {agent,call,session,lease:claim.lease};
}

test('file and terminal leases cannot be reused as desktop transports; normal file and terminal exchanges still work',async()=>{
  const s=await setup();
  try{
    await s.initialize();s.auth=await s.login('cantin.bruno@gmx.fr','09876543');
    for(const mode of ['files','terminal']){
      const r=await remote(s,mode),base={id:r.session.id,lease:r.lease};
      const exchange=await r.call('remote/'+(mode==='files'?'files/exchange':'terminal/exchange'),{...base,status:'active'});
      assert.equal(exchange.status,200,await exchange.clone().text());
      assert.equal((await s.api('remote/input',{id:r.session.id,seq:1,events:[{type:'text',text:'should not execute'}]},s.auth.token)).status,409);
      assert.equal((await r.call('remote/exchange',{...base,status:'active',ack:0,frame:{width:1,height:1,jpeg:'/9j/2Q=='}})).status,409);
      assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM remote_inputs WHERE session_id=?').get(r.session.id).n,0);
      assert.equal(await s.env.BUCKET.get('remote/'+r.session.id+'/frame'),null);
      assert.equal((await s.api('remote/stop',{id:r.session.id},s.auth.token)).status,200);
    }
  }finally{s.env.DB.db.close();}
});

test('logout immediately removes remote frames, pending input, commands and authorization',async()=>{
  const s=await setup();
  try{
    await s.initialize();s.auth=await s.login('cantin.bruno@gmx.fr','09876543');
    const r=await remote(s,'desktop'),id=r.session.id;
    assert.equal((await r.call('remote/exchange',{id,lease:r.lease,status:'active',ack:0,frame:{width:1,height:1,jpeg:'/9j/2Q=='}})).status,200);
    assert.equal((await s.api('remote/input',{id,seq:1,events:[{type:'text',text:'queued'}]},s.auth.token)).status,200);
    assert.ok(await s.env.BUCKET.get('remote/'+id+'/frame'));
    assert.equal((await s.api('logout',{},s.auth.token)).status,200);
    assert.equal(s.env.DB.db.prepare('SELECT status FROM remote_sessions WHERE id=?').get(id).status,'closed');
    assert.equal(await s.env.BUCKET.get('remote/'+id+'/frame'),null);
    for(const table of ['remote_inputs','terminal_commands','remote_file_commands'])assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM '+table+' WHERE session_id=?').get(id).n,0);
    assert.equal((await s.api('me',undefined,s.auth.token)).status,401);
  }finally{s.env.DB.db.close();}
});

test('explicitly expired tokens are refused and never revived by the next legitimate login',async()=>{
  const s=await setup();
  try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');
    const hash=createHash('sha256').update(owner.token).digest('hex');
    s.env.DB.db.prepare('UPDATE sessions SET expires_at=? WHERE token_hash=?').run(s.clock()-1,hash);
    assert.equal((await s.api('me',undefined,owner.token)).status,401);
    const fresh=await s.login('cantin.bruno@gmx.fr','09876543');
    assert.notEqual(fresh.token,owner.token);
    assert.equal((await s.api('me',undefined,owner.token)).status,401);
    assert.equal((await s.api('me',undefined,fresh.token)).status,200);
    assert.equal(s.env.DB.db.prepare('SELECT expires_at FROM sessions').get().expires_at,s.clock()+4*3600000);
  }finally{s.env.DB.db.close();}
});

test('API responses including errors enforce HTTPS, no embedding and no caching without breaking CORS',async()=>{
  const response=await handleAPI(new Request('https://api.test/api/status',{headers:{Origin:'https://wolfguard.wavetools.fr'}}),{});
  assert.equal(response.headers.get('Strict-Transport-Security'),'max-age=31536000');
  assert.equal(response.headers.get('X-Frame-Options'),'DENY');
  assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
  assert.match(response.headers.get('Cache-Control'),/no-store/);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://wolfguard.wavetools.fr');
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  const local=await handleAPI(new Request('http://127.0.0.1/api/status'),{});
  assert.equal(local.headers.get('Strict-Transport-Security'),null);
});
