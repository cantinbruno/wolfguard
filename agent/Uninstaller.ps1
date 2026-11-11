param([switch]$Quiet)
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$taskName = 'WolfGuard-Endpoint-' + $identity.User.Value
$endpoint = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($endpoint -and -not $isAdmin) { throw 'Relance le désinstalleur en tant qu’administrateur pour retirer le composant de protection.' }
$targets = @(
  [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'WolfGuardAgent')),
  [IO.Path]::GetFullPath((Join-Path $env:ProgramData ('WolfGuardAgent\' + $identity.User.Value)))
)
# Validate every exact target before stopping or deleting anything. Never remove
# the shared ProgramData parent or another user's installation.
foreach ($target in $targets) {
  $expected = if ($target.StartsWith([IO.Path]::GetFullPath($env:LOCALAPPDATA) + '\', [StringComparison]::OrdinalIgnoreCase)) { Join-Path $env:LOCALAPPDATA 'WolfGuardAgent' } else { Join-Path $env:ProgramData ('WolfGuardAgent\' + $identity.User.Value) }
  if ($target -ne [IO.Path]::GetFullPath($expected)) { throw 'Chemin de désinstallation invalide.' }
  $ancestor = $target
  while ($ancestor) {
    if (Test-Path -LiteralPath $ancestor) {
      if (((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Désinstallation refusée sur un lien ou une jonction.' }
    }
    $ancestor = [IO.Path]::GetDirectoryName($ancestor)
  }
  if (Test-Path -LiteralPath $target) {
    foreach ($entry in Get-ChildItem -LiteralPath $target -Recurse -Force) {
      if (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Un dossier de l’agent contient un lien ou une jonction.' }
    }
  }
}
if ($endpoint) {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}
Get-CimInstance Win32_Process | Where-Object {
  $executable = $_.ExecutablePath
  $executable -and ($targets | Where-Object { $executable.StartsWith($_ + '\', [StringComparison]::OrdinalIgnoreCase) })
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
$legacy = Get-ScheduledTask -TaskName 'WolfGuard-Scan-Agent' -ErrorAction SilentlyContinue
if ($legacy -and $legacy.Principal.UserId -in @($identity.Name, $identity.User.Value)) {
  Stop-ScheduledTask -TaskName $legacy.TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $legacy.TaskName -Confirm:$false
}
Remove-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name WolfGuardAgent -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath 'HKCU:\Software\Classes\wolfguard-agent') { Remove-Item -LiteralPath 'HKCU:\Software\Classes\wolfguard-agent' -Recurse -Force }
foreach ($target in $targets) { if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force } }
Write-Host 'WolfGuard Agent désinstallé pour cet utilisateur. Révoque aussi le poste dans Agents.'
