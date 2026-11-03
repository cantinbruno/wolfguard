import {spawn,execFile} from 'node:child_process';
import {access} from 'node:fs/promises';
import path from 'node:path';
export function nativeCommand(file,args,{signal,timeout=65000,maxBuffer=8*1024*1024}={}){
  return new Promise((resolve,reject)=>execFile(file,args,{signal,timeout,maxBuffer,windowsHide:true,encoding:'utf8'},(error,stdout)=>error?reject(error):resolve(stdout)));
}
export async function executable(name){
  for(const folder of (process.env.PATH||'').split(path.delimiter))if(folder){const file=path.join(folder,name);try{await access(file);return file;}catch{}}
  return null;
}
export function nativeIndicator(file,args,{signal,onClose}){
  const process=spawn(file,args,{stdio:'ignore',windowsHide:true});let closing=false;
  const abort=()=>{closing=true;process.kill();};signal?.addEventListener('abort',abort,{once:true});
  process.once('error',()=>{if(!closing)onClose();});process.once('exit',()=>{signal?.removeEventListener('abort',abort);if(!closing)onClose();});
  return ()=>{signal?.removeEventListener('abort',abort);abort();};
}
export function denied(){const error=new Error('La prise en main a été refusée sur le poste distant.');error.code='CONSENT_DENIED';return error;}
export function encodeDesktop(rgba,width,height,jpeg,{stride=width*4,step=4,bgr=false}={}){
  if(width<1||height<1||width>8192||height>8192||width*height>32000000)throw new Error('Dimensions du bureau non prises en charge.');
  const ratio=Math.min(1,1600/width,1000/height),w=Math.max(1,Math.floor(width*ratio)),h=Math.max(1,Math.floor(height*ratio)),pixels=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const source=Math.floor(y/ratio)*stride+Math.floor(x/ratio)*step,destination=(y*w+x)*4;pixels[destination]=rgba[source+(bgr?2:0)];pixels[destination+1]=rgba[source+1];pixels[destination+2]=rgba[source+(bgr?0:2)];pixels[destination+3]=255;}
  let encoded=jpeg.encode({data:pixels,width:w,height:h},60).data;if(encoded.length>470000)encoded=jpeg.encode({data:pixels,width:w,height:h},40).data;
  if(encoded.length>480000)throw new Error('Image du bureau trop volumineuse.');return {width:w,height:h,jpeg:Buffer.from(encoded).toString('base64')};
}
export async function openNativeDesktop(options){
  const module=await import('./remote-'+({win32:'windows',darwin:'macos',linux:'linux'})[process.platform]+'.mjs');
  return module.openDesktop(options);
}
