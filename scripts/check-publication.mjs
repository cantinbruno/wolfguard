import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,lstatSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const issues=new Set();
const secrets=[/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{36,}\b/,/\bgithub_pat_[A-Za-z0-9_]{60,}\b/,/\bAKIA[A-Z0-9]{16}\b/];
for(const name of new Set(files)) {
  const filename=path.join(root,name);
  if(!existsSync(filename))continue;
  if(lstatSync(filename).isSymbolicLink()) {issues.add(name);continue;}
  if(/\.zip$/i.test(name)&&!['app/downloads/WolfGuard-Agent-Windows.zip','docs/downloads/WolfGuard-Agent-Windows.zip'].includes(name)){issues.add(name);continue;}
  if(/\.exe$/i.test(name)&&!['app/downloads/WolfGuard-Agent-Windows.exe','docs/downloads/WolfGuard-Agent-Windows.exe'].includes(name)){issues.add(name);continue;}
  if(/(?:^|\/)(?:\.local-archive|\.cache|\.env(?:\..*)?|backups|donnees)(?:\/|$)|\.(?:sqlite\w*|db|itw|wgweb|wgmodule|pem|pfx|p12|key|dpapi)$/i.test(name)){issues.add(name);continue;}
  const bytes=readFileSync(filename);
  if(bytes.subarray(0,15).toString()==='SQLite format 3'){issues.add(name);continue;}
  const text=bytes.toString('utf8');
  if(secrets.some(pattern=>pattern.test(text)))issues.add(name);
  if(/^(?:app|docs)\/.*\.json$/i.test(name)) {
    let value;
    try { value=JSON.parse(text); } catch { issues.add(name);continue; }
    if(['wolfguard-web','wolfguard-workspace'].includes(value?.format) || (Array.isArray(value?.settings) && Array.isArray(value?.activity) && Array.isArray(value?.items)) || (Array.isArray(value?.items) && value.items.some(item=>item?.type==='vault' || item?.vaultBlobEnc || item?.passwordEnc)) || (Array.isArray(value?.settings) && value.settings.some(record=>['accessCodeHash','vaultCrypto'].includes(record?.key))))issues.add(name);
  }
}
try{execFileSync('python',[path.join(root,'scripts/package-agent.py'),'--check'],{cwd:root,stdio:'pipe'});}catch{issues.add('archive agent non conforme aux sources autorisées');}
if(issues.size){console.error('Publication bloquée : fichiers privés, secrets possibles ou liens symboliques détectés (contenus masqués).\n'+[...issues].join('\n'));process.exitCode=1;}
else console.log('PASS: aucun fichier privé ni secret reconnu dans les fichiers publiables et suivis par Git.');
