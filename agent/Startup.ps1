param([switch]$Remove)
$ErrorActionPreference = 'Stop'
$taskName = 'WolfGuard-Scan-Agent'
if ($Remove) {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host 'Demarrage automatique retire. Tu peux revoquer cet agent depuis WolfGuard.'
  exit
}
$launcher = Join-Path ([IO.Path]::GetFullPath($PSScriptRoot)) 'Start-Agent.ps1'
if (-not (Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA 'WolfGuardAgent/credential.dpapi'))) { throw 'Associe d abord cet agent au site avec Demarrer-agent.cmd.' }
$account = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$launcher+'"')
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $account
$principal = New-ScheduledTaskPrincipal -UserId $account -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host 'Demarrage automatique active pour ta session Windows, sans droits administrateur.'
