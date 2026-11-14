param([ValidateSet('secure','extract')][string]$Operation,[Parameter(Mandatory=$true)][string]$Directory,[string]$Archive)
$ErrorActionPreference='Stop'
$directoryPath=[IO.Path]::GetFullPath($Directory)
if($directoryPath -eq [IO.Path]::GetPathRoot($directoryPath)){throw 'Unsafe antivirus directory'}
$ancestor=$directoryPath
while($ancestor -and $ancestor -ne [IO.Path]::GetPathRoot($ancestor)){
  if(Test-Path -LiteralPath $ancestor){if(((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Reparse point refused'}}
  $ancestor=[IO.Path]::GetDirectoryName($ancestor)
}
if(-not (Test-Path -LiteralPath $directoryPath)){[IO.Directory]::CreateDirectory($directoryPath)|Out-Null}
$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
$administrator=(New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$acl=New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true,$false)
$inherit=[Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
$propagation=[Security.AccessControl.PropagationFlags]::None
foreach($sid in @('S-1-5-18','S-1-5-32-544')){
  $principal=New-Object Security.Principal.SecurityIdentifier($sid)
  $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($principal,'FullControl',$inherit,$propagation,'Allow')))
}
if(-not $administrator){$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identity.User,'FullControl',$inherit,$propagation,'Allow')))}
else{$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identity.User,'ReadAndExecute',$inherit,$propagation,'Allow')))}
$acl.SetOwner($(if($administrator){New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')}else{$identity.User}))
Set-Acl -LiteralPath $directoryPath -AclObject $acl
if($Operation -eq 'secure'){exit}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($Archive))
try{
  if($zip.Entries.Count -gt 2000){throw 'Archive entry limit exceeded'}
  $total=0L;$prefix=$directoryPath.TrimEnd('\')+'\';$names=New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
  foreach($entry in $zip.Entries){
    $name=$entry.FullName.Replace('/','\')
    if($name -match '[\x00-\x1f:]' -or [IO.Path]::IsPathRooted($name) -or ($name.Split('\') -contains '..') -or (($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000){throw 'Unsafe archive entry'}
    $target=[IO.Path]::GetFullPath((Join-Path $directoryPath $name))
    if(-not $target.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase) -or -not $names.Add($target)){throw 'Unsafe or duplicate archive path'}
    $total+=$entry.Length;if($total -gt 2GB){throw 'Expanded archive limit exceeded'}
  }
  foreach($entry in $zip.Entries){
    $target=[IO.Path]::GetFullPath((Join-Path $directoryPath $entry.FullName.Replace('/','\')))
    if($entry.FullName.EndsWith('/')){[IO.Directory]::CreateDirectory($target)|Out-Null;continue}
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))|Out-Null
    if(Test-Path -LiteralPath $target){throw 'Antivirus extraction refuses overwrite'}
    $entryInputStream=$entry.Open();$output=[IO.File]::Open($target,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    try{$entryInputStream.CopyTo($output)}finally{$output.Dispose();$entryInputStream.Dispose()}
  }
}finally{$zip.Dispose()}
