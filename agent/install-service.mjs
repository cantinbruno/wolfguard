import {mkdir,copyFile,writeFile,readFile,lstat,chmod} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
import {spawn} from 'node:child_process';
import {homedir,hostname} from 'node:os';
import {AgentClient,agentDirectory,diskCredentialStore} from './agent.mjs';
import {fixedProcess} from './network.mjs';

const FILES=['agent.mjs','endpoint.mjs','endpoint-posix.mjs','install-service.mjs','network.mjs','posix.mjs','security-rules.mjs','ai.mjs','remote.mjs','files.mjs','terminal.mjs','remote-runtime.mjs','remote-native.mjs','remote-windows.mjs','remote-windows-encoder.mjs','remote-macos.mjs','remote-linux.mjs','remote-portal.mjs','remote-dependencies.json'];
const SPECS=['scan-spec.mjs','remote-spec.mjs','files-spec.mjs','terminal-spec.mjs','ai-input.mjs','endpoint-spec.mjs'];
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const systemd=value=>'"'+String(value).replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('%','%%').replaceAll('$','$$')+'"';
async function safeDirectory(directory,rootOnly=false){
  const absolute=path.resolve(directory);let current=path.parse(absolute).root;
  for(const part of absolute.slice(current.length).split(path.sep).filter(Boolean)){
    current=path.join(current,part);let info;try{info=await lstat(current);}catch(error){if(error.code!=='ENOENT')throw error;await mkdir(current,{mode:rootOnly?0o755:0o700});info=await lstat(current);}
    if(!info.isDirectory()||info.isSymbolicLink())throw new Error('Chemin d’installation non sûr.');
    if(rootOnly&&(info.uid!==0||(info.mode&0o022)!==0))throw new Error('Le composant privilégié nécessite des dossiers appartenant à root, non modifiables par les utilisateurs.');
  }
  return absolute;
}
async function copyPayload(destination,rootOnly){
  await safeDirectory(destination,rootOnly);await safeDirectory(path.join(destination,'agent'),rootOnly);await safeDirectory(path.join(destination,'server','lib','wolfguard'),rootOnly);
  async function copy(source,target,mode=0o644){try{const old=await lstat(target);if(old.isSymbolicLink()||!old.isFile())throw new Error('Fichier d’installation non sûr.');}catch(error){if(error.code!=='ENOENT')throw error;}await copyFile(source,target);await chmod(target,mode);}
  for(const name of FILES)await copy(new URL('./'+name,import.meta.url),path.join(destination,'agent',name));
  for(const name of SPECS)await copy(new URL('../server/lib/wolfguard/'+name,import.meta.url),path.join(destination,'server','lib','wolfguard',name));
  await copy(process.execPath,path.join(destination,'node'),0o755);
  return {node:path.join(destination,'node'),worker:path.join(destination,'agent','agent.mjs')};
}
async function launchUser(directory,runtime){
  const env={WOLFGUARD_AGENT_HOME:directory,NODE_OPTIONS:'',NODE_PATH:''};
  if(process.platform==='linux'){
    const units=path.join(homedir(),'.config','systemd','user');await safeDirectory(units);
    await writeFile(path.join(units,'wolfguard-agent.service'),'[Unit]\nDescription=WolfGuard agent en arrière-plan\nAfter=network-online.target\n[Service]\nType=simple\nExecStart='+systemd(runtime.node)+' '+systemd(runtime.worker)+'\nEnvironment='+systemd('WOLFGUARD_AGENT_HOME='+directory)+' "NODE_OPTIONS=" "NODE_PATH="\nRestart=on-failure\nRestartSec=5\nUMask=0077\n[Install]\nWantedBy=default.target\n',{mode:0o600});
    try{await fixedProcess('/usr/bin/systemctl',['--user','daemon-reload']);await fixedProcess('/usr/bin/systemctl',['--user','enable','--now','wolfguard-agent.service']);return;}catch{}
    const pidFile=path.join(directory,'background.pid');
    try{const pid=Number(await readFile(pidFile,'utf8'));if(Number.isSafeInteger(pid)&&pid>1){const command=await readFile('/proc/'+pid+'/cmdline','utf8');if(command.split('\0').includes(runtime.worker)){process.kill(pid,0);console.log('Agent déjà actif en arrière-plan.');return;}}}catch{}
    const child=spawn(runtime.node,[runtime.worker],{detached:true,stdio:'ignore',env:{...process.env,...env}});child.unref();if(child.pid)await writeFile(pidFile,String(child.pid),{mode:0o600});
    console.log('Agent lancé en arrière-plan. systemd utilisateur indisponible : le démarrage automatique reste à configurer.');
  }else{
    const agents=path.join(homedir(),'Library','LaunchAgents');await safeDirectory(agents);const plist=path.join(agents,'fr.wavetools.wolfguard.agent.plist');
    await writeFile(plist,'<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>fr.wavetools.wolfguard.agent</string><key>ProgramArguments</key><array><string>'+xml(runtime.node)+'</string><string>'+xml(runtime.worker)+'</string></array><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer><key>EnvironmentVariables</key><dict>'+Object.entries(env).map(([key,value])=>'<key>'+xml(key)+'</key><string>'+xml(value)+'</string>').join('')+'</dict><key>StandardErrorPath</key><string>'+xml(path.join(directory,'service-error.log'))+'</string></dict></plist>',{mode:0o600});
    const domain='gui/'+process.getuid();await fixedProcess('/bin/launchctl',['bootout',domain+'/fr.wavetools.wolfguard.agent']).catch(()=>{});await fixedProcess('/bin/launchctl',['bootstrap',domain,plist]);
  }
}
async function installProtection(sourceDirectory,uid){
  if(process.getuid?.()!==0||!Number.isSafeInteger(uid)||uid<1)throw new Error('Exécute cette installation avec sudo et indique l’identifiant du compte à protéger.');
  const source=path.resolve(sourceDirectory),info=await lstat(source);if(info.isSymbolicLink()||!info.isDirectory()||info.uid!==uid)throw new Error('Le dossier d’association doit appartenir au compte indiqué.');
  const sourceCredential=path.join(source,'credential.json'),credentialInfo=await lstat(sourceCredential);if(credentialInfo.isSymbolicLink()||!credentialInfo.isFile()||credentialInfo.uid!==uid)throw new Error('Association utilisateur invalide.');
  const credential=JSON.parse(await readFile(sourceCredential,'utf8'));if(credential.api!=='https://wolfguard-web-cantin.cantin-bruno.chatgpt.site'||!/^[a-f0-9]{64}$/.test(credential.token)||!/^[a-f0-9]{32}$/.test(credential.id))throw new Error('Association du poste invalide.');
  const base=process.platform==='darwin'?'/Library/Application Support/WolfGuardAgent':'/var/lib/wolfguard-agent';
  const directory=await safeDirectory(path.join(base,String(uid)),true),runtime=await copyPayload(path.join(directory,'runtime'),true);
  await writeFile(path.join(directory,'credential.json'),JSON.stringify(credential),{mode:0o600});await chmod(path.join(directory,'credential.json'),0o600);
  const marker=path.join(directory,'protection-heartbeat.json');
  if(process.platform==='linux'){
    const unit='wolfguard-protection-'+uid+'.service',file=path.join('/etc/systemd/system',unit);
    await writeFile(file,'[Unit]\nDescription=WolfGuard protection du poste\nAfter=network-online.target\n[Service]\nType=simple\nExecStart='+systemd(runtime.node)+' '+systemd(runtime.worker)+' --protection-only\nEnvironment='+systemd('WOLFGUARD_AGENT_HOME='+directory)+' '+systemd('WOLFGUARD_PROTECTION_MARKER='+marker)+' "NODE_OPTIONS=" "NODE_PATH=" "PATH=/usr/sbin:/usr/bin:/sbin:/bin"\nRestart=on-failure\nRestartSec=10\nUMask=0077\n[Install]\nWantedBy=multi-user.target\n',{mode:0o644});
    await fixedProcess('/usr/bin/systemctl',['daemon-reload']);await fixedProcess('/usr/bin/systemctl',['enable','--now',unit]);
  }else{
    const label='fr.wavetools.wolfguard.protection.'+uid,plist='/Library/LaunchDaemons/'+label+'.plist';
    await writeFile(plist,'<?xml version="1.0"?><plist version="1.0"><dict><key>Label</key><string>'+label+'</string><key>ProgramArguments</key><array><string>'+xml(runtime.node)+'</string><string>'+xml(runtime.worker)+'</string><string>--protection-only</string></array><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>EnvironmentVariables</key><dict><key>WOLFGUARD_AGENT_HOME</key><string>'+xml(directory)+'</string><key>WOLFGUARD_PROTECTION_MARKER</key><string>'+xml(marker)+'</string><key>NODE_OPTIONS</key><string></string><key>NODE_PATH</key><string></string></dict></dict></plist>',{mode:0o644});
    await fixedProcess('/bin/launchctl',['bootout','system/'+label]).catch(()=>{});await fixedProcess('/bin/launchctl',['bootstrap','system',plist]);
  }
  console.log('Composant de protection installé. La prise en main reste dans la session utilisateur, sans privilèges root.');
}
async function main(){
  if(!['linux','darwin'].includes(process.platform))throw new Error('Utilise le lanceur Windows sur ce système.');
  const args=process.argv.slice(2);
  if(args[0]==='--install-protection'){await installProtection(args[1]||'',Number(args[2]));return;}
  if(process.getuid?.()===0)throw new Error('Installe d’abord l’agent dans la session utilisateur. Utilise --install-protection uniquement pour son composant système.');
  const directory=agentDirectory(),store=diskCredentialStore(directory);let credential=await store.load();
  if(!credential||args.includes('--pair')||args.includes('--pair-code')){
    let code=args.includes('--pair-code')?args[args.indexOf('--pair-code')+1]:null;if(!code){const prompt=createInterface({input:process.stdin,output:process.stdout});try{code=(await prompt.question('Code temporaire WolfGuard > Agents : ')).trim().toLowerCase();}finally{prompt.close();}}
    if(!/^[a-f0-9]{32}$/.test(code))throw new Error('Code temporaire invalide.');
    const client=new AgentClient();credential={api:client.origin,...await client.post('enroll',{code,name:hostname(),platform:process.platform})};await store.save(credential);
  }
  const runtime=await copyPayload(path.join(directory,'background-app'),false);await launchUser(directory,runtime);
  console.log('WolfGuard fonctionne en arrière-plan. La gestion se fait depuis le site.');
  console.log('Pour administrer les protections natives avec un composant système : sudo sh Start-Agent.sh --install-protection '+JSON.stringify(directory)+' '+process.getuid());
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
