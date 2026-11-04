import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export function createWindowsEncoder({signal,executable=process.env.WOLFGUARD_AGENT_EXE||fileURLToPath(new URL('../WolfGuard-Agent.exe',import.meta.url))}={}){
  signal?.throwIfAborted();
  const child=spawn(executable,['--desktop-encoder'],{windowsHide:true,stdio:['pipe','pipe','ignore']});
  let pending=null,buffer=Buffer.alloc(0),failure=null,closed=false;
  function fail(error){failure=error;if(pending){clearTimeout(pending.timer);pending.reject(error);pending=null;}}
  function close(){if(closed)return;closed=true;signal?.removeEventListener('abort',abort);fail(new DOMException('Session terminée.','AbortError'));child.stdin.destroy();child.stdout.destroy();if(child.exitCode===null&&!child.killed)child.kill();}
  const abort=()=>close();signal?.addEventListener('abort',abort,{once:true});
  child.once('error',()=>fail(new Error('Le composant d’image Windows n’a pas pu démarrer. Relance la dernière version de l’agent.')));
  child.stdin.on('error',()=>fail(new Error('Le composant d’image Windows a été interrompu.')));
  child.stdout.on('error',()=>fail(new Error('La réception de l’image Windows a été interrompue.')));
  child.once('close',()=>{if(!closed)fail(new Error('Le composant d’image Windows s’est arrêté.'));});
  child.stdout.on('data',chunk=>{
    if(closed)return;
    buffer=Buffer.concat([buffer,chunk]);
    if(buffer.length>480012){fail(new Error('Image Windows trop volumineuse.'));close();return;}
    if(buffer.length<12)return;
    const width=buffer.readInt32LE(0),height=buffer.readInt32LE(4),length=buffer.readInt32LE(8);
    if(width<1||height<1||width>1600||height>1000||length<4||length>480000){fail(new Error('Image Windows invalide.'));close();return;}
    if(buffer.length<12+length)return;
    if(!pending||buffer.length!==12+length){fail(new Error('Réponse du composant d’image invalide.'));close();return;}
    const current=pending;pending=null;clearTimeout(current.timer);
    const jpeg=buffer.subarray(12).toString('base64');buffer=Buffer.alloc(0);current.resolve({width,height,jpeg});
  });
  if(signal?.aborted)close();
  return {
    processId:child.pid,
    encode(pixels,width,height){
      signal?.throwIfAborted();
      if(failure||closed)return Promise.reject(failure||new Error('Session terminée.'));
      if(pending)return Promise.reject(new Error('Une image est déjà en cours de préparation.'));
      if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192||width*height>32000000||pixels.length!==width*height*4)return Promise.reject(new Error('Dimensions du bureau invalides.'));
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{fail(new Error('Le composant d’image Windows ne répond pas.'));close();},5000);
        pending={resolve,reject,timer};const header=Buffer.alloc(8);header.writeInt32LE(width,0);header.writeInt32LE(height,4);
        child.stdin.write(header);child.stdin.write(pixels);
      });
    },
    close
  };
}
