param([switch]$Pair, [switch]$Headless)
$ErrorActionPreference = 'Stop'
$agentRoot = [IO.Path]::GetFullPath($PSScriptRoot)
if (-not $Headless) {
  $window = Join-Path $agentRoot 'WolfGuard-Agent.exe'
  if (-not (Test-Path -LiteralPath $window)) { $window = Join-Path $env:LOCALAPPDATA 'WolfGuardAgent/WolfGuard-Agent.exe' }
  if (-not (Test-Path -LiteralPath $window)) { throw 'Telecharge WolfGuard-Agent-Windows.exe depuis le site pour ouvrir la fenetre de l agent.' }
  if ($Pair) { Start-Process -FilePath $window -ArgumentList '--pair' -WindowStyle Normal }
  else { Start-Process -FilePath $window -WindowStyle Normal }
  exit
}
$runtimeDirectory = Join-Path $env:LOCALAPPDATA 'WolfGuardAgent/runtime'
$nodePath = Join-Path $runtimeDirectory 'node-v22.23.4-win-x64/node.exe'
if (-not (Test-Path -LiteralPath $nodePath)) {
  Write-Host 'Preparation du moteur de l agent depuis nodejs.org...'
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
  $archivePath = Join-Path $runtimeDirectory 'node-v22.23.4-win-x64.zip'
  Invoke-WebRequest -UseBasicParsing -Uri 'https://nodejs.org/dist/v22.23.4/node-v22.23.4-win-x64.zip' -OutFile $archivePath
  if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20') { throw 'Le moteur telecharge ne correspond pas a son empreinte attendue.' }
  Expand-Archive -LiteralPath $archivePath -DestinationPath $runtimeDirectory -Force
}
if ($Pair) { & $nodePath (Join-Path $agentRoot 'agent/agent.mjs') --pair }
else { & $nodePath (Join-Path $agentRoot 'agent/agent.mjs') }
exit $LASTEXITCODE
