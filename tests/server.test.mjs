import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {create,open} from '../browser/crypto.js';

class D1 {
  constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(readFileSync(new URL('../server/drizzle/0000_brainy_jigsaw.sql',import.meta.url),'utf8'));}
  prepare(sql){const statement=this.db.prepare(sql);let values=[];return {bind(...args){values=args;return this;},async first(){return statement.get(...values)||null;},async run(){const r=statement.run(...values);return {meta:{changes:Number(r.changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.db.exec('COMMIT');return results;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
class Bucket {
  objects=new Map();
  async put(key,body,options){const value=new Uint8Array(await new Response(body).arrayBuffer());this.objects.set(key,{value,...options});return {key};}
  async get(key){const data=this.objects.get(key);return data?{...data,body:new Response(data.value).body}:null;}
  async delete(key){this.objects.delete(key);}
}
function setup(){
  const activation=randomBytes(32).toString('hex');let now=1700000000000;
  const env={DB:new D1(),BUCKET:new Bucket(),AUTH_PEPPER:randomBytes(32).toString('hex'),STORAGE_KEY:randomBytes(32).toString('hex'),BOOTSTRAP_HASH:createHash('sha256').update(activation).digest('hex')};
  return {env,activation,advance(ms){now+=ms;},async api(path,method='GET',data,token,headers={}){
    const options={method,headers:{Origin:'https://wolfguard.wavetools.fr',...headers}};
    if(token)options.headers.Authorization='Bearer '+token;
    if(data!==undefined){options.body=typeof data==='string'?data:JSON.stringify(data);options.headers['Content-Type']='application/json';}
    return handleAPI(new Request('https://backend.test/api/'+path,options),env,()=>now);
  },upload(data,version,token,rotation){const text=typeof data==='string'?data:JSON.stringify(data);return this.api('vault','PUT',text,token,{'X-WG-Version':String(version),'X-WG-Size':String(Buffer.byteLength(text)),...(rotation?{'X-WG-Rotation':rotation}:{})});}};
}
const payload={version:2,items:[],folders:[],settings:[],activity:[]};
async function activate(s,code='07942685') {const r=await s.api('setup','POST',{code},null,{'X-WG-Activation':s.activation});assert.equal(r.status,200);return r.json();}
async function login(s,code='07942685'){const r=await s.api('login','POST',{code});assert.equal(r.status,200);return r.json();}

test('unclaimed vault requires private one-time activation; anonymous and cross-origin reads/writes fail',async()=>{
  const s=setup();assert.deepEqual(await (await s.api('status')).json(),{initialized:false});
  assert.equal((await s.api('setup','POST',{code:'07942685'})).status,403);
  const auth=await activate(s);assert.equal(auth.exists,false);
  assert.equal((await s.api('setup','POST',{code:'11111111'},null,{'X-WG-Activation':s.activation})).status,409);
  assert.equal((await s.api('vault')).status,401);
  assert.equal((await s.api('vault','GET',undefined,auth.token,{Origin:'https://evil.test'})).status,403);
  const preflight=await s.api('vault','OPTIONS');assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://wolfguard.wavetools.fr');
  assert.equal((await s.api('vault','GET',undefined,auth.token)).status,404);
  s.env.DB.db.close();
});

test('failed PIN attempts serialize globally and impose growing persistent deadlines across devices',async()=>{
  const s=setup();await activate(s);
  const responses=await Promise.all([s.api('login','POST',{code:'00000000'}),s.api('login','POST',{code:'00000001'})]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[401,429]);
  assert.equal((await s.api('login','POST',{code:'07942685'})).status,429);
  s.advance(5001);
  const second=await s.api('login','POST',{code:'00000000'});assert.equal(second.status,401);assert.equal((await second.json()).retryAfter,10);
  s.advance(10001);await login(s);
  const row=await s.env.DB.prepare('SELECT * FROM vault').first();assert.equal(row.failures,0);assert.equal(row.blocked_until,0);
  s.env.DB.db.close();
});

test('two independent sessions recover identical ciphertext; immutable uploads use CAS and resist lost updates',async()=>{
  const s=setup(),a=await activate(s),encrypted=await create(payload,'07942685');
  assert.equal((await s.upload(encrypted.envelope,0,a.token)).status,200);
  const b=await login(s);assert.equal(b.version,1);assert.equal(b.exists,true);
  const remote=await s.api('vault','GET',undefined,b.token);assert.equal(remote.headers.get('X-WG-Version'),'1');
  assert.deepEqual((await open(await remote.json(),'07942685')).payload,payload);
  const atRest=[...s.env.BUCKET.objects.values()][0].value;
  assert.equal(new TextDecoder().decode(atRest).includes('wolfguard'),false);
  const edits=await Promise.all([s.upload(encrypted.envelope,1,a.token),s.upload(encrypted.envelope,1,b.token)]);
  assert.deepEqual(edits.map(r=>r.status).sort(),[200,409]);
  assert.equal((await s.env.DB.prepare('SELECT version FROM vault').first()).version,2);
  assert.equal(s.env.BUCKET.objects.size,2);
  s.advance(60001);assert.equal((await s.api('vault','GET',undefined,a.token)).status,401);
  s.env.DB.db.close();
});

test('streaming storage authenticates multiple frames and failed uploads leave committed data intact',async()=>{
  const s=setup(),auth=await activate(s),text=JSON.stringify({opaque:'abc😀'.repeat(70000)});
  assert.equal((await s.upload(text,0,auth.token)).status,200);
  assert.equal(await (await s.api('vault','GET',undefined,auth.token)).text(),text);
  const oldPut=s.env.BUCKET.put;s.env.BUCKET.put=async()=>{throw new Error('offline');};
  assert.equal((await s.upload('new copy',1,auth.token)).status,503);
  s.env.BUCKET.put=oldPut;
  assert.equal(await (await s.api('vault','GET',undefined,auth.token)).text(),text);
  const row=await s.env.DB.prepare('SELECT * FROM vault').first();s.env.BUCKET.objects.get(row.object_key).value[90]^=1;
  const damaged=await s.api('vault','GET',undefined,auth.token);await assert.rejects(damaged.text());
  s.env.DB.db.close();
});

test('code rotation changes credential and encrypted snapshot together, then revokes older sessions',async()=>{
  const s=setup(),a=await activate(s),old=await create(payload,'07942685');
  await s.upload(old.envelope,0,a.token);const b=await login(s);
  const staged=await s.api('rotation','POST',{oldCode:'07942685',newCode:'09876543',version:1},a.token);
  assert.equal(staged.status,200);const {rotation}=await staged.json();
  await login(s); // Old code remains valid until its replacement snapshot commits.
  const next=await create(payload,'09876543',2);
  const result=await s.upload(next.envelope,1,a.token,rotation);assert.equal(result.status,200);
  const changed=await result.json();assert.equal(changed.version,2);assert.ok(changed.token);
  assert.equal((await s.api('vault','GET',undefined,b.token)).status,401);
  assert.equal((await s.api('login','POST',{code:'07942685'})).status,401);
  s.advance(5001);const fresh=await login(s,'09876543');
  assert.deepEqual((await open(await (await s.api('vault','GET',undefined,fresh.token)).json(),'09876543')).payload,payload);
  s.env.DB.db.close();
});
