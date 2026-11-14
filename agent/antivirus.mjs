import {readFile,writeFile,rename,lstat,readdir} from 'node:fs/promises';
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
    this.directory=path.resolve(directory);this.platform=platform;this.clock=clock;this.run=run;
    this.scope=[...new Set((scope||[path.join(home,'Downloads'),path.join(home,'Desktop'),path.join(home,'Documents'),temporary]).map(p=>path.resolve(p)))].filter(p=>!within(this.directory,p)&&p!==this.directory).slice(0,5);
    this.engine=engine||new ClamEngine(path.join(this.directory,'runtime'),{platform,arch,run});this.store=store||new AntivirusStore(path.join(this.directory,'quarantine'),{platform,run});
    this.state={version:1,capable:true,installed:false,enabled:false,state:'missing',engineVersion:'',signatureVersion:'',signatureAt:0,lastScanAt:0,lastUpdateAt:0,scannedFiles:0,pendingFiles:0,errors:0,message:'Le moteur WolfGuard Antivirus n’est pas encore installé.',scope:this.scope,quarantine:[]};
    this.enabled=false;this.monitorAllowed=true;this.loaded=false;this.busy=false;this.scanAbort=null;this.cache=new Map();this.events=new Map();this.timer=null;this.lastUpdateAttempt=0;
  }
  async load(){
    if(this.loaded)return;this.loaded=true;
    const filename=path.join(this.directory,'state.json');
    try{await safeAncestors(filename);const info=await lstat(filename);if(!info.isFile()||info.size>16000)throw new Error('État antivirus local invalide.');const saved=JSON.parse(await readFile(filename,'utf8'));this.enabled=saved.enabled===true;this.monitorAllowed=saved.monitorAllowed!==false;for(const key of ['lastScanAt','lastUpdateAt','scannedFiles','errors'])if(Number.isSafeInteger(saved[key])&&saved[key]>=0)this.state[key]=saved[key];}
    catch(error){if(error.code!=='ENOENT'){this.state.state='error';this.state.message=text(error);}}
  }
  async prepare(){
    await privateDirectory(this.directory);
    if(this.platform==='win32')await this.run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./antivirus-windows.ps1',import.meta.url)),'-Operation','secure','-Directory',this.directory],{timeout:20000,maxBytes:16000});
    await this.store.prepare();
  }
  async persist(){
    const data={enabled:this.enabled,monitorAllowed:this.monitorAllowed,lastScanAt:this.state.lastScanAt,lastUpdateAt:this.state.lastUpdateAt,scannedFiles:this.state.scannedFiles,errors:this.state.errors};
    const file=path.join(this.directory,'state.json'),temporary=path.join(this.directory,'state-'+randomBytes(16).toString('hex')+'.tmp');
    await safeAncestors(file);await writeFile(temporary,JSON.stringify(data),{flag:'wx',mode:0o600});await rename(temporary,file);
  }
  async setPolicy(mode){await this.load();const allowed=mode==='protect';if(this.monitorAllowed!==allowed){this.monitorAllowed=allowed;if(!allowed)this.scanAbort?.abort();if(this.state.installed)await this.persist();}}
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
      if(!this.busy&&this.state.state!=='error')this.state.state=!engine?'missing':!this.enabled||!this.monitorAllowed?'paused':this.state.signatureAt?'ready':'error';
    }catch(error){this.state.state='error';this.state.message=text(error);}
    this.state.enabled=this.enabled&&this.monitorAllowed;
    return antivirusSnapshot(this.state);
  }
  async candidates({signal}={}){
    const files=[];let visited=0,incomplete=false;
    const walk=async (directory,depth)=>{
      if(signal?.aborted)throw signal.reason;
      if(depth>16||visited>=10000||files.length>=2000){incomplete=true;return;}
      await safeAncestors(directory);let entries;
      try{entries=await readdir(directory,{withFileTypes:true});}catch(error){if(error.code!=='ENOENT')this.state.errors++;return;}
      for(const entry of entries){
        if(signal?.aborted)throw signal.reason;if(++visited>10000||files.length>=2000){incomplete=true;break;}
        const file=path.join(directory,entry.name);if(file===this.directory||within(file,this.directory)||entry.isSymbolicLink()||/[\u0000-\u001f]/.test(entry.name))continue;
        if(entry.isDirectory()){await walk(file,depth+1);continue;}if(!entry.isFile())continue;
        try{const info=await lstat(file),fingerprint=[info.dev,info.ino,info.size,info.mtimeMs,info.ctimeMs].join(':');
          if(info.size>MAX_FILE_BYTES){this.state.errors++;continue;}
          if(this.cache.get(file)!==fingerprint)files.push({file,fingerprint});
        }catch{this.state.errors++;}
      }
    };
    for(const root of this.scope)await walk(root,0);
    if(incomplete)this.state.message='Périmètre partiellement parcouru : limite de fichiers ou de profondeur atteinte. Les fichiers non analysés ne sont pas déclarés sains.';
    return {files,incomplete};
  }
  async scan({signal,automatic=false}={}){
    await this.load();if(this.busy)throw new Error('Une opération antivirus est déjà en cours.');
    this.scanAbort=new AbortController();signal=AbortSignal.any([...(signal?[signal]:[]),this.scanAbort.signal,AbortSignal.timeout(600000)]);
    this.busy=true;this.state.state='scanning';this.state.errors=0;this.state.scannedFiles=0;this.state.message='Analyse des dossiers couverts par WolfGuard.';
    try{
      if(!await this.engine.paths())throw new Error('Le moteur WolfGuard n’est pas installé.');
      const {files,incomplete}=await this.candidates({signal});this.state.pendingFiles=files.length;
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
    finally{this.busy=false;this.scanAbort=null;this.state.pendingFiles=0;}
  }
  async execute(value,{signal}={}){
    const command=antivirusCommand(value);if(!command)throw new Error('Action antivirus invalide.');
    await this.load();
    if(command.action==='av-pause'){this.enabled=false;this.scanAbort?.abort();if(this.state.installed)await this.persist();this.state.state='paused';this.state.message='Surveillance WolfGuard suspendue ; les protections natives restent actives.';return {ok:true,message:this.state.message};}
    if(this.busy)throw new Error('Une opération antivirus est déjà en cours.');
    if(command.action==='av-scan')return this.scan({signal});
    this.busy=true;
    try{
      if(command.action==='av-install'){
        this.state.state='installing';this.state.message='Installation du moteur ClamAV officiel ; les protections existantes restent actives.';await this.prepare();
        await this.engine.install({signal,onProgress:(bytes,total)=>{this.state.message='Téléchargement du moteur ClamAV : '+Math.floor(100*bytes/total)+' %.';}});
        this.state.state='updating';this.state.message='Téléchargement et validation des signatures officielles.';await this.engine.update({signal});
        this.state.lastUpdateAt=this.clock();this.enabled=true;
      }else{
        if(!await this.engine.paths())throw new Error('Le moteur WolfGuard n’est pas installé.');
        if(command.action==='av-update'){this.state.state='updating';this.state.message='Actualisation des signatures ClamAV.';this.lastUpdateAttempt=this.clock();await this.engine.update({signal});this.state.lastUpdateAt=this.clock();this.cache.clear();}
        else if(command.action==='av-resume')this.enabled=true;
        else if(command.action==='av-restore'){const record=await this.store.restore(command.id,this.scope);this.event(record);this.cache.delete(record.path);}
        else if(command.action==='av-delete'){const record=await this.store.remove(command.id);this.cache.delete(record.path);}
      }
      await this.persist();this.state.state=this.enabled&&this.monitorAllowed?'ready':'paused';this.state.message='Action antivirus confirmée. La surveillance réactive couvre uniquement les dossiers indiqués.';
      return {ok:true,message:this.state.message};
    }catch(error){this.state.state='error';this.state.message=text(error);return {ok:false,code:'ANTIVIRUS_ACTION_FAILED',message:this.state.message};}
    finally{this.busy=false;}
  }
  start({signal}={}){
    if(this.timer)return;
    const tick=async()=>{
      if(signal?.aborted)return;
      try{await this.load();if(!this.busy&&this.enabled&&this.monitorAllowed&&await this.engine.paths()){
        const signatures=await this.engine.signatures();
        if(this.clock()-signatures.at>86400000&&this.clock()-this.lastUpdateAttempt>3600000){this.lastUpdateAttempt=this.clock();await this.execute('av-update',{signal});}
        if(!this.busy)await this.scan({signal,automatic:true});
      }}catch(error){if(!signal?.aborted){this.state.state='error';this.state.message=text(error);}}
      if(!signal?.aborted)this.timer=setTimeout(tick,30000);
    };
    this.timer=setTimeout(tick,1000);signal?.addEventListener('abort',()=>{clearTimeout(this.timer);this.timer=null;this.scanAbort?.abort();},{once:true});
  }
}
let current;
export function getAntivirusManager(){return current??=new AntivirusManager();}
