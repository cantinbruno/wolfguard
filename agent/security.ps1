$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$data = @{}
function Observe($name, [scriptblock]$action) {
  try { $data[$name] = & $action } catch { $data[$name] = @{available=$false} }
}
function RegistryValue($path,$name) {
  if (-not (Test-Path -LiteralPath $path -ErrorAction Stop)) { return $null }
  return (Get-ItemProperty -LiteralPath $path -ErrorAction Stop).$name
}
Observe 'host' { $os=Get-CimInstance Win32_OperatingSystem; @{available=$true;hostname=[Environment]::MachineName;os=[string]$os.Caption;version=[string]$os.Version;build=[string]$os.BuildNumber} }
Observe 'hotfixes' { @{available=$true;items=@(Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 5 | ForEach-Object { @{id=[string]$_.HotFixID;date=[string]$_.InstalledOn} })} }
Observe 'firewall' { @{available=$true;profiles=@(Get-NetFirewallProfile -PolicyStore ActiveStore | ForEach-Object { @{name=[string]$_.Name;enabled=$(if([string]$_.Enabled -eq 'True'){$true}elseif([string]$_.Enabled -eq 'False'){$false}else{$null})} })} }
Observe 'defender' { $d=Get-MpComputerStatus; @{available=$true;mode=[string]$d.AMRunningMode;realtime=$d.RealTimeProtectionEnabled;signatureAge=$d.AntivirusSignatureAge} }
Observe 'smb' { $s=Get-SmbServerConfiguration; @{available=$true;enabled=$s.EnableSMB1Protocol} }
Observe 'rdp' { $p='HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server'; $enabled=RegistryValue $p 'fDenyTSConnections'; @{available=$true;enabled=$(if($null -eq $enabled){$null}else{$enabled -eq 0});nla=(RegistryValue ($p+'\WinStations\RDP-Tcp') 'UserAuthentication')} }
Observe 'uac' { @{available=$true;value=(RegistryValue 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' 'EnableLUA')} }
Observe 'installer' { @{available=$true;machine=(RegistryValue 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Installer' 'AlwaysInstallElevated');user=(RegistryValue 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\Installer' 'AlwaysInstallElevated')} }
Observe 'tls' { $p='HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\'; @{available=$true;tls10=(RegistryValue ($p+'TLS 1.0\Server') 'Enabled');tls11=(RegistryValue ($p+'TLS 1.1\Server') 'Enabled')} }
Observe 'updates' {
  $session=New-Object -ComObject Microsoft.Update.Session
  $searcher=$session.CreateUpdateSearcher()
  $searcher.Online=$false
  $found=$searcher.Search("IsInstalled=0 and IsHidden=0 and Type='Software'")
  $automatic=New-Object -ComObject Microsoft.Update.AutoUpdate
  $last=$automatic.Results.LastSearchSuccessDate
  $date=if($null -ne $last -and $last.Year -gt 2000){$last.ToUniversalTime().ToString('o')}else{''}
  $pending=@(for($i=0;$i -lt $found.Updates.Count;$i++) { $u=$found.Updates.Item($i);if($u.MsrcSeverity){@{title=[string]$u.Title;ids=@($u.KBArticleIDs);severity=[string]$u.MsrcSeverity}} })
  @{available=$true;lastSearch=$date;pending=$pending}
}
$data | ConvertTo-Json -Depth 8 -Compress
