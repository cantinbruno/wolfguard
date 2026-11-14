import {execFile} from 'node:child_process';
import {readFile,writeFile,open,lstat,realpath,rename,unlink,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {privateDirectory,safeAncestors,fileDigest,within} from './antivirus-store.mjs';
const definition=JSON.parse(await readFile(new URL('./antivirus-dependencies.json',import.meta.url),'utf8'));
export function antivirusProcess(file,args,{input='',signal,timeout=120000,maxBytes=256000}={}){
  return new Promise((resolve,reject)=>{
    if(process.platform==='win32'&&file==='powershell.exe')file=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
    const env={...process.env,LC_ALL:'C',LANG:'C'};delete env.OPENSSL_CONF;delete env.OPENSSL_MODULES;
    const child=execFile(file,args,{windowsHide:true,cwd:path.dirname(file),env,encoding:'utf8',timeout,maxBuffer:maxBytes,signal},(error,stdout,stderr)=>{
      if(error){error.stdout=stdout;error.stderr=stderr;reject(error);}else resolve(stdout);
    });child.stdin.on('error',()=>{});child.stdin.end(input);
  });
}
export async function downloadEngine(target,{fetcher=fetch,signal,onProgress=()=>{}}={}){
  const item=definition.windowsX64;let url=new URL(item.url),response;
  for(let redirects=0;redirects<5;redirects++){
    if(url.protocol!=='https:'||url.username||url.password||!['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(url.hostname))throw new Error('Origine du moteur antivirus refusée.');
    response=await fetcher(url.href,{redirect:'manual',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(180000)]):AbortSignal.timeout(180000)});
    if(response.status>=300&&response.status<400){const location=response.headers.get('location');await response.body?.cancel();if(!location)throw new Error('Redirection antivirus invalide.');url=new URL(location,url);continue;}
    break;
  }
  if(!response?.ok||!response.body)throw new Error('Téléchargement du moteur ClamAV impossible.');
  const output=await open(target,'wx',0o600),digest=createHash('sha256');let total=0;
  try{
    for await(const chunk of response.body){total+=chunk.length;if(total>item.bytes)throw new Error('Moteur antivirus trop volumineux.');digest.update(chunk);await output.writeFile(chunk);onProgress(total,item.bytes);}
    if(total!==item.bytes||digest.digest('hex')!==item.sha256)throw new Error('L’intégrité du moteur ClamAV n’est pas confirmée.');
  }catch(error){await output.close();await unlink(target).catch(()=>{});throw error;}
  await output.close();
}
export class ClamEngine{
  constructor(directory,{platform=process.platform,arch=process.arch,run=antivirusProcess,fetcher=fetch,download=downloadEngine}={}){this.directory=path.resolve(directory);this.platform=platform;this.arch=arch;this.run=run;this.fetcher=fetcher;this.download=download;this.cached=null;}
  async paths(){
    if(this.cached)return this.cached;
    if(this.platform==='win32'){
      const marker=path.join(this.directory,'engine.verified.json');await safeAncestors(marker);
      let saved;try{saved=JSON.parse(await readFile(marker,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw new Error('Installation antivirus illisible.');}
      if(saved.version!==definition.version)return null;
      if(saved.archiveHash!==definition.windowsX64.sha256)throw new Error('Intégrité du moteur antivirus non reconnue.');
      if(saved.installation!==undefined&&!/^engine-\d+\.\d+\.\d+-[a-f0-9]{32}$/.test(saved.installation))throw new Error('Emplacement du moteur antivirus invalide.');
      const root=path.join(this.directory,saved.installation||'engine-'+definition.version,definition.windowsX64.directory);
      for(const name of ['clamscan.exe','freshclam.exe']){
        const file=path.join(root,name);await safeAncestors(file);const info=await lstat(file);if(!info.isFile()||info.isSymbolicLink()||info.size>64*1024*1024||fileDigest(await readFile(file))!==saved.files?.[name])throw new Error('Exécutable antivirus altéré.');
      }
      this.cached={scanner:path.join(root,'clamscan.exe'),updater:path.join(root,'freshclam.exe'),version:saved.version};return this.cached;
    }
    const candidates=this.platform==='darwin'?['/opt/homebrew/bin','/usr/local/bin']:['/usr/bin','/usr/local/bin'];
    for(const dir of candidates)try{
      const scanner=await realpath(path.join(dir,'clamscan')),updater=await realpath(path.join(dir,'freshclam'));
      for(const file of [scanner,updater]){await safeAncestors(file);const info=await lstat(file);if(!info.isFile()||(info.mode&0o022)!==0||(process.getuid?.()===0&&info.uid!==0))throw new Error('Moteur ClamAV insuffisamment protégé.');}
      const version=(await this.run(scanner,['--version'],{timeout:15000,maxBytes:4000})).trim();this.cached={scanner,updater,version:version.slice(0,80)};return this.cached;
    }catch{}
    return null;
  }
  async install({signal,onProgress}={}){
    if(await this.paths())return;
    if(this.platform!=='win32')throw new Error('Installe ClamAV et FreshClam depuis les paquets de ce système, puis relance l’installation WolfGuard.');
    if(this.arch!=='x64')throw new Error('Le moteur intégré Windows nécessite actuellement un poste x64.');
    await privateDirectory(this.directory);
    const installation='engine-'+definition.version+'-'+randomBytes(16).toString('hex');
    const archive=path.join(this.directory,'engine-'+randomBytes(16).toString('hex')+'.zip'),target=path.join(this.directory,installation);
    const marker=path.join(this.directory,'engine.verified.json'),pending=path.join(this.directory,'marker-'+randomBytes(16).toString('hex')+'.tmp');let committed=false;
    await this.download(archive,{fetcher:this.fetcher,signal,onProgress});
    try{
      await this.run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./antivirus-windows.ps1',import.meta.url)),'-Operation','extract','-Directory',target,'-Archive',archive],{signal,timeout:180000,maxBytes:16000});
      const root=path.join(target,definition.windowsX64.directory),files={};
      for(const name of ['clamscan.exe','freshclam.exe'])files[name]=fileDigest(await readFile(path.join(root,name)));
      await writeFile(pending,JSON.stringify({version:definition.version,archiveHash:definition.windowsX64.sha256,installation,files}),{flag:'wx',mode:0o600});
      await safeAncestors(marker);await rename(pending,marker);committed=true;
      this.cached=null;await this.paths();
    }finally{
      await unlink(archive).catch(()=>{});await unlink(pending).catch(()=>{});
      if(!committed&&within(target,this.directory)&&/^engine-\d+\.\d+\.\d+-[a-f0-9]{32}$/.test(path.basename(target))){await safeAncestors(target);await rm(target,{recursive:true,force:true});}
    }
  }
  async update({signal}={}){
    const engine=await this.paths();if(!engine)throw new Error('Le moteur antivirus n’est pas installé.');
    const database=path.join(this.directory,'database');await privateDirectory(database);
    if(/[\r\n"]/.test(database))throw new Error('Chemin des signatures invalide.');
    const config=path.join(this.directory,'freshclam.conf');
    await writeFile(config,'DatabaseDirectory "'+database+'"\nDatabaseMirror database.clamav.net\nScriptedUpdates yes\nMaxAttempts 3\nConnectTimeout 20\nReceiveTimeout 120\n',{mode:0o600});
    await this.run(engine.updater,['--config-file='+config,'--stdout','--quiet'],{signal,timeout:600000,maxBytes:128000});
    const signatures=await this.signatures();if(!signatures.at)throw new Error('Les signatures téléchargées ne sont pas exploitables.');return signatures;
  }
  async signatures(){
    for(const name of ['daily.cld','daily.cvd']){
      const filename=path.join(this.directory,'database',name);let file;
      try{await safeAncestors(filename);file=await open(filename,'r');const buffer=Buffer.alloc(512),read=await file.read(buffer,0,512,0),parts=buffer.subarray(0,read.bytesRead).toString('ascii').trim().split(':');
        const at=Number(parts[8])*1000;if(parts[0]==='ClamAV-VDB'&&/^\d+$/.test(parts[2])&&Number.isSafeInteger(at)&&at>0&&at<=Date.now()+300000)return {version:parts[2],at};
      }catch(error){if(error.code!=='ENOENT')throw error;}finally{await file?.close();}
    }
    return {version:'',at:0};
  }
  async scan(snapshots,{signal}={}){
    const engine=await this.paths();if(!engine)throw new Error('Le moteur antivirus n’est pas installé.');
    const signatures=await this.signatures();if(!signatures.at||Date.now()-signatures.at>2*86400000)throw new Error('Signatures absentes ou anciennes : les fichiers ne sont pas déclarés sains.');
    const stage=path.join(this.directory,'scan-input');await privateDirectory(stage);const files=[];
    try{
      for(const snapshot of snapshots){const filename=path.join(stage,randomBytes(16).toString('hex')+'.sample');await writeFile(filename,snapshot.bytes,{flag:'wx',mode:0o600});files.push({filename,snapshot});}
      const args=['--database='+path.join(this.directory,'database'),'--no-summary','--follow-dir-symlinks=0','--follow-file-symlinks=0','--bytecode-unsigned=no','--alert-exceeds-max=yes','--max-filesize=64M','--max-scansize=128M','--max-recursion=16','--max-files=5000','--max-scantime=30000','--',...files.map(f=>f.filename)];
      let output;
      try{output=await this.run(engine.scanner,args,{signal,timeout:180000,maxBytes:256000});}catch(error){if(error.code!==1)throw new Error('Analyse antivirus interrompue ou en erreur.');output=error.stdout;}
      const lines=String(output||'').split(/\r?\n/),results=[];
      for(const file of files){
        const current=await readFile(file.filename);if(fileDigest(current)!==file.snapshot.sha256)throw new Error('Le contenu soumis au moteur a changé.');
        const prefix=file.filename+': ',verdicts=lines.filter(line=>line.startsWith(prefix)).map(line=>line.slice(prefix.length));
        const positive=verdicts.find(v=>v.endsWith(' FOUND'));
        if(positive&&/^Heuristics\.Limits\./.test(positive))results.push({snapshot:file.snapshot,status:'incomplete',threat:positive.slice(0,-6)});
        else if(positive)results.push({snapshot:file.snapshot,status:'infected',threat:positive.slice(0,-6)});
        else if(verdicts.includes('OK'))results.push({snapshot:file.snapshot,status:'clean'});
        else results.push({snapshot:file.snapshot,status:'incomplete'});
      }
      return results;
    }finally{for(const file of files)await unlink(file.filename).catch(()=>{});}
  }
}
