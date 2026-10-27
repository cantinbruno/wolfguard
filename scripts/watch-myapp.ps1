$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$cache = Join-Path $repository '.cache'
New-Item -ItemType Directory -Path $cache -Force | Out-Null
$log = Join-Path $cache 'auto-publication.log'
function Signature {
  $files = @()
  foreach ($directory in @('app','browser','server','agent','scripts','tests')) {
    $files += Get-ChildItem -LiteralPath (Join-Path $repository $directory) -Recurse -File | Where-Object { $_.FullName -notmatch '[\\/](__pycache__|node_modules|\.cache|\.sites-runtime|\.wrangler|dist)[\\/]' }
  }
  foreach ($name in @('README.md','package.json','.gitignore')) { $files += Get-Item -LiteralPath (Join-Path $repository $name) -Force }
  return (@($files | Sort-Object FullName | ForEach-Object { $_.FullName + '|' + $_.Length + '|' + $_.LastWriteTimeUtc.Ticks }) -join "`n")
}
$last = ''
$retryAfter = [datetime]::MinValue
while ($true) {
  try {
    $current = Signature
    if ($current -ne $last -or [datetime]::UtcNow -gt $retryAfter) {
      Start-Sleep -Seconds 3
      if ((Signature) -ne $current) { continue }
      & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'sync-myapp.ps1') *>> $log
      if ($LASTEXITCODE -eq 0) { $last = $current; $retryAfter = [datetime]::UtcNow.AddMinutes(5) }
      else { $last = $current; $retryAfter = [datetime]::UtcNow.AddSeconds(30) }
      if ((Get-Item -LiteralPath $log).Length -gt 1MB) { Get-Content -LiteralPath $log -Tail 200 | Set-Content -LiteralPath (Join-Path $cache 'auto-publication.previous.log'); Clear-Content -LiteralPath $log }
    }
  } catch {
    Add-Content -LiteralPath $log -Value ([datetime]::UtcNow.ToString('o') + ' ' + $_.Exception.Message)
    $retryAfter = [datetime]::UtcNow.AddSeconds(30)
  }
  Start-Sleep -Seconds 5
}
