import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,open,seal,validateEnvelope,WORKSPACE_VERSION} from '../browser/crypto.js';

test('workspace encryption authenticates metadata and uses nonextractable keys and fresh IVs',async()=>{
  const payload={version:2,items:[],folders:[],settings:[],activity:[]};
  const result=await create(payload,'07942685');
  assert.equal(result.envelope.version,WORKSPACE_VERSION);
  assert.equal(result.key.extractable,false);
  await assert.rejects(crypto.subtle.exportKey('raw',result.key));
  const next=await seal(payload,result.key,result.salt,2);
  assert.notEqual(next.iv,result.envelope.iv);
  assert.deepEqual((await open(next,'07942685')).payload,payload);
  for(const changes of [{revision:2},{version:2},{iv:btoa(String.fromCharCode(...new Uint8Array(12)))},{salt:btoa(String.fromCharCode(...new Uint8Array(16)))}]){
    await assert.rejects(open({...result.envelope,...changes},'07942685'),{code:'INVALID_ACCESS_CODE'});
  }
  assert.throws(()=>validateEnvelope({...result.envelope,iterations:999999999}),/invalide/);
  assert.throws(()=>validateEnvelope({...result.envelope,data:result.envelope.data.replace(/=+$/,'')+'==='}),/invalide/);
});
