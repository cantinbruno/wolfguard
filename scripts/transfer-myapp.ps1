param([string]$SourceRoot, [string]$Output)
$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $SourceRoot) { $SourceRoot = [IO.Path]::GetDirectoryName($repository) }
if (-not $Output) { $Output = Join-Path ([Environment]::GetFolderPath('Desktop')) ('WolfGuard-transfert-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.wgweb') }
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:LOCALAPPDATA 'WolfGuardWeb/runtime/node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js 22.13 ou superieur est necessaire pour ce transfert local.' }
Write-Host 'Ferme l application Windows avant le transfert. Les bases seront lues sans modification.'
Write-Host 'Le code Windows puis le nouveau code web de 8 lettres seront demandes avec saisie masquee.'
& $nodePath (Join-Path $PSScriptRoot 'migrate-desktop.mjs') --source $SourceRoot --output $Output
if ($LASTEXITCODE -ne 0) { throw 'Le transfert a ete interrompu. Les bases Windows sont intactes.' }
Write-Host ('Sauvegarde chiffree : ' + $Output)
Write-Host 'Sur https://wolfguard.wavetools.fr/, choisis Ouvrir une sauvegarde puis ce fichier.'
