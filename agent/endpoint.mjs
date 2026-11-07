import {readFile,lstat} from 'node:fs/promises';
import {collectPosixEndpoint,executePosixEndpoint} from './endpoint-posix.mjs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {fixedProcess} from './network.mjs';
import {endpointPolicy,endpointSnapshot,DEFAULT_ENDPOINT_POLICY,ENDPOINT_COMMANDS} from '../server/lib/wolfguard/endpoint-spec.mjs';

export async function collectEndpoint({platform=process.platform,run=fixedProcess,signal}={}){
  if(platform!=='win32')return endpointSnapshot(await collectPosixEndpoint({platform,run,signal}));
  const value=JSON.parse(await run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./endpoint.ps1',import.meta.url)),'-Operation','collect'],{signal,timeout:25000,maxBytes:250000}));
  const events=(Array.isArray(value.events)?value.events:[]).map(row=>({...row,id:createHash('sha256').update(row.id).digest('hex'),occurredAt:Date.parse(row.occurredAt)}));
  return endpointSnapshot({...value,collectedAt:Date.now(),platform,events});
}
export async function executeEndpointAction(action,policy=DEFAULT_ENDPOINT_POLICY,{platform=process.platform,run=fixedProcess,signal}={}){
  if(!ENDPOINT_COMMANDS.includes(action))throw new Error('Action de protection inconnue.');
  if(action==='refresh')return {ok:true,message:'Actualisation de la protection demandée.'};
  if(platform!=='win32')return executePosixEndpoint(action,policy,{platform,run,signal});
  return JSON.parse(await run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./endpoint.ps1',import.meta.url)),'-Operation',action],{input:JSON.stringify(endpointPolicy(policy)),signal,timeout:action==='quick-scan'?180000:30000,maxBytes:16000}));
}
export async function runEndpointProtection(client,{signal,onStatus=()=>{},collect=collectEndpoint,execute=executeEndpointAction,intervalMs=30000,onReport=()=>{}}={}){
  let policy={...DEFAULT_ENDPOINT_POLICY},revision=0,appliedRevision=0,lastAttempt=0;const sent=new Map();
  while(!signal?.aborted){
    try{
      if(!process.env.WOLFGUARD_PROTECTION_MARKER&&process.platform!=='win32'&&client.agentId&&process.getuid?.()>0){
        const base=process.platform==='darwin'?'/Library/Application Support/WolfGuardAgent':'/var/lib/wolfguard-agent',directory=base+'/'+process.getuid(),marker=directory+'/protection-heartbeat.json';
        try{const [parent,folder,file]=await Promise.all([lstat(base),lstat(directory),lstat(marker)]);if(parent.uid===0&&!(parent.mode&0o022)&&!parent.isSymbolicLink()&&folder.uid===0&&!(folder.mode&0o022)&&file.uid===0&&!(file.mode&0o022)&&!folder.isSymbolicLink()&&!file.isSymbolicLink()){const heartbeat=JSON.parse(await readFile(marker,'utf8'));if(heartbeat.agentId===client.agentId&&Date.now()-heartbeat.at<120000){await delay(intervalMs,undefined,{signal}).catch(()=>{});continue;}}}catch{}
      }
      let snapshot=await collect({signal});
      const response=await client.post('edr/report',{...snapshot,events:snapshot.events.filter(row=>sent.get(row.id)!==JSON.stringify(row)),appliedRevision},{signal});
      for(const row of snapshot.events)sent.set(row.id,JSON.stringify(row));while(sent.size>5000)sent.delete(sent.keys().next().value);
      await onReport();
      policy=endpointPolicy(response.policy);revision=response.revision;
      if(response.command){
        let result;try{result=await execute(response.command.action,policy,{signal});}catch{result={ok:false,message:'L’action de protection n’a pas été confirmée.'};}
        await client.post('edr/result',{id:response.command.id,lease:response.command.lease,...result},{signal});lastAttempt=0;
      }
      if(policy.mode==='protect'&&snapshot.canEnforce&&(appliedRevision!==revision||Date.now()-lastAttempt>300000)){
        lastAttempt=Date.now();const result=await execute('enable-protection',policy,{signal});
        if(result.ok)appliedRevision=revision;
        else onStatus('La politique de protection nécessite une intervention sur le poste.',{state:'protection-warning'});
      }
    }catch(error){if(signal?.aborted)break;if(error.status===401||error.status===403)throw error;onStatus('La protection native continue ; la remontée EDR sera retentée.',{state:'protection-offline'});}
    await delay(intervalMs,undefined,{signal}).catch(()=>{});
  }
}
