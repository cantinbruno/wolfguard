import {constants} from 'node:fs';
import {open,lstat,realpath,mkdir,readFile,writeFile,rename,unlink,readdir,link} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,createHash,createCipheriv,createDecipheriv} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const MAX_FILE_BYTES=64*1024*1024;
const idOK=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
export const fileDigest=data=>createHash('sha256').update(data).digest('hex');
const equal=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
export function within(file,root){const relative=path.relative(root,file);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);}
export async function safeAncestors(filename){
  let current=path.resolve(filename);
  if(/[\r\n\x00]/.test(current)||current.startsWith('\\\\'))throw new Error('Chemin antivirus non pris en charge.');
  while(current!==path.dirname(current)){
    try{const info=await lstat(current);if(info.isSymbolicLink())throw new Error('Les liens et jonctions sont refusés par l’antivirus.');}catch(error){if(error.code!=='ENOENT')throw error;}
    current=path.dirname(current);
  }
}
export async function privateDirectory(directory){
  await safeAncestors(directory);await mkdir(directory,{recursive:true,mode:0o700});
  const info=await lstat(directory);if(!info.isDirectory()||info.isSymbolicLink())throw new Error('Dossier antivirus invalide.');
  if(process.platform!=='win32'&&((info.mode&0o077)!==0||info.uid!==process.getuid?.()))throw new Error('Le dossier antivirus doit être privé et appartenir au service.');
}
export async function snapshotFile(filename,roots,{maxBytes=MAX_FILE_BYTES}={}){
  const file=path.resolve(filename);if(!roots.some(root=>within(file,path.resolve(root))))throw new Error('Fichier hors du périmètre antivirus.');
  await safeAncestors(file);
  if(!equal(await realpath(file),file))throw new Error('Chemin réorienté refusé.');
  const handle=await open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try{
    const before=await handle.stat();if(!before.isFile()||before.nlink!==1||before.size>maxBytes)throw new Error('Fichier spécial, partagé ou trop volumineux : analyse non effectuée.');
    const data=Buffer.alloc(before.size+1);let length=0;
    while(length<data.length){const read=await handle.read(data,length,data.length-length,null);if(!read.bytesRead)break;length+=read.bytesRead;}
    const after=await handle.stat();
    if(length!==before.size||after.size!==before.size||after.mtimeMs!==before.mtimeMs||after.ctimeMs!==before.ctimeMs)throw new Error('Le fichier a changé pendant sa lecture.');
    const bytes=data.subarray(0,length);
    return {path:file,bytes,sha256:fileDigest(bytes),dev:before.dev,ino:before.ino,size:before.size,mtimeMs:before.mtimeMs,ctimeMs:before.ctimeMs};
  }finally{await handle.close();}
}
async function limitedRead(filename,max){
  await safeAncestors(filename);const handle=await open(filename,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try{
    const info=await handle.stat();if(!info.isFile()||info.nlink!==1||info.size>max)throw new Error('Fichier antivirus invalide.');
    const bytes=Buffer.alloc(info.size+1);let length=0;
    while(length<bytes.length){const read=await handle.read(bytes,length,bytes.length-length,null);if(!read.bytesRead)break;length+=read.bytesRead;}
    const after=await handle.stat();if(length!==info.size||after.size!==info.size||after.mtimeMs!==info.mtimeMs||after.ctimeMs!==info.ctimeMs)throw new Error('Fichier antivirus modifié pendant sa lecture.');
    return bytes.subarray(0,length);
  }finally{await handle.close();}
}
export class AntivirusStore{
  constructor(directory,{platform=process.platform,run}={}){this.directory=path.resolve(directory);this.platform=platform;this.run=run;this.key=null;}
  filename(id,suffix){if(!idOK(id))throw new Error('Identifiant de quarantaine invalide.');return path.join(this.directory,id+'.'+suffix);}
  async prepare(){
    await privateDirectory(this.directory);
    if(this.platform==='win32')await this.run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./antivirus-windows.ps1',import.meta.url)),'-Operation','secure','-Directory',this.directory],{timeout:20000,maxBytes:16000});
    await this.loadKey(true);
  }
  async loadKey(create=false){
    if(this.key)return this.key;
    const keyPath=path.join(this.directory,this.platform==='win32'?'key.dpapi':'key.bin');let value;
    try{value=await limitedRead(keyPath,16000);}catch(error){
      if(error.code!=='ENOENT'||!create)throw error;
      const key=randomBytes(32);value=key;
      if(this.platform==='win32')value=Buffer.from(await this.run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./protect.ps1',import.meta.url)),'-Mode','protect'],{input:key.toString('hex'),timeout:10000,maxBytes:16000}));
      await writeFile(keyPath,value,{flag:'wx',mode:0o600});this.key=key;return key;
    }
    if(this.platform==='win32')value=Buffer.from((await this.run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./protect.ps1',import.meta.url)),'-Mode','unprotect'],{input:value.toString(),timeout:10000,maxBytes:16000})).trim(),'hex');
    else{const info=await lstat(keyPath);if(info.uid!==process.getuid?.()||(info.mode&0o077)!==0)throw new Error('Clé de quarantaine insuffisamment protégée.');}
    if(value.length!==32)throw new Error('Clé de quarantaine illisible ; elle ne sera pas remplacée.');this.key=value;return value;
  }
  async seal(id,kind,bytes){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',await this.loadKey(),iv);cipher.setAAD(Buffer.from('WolfGuard antivirus v1:'+id+':'+kind));const data=Buffer.concat([cipher.update(bytes),cipher.final()]);return Buffer.concat([Buffer.from('WGAV1'),iv,cipher.getAuthTag(),data]);}
  async unseal(id,kind,bytes){
    if(bytes.length<33||bytes.subarray(0,5).toString()!=='WGAV1')throw new Error('Enveloppe de quarantaine invalide.');
    const decipher=createDecipheriv('aes-256-gcm',await this.loadKey(),bytes.subarray(5,17));decipher.setAAD(Buffer.from('WolfGuard antivirus v1:'+id+':'+kind));decipher.setAuthTag(bytes.subarray(17,33));return Buffer.concat([decipher.update(bytes.subarray(33)),decipher.final()]);
  }
  async record(id){const bytes=await limitedRead(this.filename(id,'meta'),16384),record=JSON.parse((await this.unseal(id,'meta',bytes)).toString('utf8'));if(record.id!==id||!idOK(record.id))throw new Error('Métadonnées de quarantaine invalides.');return record;}
  async save(record,{create=false}={}){
    const target=this.filename(record.id,'meta'),temporary=this.filename(randomBytes(16).toString('hex'),'writing');
    const data=await this.seal(record.id,'meta',Buffer.from(JSON.stringify(record)));
    if(create){await writeFile(target,data,{flag:'wx',mode:0o600});return;}
    await writeFile(temporary,data,{flag:'wx',mode:0o600});await rename(temporary,target);
  }
  async list(){
    let entries;try{entries=await readdir(this.directory,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return [];throw error;}
    const files=entries.filter(e=>/^[a-f0-9]{32}\.meta$/.test(e.name));if(files.length>100)throw new Error('Limite de quarantaine atteinte.');
    return Promise.all(files.map(e=>{if(!e.isFile()||e.isSymbolicLink())throw new Error('Métadonnées de quarantaine non régulières.');return this.record(e.name.slice(0,32));}));
  }
  async quarantine(snapshot,threat,roots){
    await this.prepare();const existing=await this.list();
    if(existing.length>=100||existing.reduce((n,r)=>n+r.size,0)+snapshot.size>2*1024*1024*1024)throw new Error('Quarantaine pleine : le fichier détecté est conservé à sa place.');
    const id=randomBytes(16).toString('hex'),record={id,path:snapshot.path,sha256:snapshot.sha256,size:snapshot.size,threat:String(threat).slice(0,300),detectedAt:Date.now(),status:'detected'};
    await writeFile(this.filename(id,'data'),await this.seal(id,'data',snapshot.bytes),{flag:'wx',mode:0o600});await this.save(record,{create:true});
    const holding=this.filename(id,'holding');let moved=false;
    try{
      const current=await snapshotFile(snapshot.path,roots);
      if(current.sha256!==snapshot.sha256||current.dev!==snapshot.dev||current.ino!==snapshot.ino||current.mtimeMs!==snapshot.mtimeMs||current.ctimeMs!==snapshot.ctimeMs)throw new Error('Le fichier a changé avant la quarantaine.');
      await rename(snapshot.path,holding);moved=true;
      const held=await snapshotFile(holding,[this.directory]);
      if(held.sha256!==snapshot.sha256||held.dev!==snapshot.dev||held.ino!==snapshot.ino)throw new Error('Le fichier déplacé ne correspond plus au verdict.');
      await unlink(holding);moved=false;record.status='quarantined';await this.save(record);
    }catch(error){
      if(moved){try{await safeAncestors(path.dirname(snapshot.path));await link(holding,snapshot.path);await unlink(holding);moved=false;}catch{record.recoveryRequired=true;}}
      record.message=error.code==='EXDEV'?'Quarantaine impossible sur un autre volume ; fichier non supprimé.':String(error.message).slice(0,300);await this.save(record);
    }
    return record;
  }
  async restore(id,roots){
    const record=await this.record(id);if(!['quarantined','detected'].includes(record.status)||record.recoveryRequired)throw new Error('Ce fichier nécessite une récupération manuelle.');
    const dest=path.resolve(record.path);if(!roots.some(root=>within(dest,root)))throw new Error('Restauration hors du périmètre refusée.');
    await safeAncestors(path.dirname(dest));if(!equal(await realpath(path.dirname(dest)),path.dirname(dest)))throw new Error('Destination de restauration réorientée.');
    const data=await this.unseal(id,'data',await limitedRead(this.filename(id,'data'),MAX_FILE_BYTES+33));if(fileDigest(data)!==record.sha256)throw new Error('Le contenu en quarantaine est altéré.');
    await writeFile(dest,data,{flag:'wx',mode:0o600});record.status='restored';record.restoredAt=Date.now();await this.save(record);return record;
  }
  async remove(id){const record=await this.record(id);if(record.recoveryRequired)throw new Error('Une récupération manuelle est nécessaire avant suppression.');await safeAncestors(this.filename(id,'data'));await unlink(this.filename(id,'data'));await unlink(this.filename(id,'meta'));return record;}
}
