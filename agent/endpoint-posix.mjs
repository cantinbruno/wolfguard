import {readFile,stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const signalState=value=>value===true?'enabled':value===false?'disabled':'unknown';
async function command(run,file,args,signal){try{return {ok:true,output:await run(file,args,{signal,timeout:10000,maxBytes:200000})};}catch{return {ok:false,output:''};}}

export async function collectPosixEndpoint({platform=process.platform,run,read=readFile,metadata=stat,signal}={}){
  const result={collectedAt:Date.now(),platform,supported:true,provider:'Antivirus non confirmé',antivirus:'unknown',realtime:'unknown',firewall:'unknown',signatures:'unknown',canEnforce:false,events:[],warnings:[]};
  const executable=platform==='darwin'?'/usr/local/bin/mdatp':'/usr/bin/mdatp';
  const defender=await command(run,executable,['health','--output','json'],signal);
  if(defender.ok)try{
    const health=JSON.parse(defender.output);result.provider='Microsoft Defender for Endpoint';result.antivirus=signalState(health.healthy);result.realtime=signalState(health.real_time_protection_enabled);result.signatures=health.definitions_status==='up_to_date'?'enabled':health.definitions_status==='updating'?'unknown':'disabled';result.signatureVersion=String(health.definitions_version||'');
    if(health.licensed===false){result.antivirus='unknown';result.warnings.push('L’association de cet antivirus à son fournisseur n’est pas confirmée.');}
    const threats=await command(run,executable,['threat','list','--output','json'],signal);
    if(threats.ok){const value=JSON.parse(threats.output),rows=Array.isArray(value)?value:Array.isArray(value.threats)?value.threats:[];if(!Array.isArray(value)&&!Array.isArray(value.threats))result.warnings.push('Format de l’historique antivirus non reconnu : les événements ne sont pas confirmés.');
      for(const row of rows.slice(0,100)){
        const status=({quarantined:'quarantined',removed:'removed',cleaned:'cleaned',blocked:'blocked',active:'alert',detected:'alert',failed:'failed'})[row.status]||'alert';
        const time=Date.parse(row.detection_time||row.created_at||row.timestamp||'');if(!Number.isFinite(time)){if(!result.warnings.includes('Certains événements antivirus ne comportent pas de date exploitable.'))result.warnings.push('Certains événements antivirus ne comportent pas de date exploitable.');continue;}
        const id=String(row.id||row.threat_id||'')+':'+String(row.name||row.threat_name||'');
        result.events.push({id:createHash('sha256').update('mdatp:'+id).digest('hex'),occurredAt:time,provider:result.provider,title:String(row.name||row.threat_name||'Menace détectée'),resource:String(row.file_path||row.path||''),detail:'État communiqué par l’antivirus : '+String(row.status||'non confirmé'),status,severity:'high'});
      }
    }else result.warnings.push('Historique des menaces de cet antivirus inaccessible.');
  }catch{result.warnings.push('Télémétrie antivirus non exploitable.');}
  else if(platform==='darwin'){
    result.provider='Apple XProtect / Gatekeeper';
    const gatekeeper=await command(run,'/usr/sbin/spctl',['--status'],signal);
    result.realtime=/assessments enabled/i.test(gatekeeper.output)?'enabled':/assessments disabled/i.test(gatekeeper.output)?'disabled':'unknown';
    for(const bundle of ['/Library/Apple/System/Library/CoreServices/XProtect.bundle','/System/Library/CoreServices/XProtect.bundle'])try{const info=await metadata(bundle);if(info.isDirectory()){result.antivirus='enabled';break;}}catch{}
    result.warnings.push('Les protections Apple sont conservées. La fraîcheur des signatures et l’exhaustivité des blocages XProtect ne sont pas exposées par cette interface.');
    const log=await command(run,'/usr/bin/log',['show','--style','json','--last','5m','--predicate','process == "XProtectService" OR process == "XProtectRemediator"'],signal);
    if(log.ok)try{const rows=JSON.parse(log.output);for(const row of (Array.isArray(rows)?rows:[]).slice(-50)){
      const message=String(row.eventMessage||''),at=Date.parse(row.timestamp||'');if(!Number.isFinite(at)||!/detected|infected|quarantin|blocked|remediat.*fail/i.test(message)||/no (?:malware|threats?|infections?)|not (?:detected|infected)|nothing found|0 threats/i.test(message))continue;
      // A textual detection is an alert unless the native message explicitly
      // confirms prevention. Never infer quarantine from a process name.
      const blocked=/\bblocked\b|\bquarantined\b/i.test(message)&&!/not blocked|failed|unable|cannot/i.test(message);
      result.events.push({id:createHash('sha256').update('xprotect:'+row.timestamp+':'+message).digest('hex'),occurredAt:at,provider:result.provider,title:blocked?'Blocage confirmé par XProtect':'Événement de protection Apple',detail:message.slice(0,1800),resource:'',status:blocked?'blocked':'alert',severity:'high'});
    }}catch{result.warnings.push('Journal XProtect non exploitable.');}
    else result.warnings.push('Journal XProtect inaccessible.');
  }else{
    const clamd=await command(run,'/usr/bin/clamdscan',['--version'],signal);
    if(clamd.ok){
      result.provider='ClamAV';result.signatureVersion=clamd.output.trim().slice(0,80);
      const active=await command(run,'/usr/bin/systemctl',['is-active','clamav-daemon.service'],signal),onAccess=await command(run,'/usr/bin/systemctl',['is-active','clamav-clamonacc.service'],signal);
      result.antivirus=active.ok&&active.output.trim()==='active'?'enabled':'unknown';
      let config='';for(const file of ['/etc/clamav/clamd.conf','/etc/clamd.d/scan.conf'])try{config+=await read(file,'utf8');}catch{}
      const configured=/^\s*OnAccessPrevention\s+yes\s*$/mi.test(config)&&/^\s*OnAccessIncludePath\s+\S+/mi.test(config)&&/^\s*OnAccessExcludeU(?:name|ID)\s+\S+/mi.test(config);
      result.realtime=onAccess.ok&&onAccess.output.trim()==='active'&&configured?'enabled':'unknown';
      const version=clamd.output.trim().split('/'),date=Date.parse(version.at(-1));result.signatures=Number.isFinite(date)?Date.now()-date<3*86400000?'enabled':'disabled':'unknown';
      if(result.realtime==='enabled')result.warnings.push('La prévention ClamOnAcc couvre uniquement les chemins définis dans sa configuration.');
      if(result.realtime!=='enabled')result.warnings.push('ClamAV installé, prévention en accès temps réel non confirmée. Vérifie clamonacc et ses chemins protégés.');
      const logs=await command(run,'/usr/bin/journalctl',['-u','clamav-clamonacc.service','--since','5 minutes ago','-n','100','-o','json','--no-pager'],signal);
      if(logs.ok)for(const line of logs.output.split('\n'))try{const row=JSON.parse(line),message=String(row.MESSAGE||'');if(!/FOUND|virus detected|access denied/i.test(message))continue;const at=Math.floor(Number(row.__REALTIME_TIMESTAMP)/1000);if(!Number.isFinite(at))continue;result.events.push({id:createHash('sha256').update('clamonacc:'+row.__CURSOR+':'+message).digest('hex'),occurredAt:at,provider:'ClamAV',title:/access denied/i.test(message)?'Accès bloqué par ClamOnAcc':'Menace signalée par ClamAV',detail:message.slice(0,1800),resource:'',status:/access denied/i.test(message)?'blocked':'alert',severity:'high'});}catch{}
    }else result.warnings.push('Aucun antivirus compatible confirmé. Installe et configure ClamAV / ClamOnAcc ou un antivirus pris en charge.');
  }
  if(platform==='darwin'){
    const firewall=await command(run,'/usr/libexec/ApplicationFirewall/socketfilterfw',['--getglobalstate'],signal);result.firewall=/enabled|State\s*=\s*1/i.test(firewall.output)?'enabled':/disabled|State\s*=\s*0/i.test(firewall.output)?'disabled':'unknown';
  }else{
    const ufw=await command(run,'/usr/sbin/ufw',['status'],signal);
    if(/Status:\s*active/i.test(ufw.output))result.firewall='enabled';else if(/Status:\s*inactive/i.test(ufw.output))result.firewall='disabled';
    else{const firewalld=await command(run,'/usr/bin/firewall-cmd',['--state'],signal);if(firewalld.ok&&firewalld.output.trim()==='running')result.firewall='enabled';}
  }
  try{const info=await metadata(new URL('./endpoint-posix.mjs',import.meta.url));result.canEnforce=process.getuid?.()===0&&info.uid===0&&(info.mode&0o022)===0;}catch{}
  result.events=result.events.slice(0,100);return result;
}
export async function executePosixEndpoint(action,policy,{platform=process.platform,run,signal}={}){
  const own=await stat(new URL('./endpoint-posix.mjs',import.meta.url));
  if(process.getuid?.()!==0||own.uid!==0||(own.mode&0o022)!==0)return {ok:false,code:'ADMIN_REQUIRED',message:'Installe le composant de protection système avec des droits administrateur dans un dossier protégé.'};
  const binary=platform==='darwin'?'/usr/local/bin/mdatp':'/usr/bin/mdatp',status=await command(run,binary,['health','--output','json'],signal);
  try{
    if(action==='quick-scan'){
      if(!status.ok)return {ok:false,code:'UNSUPPORTED',message:'L’analyse rapide nécessite un antivirus compatible installé.'};
      await run(binary,['scan','quick'],{signal,timeout:180000,maxBytes:16000});return {ok:true,message:'Analyse rapide confirmée par l’antivirus.'};
    }
    if(policy.realtime){
      if(status.ok)await run(binary,['config','real-time-protection','--value','enabled'],{signal,timeout:15000,maxBytes:16000});
      else if(platform==='linux'){
        let config='';for(const file of ['/etc/clamav/clamd.conf','/etc/clamd.d/scan.conf'])try{config+=await readFile(file,'utf8');}catch{}
        if(!/^\s*OnAccessPrevention\s+yes\s*$/mi.test(config)||!/^\s*OnAccessIncludePath\s+\S+/mi.test(config)||!/^\s*OnAccessExcludeU(?:name|ID)\s+\S+/mi.test(config))return {ok:false,code:'CONFIGURATION_REQUIRED',message:'Configure ClamOnAcc avec ses chemins surveillés et exclusions de boucle avant son activation.'};
        await run('/usr/bin/systemctl',['start','clamav-daemon.service','clamav-clamonacc.service'],{signal,timeout:30000,maxBytes:16000});
      }else return {ok:false,code:'APPLE_MANAGED',message:'Gatekeeper et XProtect sont gérés par macOS. Aucun réglage système de sécurité n’a été réduit.'};
    }
    if(policy.firewall){
      if(platform==='darwin')await run('/usr/libexec/ApplicationFirewall/socketfilterfw',['--setglobalstate','on'],{signal,timeout:15000,maxBytes:16000});
      else{const ufw=await command(run,'/usr/sbin/ufw',['status'],signal);if(ufw.ok)await run('/usr/sbin/ufw',['--force','enable'],{signal,timeout:20000,maxBytes:16000});else await run('/usr/bin/systemctl',['start','firewalld.service'],{signal,timeout:20000,maxBytes:16000});}
    }
    return {ok:true,message:'Activation des protections demandée au système. Le prochain relevé confirmera leur état.'};
  }catch{return {ok:false,code:'ACTION_FAILED',message:'Le système n’a pas confirmé l’action de protection.'};}
}
