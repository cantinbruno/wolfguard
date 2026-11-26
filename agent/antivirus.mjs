import {readFile,writeFile,rename,lstat,readdir,opendir} from 'node:fs/promises';
import {homedir,tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {ClamEngine,antivirusProcess} from './antivirus-engine.mjs';
import {AntivirusStore,privateDirectory,safeAncestors,snapshotFile,within,MAX_FILE_BYTES} from './antivirus-store.mjs';
import {antivirusCommand,antivirusSnapshot} from '../server/lib/wolfguard/antivirus-spec.mjs';
const provider='WolfGuard Antivirus / ClamAV';
const text=error=>String(error?.message||error||'Action antivirus non confirmée.').slice(0,650);
export function antivirusDirectory({platform=process.platform,env=process.env,home=homedir()}={}){
  const agent=env.WOLFGUARD_AGENT_HOME&&path.isAbsolute(env.WOLFGUARD_AGENT_HOME)?env.WOLFGUARD_AGENT_HOME:platform==='win32'?path.join(env.LOCALAPPDATA||path.join(home,'AppData','Local'),'WolfGuardAgent'):platform==='darwin'?path.join(home,'Library','Application Support','WolfGuardAgent'):path.join(env.XDG_CONFIG_HOME&&path.isAbsolute(env.XDG_CONFIG_HOME)?env.XDG_CONFIG_HOME:path.join(home,'.config'),'WolfGuardAgent');
  return path.join(agent,'antivirus');
}
export class AntivirusManager{
  constructor({directory=antivirusDirectory(),platform=process.platform,arch=process.arch,home=homedir(),temporary=tmpdir(),engine,store,run=antivirusProcess,scope,clock=Date.now}={}){
    this.directory=path.resolve(directory);this.platform=platform;this.arch=arch;this.clock=clock;this.run=run;
    this.scopeConfigured=!!scope;this.scopeDiscovered=false;this.walkCursor=null;this.completedPasses=0;this.skippedFiles=0;
    this.scope=[...new Set((scope||(platform==='win32'?[path.parse(home).root]:[path.join(home,'Downloads'),path.join(home,'Desktop'),path.join(home,'Documents'),temporary])).map(p=>path.resolve(p)))].filter(p=>!within(p,this.directory)&&p!==this.directory).slice(0,26);
    this.engine=engine||new ClamEngine(path.join(this.directory,'runtime'),{platform,arch,run});this.store=store||new AntivirusStore(path.join(this.directory,'quarantine'),{platform,run});
    this.state={version:1,capable:true,installed:false,enabled:false,state:'missing',engineVersion:'',signatureVersion:'',signatureAt:0,lastScanAt:0,lastUpdateAt:0,scannedFiles:0,pendingFiles:0,errors:0,message:'Le moteur WolfGuard Antivirus n’est pas encore installé.',scope:this.scope,quarantine:[]};
    this.enabled=false;this.paused=false;this.policyConfirmed=false;this.monitorAllowed=true;this.loaded=false;this.loadFailed=false;this.busy=false;this.scanAbort=null;this.operationAbort=null;this.cache=new Map();this.events=new Map();this.timer=null;this.lastUpdateAttempt=0;this.lastInstallAttempt=0;
  }
  async load(){
    if(this.loaded)return;this.loaded=true;
    const filename=path.join(this.directory,'state.json');
    try{await safeAncestors(filename);const info=await lstat(filename);if(!info.isFile()||info.size>16000)throw new Error('État antivirus local invalide.');const saved=JSON.parse(await readFile(filename,'utf8'));this.enabled=saved.enabled===true;this.paused=saved.paused===true||saved.paused===undefined&&saved.enabled===false;this.monitorAllowed=saved.monitorAllowed!==false;for(const key of ['lastUpdateAttempt','lastInstallAttempt'])if(Number.isSafeInteger(saved[key])&&saved[key]>=0)this[key]=saved[key];for(const key of ['lastScanAt','lastUpdateAt','scannedFiles','errors'])if(Number.isSafeInteger(saved[key])&&saved[key]>=0)this.state[key]=saved[key];}
    catch(error){if(error.code!=='ENOENT'){this.loadFailed=true;this.state.state='error';this.state.message=text(error);}}
  }
  async prepare(){
    await privateDirectory(this.directory);
    if(this.platform==='win32')await this.run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./antivirus-windows.ps1',import.meta.url)),'-Operation','secure','-Directory',this.directory],{timeout:20000,maxBytes:16000});
    await this.store.prepare();
    if(this.platform==='win32'&&!this.scopeConfigured&&!this.scopeDiscovered){
      const raw=await this.run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',"@(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object { $_.DeviceID + '\\' }) | ConvertTo-Json -Compress"],{timeout:15000,maxBytes:4000});
      if(raw.trim()){const drives=JSON.parse(raw);const roots=(Array.isArray(drives)?drives:[drives]).filter(value=>typeof value==='string'&&/^[a-z]:[\\/]$/i.test(value)).map(value=>path.resolve(value));if(roots.length){this.scope=[...new Set(roots)].slice(0,26);this.state.scope=this.scope;this.walkCursor=null;this.scopeDiscovered=true;}}
    }
  }
  async persist(){
    const data={enabled:this.enabled,paused:this.paused,monitorAllowed:this.monitorAllowed,lastInstallAttempt:this.lastInstallAttempt,lastUpdateAttempt:this.lastUpdateAttempt,lastScanAt:this.state.lastScanAt,lastUpdateAt:this.state.lastUpdateAt,scannedFiles:this.state.scannedFiles,errors:this.state.errors};
    const file=path.join(this.directory,'state.json'),temporary=path.join(this.directory,'state-'+randomBytes(16).toString('hex')+'.tmp');
    await safeAncestors(file);await writeFile(temporary,JSON.stringify(data),{flag:'wx',mode:0o600});await rename(temporary,file);this.loadFailed=false;
  }
  async setPolicy(mode){await this.load();this.policyConfirmed=true;const allowed=mode==='protect';if(this.monitorAllowed!==allowed){this.monitorAllowed=allowed;if(!allowed){this.scanAbort?.abort();this.operationAbort?.abort();}if(this.state.installed&&!this.loadFailed)await this.persist();}}
  maintenanceEvent(title,status,detail){
    const at=this.clock(),id=createHash('sha256').update('wolfguard-maintenance:'+title+':'+at).digest('hex');
    this.events.set(id,{id,occurredAt:at,provider,title,detail,resource:'',status,severity:status==='failed'?'medium':'info'});while(this.events.size>100)this.events.delete(this.events.keys().next().value);
  }
  event(record){
    const status=record.status==='quarantined'?'quarantined':record.status==='restored'?'info':'alert';
    const event={id:createHash('sha256').update('wolfguard-av:'+record.id).digest('hex'),occurredAt:record.restoredAt||record.detectedAt,provider,title:record.status==='quarantined'?'Menace mise en quarantaine par WolfGuard':record.status==='restored'?'Fichier restauré depuis la quarantaine WolfGuard':'Menace détectée par WolfGuard',resource:record.path,detail:record.threat+(record.message?' · '+record.message:''),status,severity:status==='info'?'info':'high'};
    this.events.set(event.id,event);while(this.events.size>100)this.events.delete(this.events.keys().next().value);
  }
  async snapshot(){
    await this.load();
    try{
      const engine=await this.engine.paths();this.state.installed=!!engine;this.state.engineVersion=engine?.version||'';
      if(engine){const signatures=await this.engine.signatures();this.state.signatureAt=signatures.at;this.state.signatureVersion=signatures.version;this.state.quarantine=(await this.store.list()).sort((a,b)=>b.detectedAt-a.detectedAt);for(const row of this.state.quarantine)this.event(row);}
      if(!this.busy&&this.state.state!=='error'){
        const fresh=this.state.signatureAt&&this.clock()-this.state.signatureAt<=2*86400000;
        this.state.state=!engine?'missing':!this.enabled||!this.monitorAllowed?'paused':fresh&&this.scope.length?'ready':'error';
        if(!engine)this.state.message='Le moteur WolfGuard Antivirus n’est pas encore installé.';
        else if(!this.enabled||!this.monitorAllowed)this.state.message=this.paused?'Surveillance WolfGuard suspendue par le compte.':'Surveillance WolfGuard suspendue par la politique du poste.';
        else if(!this.scope.length)this.state.message='Aucun disque ou dossier à surveiller : la protection des fichiers ne peut pas être confirmée.';
        else if(!fresh)this.state.message='Signatures absentes ou trop anciennes ; actualisation automatique en attente. Les fichiers ne sont pas déclarés sains.';
        else if(!this.state.lastScanAt)this.state.message='Moteur ClamAV installé et signatures à jour. Le premier passage de surveillance est en attente.';
        else if(this.state.message==='Le moteur WolfGuard Antivirus n’est pas encore installé.')this.state.message='Moteur ClamAV installé et signatures à jour. Surveillance périodique sur les disques indiqués.';
      }
    }catch(error){this.state.state='error';this.state.message=text(error);}
    this.state.enabled=this.enabled&&this.monitorAllowed;
    return antivirusSnapshot(this.state);
  }
  async *walkFiles(directory,depth=0){
    this.scanAbort?.signal.throwIfAborted();
    if(depth>64){this.skippedFiles++;return;}
    let handle;
    try{
      await safeAncestors(directory);handle=await opendir(directory);
      for await(const entry of handle){
        this.scanAbort?.signal.throwIfAborted();
        const file=path.join(directory,entry.name);
        if(file===this.directory||within(file,this.directory))continue;
        if(entry.isSymbolicLink()||/[\u0000-\u001f]/.test(entry.name)){this.skippedFiles++;continue;}
        if(entry.isDirectory())yield* this.walkFiles(file,depth+1);
        else if(entry.isFile())yield file;
      }
    }catch(error){if(this.scanAbort?.signal.aborted)throw error;if(error.code!=='ENOENT')this.skippedFiles++;}
  }
  async *walkScope(){for(const root of this.scope)yield* this.walkFiles(root);}
  async candidates({signal,limit=2000}={}){
    const files=[];let visited=0,incomplete=false;
    this.walkCursor??=this.walkScope();
    while(visited++<10000&&files.length<limit){
      signal?.throwIfAborted();const next=await this.walkCursor.next();
      if(next.done){this.walkCursor=null;this.completedPasses++;break;}
      try{const info=await lstat(next.value),fingerprint=[info.dev,info.ino,info.size,info.mtimeMs,info.ctimeMs].join(':');
        if(info.size>MAX_FILE_BYTES||info.nlink!==1){this.skippedFiles++;continue;}
        if(this.cache.get(next.value)!==fingerprint)files.push({file:next.value,fingerprint});
      }catch{this.skippedFiles++;}
    }
    incomplete=!!this.walkCursor;
    if(incomplete)this.state.message='Parcours système en cours : la prochaine passe reprend après les fichiers déjà examinés.';
    this.state.skippedFiles=this.skippedFiles;this.state.completedPasses=this.completedPasses;
    return {files,incomplete};
  }
  async scan({signal,automatic=false}={}){
    await this.load();if(this.busy)throw new Error('Une opération antivirus est déjà en cours.');
    this.scanAbort=new AbortController();signal=AbortSignal.any([...(signal?[signal]:[]),this.scanAbort.signal,AbortSignal.timeout(600000)]);
    this.busy=true;this.state.state='scanning';this.state.errors=0;this.state.scannedFiles=0;this.state.message='Analyse progressive des disques couverts par WolfGuard.';
    try{
      if(!await this.engine.paths())throw new Error('Le moteur WolfGuard n’est pas installé.');
      if(!this.scope.length)throw new Error('Aucun disque ou dossier à surveiller.');
      const {files,incomplete}=await this.candidates({signal,limit:automatic?100:2000});this.state.pendingFiles=files.length;
      for(let start=0;start<files.length;){
        if(signal?.aborted)throw signal.reason;const batch=[];let bytes=0;
        while(start<files.length&&batch.length<20){
          const item=files[start];let snapshot;
          try{snapshot=await snapshotFile(item.file,this.scope);}catch{this.state.errors++;start++;this.state.pendingFiles--;continue;}
          if(batch.length&&bytes+snapshot.size>64*1024*1024)break;
          batch.push({...snapshot,fingerprint:item.fingerprint});bytes+=snapshot.size;start++;
        }
        if(!batch.length)continue;
        const results=await this.engine.scan(batch,{signal});
        for(const result of results){
          if(signal?.aborted)throw signal.reason;
          this.state.pendingFiles--;this.state.scannedFiles++;
          if(result.status==='clean')this.cache.set(result.snapshot.path,result.snapshot.fingerprint);
          else if(result.status==='infected'){const record=await this.store.quarantine(result.snapshot,result.threat,this.scope);this.event(record);this.cache.set(result.snapshot.path,result.snapshot.fingerprint);if(record.status!=='quarantined')this.state.errors++;}
          else this.state.errors++;
        }
        while(this.cache.size>20000)this.cache.delete(this.cache.keys().next().value);
      }
      this.state.lastScanAt=this.clock();this.state.message=this.state.errors?'Analyse terminée avec '+this.state.errors+' fichier(s) ou action(s) non confirmés.':incomplete?this.state.message:'Analyse des fichiers nouveaux ou modifiés terminée. La surveillance est réactive, sans blocage préalable à l’exécution.';
      this.state.state=this.enabled&&this.monitorAllowed?'ready':'paused';await this.persist();
      return {ok:true,message:this.state.message};
    }catch(error){this.state.state=!this.enabled||!this.monitorAllowed?'paused':'error';this.state.message=signal?.aborted?'Analyse antivirus interrompue.':text(error);throw error;}
    finally{if(signal.aborted){await this.walkCursor?.return();this.walkCursor=null;}this.busy=false;this.scanAbort=null;this.state.pendingFiles=0;}
  }
  async execute(value,{signal,automatic=false}={}){
    const command=antivirusCommand(value);if(!command)throw new Error('Action antivirus invalide.');
    await this.load();
    if(automatic&&(this.loadFailed||!this.policyConfirmed||!this.monitorAllowed||this.paused||signal?.aborted))return {ok:false,message:'Installation automatique suspendue par la politique du poste.'};
    if(command.action==='av-pause'){this.paused=true;this.enabled=false;this.scanAbort?.abort();this.operationAbort?.abort();await this.prepare();await this.persist();this.state.state='paused';this.state.message='Surveillance WolfGuard suspendue ; les protections natives restent actives.';return {ok:true,message:this.state.message};}
    if(this.busy)throw new Error('Une opération antivirus est déjà en cours.');
    if(command.action==='av-scan')return this.scan({signal});
    this.busy=true;this.operationAbort=new AbortController();signal=AbortSignal.any([...(signal?[signal]:[]),this.operationAbort.signal]);
    try{
      if(command.action==='av-install'){
        this.state.state='installing';this.state.message='Installation automatique du moteur ClamAV officiel ; les protections existantes restent actives.';this.lastInstallAttempt=this.clock();await this.prepare();await this.persist();
        await this.engine.install({signal,onProgress:(bytes,total)=>{this.state.message='Téléchargement du moteur ClamAV : '+Math.floor(100*bytes/total)+' %.';}});
        signal.throwIfAborted();this.state.state='updating';this.state.message='Téléchargement et validation des signatures officielles.';this.lastUpdateAttempt=this.clock();await this.persist();await this.engine.update({signal});
        signal.throwIfAborted();this.state.lastUpdateAt=this.clock();this.enabled=true;this.paused=false;this.cache.clear();
        this.maintenanceEvent('WolfGuard Antivirus installé et signatures vérifiées','info','Installation du moteur officiel et première actualisation confirmées par le poste.');
      }else{
        if(!await this.engine.paths())throw new Error('Le moteur WolfGuard n’est pas installé.');
        if(command.action==='av-update'){this.state.state='updating';this.state.message='Actualisation des signatures ClamAV.';this.lastUpdateAttempt=this.clock();await this.prepare();await this.persist();await this.engine.update({signal});signal.throwIfAborted();this.state.lastUpdateAt=this.clock();this.cache.clear();this.maintenanceEvent('Signatures WolfGuard vérifiées','info','Actualisation FreshClam confirmée par le poste.');}
        else if(command.action==='av-resume'){this.enabled=true;this.paused=false;}
        else if(command.action==='av-restore'){const record=await this.store.restore(command.id,this.scope);this.event(record);this.cache.delete(record.path);}
        else if(command.action==='av-delete'){const record=await this.store.remove(command.id);this.cache.delete(record.path);}
      }
      await this.persist();this.state.state=this.enabled&&this.monitorAllowed?'ready':'paused';this.state.message='Action antivirus confirmée. Le parcours progressif reprend sur les disques indiqués, selon les droits de l’agent.';
      return {ok:true,message:this.state.message};
    }catch(error){this.state.state=this.paused||!this.monitorAllowed?'paused':'error';this.state.message=text(error);if(!signal.aborted&&['av-install','av-update'].includes(command.action))this.maintenanceEvent(command.action==='av-install'?'Installation antivirus non confirmée':'Mise à jour des signatures non confirmée','failed',this.state.message);return {ok:false,code:'ANTIVIRUS_ACTION_FAILED',message:this.state.message};}
    finally{this.busy=false;this.operationAbort=null;}
  }
  async maintain({signal}={}){
    await this.load();if(this.busy||this.loadFailed||signal?.aborted)return;
    const engine=await this.engine.paths(),now=this.clock();if(this.busy||signal?.aborted)return;
    if((!engine||!this.enabled&&!this.paused)&&this.platform==='win32'&&this.arch==='x64'&&this.policyConfirmed&&this.monitorAllowed&&!this.paused){
      if(this.lastInstallAttempt&&now-this.lastInstallAttempt<3600000)return;
      return this.execute('av-install',{signal,automatic:true});
    }
    if(!engine)return;
    if(!this.lastUpdateAttempt||now-this.lastUpdateAttempt>=3600000)await this.execute('av-update',{signal});
    if(signal?.aborted)return;
    if(!this.busy&&this.enabled&&this.monitorAllowed)await this.scan({signal,automatic:true});
  }
  start({signal}={}){
    if(this.timer)return;
    const tick=async()=>{
      if(signal?.aborted)return;
      try{await this.maintain({signal});}catch(error){if(!signal?.aborted){this.state.state='error';this.state.message=text(error);}}
      if(!signal?.aborted)this.timer=setTimeout(tick,30000);
    };
    this.timer=setTimeout(tick,1000);signal?.addEventListener('abort',()=>{clearTimeout(this.timer);this.timer=null;this.scanAbort?.abort();this.operationAbort?.abort();if(!this.busy){this.walkCursor?.return().catch(()=>{});this.walkCursor=null;}},{once:true});
  }
}
let current;
export function getAntivirusManager(){return current??=new AntivirusManager();}
