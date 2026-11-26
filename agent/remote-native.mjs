import {spawn,execFile} from 'node:child_process';
import {access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function requestRemoteConsent({mode='desktop',signal,platform=process.platform,run=nativeCommand,find=executable}={}){
  const descriptions={desktop:'afficher tous les écrans et contrôler la souris et le clavier',terminal:'exécuter des commandes sur ce poste avec les droits de ton compte',files:'consulter les dossiers et transférer des fichiers sur ce poste'};
  if(!descriptions[mode])throw denied();
  signal?.throwIfAborted();
  const prompt='Une demande d’assistance WolfGuard souhaite '+descriptions[mode]+'. Autorises-tu cette session (20 minutes maximum) ? Sans réponse, l’accès est refusé.';
  try{
    if(platform==='win32')await run(process.env.WOLFGUARD_AGENT_EXE||fileURLToPath(new URL('../WolfGuard-Agent.exe',import.meta.url)),['--remote-consent',mode],{signal,timeout:65000});
    else if(platform==='darwin'){
      const result=await run('/usr/bin/osascript',['-e','display dialog '+JSON.stringify(prompt)+' buttons {"Refuser", "Autoriser"} default button "Refuser" cancel button "Refuser" with title "WolfGuard · Accord obligatoire" giving up after 60'],{signal});
      if(!result.includes('button returned:Autoriser')||result.includes('gave up:true'))throw denied();
    }else if(platform==='linux'){
      const zenity=await find('zenity'),kdialog=await find('kdialog'),xmessage=await find('xmessage');
      if(zenity)await run(zenity,['--question','--title=WolfGuard · Accord obligatoire','--text='+prompt,'--ok-label=Autoriser','--cancel-label=Refuser','--default-cancel','--timeout=60'],{signal});
      else if(kdialog){if((await run(kdialog,['--title','WolfGuard · Accord obligatoire','--default','Refuser','--menu',prompt,'Refuser','Refuser','Autoriser','Autoriser cette session'],{signal})).trim()!=='Autoriser')throw denied();}
      else if(xmessage){if((await run(xmessage,['-center','-print','-buttons','Refuser:1,Autoriser:0','-default','Refuser','-timeout','60',prompt],{signal})).trim()!=='Autoriser')throw denied();}
      else throw denied();
    }else throw denied();
    signal?.throwIfAborted();return true;
  }catch{if(signal?.aborted)signal.throwIfAborted();throw denied();}
}
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
