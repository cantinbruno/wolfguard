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
  async post(route,body,{signal}={}){const response=await fetch(this.origin+'/api/agent/'+route,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'WolfGuard-Agent/2.0',...(this.token?{Authorization:'Agent '+this.token}:{})},body:JSON.stringify(body),redirect:'error',credentials:'omit',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});const result=await response.json().catch(()=>({}));if(!response.ok){const error=new Error(result.error||'Relais indisponible.');error.status=result.error?response.status:503;throw error;}return result;}
}
export async function executeJob(client,job,{signal,onStatus=()=>{},passiveCollector}={}){
  const cancel=new AbortController(),deadline=setTimeout(()=>cancel.abort(),180000),externalAbort=()=>cancel.abort();signal?.addEventListener('abort',externalAbort,{once:true});if(signal?.aborted)cancel.abort();
  let latest={strategy:job.spec.strategy,results:[],warnings:[],completed:0,total:0},revision=job.revision,lastAck=Date.now(),finished=false,remoteStopped=false;
  const heartbeat=async status=>{
    const result=await client.post('update',{id:job.id,lease:job.lease,revision:++revision,status,completed:latest.completed,total:latest.total,report:latest});
    revision=Math.max(revision,result.revision||0);lastAck=Date.now();
    if(!['running','completed'].includes(result.status)){remoteStopped=true;cancel.abort();}return result;
  };
const monitor=(async()=>{while(!finished&&!cancel.signal.aborted){await delay(2000).catch(()=>{});if(finished)break;try{await heartbeat('running');}catch(error){if(error.status===401||error.status===403||Date.now()-lastAck>=20000){cancel.abort();onStatus('Connexion au relais perdue : scan arrêté.',{state:'offline'});}}}})();
  try{
    onStatus('Scan '+(job.spec.strategy==='passive'?'passif':'actif')+' en cours.',{state:'scanning',strategy:job.spec.strategy,completed:0,total:0});
    let lastProgress=0;
    latest=await runNetworkScan(job.spec,{signal:cancel.signal,onProgress:report=>{latest=report;if(Date.now()-lastProgress>=250||report.completed===report.total){lastProgress=Date.now();onStatus('Scan '+(job.spec.strategy==='passive'?'passif':'actif')+' en cours.',{state:'scanning',strategy:job.spec.strategy,completed:report.completed,total:report.total});}},passiveCollector});
  }catch(error){if(cancel.signal.aborted)latest={...latest,cancelled:true};else latest={...latest,warnings:[...latest.warnings,String(error.message||'Collecte impossible.').slice(0,500)],error:String(error.message||'Collecte impossible.').slice(0,500)};}
  finally{finished=true;clearTimeout(deadline);await monitor;signal?.removeEventListener('abort',externalAbort);}
  if(!remoteStopped){const status=latest.error?'failed':cancel.signal.aborted?'cancelled':'completed';for(let attempt=0;attempt<3;attempt++){try{await heartbeat(status);break;}catch(error){if(error.status===401||error.status===403)throw error;if(attempt===2)throw new Error('Résultat non confirmé par le relais.');await delay(1500);}}}
  const outcome=latest.error?'failed':cancel.signal.aborted||remoteStopped?'cancelled':'completed';
  onStatus(outcome==='failed'?'Le scan a échoué. Consulte le rapport sur le site.':outcome==='cancelled'?'Scan arrêté.':'Scan terminé. Les résultats sont disponibles sur le site.',{state:outcome,completed:latest.completed,total:latest.total});return latest;
}
export async function runAgent(client,{signal,onStatus=()=>{},passiveCollector,pollMs=4000}={}){
  onStatus('Connexion à WolfGuard…',{state:'connecting'});
  while(!signal?.aborted){
    try{const {job}=await client.post('poll',{}, {signal});if(signal?.aborted)break;if(job)await executeJob(client,job,{signal,onStatus,passiveCollector});else onStatus('Agent connecté. Prêt à recevoir un scan depuis le site.',{state:'connected'});}
    catch(error){if(signal?.aborted)break;if(error.status===401||error.status===403)throw error;onStatus('Connexion interrompue. Nouvelle tentative automatique.',{state:'offline'});}
    try{await delay(pollMs,undefined,{signal});}catch{break;}
  }
}
async function protectedData(value,mode){return fixedProcess('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./protect.ps1',import.meta.url)),'-Mode',mode],{input:value,timeout:10000,maxBytes:16000});}
export function diskCredentialStore(directory){
  const filename=path.join(directory,'credential.dpapi');
  return {
    async load(){try{return JSON.parse(await protectedData(await readFile(filename,'utf8'),'unprotect'));}catch(error){if(error.code==='ENOENT')return null;throw new Error('L’association enregistrée est illisible. Génère un nouveau code sur le site.');}},
    async save(credential){await mkdir(directory,{recursive:true});await writeFile(filename+'.tmp',await protectedData(JSON.stringify(credential),'protect'),{mode:0o600});await rename(filename+'.tmp',filename);}
  };
}

// The native window sends only pairing/control commands over stdin. Status
// events on stdout contain no credential, pairing code, target or scan report.
export async function desktopAgent({client=new AgentClient(),store=diskCredentialStore(path.join(process.env.LOCALAPPDATA||'','WolfGuardAgent')),input=process.stdin,emit=event=>process.stdout.write(JSON.stringify(event)+'\n'),name=hostname(),pollMs=4000,passiveCollector}={}){
  let controller=null,work=null,closing=false;
  const state=(message,detail={})=>emit({type:'state',state:detail.state||'error',message,...detail});
  async function stop(){if(controller)controller.abort();if(work)await work;controller=null;work=null;}
  function connect(credential){
    client.token=credential.token;controller=new AbortController();
    work=runAgent(client,{signal:controller.signal,pollMs,passiveCollector,onStatus:state}).catch(error=>state(error.status===401||error.status===403?'Ce poste doit être associé de nouveau. Génère un code sur le site.':'La connexion n’a pas pu démarrer.',{state:error.status===401||error.status===403?'revoked':'error'}));
  }
  let credential=null;
  const lines=createInterface({input,crlfDelay:Infinity,terminal:false});
  let queue=(async()=>{
    try{credential=await store.load();if(credential&&(credential.api!==client.origin||!/^[a-f0-9]{64}$/.test(credential.token)))throw new Error('Association enregistrée invalide.');if(credential)connect(credential);else state('Colle le code temporaire généré dans WolfGuard.',{state:'pairing'});}
    catch(error){state(error.message,{state:'pairing'});}
  })();
  lines.on('line',line=>{
    queue=queue.then(async()=>{
      if(closing)return;
      let command;try{if(line.length>2048)throw new Error();command=JSON.parse(line);}catch{state('Commande de la fenêtre invalide.',{state:'error'});return;}
      if(command.type==='shutdown'){closing=true;await stop();lines.close();return;}
      if(command.type==='stop'){await stop();state('L’agent est arrêté. Aucun scan ne sera exécuté.',{state:'stopped'});return;}
      if(command.type==='repair'){await stop();state('Génère un nouveau code temporaire sur le site, puis colle-le ici.',{state:'pairing'});return;}
      if(command.type==='start'){if(work)await stop();if(credential)connect(credential);else state('Colle un code temporaire pour associer ce poste.',{state:'pairing'});return;}
      if(command.type==='pair'){
        const code=String(command.code||'').trim().toLowerCase();
        if(!/^[a-f0-9]{32}$/.test(code)){state('Le code temporaire doit contenir 32 caractères. Copie-le depuis le site.',{state:'pairing'});return;}
        await stop();state('Association du poste…',{state:'enrolling'});
        try{const enrolled=await client.post('enroll',{code,name:String(name).slice(0,100),platform:'win32'});const next={api:client.origin,...enrolled};await store.save(next);credential=next;connect(next);}
        catch(error){state(error.status===403?'Ce code a expiré ou a déjà été utilisé. Génère un nouveau code.':'Association impossible. Vérifie ta connexion puis réessaie.',{state:'pairing'});}
      }
    }).catch(()=>state('L’action n’a pas pu se terminer. Réessaie.',{state:'error'}));
  });
  await new Promise(resolve=>lines.once('close',resolve));closing=true;await queue;await stop();
}
async function main(){
  if(process.platform!=='win32')throw new Error('Utilise cet agent sur Windows.');
  if(process.argv.includes('--gui'))return desktopAgent();
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
