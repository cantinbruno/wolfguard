'use strict';

// Shared by the authenticated Agents panel and the public invitation page.
globalThis.WolfGuardAgentInstaller=(()=>{
  const platforms=Object.freeze({win32:{name:'Windows',file:'WolfGuard-Agent-Windows.exe'},linux:{name:'Linux',file:'WolfGuard-Agent-Linux.zip'},darwin:{name:'macOS',file:'WolfGuard-Agent-macOS.zip'}});
  async function prepare(platform,code){
    if(!Object.hasOwn(platforms,platform)||!/^[a-f0-9]{32}$/.test(code))throw new Error('Lien d’installation invalide.');
    const item=platforms[platform];
    const response=await fetch(new URL('downloads/agent-integrity.json',location.href),{cache:'no-store',redirect:'error',credentials:'omit',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Fichiers d’installation indisponibles.');
    const integrity=await response.json(),hash=integrity[item.file];
    if(!/^[a-f0-9]{64}$/.test(hash))throw new Error('Empreinte de l’agent indisponible.');
    const url=new URL('downloads/'+item.file,location.href).href;
    if(platform==='win32'){
      const escaped=url.replaceAll("'","''");
      const powershell="$ErrorActionPreference='Stop';$stage=Join-Path $env:TEMP ('WolfGuard-install-'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $stage|Out-Null;try{$exe=Join-Path $stage 'WolfGuard-Agent.exe';Invoke-WebRequest -UseBasicParsing -Uri '"+escaped+"' -OutFile $exe;if((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant() -ne '"+hash+"'){throw 'Integrite de l agent invalide'};Start-Process -FilePath $exe -ArgumentList '--pair-code','"+code+"' -WindowStyle Hidden;Write-Host 'Agent installe. Le poste apparait dans WolfGuard.'}catch{Write-Host $_.Exception.Message;exit 1}";
      const bytes=new Uint8Array(powershell.length*2);
      for(let i=0;i<powershell.length;i++){bytes[i*2]=powershell.charCodeAt(i)&255;bytes[i*2+1]=powershell.charCodeAt(i)>>8;}
      let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
      return {name:'Installer-WolfGuard.cmd',text:'@echo off\r\npowershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -EncodedCommand '+btoa(binary)+'\r\n'};
    }
    const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
    return {name:'Installer-WolfGuard.sh',text:'#!/bin/sh\nset -eu\numask 077\nstage=$(mktemp -d)\ntrap \'rm -rf -- "$stage"\' EXIT HUP INT TERM\ncurl --fail --location --proto \'=https\' '+quote(url)+' -o "$stage/agent.zip"\nif command -v sha256sum >/dev/null 2>&1; then actual=$(sha256sum "$stage/agent.zip" | cut -d \' \' -f1); else actual=$(shasum -a 256 "$stage/agent.zip" | cut -d \' \' -f1); fi\n[ "$actual" = '+quote(hash)+' ] || exit 1\nunzip -q "$stage/agent.zip" -d "$stage/app"\nsh "$stage/app/Start-Agent.sh" --pair-code '+code+'\n'};
  }
  function download(installer){
    const url=URL.createObjectURL(new Blob([installer.text],{type:'application/octet-stream'})),link=document.createElement('a');
    link.href=url;link.download=installer.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return Object.freeze({platforms,prepare,download});
})();
