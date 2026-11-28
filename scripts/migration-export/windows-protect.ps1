param([ValidateSet('protect', 'unprotect')][string]$Operation)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$inputBytes = [Convert]::FromBase64String([Console]::In.ReadToEnd())
$scope = [System.Security.Cryptography.DataProtectionScope]::CurrentUser
try {
  if ($Operation -eq 'protect') {
    $resultBytes = [System.Security.Cryptography.ProtectedData]::Protect($inputBytes, $null, $scope)
  } else {
    $resultBytes = [System.Security.Cryptography.ProtectedData]::Unprotect($inputBytes, $null, $scope)
  }
  [Console]::Out.Write([Convert]::ToBase64String($resultBytes))
} finally {
  [Array]::Clear($inputBytes, 0, $inputBytes.Length)
  if ($resultBytes) { [Array]::Clear($resultBytes, 0, $resultBytes.Length) }
}
