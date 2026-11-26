import {setTimeout as delay} from 'node:timers/promises';
import {desktopInput,desktopFrame} from '../server/lib/wolfguard/remote-spec.mjs';
import {prepareDesktopRuntime} from './remote-runtime.mjs';
import {openNativeDesktop,requestRemoteConsent} from './remote-native.mjs';
import {executeFileSession} from './files.mjs';
import {executeTerminalSession} from './terminal.mjs';

export async function approveRemoteSession(client,session,{signal,onStatus=()=>{},requestConsent=requestRemoteConsent,consentIntervalMs=3000,consentTimeoutMs=60000}={}){
  const cancel=new AbortController(),combined=AbortSignal.any([cancel.signal,...(signal?[signal]:[])]);
  const timer=setTimeout(()=>cancel.abort(),consentTimeoutMs);let monitoring=null,approved=false;
  const exchange=status=>client.post('remote/consent',{id:session.id,lease:session.lease,status},{signal:AbortSignal.any([combined,AbortSignal.timeout(5000)])});
  try{
    const initial=await exchange('preparing');if(initial.status!=='preparing')return false;
    onStatus('Accord obligatoire : accepte ou refuse la demande affichée sur ce poste.',{state:'remote-consent'});
    monitoring=(async()=>{while(!combined.aborted){await delay(consentIntervalMs,undefined,{signal:combined}).catch(()=>{});if(combined.aborted)break;try{if((await exchange('preparing')).status!=='preparing'){cancel.abort();break;}}catch{cancel.abort();break;}}})();
    approved=await requestConsent({mode:session.mode||'desktop',signal:combined})===true;
    combined.throwIfAborted();
  }catch{approved=false;}
  finally{clearTimeout(timer);cancel.abort();await monitoring;}
  if(signal?.aborted)approved=false;
  try{const response=await client.post('remote/consent',{id:session.id,lease:session.lease,status:approved?'accepted':'denied'},{signal:AbortSignal.timeout(5000)});approved=approved&&response.status==='active';}catch{approved=false;}
  if(!approved)onStatus('Accès distant refusé ou demande expirée.',{state:'connected'});
  return approved;
}

export async function executeRemoteSession(client,session,options={}){
  const {signal,onStatus=()=>{},directory,openDesktop=openNativeDesktop,prepare=prepareDesktopRuntime,intervalMs=32,captureIntervalMs=66,terminalRunner=executeTerminalSession,fileRunner=executeFileSession}=options;
  if(!await approveRemoteSession(client,session,options))return;
  if(session.mode==='files')return fileRunner(client,session,{signal,onStatus});
  if(session.mode==='terminal')return terminalRunner(client,session,{signal,onStatus});
  const cancel=new AbortController(),external=()=>cancel.abort();signal?.addEventListener('abort',external,{once:true});if(signal?.aborted)cancel.abort();
  const deadline=setTimeout(()=>cancel.abort(),Math.max(0,Math.min(20*60000,session.expiresAt-Date.now())));
  let adapter=null,status='active',message='',frame=null,ack=0;
  const exchange=async value=>client.post('remote/exchange',{id:session.id,lease:session.lease,ack,status,...value},{signal:cancel.signal});
  const monitor=(async()=>{
    while(!cancel.signal.aborted){
      const started=Date.now();
      try{
        const latest=frame;frame=null;const response=await exchange(latest?{frame:latest}:{});
        if(!['preparing','active'].includes(response.status)){cancel.abort();break;}
        if(status==='active'&&adapter)for(const batch of response.inputs||[]){
          if(batch.seq<=ack)continue;
          if(batch.seq!==ack+1)throw new Error('Ordre des actions interrompu.');
          for(const event of batch.events){cancel.signal.throwIfAborted();await adapter.input(desktopInput(event));}
          ack=batch.seq;
        }
      }catch(error){if(!cancel.signal.aborted){status='error';message='Connexion de prise en main interrompue.';}cancel.abort();break;}
      await delay(Math.max(0,intervalMs-(Date.now()-started)),undefined,{signal:cancel.signal}).catch(()=>{});
    }
  })();
  try{
    onStatus('Préparation de la prise en main. Chargement des composants du bureau…',{state:'remote-preparing'});
    const runtime=await prepare(directory,{signal:cancel.signal});cancel.signal.throwIfAborted();
    adapter=await openDesktop({...runtime,consentGranted:true,signal:cancel.signal,onClose:()=>cancel.abort()});
    cancel.signal.throwIfAborted();status='active';
    onStatus('Prise en main active. Le bureau, la souris et le clavier sont partagés. Tu peux arrêter la session ici.',{state:'remote'});
    while(!cancel.signal.aborted){
      const started=Date.now();
      // Keep a single latest frame while the relay is busy; never queue old images.
      frame=desktopFrame(await adapter.capture());
      await delay(Math.max(0,captureIntervalMs-(Date.now()-started)),undefined,{signal:cancel.signal}).catch(()=>{});
    }
  }catch(error){if(!cancel.signal.aborted){status=error.code==='CONSENT_DENIED'?'denied':'error';message=String(error.message||'Bureau indisponible.').slice(0,500);}cancel.abort();}
  finally{
    clearTimeout(deadline);signal?.removeEventListener('abort',external);
    try{await adapter?.close();}catch{}
    await monitor;
    try{await client.post('remote/exchange',{id:session.id,lease:session.lease,ack,status:['denied','error'].includes(status)?status:'closed',message:message||'Session terminée sur le poste distant.'},{signal:AbortSignal.timeout(2500)});}catch{}
    onStatus(message||'Prise en main terminée.',{state:'connected'});
  }
}
