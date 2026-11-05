import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {normalizeIP,requestIP} from '../server/lib/wolfguard/access.mjs';

class D1 {
  constructor(){this.db=new DatabaseSync(':memory:');for(const name of readdirSync(new URL('../server/drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())this.db.exec(readFileSync(new URL('../server/drizzle/'+name,import.meta.url),'utf8'));}
  prepare(sql){const statement=this.db.prepare(sql);let args=[];return {bind(...values){args=values;return this;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){return {meta:{changes:Number(statement.run(...args).changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
async function setup(){
  let now=Date.now(),beforePut=null;const objects=new Map();
  const env={DB:new D1(),BUCKET:{async put(key,body,options){if(beforePut)await beforePut();objects.set(key,{body:await new Response(body).arrayBuffer(),...options});},async get(key){const value=objects.get(key);return value?{...value,body:new Response(value.body).body,text:async()=>new TextDecoder().decode(value.body)}:null;},async delete(key){objects.delete(key);}},AUTH_PEPPER:'1'.repeat(64),STORAGE_KEY:'2'.repeat(64),BOOTSTRAP_HASH:createHash('sha256').update('b'.repeat(64)).digest('hex')};
  const api=(path,body,token,ip='198.51.100.1',headers={})=>handleAPI(new Request('https://test.invalid/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://wolfguard.wavetools.fr','Content-Type':'application/json','User-Agent':'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0',...(token?{Authorization:'Bearer '+token}:{}),...(ip?{'CF-Connecting-IP':ip}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})}),env,()=>now);
  const owner=await (await api('setup',{code:'07942685'},null,'198.51.100.1',{'X-WG-Activation':'b'.repeat(64)})).json();
  const login=async(ip,headers)=>{const response=await api('login',{code:'07942685'},null,ip,headers);assert.equal(response.status,200);return (await response.json()).token;};
  const list=async()=>{const response=await api('access',undefined,owner.token);assert.equal(response.status,200);return response.json();};
  const upload=(token,ip,version)=>{const body=JSON.stringify({synthetic:true,version});return handleAPI(new Request('https://test.invalid/api/vault',{method:'PUT',headers:{Origin:'https://wolfguard.wavetools.fr',Authorization:'Bearer '+token,'CF-Connecting-IP':ip,'X-WG-Version':String(version),'X-WG-Size':String(Buffer.byteLength(body))},body}),env,()=>now);};
  return {env,api,owner,login,list,upload,objects,advance:ms=>{now+=ms;},beforeUpload:callback=>{beforePut=callback;}};
}

test('IP normalization rejects lists, ports, CIDR, injection and spoofed forwarding headers',()=>{
  for(const value of ['127.0.0.1:443','192.0.2.0/24','01.2.3.4','256.1.1.1','192.0.2.1,192.0.2.2','<script>','[::1]','::1%eth0'])assert.equal(normalizeIP(value),null,value);
  assert.equal(normalizeIP('2001:0DB8:0:0:0:0:0:1'),'2001:db8::1');
  assert.equal(normalizeIP('::ffff:192.0.2.1'),'192.0.2.1');
  assert.equal(requestIP(new Request('https://test.invalid',{headers:{'X-Forwarded-For':'192.0.2.1','CF-Connecting-IPv6':'2001:db8::1'}})),null);
  assert.equal(requestIP(new Request('https://test.invalid',{headers:{'CF-Connecting-IP':'2a06:98c0:3600::103'}})),null);
});

test('access lists authenticated connections with IP, device, timestamps and opaque IDs without credentials',async()=>{
  const s=await setup();try{
    const other=await s.login('2001:db8::2');const rows=await s.list();
    assert.equal(rows.connections.length,2);assert.equal(rows.currentIP,'198.51.100.1');
    assert.equal(rows.connections.filter(row=>row.current).length,1);
    assert.ok(rows.connections.every(row=>/^[a-f0-9]{32}$/.test(row.id)&&row.device==='Chrome · Windows'&&row.createdAt&&row.lastSeen));
    const text=JSON.stringify(rows);assert.ok(!text.includes(s.owner.token)&&!text.includes(other)&&!text.includes('token_hash'));
    const disk=JSON.stringify(s.env.DB.db.prepare('SELECT * FROM access_connections').all());
    assert.ok(!disk.includes('198.51.100.1')&&!disk.includes('2001:db8')&&!disk.includes('Chrome'));
    assert.equal((await s.api('access')).status,401);
    assert.equal((await s.api('access/block',{ip:'192.0.2.1'})).status,401);
  }finally{s.env.DB.db.close();}
});

test('disconnect revokes only its session; reconnecting is permitted and old tokens remain invalid',async()=>{
  const s=await setup();try{
    const a=await s.login('192.0.2.5'),b=await s.login('192.0.2.5');
    const list=await s.list(),id=list.connections.find(row=>row.ip==='192.0.2.5').id;
    assert.equal((await s.api('access/disconnect',{id},s.owner.token)).status,200);
    const states=await Promise.all([s.api('touch',{},a,'192.0.2.5'),s.api('touch',{},b,'192.0.2.5')]);
    assert.deepEqual(states.map(row=>row.status).sort(),[200,401]);
    assert.equal((await s.api('touch',{},s.owner.token)).status,200);await s.login('192.0.2.5');
    assert.equal((await s.api('access/disconnect',{id:'bad'},s.owner.token)).status,400);
  }finally{s.env.DB.db.close();}
});

test('blocking IPv4/IPv6 cuts every matching session, prevents login, and unblocking never restores revoked sessions',async()=>{
  for(const ip of ['192.0.2.5','2001:db8::5']){
    const s=await setup();try{
      const a=await s.login(ip),b=await s.login(ip);
      assert.equal((await s.api('access/block',{ip},s.owner.token)).status,200);
      for(const token of [a,b])assert.notEqual((await s.api('touch',{},token,ip)).status,200);
      assert.equal((await s.api('login',{code:'07942685'},null,ip)).status,403);
      assert.equal((await s.api('touch',{},a,'192.0.2.99')).status,401);
      const listed=await s.list();assert.equal(listed.blocks[0].ip,ip);assert.ok(!listed.connections.some(row=>row.ip===ip));
      assert.ok(!JSON.stringify(s.env.DB.db.prepare('SELECT * FROM access_blocks').all()).includes(ip));
      assert.equal((await s.api('access/unblock',{id:listed.blocks[0].id},s.owner.token)).status,200);
      await s.login(ip);assert.equal((await s.api('touch',{},a,ip)).status,401);
      assert.equal((await s.list()).blocks.length,0);
    }finally{s.env.DB.db.close();}
  }
});

test('self IP, mapped aliases and same-IP peers cannot lock out the manager',async()=>{
  const s=await setup();try{
    await s.login('198.51.100.1');
    assert.ok((await s.list()).connections.every(row=>row.sameIP));
    for(const ip of ['198.51.100.1','::ffff:198.51.100.1'])assert.equal((await s.api('access/block',{ip},s.owner.token)).status,409);
    assert.equal((await s.api('touch',{},s.owner.token)).status,200);
    assert.equal((await s.api('access/block',{ip:'1.2.3.4/24'},s.owner.token)).status,400);
  }finally{s.env.DB.db.close();}
});

test('legacy and unknown-IP sessions remain disconnectable and expired sessions disappear',async()=>{
  const s=await setup();try{
    const token=await s.login(null);const hash=createHash('sha256').update(token).digest('hex');
    s.env.DB.db.prepare('DELETE FROM access_connections WHERE token_hash=?').run(hash);
    const row=(await s.list()).connections.find(row=>!row.current);
    assert.ok(row.id);assert.equal(row.ip,null);assert.equal(row.createdAt,null);
    assert.equal((await s.api('access/disconnect',{id:row.id},s.owner.token)).status,200);
    s.advance(15*60000+1);assert.equal((await s.api('access',undefined,s.owner.token)).status,401);
  }finally{s.env.DB.db.close();}
});

test('revocation during an upload cannot commit a snapshot after the session is disconnected',async()=>{
  const s=await setup();try{
    const token=await s.login('192.0.2.5'),row=(await s.list()).connections.find(row=>row.ip==='192.0.2.5');
    s.beforeUpload(async()=>{s.beforeUpload(null);assert.equal((await s.api('access/disconnect',{id:row.id},s.owner.token)).status,200);});
    assert.equal((await s.upload(token,'192.0.2.5',0)).status,401);
    assert.equal(s.env.DB.db.prepare('SELECT version FROM vault').get().version,0);assert.equal(s.objects.size,0);
  }finally{s.env.DB.db.close();}
});

test('a block racing with login cannot leave a usable token on a different IP',async()=>{
  const s=await setup();try{
    const batch=s.env.DB.batch.bind(s.env.DB);let intercept=true;
    s.env.DB.batch=async statements=>{if(intercept){intercept=false;assert.equal((await s.api('access/block',{ip:'192.0.2.8'},s.owner.token)).status,200);}return batch(statements);};
    assert.equal((await s.api('login',{code:'07942685'},null,'192.0.2.8')).status,403);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM sessions').get().n,1);
  }finally{s.env.DB.db.close();}
});

test('disconnecting or blocking an owner closes desktop sharing and deletes its transient frame immediately',async()=>{
  for(const action of ['disconnect','block']){
    const s=await setup();try{
      const viewer=await s.login('192.0.2.5');
      const pair=await (await s.api('agents/pair',{},s.owner.token)).json();
      const agent=await (await s.api('agent/enroll',{code:pair.code,name:'Test',platform:'win32'})).json();
      const agentCall=(path,body)=>s.api('agent/'+path,body,null,'198.51.100.2',{Authorization:'Agent '+agent.token});
      await agentCall('poll',{capabilities:['remote-desktop-v1']});
      const session=await (await s.api('remote/start',{agentId:agent.id},viewer,'192.0.2.5')).json();
      const claim=await (await agentCall('poll',{})).json();
      assert.equal((await agentCall('remote/exchange',{id:session.id,lease:claim.remote.lease,status:'active',ack:0,frame:{width:10,height:10,jpeg:'/9j/2Q=='}})).status,200);
      assert.equal(s.objects.size,1);
      const connection=(await s.list()).connections.find(row=>row.ip==='192.0.2.5');
      assert.equal((await s.api('access/'+action,action==='disconnect'?{id:connection.id}:{ip:connection.ip},s.owner.token)).status,200);
      assert.equal(s.objects.size,0);
      assert.equal(s.env.DB.db.prepare('SELECT status FROM remote_sessions WHERE id=?').get(session.id).status,'closed');
      assert.equal((await s.api('remote/session?id='+session.id,undefined,viewer,'192.0.2.5')).status===200,false);
    }finally{s.env.DB.db.close();}
  }
});
