param([Parameter(Mandatory=$true)][string]$Executable)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

function Find-Prompt($Process, [string]$Title = 'WolfGuard · Autoriser la prise en main') {
  $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $Process.Id)
  $deadline = [DateTime]::UtcNow.AddSeconds(10)
  do {
    if ($Process.HasExited) { throw "Permission helper exited before displaying consent: $($Process.ExitCode)" }
    $window = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst([System.Windows.Automation.TreeScope]::Children, $condition)
    if ($window -and $window.Current.Name -eq $Title) { return $window }
    Start-Sleep -Milliseconds 50
  } while ([DateTime]::UtcNow -lt $deadline)
  throw 'Consent window was not displayed'
}

function Click-Button($Window, [string]$Name) {
  $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $Name)
  $button = $Window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
  if (-not $button) { throw "Missing consent button: $Name" }
  $button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
}

function Read-Status($Pending, [string]$Expected) {
  if (-not $Pending.Wait(5000)) { throw "Missing permission event: $Expected" }
  $event = $Pending.Result | ConvertFrom-Json
  if ($event.status -ne $Expected) { throw "Expected $Expected, received $($event.status)" }
}

# Only launch the consent helper. No desktop adapter, capture or input is started.
foreach ($action in @('refuse', 'accept-stop', 'close', 'disconnect', 'sharing-stop', 'sharing-disconnect')) {
  Write-Output "Checking consent action: $action"
  $info = New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName = $Executable
  $immediate = $action.StartsWith('sharing-')
  $info.Arguments = if ($immediate) { '--remote-sharing' } else { '--remote-permission' }
  $info.UseShellExecute = $false
  $info.CreateNoWindow = $true
  $info.RedirectStandardInput = $true
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $info
  try {
    [void]$process.Start()
    $pending = $process.StandardOutput.ReadLineAsync()
    if ($immediate) {
      Read-Status $pending 'ready'
      $window = Find-Prompt $process 'WolfGuard · Bureau partagé'
      $pending = $process.StandardOutput.ReadLineAsync()
    } else { $window = Find-Prompt $process }
    if ($window.Current.IsOffscreen) { throw 'Consent window is not visible' }
    if ($pending.Wait(200)) { throw 'Helper emitted a decision before user consent' }
    if ($immediate) {
      $allowCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, 'Autoriser cette session')
      if ($window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $allowCondition)) { throw 'Unattended sharing still asks for consent' }
      if ($action -eq 'sharing-stop') { Click-Button $window 'Arrêter le partage' }
      else { $process.StandardInput.Close() }
      Read-Status $pending 'closed'
    } elseif ($action -eq 'accept-stop') {
      Click-Button $window 'Autoriser cette session'
      Read-Status $pending 'accepted'
      $pending = $process.StandardOutput.ReadLineAsync()
      Click-Button $window 'Arrêter le partage'
      Read-Status $pending 'closed'
    } else {
      if ($action -eq 'refuse') { Click-Button $window 'Refuser' }
      elseif ($action -eq 'close') { $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).Close() }
      else { $process.StandardInput.Close() }
      Read-Status $pending 'denied'
    }
    if (-not $process.WaitForExit(5000)) { throw 'Permission helper did not stop' }
    if ($process.ExitCode -ne 0) { throw "Permission helper failed: $($process.ExitCode)" }
    if ($process.StandardOutput.ReadToEnd().Trim()) { throw 'Unexpected permission events' }
    if ($process.StandardError.ReadToEnd().Trim()) { throw 'Unexpected permission error' }
  } finally {
    if (-not $process.HasExited) { $process.Kill(); $process.WaitForExit() }
    $process.Dispose()
  }
}
Write-Output 'PASS: Windows helper; legacy consent, direct sharing without confirmation, visible Stop button and parent disconnect'
