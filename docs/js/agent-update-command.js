// Generated from agent/update-command.mjs.
const WolfGuardUpdateCommand = (() => {
// Shared by the installed agent and the browser bootstrap for older agents.
const UPDATE_ORIGIN='https://wolfguard.wavetools.fr/';
const UPDATE_FILES=Object.freeze({win32:'WolfGuard-Agent-Windows.exe',linux:'WolfGuard-Agent-Linux.zip',darwin:'WolfGuard-Agent-macOS.zip'});
const quote=value=>"'"+String(value).replaceAll("'","'\\''")+"'";
function validateRelease(value){
  if(!/^[a-f0-9]{64}$/.test(value?.version||'')||!Object.values(UPDATE_FILES).every(name=>/^[a-f0-9]{64}$/.test(value.files?.[name]||'')))throw new Error('Version de l’agent invalide.');
  return value;
}
function updateCommand(platform,version,baseURL=UPDATE_ORIGIN){
    if(!Object.hasOwn(UPDATE_FILES,platform)||!/^[a-f0-9]{64}$/.test(version?.version||''))throw new Error('Système ou version non pris en charge.');
    const file=UPDATE_FILES[platform],hash=version.files?.[file];if(!/^[a-f0-9]{64}$/.test(hash||''))throw new Error('Empreinte de mise à jour invalide.');
    const url=new URL('downloads/'+file,baseURL);url.searchParams.set('v',hash);
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

return Object.freeze({UPDATE_ORIGIN,UPDATE_FILES,validateRelease,updateCommand});
})();
