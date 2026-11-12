import {fixedProcess} from './network.mjs';
import {AGENT_VERSION} from './version.mjs';
import {UPDATE_ORIGIN,UPDATE_FILES,validateRelease,updateCommand} from './update-command.mjs';

export const UPDATE_INTERVAL=5*60000, UPDATE_RETRY=15*60000;
async function publishedRelease(signal){
  const response=await fetch(new URL('downloads/agent-release.json',UPDATE_ORIGIN),{cache:'no-store',credentials:'omit',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Version publiée indisponible.');
  const text=await response.text();
  if(text.length>16000)throw new Error('Version publiée invalide.');
  return validateRelease(JSON.parse(text));
}
export async function installUpdate(platform,release,{signal,run=fixedProcess}={}){
  const script=updateCommand(platform,validateRelease(release));
  const output=platform==='win32'
    ? await run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{signal,timeout:60000,maxBytes:16000})
    : await run('/bin/sh',['-s'],{input:script,signal,timeout:60000,maxBytes:16000});
  if(!output.includes('WOLFGUARD_UPDATE_READY'))throw new Error('Installation automatique non confirmée.');
}
// Called only after an authenticated, idle poll: never interrupts a scan,
// remote session or AI task. Installation uses the existing association.
export function createAutoUpdater({platform=process.platform,version=AGENT_VERSION,now=Date.now,release=publishedRelease,install=installUpdate}={}){
  let nextCheck=0,checking=false;
  return async({signal,onStatus=()=>{}}={})=>{
    if(checking||signal?.aborted||now()<nextCheck||!Object.hasOwn(UPDATE_FILES,platform))return false;
    checking=true;nextCheck=now()+UPDATE_INTERVAL;
    try{
      const target=validateRelease(await release(signal));
      signal?.throwIfAborted();
      if(target.version===version)return false;
      nextCheck=now()+UPDATE_RETRY;
      onStatus('Nouvelle version disponible. Mise à jour automatique de l’agent…',{state:'updating'});
      await install(platform,target,{signal});
      onStatus('Mise à jour vérifiée. Redémarrage automatique de l’agent…',{state:'updating'});
      return true;
    }catch(error){
      nextCheck=now()+UPDATE_RETRY;
      if(!signal?.aborted)onStatus('Mise à jour différée. Nouvelle tentative automatique dans 15 minutes.',{state:'update-pending'});
      return false;
    }finally{checking=false;}
  };
}
