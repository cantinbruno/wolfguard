param([ValidateSet('protect','unprotect')][string]$Mode)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
[Console]::InputEncoding = New-Object Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$inputText = [Console]::In.ReadToEnd()
$entropy = [Text.Encoding]::UTF8.GetBytes('WolfGuard agent credential v1')
if ($Mode -eq 'protect') {
  $data = [Text.Encoding]::UTF8.GetBytes($inputText)
  $encrypted = [Security.Cryptography.ProtectedData]::Protect($data,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Write([Convert]::ToBase64String($encrypted))
} else {
  $data = [Convert]::FromBase64String($inputText)
  $decrypted = [Security.Cryptography.ProtectedData]::Unprotect($data,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Write([Text.Encoding]::UTF8.GetString($decrypted))
}
