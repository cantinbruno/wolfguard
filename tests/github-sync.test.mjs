import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGitHubSync} from '../browser/github-sync.js';
import {create,validateEnvelope} from '../browser/crypto.js';
const TOKEN=['github','pat','fixture'].join('_')+'A'.repeat(40);
const repo='https://api.github.com/repos/cantinbruno/wolfguard-data';
function fakeGitHub(){
  const state={private:true,file:null,sha:'a'.repeat(40),calls:[],serial:1};
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  state.fetch=async(url,options)=>{
    state.calls.push({url,options});
    assert.ok(url.startsWith(repo));
    assert.equal(options.headers.Authorization,'Bearer '+TOKEN);
    assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');
    if(url===repo)return json({private:state.private,full_name:'cantinbruno/wolfguard-data'});
    if(url.includes('/contents/?'))return json({entries:[{type:'file',name:'README.md'}]});
    if(options.method==='PUT'){
      const body=JSON.parse(options.body);
      if((state.file && body.sha!==state.sha) || (!state.file && body.sha))return json({},409);
      state.file=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));
      state.sha=(++state.serial).toString(16).padStart(40,'0');
      return json({content:{sha:state.sha}});
    }
    if(url.includes('/git/blobs/'))return new Response(JSON.stringify(state.file));
    if(!state.file)return json({},404);
    return json({type:'file',sha:state.sha,size:Buffer.byteLength(JSON.stringify(state.file)),encoding:'none',download_url:'https://untrusted.invalid/never-follow'});
  };
  return state;
}
test('GitHub sync stores only authenticated encrypted envelopes in the private repository',async()=>{
  const fake=fakeGitHub(),original=globalThis.fetch;globalThis.fetch=fake.fetch;
  const client=createGitHubSync(validateEnvelope);
  try {
    await client.connect(TOKEN);assert.equal(await client.read(),null);
    const result=await create({version:2,items:[{title:'PRIVATE-CONTENT'}],folders:[],settings:[],activity:[]},'07942685');
    const saved=await client.write({...result.envelope,password:'NEVER-UPLOAD'},null);
    assert.equal(client.token,undefined);
    assert.deepEqual(fake.file,result.envelope);
    assert.equal(JSON.stringify(fake.file).includes('PRIVATE-CONTENT'),false);
    assert.equal(JSON.stringify(fake.file).includes('NEVER-UPLOAD'),false);
    assert.deepEqual(await client.read(),{envelope:result.envelope,sha:saved.sha});
    assert.ok(fake.calls.some(call=>call.url.includes('/git/blobs/')));
    assert.equal(fake.calls.some(call=>call.url.includes('untrusted.invalid')),false);
    const before=fake.calls.length;
    await assert.rejects(client.write({items:[]},saved.sha));
    assert.equal(fake.calls.length,before);
  } finally{client.disconnect();globalThis.fetch=original;}
});
test('concurrent writes and a repository made public cannot overwrite or receive a vault',async()=>{
  const fake=fakeGitHub(),original=globalThis.fetch;globalThis.fetch=fake.fetch;
  const client=createGitHubSync(validateEnvelope);
  try {
    await client.connect(TOKEN);
    const result=await create({version:2,items:[],folders:[],settings:[],activity:[]},'07942685');
    const saved=await client.write(result.envelope,null);
    fake.sha='b'.repeat(40);
    await assert.rejects(client.write(result.envelope,saved.sha),{code:'CONFLICT'});
    fake.private=false;
    const writes=fake.calls.filter(call=>call.options.method==='PUT').length;
    await assert.rejects(client.write(result.envelope,fake.sha),{code:'PRIVACY'});
    assert.equal(client.connected(),false);
    assert.equal(fake.calls.filter(call=>call.options.method==='PUT').length,writes);
    assert.deepEqual(fake.file,result.envelope);
  } finally{client.disconnect();globalThis.fetch=original;}
});
test('network errors do not expose credentials and tokens expire in memory',async()=>{
  const fake=fakeGitHub(),original=globalThis.fetch,clock=Date.now;globalThis.fetch=fake.fetch;
  const client=createGitHubSync(validateEnvelope);
  try {
    await client.connect(TOKEN);
    globalThis.fetch=async()=>{throw new Error(TOKEN)};
    await assert.rejects(client.read(),error=>error.code==='NETWORK' && !error.message.includes(TOKEN));
    const now=clock();Date.now=()=>now+16*60*1000;
    await assert.rejects(client.read(),{code:'AUTH'});
    assert.equal(client.connected(),false);
  } finally{Date.now=clock;client.disconnect();globalThis.fetch=original;}
});
