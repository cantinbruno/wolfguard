import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const root=new URL('..',import.meta.url);
const protectedFiles=['app/downloads/WolfGuard-Agent-Windows.exe','agent/windows-build.json','app/downloads/agent-release.json','docs/downloads/WolfGuard-Agent-Windows.exe'];
const snapshot=()=>protectedFiles.map(name=>readFileSync(new URL(name,root)));
const run=args=>{
  const env={...process.env};delete env.WOLFGUARD_SIGNING_CERT_THUMBPRINT;
  return spawnSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-File','scripts/sign-agent-windows.ps1',...args],{cwd:root,env,encoding:'utf8',windowsHide:true,timeout:30000});
};

test('Authenticode signing refuses a missing identity before changing any release file',{skip:process.platform!=='win32'},()=>{
  const before=snapshot(),result=run([]);
  assert.equal(result.status,1);
  assert.match(result.stderr,/Certificat Authenticode manquant/);
  assert.deepEqual(snapshot(),before);
});

test('Authenticode signing refuses an unavailable certificate instead of generating or trusting one',{skip:process.platform!=='win32'},()=>{
  const before=snapshot(),result=run(['-CertificateThumbprint','0'.repeat(40)]);
  assert.equal(result.status,1);
  assert.match(result.stderr,/introuvables ou ambigus/);
  assert.deepEqual(snapshot(),before);
});

test('checking Authenticode status leaves downloads, checksums and build provenance unchanged',{skip:process.platform!=='win32'},()=>{
  const before=snapshot(),result=run(['-Check']);
  assert.ok(result.status===0||result.status===1,result.error?.message);
  if(result.status===0)assert.match(result.stdout,/Valid/);
  else assert.match(result.stderr,/Signature Authenticode Windows non valide|Horodatage de la signature absent/);
  assert.deepEqual(snapshot(),before);
});
