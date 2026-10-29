import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash, randomBytes, createDecipheriv} from 'node:crypto';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';

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

test('the published entry is encrypted, authenticates edits and contains no private-link key', () => {
  const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
  const {key}=JSON.parse(read('.local-archive/site-access.json'));
  const envelope=JSON.parse(read('docs/browser/site-entry.json'));
  const encrypted=Buffer.from(envelope.data,'base64');
  const decrypt=(input,material=key)=>{
    const cipher=createDecipheriv('aes-256-gcm',Buffer.from(material,'hex'),Buffer.from(envelope.iv,'base64'));
    cipher.setAAD(Buffer.from('WolfGuard private entry v1'));
    cipher.setAuthTag(input.subarray(-16));
    return Buffer.concat([cipher.update(input.subarray(0,-16)),cipher.final()]).toString('utf8');
  };
  assert.equal(decrypt(encrypted),read('.cache/site-document.html'));
  assert.match(decrypt(encrypted),/id="keypad"/);
  const altered=Buffer.from(encrypted);altered[20]^=1;
  assert.throws(()=>decrypt(altered));
  assert.throws(()=>decrypt(encrypted,randomBytes(32).toString('hex')));
  const html=read('docs/index.html');
  assert.doesNotMatch(html,/id="(?:keypad|app)"/);
  assert.match(html,/noindex, nofollow/);
  assert.match(read('docs/robots.txt'),/Disallow: \/\n/);
  assert.equal(existsSync(new URL('../docs/404.html',import.meta.url)),false);
  assert.match(read('docs/browser/private-entry.js'),/location\.replace\('\/404'\)/);
  function inspect(folder) {
    for(const item of readdirSync(folder,{withFileTypes:true})) {
      const url=new URL(item.name+(item.isDirectory()?'/':''),folder);
      if(item.isDirectory())inspect(url);
      else assert.equal(readFileSync(url).includes(Buffer.from(key)),false,url.pathname);
    }
  }
  inspect(new URL('../docs/',import.meta.url));
});
