param([switch]$Remove)
$ErrorActionPreference = 'Stop'
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$taskName = 'WolfGuard-Scan-Agent'
$legacy = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $Remove) {
  $launcher = Join-Path $env:LOCALAPPDATA 'WolfGuardAgent/WolfGuard-Agent.exe'
  if (-not (Test-Path -LiteralPath $launcher)) { throw 'Ouvre d abord WolfGuard-Agent.exe pour installer la fenetre de l agent.' }
}
if ($legacy -and $legacy.Principal.UserId -in @($identity.Name,$identity.User.Value)) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }
if ($Remove) {
  Remove-ItemProperty -LiteralPath $key -Name 'WolfGuardAgent' -ErrorAction SilentlyContinue
  Write-Host 'Demarrage automatique retire. La fenetre actuelle reste ouverte.'
  exit
}
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -LiteralPath $key -Name 'WolfGuardAgent' -Value ('"'+$launcher+'"')
Write-Host 'La fenetre WolfGuard Agent s ouvrira avec ta session Windows.'
