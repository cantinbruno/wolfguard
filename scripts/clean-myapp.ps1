# Without -Apply, this script only displays the cleanup plan.
[CmdletBinding()]
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$projectPrefix = $projectRoot + '\'

function Get-CheckedPath([string]$Path) {
    $absolute = [IO.Path]::GetFullPath($Path)
    if (-not $absolute.StartsWith($projectPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Cleanup target must stay inside the project.'
    }
    $ancestor = $absolute
    while ($ancestor.Length -gt $projectRoot.Length) {
        if (Test-Path -LiteralPath $ancestor) {
            $entry = Get-Item -LiteralPath $ancestor -Force
            if (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw 'Cleanup refuses symbolic links and directory junctions.'
            }
        }
        $ancestor = [IO.Path]::GetDirectoryName($ancestor)
    }
    return $absolute
}

function Assert-NoLinks([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return }
    foreach ($entry in Get-ChildItem -LiteralPath $Path -Recurse -Force) {
        if (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw 'A cleanup directory contains a symbolic link or junction. No files were removed.'
        }
    }
}

$archiveRoot = Get-CheckedPath (Join-Path $projectRoot '.local-archive')
$maintenanceRoot = Get-CheckedPath (Join-Path $archiveRoot 'windows-original/general/maintenance')
$backupRoot = Get-CheckedPath (Join-Path $maintenanceRoot 'backups')
$candidates = @(
    (Join-Path $projectRoot '.cache'),
    (Join-Path $projectRoot 'tests/__pycache__'),
    (Join-Path $archiveRoot 'windows-original/general/.venv'),
    (Join-Path $archiveRoot 'previous-web/.cache')
)
if (Test-Path -LiteralPath $maintenanceRoot) {
    Assert-NoLinks $maintenanceRoot
    $candidates += @(Get-ChildItem -LiteralPath $maintenanceRoot -Directory -Filter '__pycache__' -Recurse -Force | Select-Object -ExpandProperty FullName)
}
$directories = @($candidates | ForEach-Object { Get-CheckedPath $_ } | Sort-Object -Unique | Where-Object { Test-Path -LiteralPath $_ })
foreach ($directory in $directories) { Assert-NoLinks $directory }

$files = @()
if (Test-Path -LiteralPath $backupRoot) {
    # Only obsolete WolfGuard executables, never databases, module archives or sources.
    $files += @(Get-ChildItem -LiteralPath $backupRoot -File -Filter 'WolfGuard*.exe' -Recurse -Force)
}
foreach ($name in @('docs', 'previews')) {
    $previewPath = Get-CheckedPath (Join-Path $maintenanceRoot $name)
    if (Test-Path -LiteralPath $previewPath) {
        $files += @(Get-ChildItem -LiteralPath $previewPath -File -Filter '*.png' -Recurse -Force)
    }
}
if (Test-Path -LiteralPath $maintenanceRoot) {
    $files += @(Get-ChildItem -LiteralPath $maintenanceRoot -File -Filter '*.pyc' -Recurse -Force)
}
$files = @($files | Sort-Object FullName -Unique | Where-Object {
    $candidate = $_.FullName
    $insideSelectedDirectory = $false
    foreach ($directory in $directories) {
        if ($candidate.StartsWith($directory + '\', [StringComparison]::OrdinalIgnoreCase)) { $insideSelectedDirectory = $true; break }
    }
    -not $insideSelectedDirectory
})
foreach ($file in $files) { $null = Get-CheckedPath $file.FullName }

function Test-PlannedFile([string]$Path) {
    foreach ($directory in $directories) {
        if ($Path.StartsWith($directory + '\', [StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
    return $fileSet.Contains($Path)
}
$fileSet = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($file in $files) { $null = $fileSet.Add($file.FullName) }

function Get-ProtectedFiles {
    $protected = @{}
    if (Test-Path -LiteralPath $archiveRoot) {
        foreach ($file in Get-ChildItem -LiteralPath $archiveRoot -File -Recurse -Force) {
            if (-not (Test-PlannedFile $file.FullName)) {
                $protected[$file.FullName] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
            }
        }
    }
    return $protected
}

$plannedBytes = [long]0
$plannedCount = 0
foreach ($directory in $directories) {
    $stats = Get-ChildItem -LiteralPath $directory -File -Recurse -Force | Measure-Object -Property Length -Sum
    $plannedBytes += [long]$stats.Sum
    $plannedCount += [int]$stats.Count
}
foreach ($file in $files) { $plannedBytes += $file.Length; $plannedCount++ }
Write-Output ('Fichiers temporaires et anciennes compilations : {0:N0}' -f $plannedCount)
Write-Output ('Espace recuperable : {0:N2} Go' -f ($plannedBytes / 1000000000))
Write-Output 'Les bases, leurs sauvegardes, les cles privees, les sources et le WolfGuard.exe actuel sont conserves.'
if (-not $Apply) {
    Write-Output 'Aucun fichier supprime. Ajouter -Apply pour executer ce plan.'
    return
}

$before = Get-ProtectedFiles
foreach ($file in $files) { Remove-Item -LiteralPath $file.FullName -Force }
foreach ($directory in $directories) {
    # Recheck the absolute destination immediately before every recursive removal.
    $checked = Get-CheckedPath $directory
    Remove-Item -LiteralPath $checked -Recurse -Force
}
if (Test-Path -LiteralPath $backupRoot) {
    Get-ChildItem -LiteralPath $backupRoot -Directory -Recurse -Force | Sort-Object { $_.FullName.Length } -Descending | ForEach-Object {
        if (@(Get-ChildItem -LiteralPath $_.FullName -Force).Count -eq 0) {
            $checked = Get-CheckedPath $_.FullName
            Remove-Item -LiteralPath $checked -Force
        }
    }
}
$after = Get-ProtectedFiles
if ($before.Count -ne $after.Count) { throw 'Protected archive inventory changed unexpectedly.' }
foreach ($path in $before.Keys) {
    if ($after[$path] -ne $before[$path]) { throw 'A protected archive changed unexpectedly.' }
}
Write-Output ('Nettoyage termine : {0:N2} Go liberes.' -f ($plannedBytes / 1000000000))
Write-Output ('Verification SHA-256 reussie pour {0} fichiers conserves.' -f $after.Count)
