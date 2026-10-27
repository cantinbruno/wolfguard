// Disposable local API for browser integration tests; never a hosted route.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
class D1 {
  constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(readFileSync(new URL('../server/drizzle/0000_brainy_jigsaw.sql',import.meta.url),'utf8'));}
  prepare(sql){const statement=this.db.prepare(sql);let values=[];return {bind(...args){values=args;return this;},async first(){return statement.get(...values)||null;},async run(){const r=statement.run(...values);return {meta:{changes:Number(r.changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
class Bucket {
  objects=new Map();failNext=false;
  async put(key,body,options){if(this.failNext){this.failNext=false;throw new Error('Synthetic upload failure');}this.objects.set(key,{value:new Uint8Array(await new Response(body).arrayBuffer()),...options});return {key};}
  async get(key){const data=this.objects.get(key);return data?{...data,body:new Response(data.value).body}:null;}
  async delete(key){this.objects.delete(key);}
}
const env={DB:new D1(),BUCKET:new Bucket(),AUTH_PEPPER:'1'.repeat(64),STORAGE_KEY:'2'.repeat(64),BOOTSTRAP_HASH:createHash('sha256').update('b'.repeat(64)).digest('hex'),LOCAL_TEST_ORIGIN:'http://127.0.0.1:4178'};
let offset=0;
const server=createServer(async(req,res)=>{
  try{
    if(req.url==='/__test/fail-upload'){env.BUCKET.failNext=true;res.end('ok');return;}
    if(req.url.startsWith('/__test/advance/')){offset+=Number(req.url.split('/').pop());res.end('ok');return;}
    const request=new Request('http://127.0.0.1'+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Readable.toWeb(req),duplex:'half'})});
    const response=await handleAPI(request,env,()=>Date.now()+offset);
    res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
  }catch{res.writeHead(500);res.end('Local test failure');}
});
server.listen(0,'127.0.0.1',()=>process.stdout.write(JSON.stringify({port:server.address().port})+'\n'));
