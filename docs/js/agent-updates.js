'use strict';

globalThis.WolfGuardAgentUpdates=(()=>{
  const states=new Map(),files={win32:'WolfGuard-Agent-Windows.exe',linux:'WolfGuard-Agent-Linux.zip',darwin:'WolfGuard-Agent-macOS.zip'};
  let published=null,loadedAt=0,loading=null;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const quote=value=>"'"+String(value).replaceAll("'","'\\''")+"'";
  async function release(force=false){
    if(!force&&published&&Date.now()-loadedAt<30000)return published;
    if(loading)return loading;
    loading=(async()=>{
      const response=await fetch('downloads/agent-release.json',{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error('Version de l’agent indisponible.');
      const value=await response.json();
      if(!/^[a-f0-9]{64}$/.test(value.version||'')||!Object.values(files).every(name=>/^[a-f0-9]{64}$/.test(value.files?.[name]||'')))throw new Error('Version de l’agent invalide.');
      published=value;loadedAt=Date.now();return value;
    })();
    try{return await loading;}finally{loading=null;}
  }
  function command(platform,version){
    if(!Object.hasOwn(files,platform)||!/^[a-f0-9]{64}$/.test(version?.version||''))throw new Error('Système ou version non pris en charge.');
    const file=files[platform],hash=version.files?.[file];if(!/^[a-f0-9]{64}$/.test(hash||''))throw new Error('Empreinte de mise à jour invalide.');
    const url=new URL('downloads/'+file,location.href);url.searchParams.set('v',hash);
    if(platform==='win32'){
      // The helper survives the current agent stopping, then installs into its
      // registered directory and removes its own verified temporary download.
      const cleanup=String.raw`function Clear-UpdateStage([string]$path){
  $root=[IO.Path]::GetFullPath($path);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  if(-not $root.StartsWith($temp+'\',[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($root) -notmatch '^WolfGuard-update-[a-f0-9]{32}$'){throw 'Dossier temporaire invalide'}
  if(Test-Path -LiteralPath $root){if((Get-Item -LiteralPath $root -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Lien temporaire interdit'};Remove-Item -LiteralPath $root -Recurse -Force}
}`;
      return String.raw`$ErrorActionPreference='Stop'
${cleanup}
$stage=Join-Path ([IO.Path]::GetTempPath()) ('WolfGuard-update-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage|Out-Null
try{
  $exe=Join-Path $stage 'WolfGuard-Agent.exe'
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 40 -Uri '${url.href.replaceAll("'","''")}' -OutFile $exe
  if((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant() -ne '${hash}'){throw 'Empreinte de mise a jour invalide'}
  $helper=@'
$ErrorActionPreference='Stop'
${cleanup}
Start-Sleep -Seconds 3
$stage=__STAGE__
try{$p=Start-Process -FilePath (Join-Path $stage 'WolfGuard-Agent.exe') -ArgumentList '--install-update' -WindowStyle Hidden -PassThru;if(-not $p.WaitForExit(90000) -or $p.ExitCode -ne 0){throw 'Installation non confirmee'}}finally{Clear-UpdateStage $stage}
'@
  $helper=$helper.Replace('__STAGE__',("'"+$stage.Replace("'","''")+"'"))
  $encoded=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($helper))
  Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',$encoded -WindowStyle Hidden
  Write-Output 'WOLFGUARD_UPDATE_READY'
}catch{Clear-UpdateStage $stage;throw}`;
    }
    const helper='#!/bin/sh\nset -eu\nstage=$1\ncase "$stage" in /*/WolfGuard-update.*) ;; *) exit 1;; esac\ntrap \'rm -rf -- "$stage"\' EXIT\nsleep 3\nsh "$stage/app/Start-Agent.sh" --update\n';
    return 'set -eu\numask 077\nstage=$(mktemp -d "${TMPDIR:-/tmp}/WolfGuard-update.XXXXXXXX")\ntrap \'rm -rf -- "$stage"\' EXIT\ncurl --fail --location --proto \'=https\' --connect-timeout 10 --max-time 40 '+quote(url.href)+' -o "$stage/agent.zip"\nif command -v sha256sum >/dev/null 2>&1;then actual=$(sha256sum "$stage/agent.zip"|cut -d \' \' -f1);else actual=$(shasum -a 256 "$stage/agent.zip"|cut -d \' \' -f1);fi\n[ "$actual" = '+quote(hash)+' ] || { echo "Empreinte de mise a jour invalide" >&2;exit 1; }\nunzip -q "$stage/agent.zip" -d "$stage/app"\nprintf %s '+quote(helper)+' > "$stage/update.sh"\n'+(platform==='darwin'?'launchctl submit -l "fr.wavetools.wolfguard.update.$$.${RANDOM:-0}" -- /bin/sh "$stage/update.sh" "$stage"':'if command -v systemd-run >/dev/null 2>&1 && systemd-run --user --collect --unit="wolfguard-update-$$" /bin/sh "$stage/update.sh" "$stage";then :;elif systemctl --user is-active --quiet wolfguard-agent.service 2>/dev/null;then echo "Impossible de preparer le redemarrage du service" >&2;exit 1;else nohup /bin/sh "$stage/update.sh" "$stage" </dev/null >"$stage/update.log" 2>&1 & fi')+'\ntrap - EXIT\nprintf "%s\\n" WOLFGUARD_UPDATE_READY\n';
  }
  async function start(agent,{onChange=()=>{}}={}){
    const cloud=WolfGuardCloud,old=states.get(agent.id);
    if(old?.running)return;
    const key=state.vaultKey,userId=cloud.currentUser()?.id;
    const sameSession=()=>!!key&&state.vaultKey===key&&cloud.hasSession()&&cloud.currentUser()?.id===userId;
    if(!sameSession())throw new Error('Connecte-toi pour mettre à jour ce poste.');
    if(!/^[a-f0-9]{32}$/.test(agent.id||''))throw new Error('Poste non associé.');
    if(!cloud.can('agents.write')||!cloud.can('remote.write'))throw new Error('Les droits Agents et Prise en main en écriture sont nécessaires.');
    if(!agent.online)throw new Error('Démarre l’agent pour le mettre à jour.');
    if(!agent.capabilities?.includes('remote-terminal-v1'))throw new Error('Installe une première fois l’agent récent sur ce poste.');
    const value={running:true,status:'preparing',message:'Préparation de la mise à jour…'};states.set(agent.id,value);
    const change=(status,message)=>{Object.assign(value,{status,message});onChange(value);};let session=null;
    const request=(path,body)=>{
      if(!sameSession())throw new Error('Session fermée. Vérifie la version du poste après reconnexion.');
      if(!cloud.can('agents.write')||!cloud.can('remote.write'))throw new Error('Les droits de mise à jour ne sont plus accordés.');
      return cloud.agentRequest(path,body);
    };
    try{
      const target=await release(true);value.version=target.version;
      if(agent.version===target.version){change('completed','Agent déjà à jour.');return;}
      const script=command(agent.platform,target);if(script.length>8000)throw new Error('Installateur distant trop volumineux.');
      change('preparing','Connexion au poste…');session=await request('remote/start',{agentId:agent.id,mode:'terminal'});
      let ready=false;
      for(let attempt=0;attempt<60;attempt++){
        const remote=await request('remote/session?id='+session.id);
        if(remote.status==='active'){ready=true;break;}
        if(!['requested','preparing'].includes(remote.status))throw new Error(remote.message||'Le poste n’a pas accepté la mise à jour.');
        await sleep(750);
      }
      if(!ready)throw new Error('Le poste ne répond pas.');
      await request('remote/terminal/command',{id:session.id,seq:1,command:script});change('downloading','Téléchargement et vérification de l’agent…');
      let launched=false;
      for(let attempt=0;attempt<80;attempt++){
        const remote=await request('remote/session?id='+session.id),result=remote.commands?.find(item=>item.seq===1);
        if(result&&['failed','cancelled'].includes(result.status))throw new Error(result.stderr?.trim().slice(0,400)||'La mise à jour a échoué sur le poste.');
        if(result?.status==='completed'){
          if(!result.stdout?.includes('WOLFGUARD_UPDATE_READY'))throw new Error('Le démarrage de l’installateur n’a pas été confirmé.');
          launched=true;break;
        }
        if(!['active','preparing'].includes(remote.status))throw new Error(remote.message||'Connexion de mise à jour interrompue.');
        await sleep(750);
      }
      if(!launched)throw new Error('Téléchargement non confirmé.');
      await request('remote/stop',{id:session.id});session=null;change('restarting','Redémarrage de l’agent et vérification de sa version…');
      for(let attempt=0;attempt<60;attempt++){
        await sleep(2000);const current=(await request('agents')).agents.find(item=>item.id===agent.id);
        if(current?.online&&current.version===target.version){change('completed','Agent mis à jour · '+target.version.slice(0,8));return;}
      }
      throw new Error('La nouvelle version n’a pas été confirmée. Vérifie que le poste est connecté avant de réessayer.');
    }catch(error){change('failed',error.message);}
    finally{value.running=false;if(session&&sameSession())await cloud.agentRequest('remote/stop',{id:session.id}).catch(()=>{});onChange(value);}
  }
  return Object.freeze({release,command,start,state:id=>states.get(id)||null});
})();
