import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('publication refuses a private workspace accidentally copied among public JSON files',()=>{
  const probe=path.join(root,'docs','publication-security-probe.json');
  assert.equal(existsSync(probe),false);
  try {
    writeFileSync(probe,JSON.stringify({format:'wolfguard-workspace',data:'SYNTHETIC-NOT-A-REAL-BACKUP'}));
    const result=spawnSync(process.execPath,['scripts/check-publication.mjs'],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,1);
    assert.match(result.stderr,/publication-security-probe.json/);
    assert.equal(result.stderr.includes('SYNTHETIC-NOT-A-REAL-BACKUP'),false);
  } finally { rmSync(probe,{force:true}); }
});

test('publication refuses an altered agent executable even at its allowed download path',()=>{
  const filename=path.join(root,'app/downloads/WolfGuard-Agent-Windows.exe');
  const original=readFileSync(filename),changed=Buffer.from(original);changed[changed.length-1]^=1;
  try {
    writeFileSync(filename,changed);
    const result=spawnSync(process.execPath,['scripts/check-publication.mjs'],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,1);
    assert.match(result.stderr,/agent non conforme/);
  } finally { writeFileSync(filename,original); }
});
