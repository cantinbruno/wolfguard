param([string]$Node)
$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $Node) {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand) { $Node = $nodeCommand.Source }
  else { $Node = Join-Path $env:LOCALAPPDATA 'WolfGuardWeb/runtime/node.exe' }
}
if (-not (Test-Path -LiteralPath $Node)) { throw 'Node.js 22 ou superieur est necessaire.' }
$mutex = New-Object Threading.Mutex($false, 'Local\WolfGuardWebAutoPublish')
$acquired = $false
try { $acquired = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $acquired = $true }
if (-not $acquired) { $mutex.Dispose(); exit 0 }
try {
  Push-Location -LiteralPath $repository
  $env:GIT_TERMINAL_PROMPT = '0'
  $env:GCM_INTERACTIVE = 'never'
  $remote = & git remote get-url origin
  if ($LASTEXITCODE -ne 0 -or $remote -ne 'https://github.com/cantinbruno/wolfguard.git') { throw 'Depot distant inattendu.' }
  if ((& git rev-parse --show-toplevel).Replace('/', '\') -ne $repository) { throw 'Le dossier doit etre la racine du depot.' }
  if ((& git branch --show-current) -ne 'main') { throw 'La publication automatique attend la branche main.' }
  if (& git diff --cached --name-only) { throw 'Des modifications sont deja preparees dans Git. Termine-les avant la synchronisation.' }
  $pending = @(& git status --porcelain)
  if ($pending | Where-Object { $_ -notmatch '^.. (app/|browser/|server/|agent/|docs/|scripts/|tests/|README\.md$|package\.json$|\.gitignore$)' }) { throw 'Fichiers hors des sources du site : publication automatique suspendue pour les conserver.' }
  & git fetch origin main --quiet
  if ($LASTEXITCODE -ne 0) { throw 'GitHub indisponible. Nouvelle tentative au prochain passage.' }
  & git merge-base --is-ancestor origin/main HEAD
  if ($LASTEXITCODE -ne 0) {
    if ($pending.Count) { throw 'Le depot distant a avance. Reconciliation necessaire avant publication.' }
    & git merge --ff-only origin/main
    if ($LASTEXITCODE -ne 0) { throw 'Historique Git divergent. Aucun historique remplace.' }
  }
  $changed = & git status --porcelain -- app browser server agent docs scripts tests README.md package.json .gitignore
  if ($changed) {
    & $Node scripts/build-web.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Preparation du site echouee.' }
    & $Node scripts/check-publication.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Controle des fichiers publiables echoue. Aucun push.' }
    & python tests/original_app_test.py
    if ($LASTEXITCODE -ne 0) { throw 'Verification navigateur echouee. Aucune publication.' }
    & python tests/keyboard_test.py
    if ($LASTEXITCODE -ne 0) { throw 'Verification du clavier echouee. Aucune publication.' }
    & python tests/animations_test.py
    if ($LASTEXITCODE -ne 0) { throw 'Verification des animations echouee. Aucune publication.' }
    & python tests/editor_layout_test.py
    if ($LASTEXITCODE -ne 0) { throw 'Verification de l editeur et de la barre fixe echouee. Aucune publication.' }
    & python tests/scan_workspace_test.py
    if ($LASTEXITCODE -ne 0) { throw 'Verification des espaces scan echouee. Aucune publication.' }
    & python tests/timeout_test.py
    if ($LASTEXITCODE -ne 0) { throw 'Verification des delais de securite echouee. Aucune publication.' }
    & python tests/security_test.py
    if ($LASTEXITCODE -ne 0) { throw 'Verification des protections de securite echouee. Aucune publication.' }
    & python tests/shared_workspace_test.py
    if ($LASTEXITCODE -ne 0) { throw 'Verification du partage entre appareils echouee. Aucune publication.' }
    & python tests/agent_workspace_test.py
    if ($LASTEXITCODE -ne 0) { throw 'Verification agent vers web echouee. Aucune publication.' }
    & $Node --test tests/migration.test.mjs tests/security.test.mjs tests/publication.test.mjs tests/server.test.mjs tests/organization.test.mjs tests/mail_cleanup.test.mjs tests/form_cleanup.test.mjs tests/agent.test.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Verification du chiffrement echouee. Aucune publication.' }
    & git add -- app browser server agent docs scripts tests README.md package.json .gitignore
    if ($LASTEXITCODE -ne 0) { throw 'Preparation Git echouee.' }
    & git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
      & git commit -m 'Update WolfGuard from the myapp workspace'
      if ($LASTEXITCODE -ne 0) { throw 'Commit echoue.' }
    }
  } else {
    & $Node scripts/check-publication.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Controle des fichiers publiables echoue. Aucun push.' }
  }
  $ahead = & git rev-list --count origin/main..HEAD
  if ([int]$ahead -gt 0) {
    & git -c credential.interactive=never push origin main
    if ($LASTEXITCODE -ne 0) { throw 'Push echoue. Le commit local est conserve pour une nouvelle tentative.' }
  }
  Write-Output ('myapp et GitHub synchronises : ' + (& git rev-parse --short HEAD))
} finally {
  Pop-Location
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
