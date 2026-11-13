import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {seal,open} from '../server/lib/wolfguard/access.mjs';
import {sealWorkspaceKey,openWorkspaceKey} from '../server/lib/wolfguard/workspace-key.mjs';

const material={key:Buffer.alloc(32,7).toString('base64'),salt:Buffer.alloc(16,8).toString('base64')};
function fixture(){
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE vault(id INTEGER PRIMARY KEY,workspace_key_cipher TEXT)');
  const env={STORAGE_KEY:'2'.repeat(64),AUTH_PEPPER:'1'.repeat(64),WORKSPACE_KEY_ENCRYPTION_KEY:'4'.repeat(64),DB:{prepare(sql){const statement=db.prepare(sql);let args=[];return{bind(...value){args=value;return this;},async run(){return{meta:{changes:Number(statement.run(...args).changes)}};},async first(){return statement.get(...args)||null;}};}}};
  return{db,env};
}
test('shared keys require a separate secret and cannot be opened with the generic storage key',async()=>{
  const {db,env}=fixture();try{
    const encrypted=await sealWorkspaceKey(material,env);
    assert.ok(encrypted.startsWith('wgkey2:'));assert.ok(!encrypted.includes(material.key));
    assert.deepEqual(await openWorkspaceKey({workspace_key_cipher:encrypted},env),material);
    await assert.rejects(open(encrypted,'WolfGuard users v1:workspace-key',env));
    for(const secret of [undefined,'invalid',env.STORAGE_KEY,env.AUTH_PEPPER]){
      await assert.rejects(sealWorkspaceKey(material,{...env,WORKSPACE_KEY_ENCRYPTION_KEY:secret}),/indisponible/);
      await assert.rejects(openWorkspaceKey({workspace_key_cipher:encrypted},{...env,WORKSPACE_KEY_ENCRYPTION_KEY:secret}),/indisponible/);
    }
    await assert.rejects(openWorkspaceKey({workspace_key_cipher:encrypted},{...env,WORKSPACE_KEY_ENCRYPTION_KEY:'5'.repeat(64)}));
    const changed=encrypted.slice(0,-6)+(encrypted.at(-6)==='A'?'B':'A')+encrypted.slice(-5);
    await assert.rejects(openWorkspaceKey({workspace_key_cipher:changed},env));
  }finally{db.close();}
});
test('legacy shared keys migrate atomically without changing the underlying key, including concurrent reads',async()=>{
  const {db,env}=fixture();try{
    const legacy=await seal(material,'WolfGuard users v1:workspace-key',env);
    db.prepare('INSERT INTO vault VALUES(1,?)').run(legacy);
    const results=await Promise.all([openWorkspaceKey({workspace_key_cipher:legacy},env),openWorkspaceKey({workspace_key_cipher:legacy},env)]);
    assert.deepEqual(results,[material,material]);
    const migrated=db.prepare('SELECT * FROM vault').get();assert.ok(migrated.workspace_key_cipher.startsWith('wgkey2:'));
    assert.deepEqual(await openWorkspaceKey(migrated,env),material);
    assert.equal(db.prepare('SELECT workspace_key_cipher FROM vault').get().workspace_key_cipher,migrated.workspace_key_cipher);
  }finally{db.close();}
});
