import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash, randomBytes} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';

test('the legacy link verifier remains separate from vault storage and PIN sessions', async () => {
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

test('the normal address opens the PIN screen and unknown paths recover to a fixed app address', () => {
  const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
  const html=read('docs/index.html');
  assert.match(html,/id="keypad"/);
  assert.match(html,/id="app" class="[^"]*hidden/);
  assert.doesNotMatch(html,/private-entry\.js|site-entry\.json|entry-message/);
  assert.match(html,/noindex, nofollow/);
  assert.match(read('docs/robots.txt'),/Disallow: \/\n/);
  const recovery=read('docs/404.html');
  assert.match(recovery,/<meta http-equiv="refresh" content="0;url=https:\/\/wolfguard\.wavetools\.fr\/">/);
  assert.match(recovery,/<a href="https:\/\/wolfguard\.wavetools\.fr\/"/);
  assert.doesNotMatch(recovery,/<script|#access=/);
  assert.equal(existsSync(new URL('../docs/browser/site-entry.json',import.meta.url)),false);
});
