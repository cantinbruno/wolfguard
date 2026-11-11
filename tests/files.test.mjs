import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,symlink} from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {createFileAccess,executeFileSession} from '../agent/files.mjs';
import {fileCommand,FILE_CHUNK} from '../server/lib/wolfguard/files-spec.mjs';
import {automaticMap} from '../agent/network.mjs';
import {setup} from './endpoint-fixture.mjs';
const cache=path.resolve('.cache');
async function temporary(run){await mkdir(cache,{recursive:true});const root=await mkdtemp(path.join(cache,'file-transfer-test-'));try{await run(root);}finally{const relative=path.relative(cache,root);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));await rm(root,{recursive:true,force:true});}}
test('file protocol rejects traversal, invalid handles and oversized chunks; automatic mapping uses an actual private interface',()=>{
  for(const command of [{action:'list',path:'../private'},{action:'upload',path:'a/../../x',total:1},{action:'read',handle:'bad',offset:0},{action:'write',handle:'a'.repeat(32),offset:0,data:Buffer.alloc(FILE_CHUNK+1).toString('base64')}])assert.throws(()=>fileCommand(command));
  const scope=automaticMap({Ethernet:[{family:'IPv4',internal:false,address:'192.168.5.42',cidr:'192.168.5.42/24'}],Loopback:[{family:'IPv4',internal:true,address:'127.0.0.1'}]});assert.equal(scope.target,'192.168.5.0/24');assert.equal(scope.origin.address,'192.168.5.42');
  assert.throws(()=>automaticMap({}));
});
test('real file access uploads atomically, preserves existing files, downloads directory ZIPs and clears partial uploads',()=>temporary(async root=>{
  const access=await createFileAccess({root});try{
    const content=Buffer.from('Contenu privé éè\n'),upload=await access.execute({action:'upload',path:'dossier/sous-dossier/été.txt',total:content.length});
    await assert.rejects(readFile(path.join(root,'dossier/sous-dossier/été.txt')));
    await assert.rejects(access.execute({action:'finish',handle:upload.handle}),/incomplet/);
    await access.execute({action:'write',handle:upload.handle,offset:0,data:content.toString('base64')});await access.execute({action:'finish',handle:upload.handle});
    assert.deepEqual(await readFile(path.join(root,'dossier/sous-dossier/été.txt')),content);
    await assert.rejects(access.execute({action:'upload',path:'dossier/sous-dossier/été.txt',total:2}),/existe/);
    await assert.rejects(access.execute({action:'list',path:path.dirname(root)}),/profil/);
    const download=await access.execute({action:'download',path:'dossier'}),chunk=await access.execute({action:'read',handle:download.handle,offset:0}),zip=Buffer.from(chunk.data,'base64');
    assert.equal(download.name,'dossier.zip');assert.equal(zip.readUInt32LE(0),0x04034b50);assert.ok(zip.includes(content));assert.ok(zip.includes(Buffer.from('dossier/sous-dossier/été.txt')));await access.execute({action:'close',handle:download.handle});
    await access.execute({action:'upload',path:'partial.txt',total:20});
  }finally{await access.close();}
  assert.ok(!(await readdir(root)).some(name=>name.endsWith('.part')));
}));
test('authenticated file session relays encrypted bytes to the real agent and removes transient commands on stop',()=>temporary(async root=>{
  const s=await setup();let work;const controller=new AbortController();
  try{
    await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543'),ticket=await(await s.api('agents/pair',{},owner.token)).json(),agent=await(await s.api('agent/enroll',{code:ticket.code,name:'Transferts test',platform:'win32'})).json();
    const agentAPI=async(route,data)=>{const response=await s.api('agent/'+route,data,null,{Authorization:'Agent '+agent.token});assert.equal(response.status,200,await response.clone().text());return response.json();};
    await agentAPI('poll',{capabilities:['remote-files-v1']});
    const started=await s.api('remote/start',{agentId:agent.id,mode:'files'},owner.token);assert.equal(started.status,201);const session=await started.json(),claim=(await agentAPI('poll',{})).remote;
    assert.equal(claim.mode,'files');work=executeFileSession({post:agentAPI},claim,{signal:controller.signal,intervalMs:1,accessFactory:()=>createFileAccess({root})});
    for(let i=0;i<100;i++){const view=await(await s.api('remote/session?id='+session.id,undefined,owner.token)).json();if(view.status==='active')break;await delay(2);}
    const command=async spec=>{
      const response=await s.api('remote/files/command',{id:session.id,command:spec},owner.token);assert.equal(response.status,201,await response.clone().text());const {seq}=await response.json();
      for(let i=0;i<200;i++){const response=await s.api('remote/files/result?id='+session.id+'&seq='+seq,undefined,owner.token);assert.equal(response.status,200);const reply=await response.json();if(reply.status==='done'){assert.equal(reply.result.ok,true,reply.result.message);return reply.result;}await delay(2);}throw new Error('File relay timeout');
    };
    const view=await command({action:'list',path:''});assert.equal(view.path,root);
    const content='PRIVATE-FILE-TRANSFER-é',upload=await command({action:'upload',path:'arrive.txt',total:Buffer.byteLength(content)});
    await command({action:'write',handle:upload.handle,offset:0,data:Buffer.from(content).toString('base64')});assert.ok(!JSON.stringify(s.env.DB.db.prepare('SELECT * FROM remote_file_commands').all()).includes(content));await command({action:'finish',handle:upload.handle});
    assert.equal(await readFile(path.join(root,'arrive.txt'),'utf8'),content);
    const download=await command({action:'download',path:'arrive.txt'}),chunk=await command({action:'read',handle:download.handle,offset:0});assert.equal(Buffer.from(chunk.data,'base64').toString(),content);
    assert.equal((await s.api('remote/files/result?id='+session.id+'&seq=1')).status,401);
    await s.api('remote/stop',{id:session.id},owner.token);await work;assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM remote_file_commands').get().n,0);
  }finally{controller.abort();await work?.catch(()=>{});s.env.DB.db.close();}
}));
