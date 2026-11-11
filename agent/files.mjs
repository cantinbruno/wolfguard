import {lstat,realpath,readdir,readFile,mkdir,open,link,unlink} from 'node:fs/promises';
import path from 'node:path';
import {homedir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {FILE_CHUNK,FILE_LIMIT,fileCommand} from '../server/lib/wolfguard/files-spec.mjs';
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
export async function createFileAccess({root=homedir()}={}){
  root=await realpath(root);const resources=new Map();
  async function safe(input,{createParents=false}={}){
    const full=path.resolve(root,input||'.'),relative=path.relative(root,full);
    if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw new Error('Choisis un dossier dans le profil de l’agent.');
    let current=root;const parts=relative?relative.split(path.sep):[];
    for(let i=0;i<parts.length;i++){
      current=path.join(current,parts[i]);let stat;
      try{stat=await lstat(current);}catch(error){if(error.code!=='ENOENT')throw error;if(createParents&&i<parts.length-1){await mkdir(current,{mode:0o700});stat=await lstat(current);}else if(i<parts.length-1)throw error;}
      if(stat?.isSymbolicLink())throw new Error('Les liens et jonctions ne sont pas transférables.');
      if(stat&&!stat.isDirectory()&&i<parts.length-1)throw new Error('Dossier invalide.');
    }
    return full;
  }
  async function archive(folder){
    const entries=[];let total=0;
    async function visit(current){
      for(const entry of await readdir(current,{withFileTypes:true})){
        const full=await safe(path.join(current,entry.name)),stat=await lstat(full),name=path.relative(path.dirname(folder),full).split(path.sep).join('/')+(stat.isDirectory()?'/':'');
        if(!stat.isDirectory()&&!stat.isFile())throw new Error('Type de fichier non pris en charge.');
        if(entries.length>=2000||(total+=stat.isFile()?stat.size:0)>FILE_LIMIT)throw new Error('Dossier limité à 2 000 entrées et 64 Mo.');
        entries.push({name,data:stat.isFile()?await readFile(full):Buffer.alloc(0)});if(stat.isDirectory())await visit(full);
      }
    }
    await visit(folder);if(!entries.length)entries.push({name:path.basename(folder)+'/',data:Buffer.alloc(0)});
    const local=[],central=[];let offset=0;
    for(const entry of entries){const name=Buffer.from(entry.name),size=entry.data.length,sum=crc(entry.data),header=Buffer.alloc(30),directory=Buffer.alloc(46);
      header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt32LE(sum,14);header.writeUInt32LE(size,18);header.writeUInt32LE(size,22);header.writeUInt16LE(name.length,26);
      directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(0x800,8);directory.writeUInt32LE(sum,16);directory.writeUInt32LE(size,20);directory.writeUInt32LE(size,24);directory.writeUInt16LE(name.length,28);directory.writeUInt32LE(offset,42);
      local.push(header,name,entry.data);central.push(directory,name);offset+=header.length+name.length+size;
    }
    const index=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(index.length,12);end.writeUInt32LE(offset,16);
    const data=Buffer.concat([...local,index,end]);if(data.length>FILE_LIMIT)throw new Error('Archive supérieure à 64 Mo.');return data;
  }
  async function dispose(id){const resource=resources.get(id);if(!resource)return;resources.delete(id);await resource.file?.close();if(resource.temporary)await unlink(resource.temporary).catch(()=>{});}
  async function execute(raw){
    const command=fileCommand(raw);
    if(command.action==='list'){
      const full=await safe(command.path),entries=[];
      for(const entry of (await readdir(full,{withFileTypes:true})).slice(0,2000)){
        if(entry.isSymbolicLink()||!entry.isDirectory()&&!entry.isFile())continue;
        try{const stat=await lstat(path.join(full,entry.name));entries.push({name:entry.name,kind:stat.isDirectory()?'directory':'file',size:stat.size});}catch{}
      }
      return {ok:true,path:full,root,parent:full===root?null:path.dirname(full),entries:entries.sort((a,b)=>Number(b.kind==='directory')-Number(a.kind==='directory')||a.name.localeCompare(b.name))};
    }
    if(command.action==='download'){
      if(resources.size>=2)throw new Error('Termine le transfert en cours.');
      const full=await safe(command.path),stat=await lstat(full);if(stat.size>FILE_LIMIT||!stat.isFile()&&!stat.isDirectory())throw new Error('Fichier limité à 64 Mo.');
      const data=stat.isDirectory()?await archive(full):await readFile(full);if(data.length>FILE_LIMIT)throw new Error('Fichier limité à 64 Mo.');
      const handle=randomBytes(16).toString('hex');resources.set(handle,{data});return {ok:true,handle,total:data.length,name:path.basename(full)+(stat.isDirectory()?'.zip':'')};
    }
    if(command.action==='upload'){
      if(resources.size>=2)throw new Error('Termine le transfert en cours.');
      const full=await safe(command.path,{createParents:true});try{await lstat(full);throw new Error('Ce fichier existe déjà. Renomme-le avant l’envoi.');}catch(error){if(error.code!=='ENOENT')throw error;}
      const handle=randomBytes(16).toString('hex'),temporary=path.join(path.dirname(full),'.wolfguard-'+handle+'.part'),file=await open(temporary,'wx',0o600);resources.set(handle,{file,temporary,destination:full,total:command.total,offset:0});return {ok:true,handle};
    }
    const resource=resources.get(command.handle);if(!resource)throw new Error('Transfert expiré.');
    if(command.action==='close'){await dispose(command.handle);return {ok:true};}
    if(command.action==='read'){if(!resource.data||command.offset>resource.data.length)throw new Error('Position invalide.');return {ok:true,data:resource.data.subarray(command.offset,command.offset+FILE_CHUNK).toString('base64')};}
    if(command.action==='write'){
      const data=Buffer.from(command.data,'base64');if(!resource.file||command.offset!==resource.offset||resource.offset+data.length>resource.total)throw new Error('Ordre du transfert invalide.');
      let used=0;while(used<data.length){const {bytesWritten}=await resource.file.write(data,used,data.length-used,resource.offset+used);if(!bytesWritten)throw new Error('Écriture interrompue.');used+=bytesWritten;}resource.offset+=used;return {ok:true,offset:resource.offset};
    }
    if(command.action==='finish'){
      if(!resource.file||resource.offset!==resource.total)throw new Error('Transfert incomplet.');
      await safe(resource.destination);await resource.file.sync();await resource.file.close();resource.file=null;
      await link(resource.temporary,resource.destination);await dispose(command.handle);return {ok:true};
    }
  }
  return {execute,close:()=>Promise.all([...resources.keys()].map(dispose))};
}
export async function executeFileSession(client,session,{signal,onStatus=()=>{},accessFactory=createFileAccess,intervalMs=150}={}){
  const access=await accessFactory();let completed=null;
  onStatus('Transfert de fichiers actif.',{state:'remote'});
  try{
    while(!signal?.aborted&&Date.now()<session.expiresAt){
      const response=await client.post('remote/files/exchange',{id:session.id,lease:session.lease,...(completed?{seq:completed.seq,result:completed.result}:{})},{signal});completed=null;
      if(response.status!=='active')break;
      if(response.command){let result;try{result=await access.execute(response.command.spec);}catch(error){result={ok:false,message:({ENOENT:'Fichier introuvable.',EACCES:'Accès au dossier refusé.',EPERM:'Accès au dossier refusé.'})[error.code]||String(error.message).slice(0,300)};}completed={seq:response.command.seq,result};}
      else await delay(intervalMs,undefined,{signal}).catch(()=>{});
    }
  }finally{await access.close();onStatus('Transfert terminé.',{state:'connected'});}
}
