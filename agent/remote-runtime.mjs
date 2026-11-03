import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const packages=JSON.parse(await readFile(new URL('./remote-dependencies.json',import.meta.url),'utf8'));
export function unpackPackage(bytes){
  const tar=gunzipSync(bytes,{maxOutputLength:32*1024*1024}),files=[];
  for(let offset=0;offset+512<=tar.length;){
    const header=tar.subarray(offset,offset+512);if(header.every(value=>value===0))break;
    const string=(start,length)=>header.subarray(start,start+length).toString().replace(/\0.*$/s,'');
    const name=string(0,100),prefix=string(345,155),size=parseInt(string(124,12).trim(),8)||0,type=string(156,1);
    if(!Number.isSafeInteger(size)||size<0||offset+512+size>tar.length)throw new Error('Archive du composant invalide.');
    const full=(prefix?prefix+'/':'')+name;
    if(type==='0'||type===''){
      if(!full.startsWith('package/')||/[\\\x00]/.test(full)||full.split('/').some(value=>value==='..'||value==='.'))throw new Error('Chemin du composant invalide.');
      const relative=full.slice(8);if(relative)files.push({name:relative,data:tar.subarray(offset+512,offset+512+size)});
    }else if(!['5','x','g'].includes(type))throw new Error('Liens interdits dans le composant.');
    offset+=512+Math.ceil(size/512)*512;
  }
  if(!files.some(file=>file.name==='package.json'))throw new Error('Composant incomplet.');return files;
}
export async function prepareDesktopRuntime(directory,{signal,fetcher=fetch,platform=process.platform,arch=process.arch}={}){
  if(!['win32','darwin','linux'].includes(platform)||!['x64','arm64'].includes(arch))throw new Error('La prise en main nécessite un système 64 bits compatible.');
  const root=path.resolve(directory,'remote-runtime-v1'),native='@koromix/koffi-'+platform+'-'+arch;
  await Promise.all(['koffi','jpeg-js',native].map(async name=>{
    const definition=packages.find(item=>item.name===name),target=path.join(root,...name.split('/')),marker=path.join(target,'.verified');
    try{if(await readFile(marker,'utf8')===definition.integrity)return;}catch{}
    const response=await fetcher(definition.url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(60000)]):AbortSignal.timeout(60000),redirect:'error'});
    if(!response.ok)throw new Error('Téléchargement du composant de bureau impossible.');
    const chunks=[];let length=0;for await(const chunk of response.body){length+=chunk.length;if(length>16*1024*1024)throw new Error('Composant trop volumineux.');chunks.push(chunk);}
    const bytes=Buffer.concat(chunks);if('sha512-'+createHash('sha512').update(bytes).digest('base64')!==definition.integrity)throw new Error('Intégrité du composant de bureau non confirmée.');
    for(const file of unpackPackage(bytes)){const output=path.resolve(target,file.name);if(!output.startsWith(target+path.sep))throw new Error('Chemin du composant invalide.');await mkdir(path.dirname(output),{recursive:true});await writeFile(output,file.data,{mode:0o600});}
    await writeFile(marker,definition.integrity,{mode:0o600});
  }));
  const [ffi,jpeg]=await Promise.all([import(pathToFileURL(path.join(root,'koffi','index.js')).href),import(pathToFileURL(path.join(root,'jpeg-js','index.js')).href)]);
  return {ffi:ffi.default,jpeg:jpeg.default};
}
