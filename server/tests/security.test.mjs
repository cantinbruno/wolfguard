import {test} from 'node:test';
import assert from 'node:assert/strict';
import {objectJSON} from '../lib/wolfguard/request.mjs';
import {profilePolicy,canManagePolicy} from '../lib/wolfguard/permissions.mjs';
import {seal,open} from '../lib/wolfguard/access.mjs';
import {handleAPI} from '../lib/wolfguard/core.mjs';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const request=value=>new Request('https://api.test/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});

test('untrusted API bodies require bounded JSON objects',async()=>{
  for(const value of [null,[],true,42,'text'])await assert.rejects(objectJSON(request(value),2048,fail),{status:400});
  await assert.rejects(objectJSON(request({value:'é'.repeat(20)}),32,fail),{status:413});
  const value={content:'{{[['.repeat(1000)};
  assert.deepEqual(await objectJSON(request(value),16000,fail),value);
});

test('temporary administrators cannot remove or extend their expiry',()=>{
  const now=Date.now(),permissions=profilePolicy('admin');permissions.expiresAt=now+60000;
  const actor={role:'member',permissions},target=profilePolicy('admin');
  assert.equal(canManagePolicy(actor,target,now),false);
  target.expiresAt=permissions.expiresAt;assert.equal(canManagePolicy(actor,target,now),true);
  assert.equal(canManagePolicy(actor,target,permissions.expiresAt),false);
});

test('large encrypted records retain authentication without overflowing the call stack',async()=>{
  const env={STORAGE_KEY:'2'.repeat(64)},value={text:'private-é'.repeat(20000)};
  const cipher=await seal(value,'record',env);
  assert.deepEqual(await open(cipher,'record',env),value);
  await assert.rejects(open(cipher,'other-record',env));
});

test('API security headers apply to errors and preserve the frontend CORS allowlist',async()=>{
  const response=await handleAPI(new Request('https://api.test/api/status',{headers:{Origin:'https://wolfguard.wavetools.fr'}}),{});
  assert.equal(response.status,503);
  assert.equal(response.headers.get('Strict-Transport-Security'),'max-age=31536000');
  assert.equal(response.headers.get('X-Frame-Options'),'DENY');
  assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://wolfguard.wavetools.fr');
  assert.match(response.headers.get('Cache-Control'),/no-store/);
});
