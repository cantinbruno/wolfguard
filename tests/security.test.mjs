import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,open,openWithKey,seal,validateEnvelope,WORKSPACE_VERSION,generateBackupKey,protectBackup,unprotectBackup,isProtectedBackup} from '../browser/crypto.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

test('SRI matches the LF bytes published by Git from a Windows workspace',()=>{
  const base=new URL('../docs/',import.meta.url);
  const html=readFileSync(new URL('../.cache/site-document.html',import.meta.url),'utf8');
  let checked=0;
  for(const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"?]+)(?:\?[^\"]*)?"[^>]*integrity="sha384-([^"]+)"/g)) {
    const bytes=readFileSync(new URL(match[1],base));
    assert.equal(bytes.toString('utf8').includes('\r\n'),false,match[1]);
    assert.equal(createHash('sha384').update(bytes).digest('base64'),match[2],match[1]);
    checked++;
  }
  assert.ok(checked>50);
});

test('workspace encryption authenticates metadata and uses nonextractable keys and fresh IVs',async()=>{
  const payload={version:2,items:[],folders:[],settings:[],activity:[]};
  const result=await create(payload,'07942685');
  assert.equal(result.envelope.version,WORKSPACE_VERSION);
  assert.equal(result.key.extractable,false);
  await assert.rejects(crypto.subtle.exportKey('raw',result.key));
  const next=await seal(payload,result.key,result.salt,2);
  assert.notEqual(next.iv,result.envelope.iv);
  assert.deepEqual((await open(next,'07942685')).payload,payload);
  assert.deepEqual((await openWithKey(next,result.key,result.salt)).payload,payload);
  await assert.rejects(openWithKey(next,result.key,new Uint8Array(16)),{code:'INVALID_ACCESS_CODE'});
  for(const changes of [{revision:2},{version:2},{iv:btoa(String.fromCharCode(...new Uint8Array(12)))},{salt:btoa(String.fromCharCode(...new Uint8Array(16)))}]){
    await assert.rejects(open({...result.envelope,...changes},'07942685'),{code:'INVALID_ACCESS_CODE'});
  }
  assert.throws(()=>validateEnvelope({...result.envelope,iterations:999999999}),/invalide/);
  assert.throws(()=>validateEnvelope({...result.envelope,data:result.envelope.data.replace(/=+$/,'')+'==='}),/invalide/);
});

test('exported backups need an independent random recovery key before the personal code can be tested',async()=>{
  const payload={version:2,items:[{id:'private',title:'PRIVATE BACKUP CONTENT'}],folders:[],settings:[],activity:[]};
  const {envelope}=await create(payload,'07942685');
  const recoveryKey=generateBackupKey(),otherKey=generateBackupKey();
  assert.match(recoveryKey,/^[a-f0-9]{64}$/);assert.notEqual(recoveryKey,otherKey);
  const backup=await protectBackup(envelope,recoveryKey),next=await protectBackup(envelope,recoveryKey);
  assert.equal(isProtectedBackup(backup),true);assert.notEqual(backup.iv,next.iv);
  const serialized=JSON.stringify(backup);
  for(const secret of [recoveryKey,'07942685','PRIVATE BACKUP CONTENT',envelope.salt])assert.ok(!serialized.includes(secret));
  await assert.rejects(open(backup,'07942685'));
  await assert.rejects(unprotectBackup(backup,otherKey));
  await assert.rejects(unprotectBackup(backup,'07942685'));
  await assert.rejects(unprotectBackup(backup,recoveryKey+'\n'));
  const inner=await unprotectBackup(backup,recoveryKey);
  assert.deepEqual(inner,envelope);
  await assert.rejects(open(inner,'99999999'));
  assert.deepEqual((await open(inner,'07942685')).payload,payload);
  for(const changed of [{version:2},{cipher:'AES-CBC'},{iv:btoa('\0'.repeat(12))},{data:(backup.data[0]==='A'?'B':'A')+backup.data.slice(1)}])await assert.rejects(unprotectBackup({...backup,...changed},recoveryKey));
});

test('protected recovery exports preserve legacy encrypted spaces without needing their old code',async()=>{
  const legacy=await create({version:1,items:[],folders:[]},'01234567');
  const recoveryKey=generateBackupKey(),backup=await protectBackup(legacy.envelope,recoveryKey);
  assert.deepEqual(await unprotectBackup(backup,recoveryKey),legacy.envelope);
  assert.equal(isProtectedBackup(legacy.envelope),false);
});
