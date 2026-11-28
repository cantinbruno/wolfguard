import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {create,open} from '../browser/crypto.js';
import {d1ObjectStore,D1ObjectStore} from '../server/lib/wolfguard/object-store.mjs';

class D1 {
  constructor(){this.db=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../server/drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())this.db.exec(readFileSync(new URL('../server/drizzle/'+file,import.meta.url),'utf8'));}
  prepare(sql){const statement=this.db.prepare(sql);let values=[];return {bind(...args){values=args;return this;},async first(){return statement.get(...values)||null;},async all(){return {results:statement.all(...values)};},async run(){const r=statement.run(...values);return {meta:{changes:Number(r.changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.db.exec('COMMIT');return results;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
const bytes=n=>new Uint8Array(randomBytes(n));
const sameBytes=(a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b))===0;
const read=async object=>new Uint8Array(await object.arrayBuffer());

test('objects of any size round-trip through D1 with their metadata, in order and without loss', async()=>{
  const store=new D1ObjectStore(new D1());
  for(const size of [1,1000,384*1024-1,384*1024,384*1024+1,5*1024*1024+7]){
    const data=bytes(size);await store.put('snapshots/a'+size,new Response(data).body,{customMetadata:{format:'1',nonce:'ab',size:String(size)},httpMetadata:{contentType:'application/octet-stream'}});
    const object=await store.get('snapshots/a'+size);assert.equal(object.size,size);assert.equal(object.customMetadata.size,String(size));assert.equal(object.httpMetadata.contentType,'application/octet-stream');
    assert.ok(sameBytes(await read(object),data),'size '+size);
  }
  assert.equal(await store.get('missing'),null);
});

test('strings and JSON work, replacement is atomic and delete removes everything', async()=>{
  const db=new D1(),store=new D1ObjectStore(db);
  await store.put('security/cache.json',JSON.stringify({a:1}),{httpMetadata:{contentType:'application/json'}});
  assert.deepEqual(await (await store.get('security/cache.json')).json(),{a:1});
  await store.put('security/cache.json','{"a":2}');
  assert.equal(await (await store.get('security/cache.json')).text(),'{"a":2}');
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM object_chunks').get().n,1,'old revision removed');
  await store.delete('security/cache.json');assert.equal(await store.get('security/cache.json'),null);
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM object_chunks').get().n,0);
});

test('a failing upload leaves no visible object and no orphan chunks', async()=>{
  const db=new D1(),store=new D1ObjectStore(db);await store.put('x','old');
  const broken=new ReadableStream({start(c){c.enqueue(bytes(500*1024));},pull(c){c.error(new Error('network cut'));}});
  await assert.rejects(store.put('x',broken),/network cut/);
  assert.equal(await (await store.get('x')).text(),'old');
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM object_chunks').get().n,1);
});

test('only the 5 newest snapshots are kept, plus the one the vault points to; remote frames expire', async()=>{
  let now=1000;const db=new D1(),store=new D1ObjectStore(db,()=>now);
  for(let i=0;i<9;i++){now+=1000;await store.put('snapshots/s'+i,'v'+i);}
  const kept=db.db.prepare("SELECT key FROM objects WHERE key LIKE 'snapshots/%' ORDER BY key").all().map(r=>r.key);
  assert.deepEqual(kept,['snapshots/s4','snapshots/s5','snapshots/s6','snapshots/s7','snapshots/s8']);
  db.db.prepare('INSERT INTO vault(id,pin_salt,pin_hash,generation,version,object_key,failures,blocked_until,lease_until) VALUES(1,?,?,1,1,?,0,0,0)').run('s','h','snapshots/s4');
  for(let i=9;i<12;i++){now+=1000;await store.put('snapshots/s'+i,'v'+i);}
  const after=db.db.prepare("SELECT key FROM objects WHERE key LIKE 'snapshots/%' ORDER BY key").all().map(r=>r.key);
  assert.ok(after.includes('snapshots/s4'),'the current vault object is never pruned');assert.equal(after.length,6);
  await store.put('remote/old','frame');now+=7*3600*1000;await store.put('remote/new','frame');
  assert.equal(await store.get('remote/old'),null);assert.ok(await store.get('remote/new'));
});

test('one store per database keeps caches keyed on it alive between requests', ()=>{
  const db=new D1();assert.equal(d1ObjectStore(db),d1ObjectStore(db));assert.notEqual(d1ObjectStore(db),d1ObjectStore(new D1()));
});

test('the API works end to end with no R2 bucket: ciphertext saved to D1, read back, replaced and never in clear', async()=>{
  const activation=randomBytes(32).toString('hex'),db=new D1();let now=1700000000000;
  const env={DB:db,AUTH_PEPPER:randomBytes(32).toString('hex'),WORKSPACE_KEY_ENCRYPTION_KEY:'4'.repeat(64),STORAGE_KEY:randomBytes(32).toString('hex'),BOOTSTRAP_HASH:createHash('sha256').update(activation).digest('hex')};
  const api=(path,method='GET',data,token,headers={})=>{const options={method,headers:{Origin:'https://wolfguard.wavetools.fr',...headers}};if(token)options.headers.Authorization='Bearer '+token;if(data!==undefined){options.body=typeof data==='string'?data:JSON.stringify(data);options.headers['Content-Type']='application/json';}return handleAPI(new Request('https://backend.test/api/'+path,options),env,()=>now);};
  const upload=(data,version,token)=>{const text=JSON.stringify(data);return api('vault','PUT',text,token,{'X-WG-Version':String(version),'X-WG-Size':String(Buffer.byteLength(text))});};
  const setup=await api('setup','POST',{code:'07942685'},null,{'X-WG-Activation':activation});assert.equal(setup.status,200);const first=await setup.json();
  const payload={version:2,items:[{id:'i1',title:'secret-title-xyz'}],folders:[],settings:[],activity:[]};
  const encrypted=await create(payload,'07942685');
  assert.equal((await upload(encrypted.envelope,0,first.token)).status,200);
  const login=await (await api('login','POST',{code:'07942685'})).json();assert.equal(login.version,1);
  const remote=await api('vault','GET',undefined,login.token);assert.equal(remote.status,200);
  assert.deepEqual((await open(await remote.json(),'07942685')).payload,payload);
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM objects').get().n,1);
  const stored=db.db.prepare('SELECT group_concat(data) d FROM object_chunks').get().d;
  assert.equal(Buffer.from(stored,'base64').includes('secret-title-xyz'),false,'ciphertext at rest');
  assert.equal((await upload(encrypted.envelope,1,login.token)).status,200);
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM objects').get().n,2,'immutable snapshots are kept as recovery history');
});
