// Generated from agent/uninstall-command.mjs and the published uninstallers.
const WolfGuardUninstallCommand = (() => {
const FILES=Object.freeze({win32:'WolfGuard-Uninstaller.ps1.txt',linux:'WolfGuard-Uninstaller.sh.txt',darwin:'WolfGuard-Uninstaller.sh.txt'});
const quote=value=>"'"+String(value).replaceAll("'","'\\''")+"'";
function uninstallCommand(platform,hashes,baseURL='https://wolfguard.wavetools.fr/'){
  if(!Object.hasOwn(FILES,platform))throw new Error('Système non pris en charge.');
  const file=FILES[platform],hash=hashes?.[file];
  if(!/^[a-f0-9]{64}$/.test(hash||''))throw new Error('Désinstalleur non vérifié.');
  const url=new URL('downloads/'+file,baseURL);url.searchParams.set('v',hash);
  if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Adresse de téléchargement non sécurisée.');
  if(platform==='win32')return String.raw`$ErrorActionPreference='Stop'
$stage=Join-Path ([IO.Path]::GetTempPath()) ('WolfGuard-uninstall-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage|Out-Null
$file=Join-Path $stage 'Uninstaller.ps1'
try{
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 40 -Uri '${url.href.replaceAll("'","''")}' -OutFile $file
  if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne '${hash}'){throw 'Empreinte du desinstalleur invalide'}
  & $file -CheckOnly
  $helper=@'
$ErrorActionPreference='Stop'
$stage=__STAGE__
$root=[IO.Path]::GetFullPath($stage);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
if(-not $root.StartsWith($temp+'\',[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($root) -notmatch '^WolfGuard-uninstall-[a-f0-9]{32}$'){throw 'Dossier temporaire invalide'}
if((Get-Item -LiteralPath $root -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Lien temporaire interdit'}
try{
  & (Join-Path $stage 'Uninstaller.ps1') -Quiet -DelaySeconds 5 *> (Join-Path $stage 'result.log')
  Remove-Item -LiteralPath $root -Recurse -Force
}catch{$_|Out-File -LiteralPath (Join-Path $stage 'result.log') -Append;exit 1}
'@
  $helper=$helper.Replace('__STAGE__',("'"+$stage.Replace("'","''")+"'"))
  $encoded=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($helper))
  Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',$encoded -WindowStyle Hidden
  Write-Output 'WOLFGUARD_UNINSTALL_READY'
}catch{
  # This exact GUID directory was created by this command, outside the agent.
  if((Get-Item -LiteralPath $stage -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw}
  Remove-Item -LiteralPath $stage -Recurse -Force
  throw
}`;
  const helper='#!/bin/sh\nset -eu\nstage=$1\ncase "$stage" in /*/WolfGuard-uninstall.*) ;; *) exit 1;; esac\n[ ! -L "$stage" ] || exit 1\nsh "$stage/Uninstaller.sh" --delay >"$stage/result.log" 2>&1\nrm -rf -- "$stage"\n';
  const env=' /usr/bin/env "WOLFGUARD_AGENT_HOME=${WOLFGUARD_AGENT_HOME:-}" "XDG_CONFIG_HOME=${XDG_CONFIG_HOME:-}" /bin/sh "$stage/helper.sh" "$stage"';
  return 'set -eu\numask 077\nstage=$(mktemp -d "${TMPDIR:-/tmp}/WolfGuard-uninstall.XXXXXXXX")\ntrap \'rm -rf -- "$stage"\' EXIT\ncurl --fail --location --proto \'=https\' --connect-timeout 10 --max-time 40 '+quote(url.href)+' -o "$stage/Uninstaller.sh"\nif command -v sha256sum >/dev/null 2>&1;then actual=$(sha256sum "$stage/Uninstaller.sh"|cut -d \' \' -f1);else actual=$(shasum -a 256 "$stage/Uninstaller.sh"|cut -d \' \' -f1);fi\n[ "$actual" = '+quote(hash)+' ] || { echo "Empreinte du desinstalleur invalide" >&2;exit 1; }\nsh "$stage/Uninstaller.sh" --check\nprintf %s '+quote(helper)+' > "$stage/helper.sh"\n'+(platform==='darwin'?'launchctl submit -l "fr.wavetools.wolfguard.uninstall.$$" --'+env:'if command -v systemd-run >/dev/null 2>&1 && systemd-run --user --collect --unit="wolfguard-uninstall-$$"'+env+';then :;elif systemctl --user is-active --quiet wolfguard-agent.service 2>/dev/null;then echo "Impossible de lancer la desinstallation hors du service" >&2;exit 1;else nohup'+env+' </dev/null >"$stage/launch.log" 2>&1 & fi')+'\ntrap - EXIT\nprintf "%s\\n" WOLFGUARD_UNINSTALL_READY\n';
}

const hashes={"WolfGuard-Uninstaller.ps1.txt":"b36e3c6dbf10e9af094d91ada2b81581e65d80c5962d83d45ae490e6adece02d","WolfGuard-Uninstaller.sh.txt":"cf73c65442aa12b8df08c973f1c926a9beba2678b60f2d85fcf5ad87914eb290"};
return Object.freeze({command:(platform,baseURL)=>uninstallCommand(platform,hashes,baseURL)});
})();
