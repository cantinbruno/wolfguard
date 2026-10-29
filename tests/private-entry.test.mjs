import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash, randomBytes} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {handleFrontend} from '../server/lib/wolfguard/frontend.mjs';

test('private entry checks an independent key without accessing vault storage or creating a PIN session', async () => {
  const key=randomBytes(32).toString('hex');
  const env={ENTRY_LINK_HASH:createHash('sha256').update(key).digest('hex')};
  const call=(token,method='POST',origin='https://wolfguard.wavetools.fr',config=env)=>handleAPI(new Request('https://backend.test/api/entry', {
    method, headers:{Origin:origin,...(token?{Authorization:'Bearer '+token}:{})}
  }), config);
  for(const key of [undefined,'01234567','a'.repeat(64),'a'.repeat(65)]) {
    const response=await call(key);
    assert.equal(response.status,404);
    assert.equal((await response.json()).error,'Adresse inconnue.');
  }
  assert.equal((await call(key,'GET')).status,404);
  assert.equal((await call(key,'POST','https://other.invalid')).status,403);
  assert.equal((await call(key,'POST','https://wolfguard.wavetools.fr',{})).status,404);
  const response=await call(key);
  assert.equal(response.status,204);
  assert.equal(await response.text(),'');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://wolfguard.wavetools.fr');
  assert.match(response.headers.get('Cache-Control'),/no-store/);
  assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
  assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
  const sessionAttempt=await handleAPI(new Request('https://backend.test/api/vault',{headers:{Authorization:'Bearer '+key}}),env);
  assert.notEqual(sessionAttempt.status,200);
});

test('entry sends an actual empty HTTP 404 before HTML for every missing or invalid URL key',async()=>{
  const key=randomBytes(32).toString('hex');
  const env={ENTRY_LINK_HASH:createHash('sha256').update(key).digest('hex')};
  const html=readFileSync(new URL('../server/lib/wolfguard/frontend.html',import.meta.url),'utf8');
  const call=(suffix,method='GET',config=env)=>handleFrontend(new Request('https://backend.test'+suffix,{method}),config,html);
  for(const suffix of ['/', '/#access='+key, '/?access=', '/?access='+randomBytes(32).toString('hex'), '/?access='+key+'&extra=1','/?access='+key+'&access='+key,'/index.html?access='+key,'/inconnu?access='+key]) {
    const response=await call(suffix);
    assert.equal(response.status,404);
    assert.equal(await response.text(),'');
    assert.match(response.headers.get('Cache-Control'),/no-store/);
    assert.equal(response.headers.get('Location'),null);
  }
  assert.equal((await call('/?access='+key,'POST')).status,404);
  assert.equal((await call('/?access='+key,'GET',{})).status,404);
  assert.equal((await call('/?access='+key,'GET',{...env,FRONTEND_HOST:'wolfguard.wavetools.fr'})).status,404);
  assert.equal((await handleFrontend(new Request('https://wolfguard.wavetools.fr/?access='+key),{...env,FRONTEND_HOST:'wolfguard.wavetools.fr'},html)).status,200);
  const valid=await call('/?access='+key);
  assert.equal(valid.status,200);
  assert.equal(await valid.text(),html);
  assert.match(html,/id="keypad"/);
  assert.equal(html.includes(key),false);
  assert.equal(valid.headers.get('Referrer-Policy'),'no-referrer');
  assert.match(valid.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
  const head=await call('/?access='+key,'HEAD');
  assert.equal(head.status,200);assert.equal(await head.text(),'');
  for(const suffix of ['/api/status','/api/login','/browser/cloud.bundle.js','/css/base.css','/downloads/WolfGuard-Agent-Windows.exe','/downloads/WolfGuard-Agent-Windows.zip'])assert.equal(await call(suffix),null);
  assert.equal(existsSync(new URL('../docs/index.html',import.meta.url)),false);
  assert.equal(existsSync(new URL('../docs/404.html',import.meta.url)),false);
  assert.equal(existsSync(new URL('../server/public/index.html',import.meta.url)),false);
});
