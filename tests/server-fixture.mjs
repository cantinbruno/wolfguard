// Disposable local API for browser integration tests; never a hosted route.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash,pbkdf2Sync} from 'node:crypto';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {usernameHash} from '../server/lib/wolfguard/users.mjs';
import {seal} from '../server/lib/wolfguard/access.mjs';
class D1 {
  constructor(){this.db=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../server/drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())this.db.exec(readFileSync(new URL('../server/drizzle/'+file,import.meta.url),'utf8'));}
  prepare(sql){const statement=this.db.prepare(sql);let values=[];return {bind(...args){values=args;return this;},async first(){return statement.get(...values)||null;},async all(){return {results:statement.all(...values)};},run(){const r=statement.run(...values);return {meta:{changes:Number(r.changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(statement.run());this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
class Bucket {
  objects=new Map();failNext=false;
  async put(key,body,options){if(this.failNext){this.failNext=false;throw new Error('Synthetic upload failure');}this.objects.set(key,{value:new Uint8Array(await new Response(body).arrayBuffer()),...options});return {key};}
  async get(key){const data=this.objects.get(key);return data?{...data,body:new Response(data.value).body}:null;}
  async delete(key){this.objects.delete(key);}
}
const env={DB:new D1(),BUCKET:new Bucket(),AUTH_PEPPER:'1'.repeat(64),STORAGE_KEY:'2'.repeat(64),BOOTSTRAP_HASH:createHash('sha256').update('b'.repeat(64)).digest('hex'),LOCAL_TEST_ORIGIN:process.env.WG_TEST_ORIGIN||'http://127.0.0.1:4178'};
env.ENTRY_LINK_HASH=process.env.WG_TEST_ENTRY_HASH;
let offset=0,fixtureCode='';
const server=createServer(async(req,res)=>{
  try{
    if(req.url==='/__test/fail-upload'){env.BUCKET.failNext=true;res.end('ok');return;}
    if(req.url.startsWith('/__test/advance/')){offset+=Number(req.url.split('/').pop());res.end('ok');return;}
    const request=new Request('http://127.0.0.1'+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Readable.toWeb(req),duplex:'half'})});
    if(req.url==='/api/setup')fixtureCode=(await request.clone().json()).code;
    const snapshot=req.url==='/api/vault'&&req.method==='PUT'?await request.clone().json():null;
    const response=await handleAPI(request,env,()=>Date.now()+offset);
    // Existing regression profiles start with a provisioned synthetic admin.
    // Dedicated onboarding tests opt out and exercise the real product setup.
    if(snapshot&&response.ok&&fixtureCode&&!process.env.WG_TEST_MANUAL_USERS){
      const vault=env.DB.db.prepare('SELECT * FROM vault').get();
      if(!vault.users_enabled){
        const id='a'.repeat(32),now=Date.now()+offset;
        const material={key:pbkdf2Sync(fixtureCode,Buffer.from(snapshot.salt,'base64'),600000,32,'sha256').toString('base64'),salt:snapshot.salt};
        env.DB.db.prepare("INSERT INTO users (id,name_hash,name_cipher,role,pin_salt,pin_hash,created_at,updated_at,last_login) VALUES (?,?,?,'admin',?,?,?,?,?)").run(id,await usernameHash('cantin.bruno@gmx.fr',env),await seal('cantin.bruno@gmx.fr','WolfGuard users v1:name:'+id,env),vault.pin_salt,vault.pin_hash,now,now,now);
        env.DB.db.prepare('UPDATE vault SET users_enabled=1,workspace_key_cipher=?').run(await seal(material,'WolfGuard users v1:workspace-key',env));
        env.DB.db.prepare('UPDATE sessions SET user_id=?,user_version=1').run(id);
      }
    }
    res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
  }catch{res.writeHead(500);res.end('Local test failure');}
});
server.listen(0,'127.0.0.1',()=>process.stdout.write(JSON.stringify({port:server.address().port})+'\n'));
