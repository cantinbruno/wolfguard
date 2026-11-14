import {readFile,lstat} from 'node:fs/promises';
import {collectPosixEndpoint,executePosixEndpoint} from './endpoint-posix.mjs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {fixedProcess} from './network.mjs';
import {endpointPolicy,endpointSnapshot,DEFAULT_ENDPOINT_POLICY,ENDPOINT_COMMANDS} from '../server/lib/wolfguard/endpoint-spec.mjs';
import {antivirusCommand} from '../server/lib/wolfguard/antivirus-spec.mjs';
import {getAntivirusManager} from './antivirus.mjs';

export async function collectEndpoint({platform=process.platform,run=fixedProcess,signal,antivirus}={}){
  if(platform!=='win32')return endpointSnapshot(await collectPosixEndpoint({platform,run,signal}));
  const value=JSON.parse(await run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./endpoint.ps1',import.meta.url)),'-Operation','collect'],{signal,timeout:25000,maxBytes:250000}));
  const events=(Array.isArray(value.events)?value.events:[]).map(row=>({...row,id:createHash('sha256').update(row.id).digest('hex'),occurredAt:Date.parse(row.occurredAt)}));
  const manager=antivirus||getAntivirusManager(),own=await manager.snapshot();
  return endpointSnapshot({...value,wolfguardAntivirus:own,collectedAt:Date.now(),platform,activeThreats:(Number.isSafeInteger(value.activeThreats)?value.activeThreats:0)+own.quarantine.filter(row=>row.status==='detected').length,events:[...events,...manager.events.values()].slice(-100)});
}
export async function executeEndpointAction(action,policy=DEFAULT_ENDPOINT_POLICY,{platform=process.platform,run=fixedProcess,signal,antivirus}={}){
  if(antivirusCommand(action)){
    if(platform!=='win32')return {ok:false,code:'ANTIVIRUS_PLATFORM_UNSUPPORTED',message:'Le moteur WolfGuard intégré nécessite actuellement Windows x64.'};
    return (antivirus||getAntivirusManager()).execute(action,{signal});
  }
  if(!ENDPOINT_COMMANDS.includes(action))throw new Error('Action de protection inconnue.');
  if(action==='refresh')return {ok:true,message:'Actualisation de la protection demandée.'};
  if(platform!=='win32')return executePosixEndpoint(action,policy,{platform,run,signal});
  return JSON.parse(await run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./endpoint.ps1',import.meta.url)),'-Operation',action],{input:JSON.stringify(endpointPolicy(policy)),signal,timeout:action==='quick-scan'?180000:30000,maxBytes:16000}));
}
export function boundedEndpointReport(snapshot,events,appliedRevision){
  const report={...snapshot,events:[...events],appliedRevision};
  if(snapshot.wolfguardAntivirus)report.wolfguardAntivirus={...snapshot.wolfguardAntivirus,quarantine:[...snapshot.wolfguardAntivirus.quarantine],quarantineTotal:snapshot.wolfguardAntivirus.quarantine.length};
  while(Buffer.byteLength(JSON.stringify(report))>240000&&report.events.length)report.events.pop();
  while(Buffer.byteLength(JSON.stringify(report))>240000&&report.wolfguardAntivirus?.quarantine.length)report.wolfguardAntivirus.quarantine.pop();
  if(Buffer.byteLength(JSON.stringify(report))>240000)throw new Error('Le relevé de protection dépasse la limite autorisée.');
  return report;
}
export async function runEndpointProtection(client,{signal,onStatus=()=>{},collect=collectEndpoint,execute=executeEndpointAction,intervalMs=30000,onReport=()=>{},antivirus=process.platform==='win32'&&collect===collectEndpoint&&execute===executeEndpointAction?getAntivirusManager():null}={}){
  let policy={...DEFAULT_ENDPOINT_POLICY},revision=0,appliedRevision=0,lastAttempt=0;const sent=new Map();
  let pending=null;antivirus?.start({signal});
  try{
  while(!signal?.aborted){
    try{
      if(!process.env.WOLFGUARD_PROTECTION_MARKER&&process.platform!=='win32'&&client.agentId&&process.getuid?.()>0){
        const base=process.platform==='darwin'?'/Library/Application Support/WolfGuardAgent':'/var/lib/wolfguard-agent',directory=base+'/'+process.getuid(),marker=directory+'/protection-heartbeat.json';
        try{const [parent,folder,file]=await Promise.all([lstat(base),lstat(directory),lstat(marker)]);if(parent.uid===0&&!(parent.mode&0o022)&&!parent.isSymbolicLink()&&folder.uid===0&&!(folder.mode&0o022)&&file.uid===0&&!(file.mode&0o022)&&!folder.isSymbolicLink()&&!file.isSymbolicLink()){const heartbeat=JSON.parse(await readFile(marker,'utf8'));if(heartbeat.agentId===client.agentId&&Date.now()-heartbeat.at<120000){await delay(intervalMs,undefined,{signal}).catch(()=>{});continue;}}}catch{}
      }
      let snapshot=await collect({signal,antivirus});
      if(snapshot.wolfguardAntivirus)snapshot={...snapshot,wolfguardAntivirus:{...snapshot.wolfguardAntivirus,commandId:pending?.id||''}};
      const report=boundedEndpointReport(snapshot,snapshot.events.filter(row=>sent.get(row.id)!==JSON.stringify(row)),appliedRevision);
      const response=await client.post('edr/report',report,{signal});
      for(const row of report.events)sent.set(row.id,JSON.stringify(row));while(sent.size>5000)sent.delete(sent.keys().next().value);
      await onReport();
      policy=endpointPolicy(response.policy);revision=response.revision;
      await antivirus?.setPolicy(policy.mode);
      if(response.cancelCommand&&pending?.id===response.cancelCommand)pending.controller.abort();
      if(response.command){
        const command=response.command;
        if(antivirusCommand(command.action)){
          const controller=new AbortController(),job={id:command.id,controller,promise:null};
          const jobSignal=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
          if(pending)throw new Error('Une opération antivirus est déjà attribuée.');
          pending=job;
          job.promise=(async()=>{
            let result;try{result=await execute(command.action,policy,{signal:jobSignal,antivirus});}catch(error){result={ok:false,message:jobSignal.aborted?'Action antivirus annulée.':String(error.message).slice(0,650)};}
            await client.post('edr/result',{id:command.id,lease:command.lease,...result},{signal});
          })().catch(()=>{if(!jobSignal.aborted)onStatus('Le résultat antivirus doit être confirmé par le prochain relevé.',{state:'protection-warning'});}).finally(()=>{if(pending===job)pending=null;});
        }else{
          let result;try{result=await execute(command.action,policy,{signal});}catch{result={ok:false,message:'L’action de protection n’a pas été confirmée.'};}
          await client.post('edr/result',{id:command.id,lease:command.lease,...result},{signal});lastAttempt=0;
        }
      }
      if(policy.mode==='protect'&&snapshot.canEnforce&&(appliedRevision!==revision||Date.now()-lastAttempt>300000)){
        lastAttempt=Date.now();const result=await execute('enable-protection',policy,{signal});
        if(result.ok)appliedRevision=revision;
        else onStatus('La politique de protection nécessite une intervention sur le poste.',{state:'protection-warning'});
      }
    }catch(error){if(signal?.aborted)break;if(error.status===401||error.status===403)throw error;onStatus('La protection native continue ; la remontée EDR sera retentée.',{state:'protection-offline'});}
    await delay(intervalMs,undefined,{signal}).catch(()=>{});
  }
  }finally{pending?.controller.abort();await pending?.promise;}
}
