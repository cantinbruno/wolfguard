param([switch]$Remove)
# Démarrage automatique par défaut : appliqué à l'installation si absent.
$ErrorActionPreference = 'Stop'
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$taskName = 'WolfGuard-Scan-Agent'
$legacy = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$endpointTask = Get-ScheduledTask -TaskName ('WolfGuard-Endpoint-'+$identity.User.Value) -ErrorAction SilentlyContinue
if ($endpointTask) {
  $admin = (New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $admin) { throw 'Le composant de protection est installé pour le système. Exécute cette commande comme administrateur.' }
  if ($Remove) { Disable-ScheduledTask -InputObject $endpointTask | Out-Null; Write-Host 'Démarrage automatique du composant de protection désactivé.' }
  else { Enable-ScheduledTask -InputObject $endpointTask | Out-Null; Write-Host 'Démarrage automatique du composant de protection activé.' }
  exit
}
if (-not $Remove) {
  $record = Join-Path $env:LOCALAPPDATA 'WolfGuardAgent/launcher.path'
  if (-not (Test-Path -LiteralPath $record)) { throw 'Lance une première fois l''agent téléchargé depuis le site.' }
  $launcher = (Get-Content -LiteralPath $record -Raw).Trim()
  if (-not (Test-Path -LiteralPath $launcher)) { throw 'Ouvre d abord WolfGuard-Agent.exe pour installer l''agent en arrière-plan.' }
}
if ($legacy -and $legacy.Principal.UserId -in @($identity.Name,$identity.User.Value)) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }
if ($Remove) {
  Remove-ItemProperty -LiteralPath $key -Name 'WolfGuardAgent' -ErrorAction SilentlyContinue
  Write-Host 'Demarrage automatique retire. L''agent en cours reste actif.'
  exit
}
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -LiteralPath $key -Name 'WolfGuardAgent' -Value ('"'+$launcher+'" --background')
Write-Host 'L''agent démarrera en arrière-plan avec la session Windows.'
