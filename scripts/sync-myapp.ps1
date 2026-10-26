param([string]$SourceRoot, [string]$Node)
$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $SourceRoot) { $SourceRoot = [IO.Path]::GetDirectoryName($repository) }
$sourceAssets = [IO.Path]::GetFullPath((Join-Path $SourceRoot 'general/assets'))
$targetAssets = [IO.Path]::GetFullPath((Join-Path $repository 'app'))
if ($targetAssets -ne (Join-Path $repository 'app') -or -not $targetAssets.StartsWith($repository + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Destination de synchronisation invalide.' }
if (-not (Test-Path -LiteralPath (Join-Path $sourceAssets 'index.html'))) { throw 'Sources myapp introuvables.' }
if ((Get-Item -LiteralPath $targetAssets).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'La destination ne peut pas etre un lien.' }
if (-not $Node) {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand) { $Node = $nodeCommand.Source }
  else {
    $Node = Join-Path $env:LOCALAPPDATA 'WolfGuardWeb/runtime/node.exe'
    if (-not (Test-Path -LiteralPath $Node)) { $Node = Join-Path $env:USERPROFILE '.codex/tmp/wolfguard-node/node-v22.23.4-win-x64/node.exe' }
  }
}
if (-not (Test-Path -LiteralPath $Node)) { throw 'Node.js 22 ou superieur est necessaire.' }
$mutex = New-Object Threading.Mutex($false, 'Local\WolfGuardWebAutoPublish')
if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); exit 0 }
try {
  Push-Location -LiteralPath $repository
  $env:GIT_TERMINAL_PROMPT = '0'
  $env:GCM_INTERACTIVE = 'never'
  $remote = & git remote get-url origin
  if ($LASTEXITCODE -ne 0 -or $remote -ne 'https://github.com/cantinbruno/wolfguard.git') { throw 'Depot distant inattendu.' }
  if ((& git branch --show-current) -ne 'main') { throw 'La publication automatique attend la branche main.' }
  $staged = & git diff --cached --name-only
  if ($staged) { throw 'Des modifications sont deja preparees dans Git. Termine-les avant la synchronisation.' }
  $pending = @(& git status --porcelain)
  if ($pending | Where-Object { $_ -notmatch '^.. (app/|docs/)' }) { throw 'Modifications hors des sources synchronisees : publication automatique suspendue pour les conserver.' }
  & git fetch origin main --quiet
  if ($LASTEXITCODE -ne 0) { throw 'GitHub indisponible. Nouvelle tentative au prochain passage.' }
  & git merge-base --is-ancestor origin/main HEAD
  if ($LASTEXITCODE -ne 0) {
    if ($pending.Count) { throw 'Le depot distant a avance. Reconciliation necessaire avant publication.' }
    & git merge --ff-only origin/main
    if ($LASTEXITCODE -ne 0) { throw 'Historique Git divergent. Aucun historique remplace.' }
  }
  $allowed = @('.html','.css','.js','.json','.svg','.txt','.md')
  $files = @(Get-ChildItem -LiteralPath $sourceAssets -File -Recurse)
  $links = @(Get-ChildItem -LiteralPath $sourceAssets -Recurse | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })
  if ($links.Count) { throw 'Les liens sont interdits dans les sources publiees.' }
  $relativeFiles = @{}
  foreach ($file in $files) {
    if ($file.Extension.ToLowerInvariant() -notin $allowed) { throw ('Format interdit dans les sources du site : ' + $file.Name) }
    $relative = $file.FullName.Substring($sourceAssets.Length + 1)
    $relativeFiles[$relative] = $true
    $destination = [IO.Path]::GetFullPath((Join-Path $targetAssets $relative))
    if (-not $destination.StartsWith($targetAssets + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Chemin de destination refuse.' }
    if ((Test-Path -LiteralPath $destination) -and (Get-FileHash -LiteralPath $file.FullName).Hash -eq (Get-FileHash -LiteralPath $destination).Hash) { continue }
    New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($destination)) -Force | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
  }
  foreach ($file in @(Get-ChildItem -LiteralPath $targetAssets -File -Recurse)) {
    $resolvedFile = [IO.Path]::GetFullPath($file.FullName)
    if (-not $resolvedFile.StartsWith($targetAssets + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Chemin de nettoyage refuse.' }
    if (-not $relativeFiles.ContainsKey($file.FullName.Substring($targetAssets.Length + 1))) { Remove-Item -LiteralPath $resolvedFile }
  }
  $changed = & git status --porcelain -- app docs
  if ($changed) {
    & $Node scripts/build-web.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Preparation du site echouee.' }
    & python tests/original_app_test.py
    if ($LASTEXITCODE -ne 0) { throw 'Verification navigateur echouee. Aucune publication.' }
    & $Node --test tests/migration.test.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Verification du chiffrement echouee. Aucune publication.' }
    & git add -- app docs
    if ($LASTEXITCODE -ne 0) { throw 'Preparation Git echouee.' }
    & git commit -m 'Synchronize WolfGuard web with myapp sources'
    if ($LASTEXITCODE -ne 0) { throw 'Commit echoue.' }
  }
  $ahead = & git rev-list --count origin/main..HEAD
  if ([int]$ahead -gt 0) {
    & git -c credential.interactive=never push origin main
    if ($LASTEXITCODE -ne 0) { throw 'Push echoue. Le commit local est conserve pour une nouvelle tentative.' }
  }
  Write-Output ('WolfGuard synchronise : ' + (& git rev-parse --short HEAD))
} finally {
  Pop-Location
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
