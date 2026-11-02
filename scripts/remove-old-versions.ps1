# Run manually with -Apply to remove the old versions and generated test files.
[CmdletBinding()]
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$oldVersionsRoot = Join-Path ([IO.Path]::GetDirectoryName($projectRoot)) ((Split-Path -Leaf $projectRoot) + '-anciennes-versions')
$currentKey = Join-Path $env:LOCALAPPDATA 'WolfGuardWeb\private\site-access.json'
if ($env:WOLFGUARD_PRIVATE_DIR) { $currentKey = Join-Path $env:WOLFGUARD_PRIVATE_DIR 'site-access.json' }
if (-not (Test-Path -LiteralPath $currentKey -PathType Leaf)) { throw 'Configuration actuelle de WolfGuard absente. Aucun fichier supprime.' }
$keyHash = (Get-FileHash -LiteralPath $currentKey -Algorithm SHA256).Hash
$oldKey = Join-Path $oldVersionsRoot 'archives\site-access.json'
if ((Test-Path -LiteralPath $oldKey) -and (Get-FileHash -LiteralPath $oldKey -Algorithm SHA256).Hash -ne $keyHash) {
    throw 'Les configurations du lien prive ne correspondent pas. Aucun fichier supprime.'
}

$targets = @($oldVersionsRoot, (Join-Path $projectRoot '.local-archive'), (Join-Path $projectRoot '.cache'), (Join-Path $projectRoot 'tests\__pycache__'), (Join-Path $projectRoot 'server\.git'))
function Assert-Target([string]$Target) {
    $absolute = [IO.Path]::GetFullPath($Target)
    if ($absolute -ne $oldVersionsRoot -and -not $absolute.StartsWith($projectRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Cible hors du perimetre autorise.' }
    if ($absolute -eq $projectRoot -or $absolute -eq (Join-Path $projectRoot '.git')) { throw 'Le depot officiel doit etre conserve.' }
    $ancestor = $absolute
    while ($ancestor) {
        if (Test-Path -LiteralPath $ancestor) {
            if ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Lien de dossier refuse.' }
        }
        $ancestor = [IO.Path]::GetDirectoryName($ancestor)
    }
    if (Test-Path -LiteralPath $absolute) {
        foreach ($entry in Get-ChildItem -LiteralPath $absolute -Recurse -Force) {
            if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Lien interne refuse.' }
        }
    }
    return $absolute
}

$checkedTargets = @($targets | ForEach-Object { Assert-Target $_ } | Where-Object { Test-Path -LiteralPath $_ })
if ($checkedTargets | Where-Object { $currentKey.StartsWith($_ + '\', [StringComparison]::OrdinalIgnoreCase) }) { throw 'La configuration actuelle ne doit pas etre supprimee.' }
Write-Output 'Suppression definitive des anciennes versions, de leurs anciennes bases et des fichiers temporaires :'
$checkedTargets | ForEach-Object { Write-Output $_ }
Write-Output 'La version officielle, son depot Git et sa configuration actuelle sont conserves.'
if (-not $Apply) { Write-Output 'Aucun fichier supprime. Ajouter -Apply pour executer ce nettoyage.'; return }
foreach ($target in $checkedTargets) {
    $checked = Assert-Target $target
    Remove-Item -LiteralPath $checked -Recurse -Force
}
if ((Get-FileHash -LiteralPath $currentKey -Algorithm SHA256).Hash -ne $keyHash) { throw 'La configuration actuelle a change.' }
Write-Output 'Nettoyage termine : seule la version officielle reste dans le projet.'
