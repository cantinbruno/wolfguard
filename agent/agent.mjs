import {setTimeout as delay} from 'node:timers/promises';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hostname} from 'node:os';
import {createInterface} from 'node:readline/promises';
import {runNetworkScan,fixedProcess} from './network.mjs';

export const API='https://wolfguard-web-cantin.paledove36.chatgpt.site';
export class AgentClient {
  constructor(origin=API,{allowLoopback=false}={}){const url=new URL(origin);if(origin!==API&&!(allowLoopback&&url.protocol==='http:'&&url.hostname==='127.0.0.1'))throw new Error('Relais non autorisé.');this.origin=origin;this.token='';}
  async post(route,body){const response=await fetch(this.origin+'/api/agent/'+route,{method:'POST',headers:{'Content-Type':'application/json',...(this.token?{Authorization:'Agent '+this.token}:{})},body:JSON.stringify(body),redirect:'error',credentials:'omit',signal:AbortSignal.timeout(10000)});const result=await response.json();if(!response.ok){const error=new Error(result.error||'Relais indisponible.');error.status=response.status;throw error;}return result;}
}
export async function executeJob(client,job,{signal,onStatus=()=>{},passiveCollector}={}){
  const cancel=new AbortController(),deadline=setTimeout(()=>cancel.abort(),180000),externalAbort=()=>cancel.abort();signal?.addEventListener('abort',externalAbort,{once:true});if(signal?.aborted)cancel.abort();
  let latest={strategy:job.spec.strategy,results:[],warnings:[],completed:0,total:0},revision=job.revision,lastAck=Date.now(),finished=false,remoteStopped=false;
  const heartbeat=async status=>{
    const result=await client.post('update',{id:job.id,lease:job.lease,revision:++revision,status,completed:latest.completed,total:latest.total,report:latest});
    revision=Math.max(revision,result.revision||0);lastAck=Date.now();
    if(!['running','completed'].includes(result.status)){remoteStopped=true;cancel.abort();}return result;
  };
  const monitor=(async()=>{while(!finished&&!cancel.signal.aborted){await delay(2000).catch(()=>{});if(finished)break;try{await heartbeat('running');}catch(error){if(error.status===401||error.status===403||Date.now()-lastAck>=20000){cancel.abort();onStatus('Connexion au relais perdue : scan arrêté.');}}}})();
  try{
    onStatus('Scan '+(job.spec.strategy==='passive'?'passif':'actif')+' en cours.');
    latest=await runNetworkScan(job.spec,{signal:cancel.signal,onProgress:report=>{latest=report;},passiveCollector});
  }catch(error){latest={...latest,warnings:[...latest.warnings,String(error.message||'Collecte impossible.').slice(0,500)],error:String(error.message||'Collecte impossible.').slice(0,500)};}
  finally{finished=true;clearTimeout(deadline);await monitor;signal?.removeEventListener('abort',externalAbort);}
  if(!remoteStopped){const status=latest.error?'failed':cancel.signal.aborted?'cancelled':'completed';for(let attempt=0;attempt<3;attempt++){try{await heartbeat(status);break;}catch(error){if(error.status===401||error.status===403)throw error;if(attempt===2)throw new Error('Résultat non confirmé par le relais.');await delay(1500);}}}
  onStatus('Scan terminé. Les résultats sont disponibles sur le site.');return latest;
}
export async function runAgent(client,{signal,onStatus=()=>{},passiveCollector,pollMs=4000}={}){
  onStatus('Agent connecté. Les scans se lancent depuis WolfGuard.');
  while(!signal?.aborted){
    try{const {job}=await client.post('poll',{});if(job)await executeJob(client,job,{signal,onStatus,passiveCollector});}
    catch(error){if(error.status===401||error.status===403)throw error;onStatus('Relais temporairement indisponible. Nouvelle tentative automatique.');}
    try{await delay(pollMs,undefined,{signal});}catch{break;}
  }
}
async function protectedData(value,mode){return fixedProcess('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./protect.ps1',import.meta.url)),'-Mode',mode],{input:value,timeout:10000,maxBytes:16000});}
async function main(){
  if(process.platform!=='win32')throw new Error('Utilise cet agent sur Windows.');
  const directory=path.join(process.env.LOCALAPPDATA,'WolfGuardAgent'),filename=path.join(directory,'credential.dpapi');
  await mkdir(directory,{recursive:true});
  let credential=null;
  try{const cipher=await readFile(filename,'utf8');credential=JSON.parse(await protectedData(cipher,'unprotect'));if(credential.api!==API||!/^[a-f0-9]{64}$/.test(credential.token))throw new Error('Association invalide.');}catch(error){if(error.code!=='ENOENT'&&!process.argv.includes('--pair'))throw new Error('Association locale illisible. Relance avec Associer-agent.cmd.');}
  const client=new AgentClient();
  if(!credential||process.argv.includes('--pair')){
    console.log('Ouvre WolfGuard > Scan > Associer un agent, puis génère un code temporaire.');
    const prompt=createInterface({input:process.stdin,output:process.stdout});let code;try{code=(await prompt.question('Colle le code d’association : ')).trim();}finally{prompt.close();}
    if(!/^[a-f0-9]{32}$/.test(code))throw new Error('Code d’association invalide.');
    credential={api:API,...await client.post('enroll',{code,name:hostname().slice(0,100),platform:'win32'})};
    await writeFile(filename+'.tmp',await protectedData(JSON.stringify(credential),'protect'),{mode:0o600});await rename(filename+'.tmp',filename);
    console.log('Poste associé. Aucun code WolfGuard ni compte GitHub n’est enregistré dans l’agent.');
  }
  client.token=credential.token;
  const cancel=new AbortController();process.once('SIGINT',()=>cancel.abort());process.once('SIGTERM',()=>cancel.abort());
  await runAgent(client,{signal:cancel.signal,onStatus:message=>console.log(new Date().toLocaleTimeString('fr-FR')+' · '+message)});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(error=>{console.error(error.status===401?'Cet agent a été révoqué ou ton code a changé. Associe-le de nouveau.':error.message);process.exitCode=1;});
