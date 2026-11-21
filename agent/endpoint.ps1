param([ValidateSet('collect','enable-protection','quick-scan')][string]$Operation='collect')
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
$admin=(New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if($Operation -ne 'collect'){
  try{
    if($Operation -eq 'quick-scan'){throw 'USE_WOLFGUARD_ENGINE'}
    if(-not $admin){throw 'ADMIN_REQUIRED'}
    $inputText=[Console]::In.ReadToEnd();if($inputText.Length -gt 2048){throw 'INVALID_POLICY'}
    $policy=$inputText|ConvertFrom-Json
    if($policy.mode -ne 'protect'){throw 'INVALID_POLICY'}
    if($policy.firewall -eq $true){Get-NetFirewallProfile|Where-Object{-not $_.Enabled}|ForEach-Object{Set-NetFirewallProfile -Name $_.Name -Enabled True}}
    @{ok=$true;message='Politique WolfGuard reçue ; pare-feu vérifié. Le moteur WolfGuard applique sa surveillance indépendamment.'}|ConvertTo-Json -Compress
  }catch{@{ok=$false;code=if($_.Exception.Message -eq 'ADMIN_REQUIRED'){'ADMIN_REQUIRED'}else{'PROTECTION_ACTION_FAILED'};message='Le maintien du pare-feu nécessite les privilèges administrateur. La surveillance WolfGuard conserve sa propre politique.'}|ConvertTo-Json -Compress}
  exit
}
$report=@{supported=$true;provider='WolfGuard Antivirus / ClamAV';antivirus='unknown';realtime='unknown';firewall='unknown';signatures='unknown';signatureVersion='';canEnforce=$admin;events=@();warnings=@();inventory=@{};systemMonitor=@{scope='system';processes=0;services=0;connections=0;startupEntries=0;eventLogs=@();limitations=@()}}
try{
  $os=Get-CimInstance Win32_OperatingSystem
  $computer=Get-CimInstance Win32_ComputerSystem
  $cpu=Get-CimInstance Win32_Processor|Select-Object -First 1
  $network=@(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue|Where-Object{$_.IPAddress -notlike '127.*'}|Select-Object -First 20 -ExpandProperty IPAddress)
  $report.inventory=@{hostname=[Environment]::MachineName;username=[string]$computer.UserName;agentUser=$identity.Name;domain=[string]$computer.Domain;domainJoined=[bool]$computer.PartOfDomain;os=[string]$os.Caption;osVersion=[string]$os.Version;architecture=[string]$os.OSArchitecture;manufacturer=[string]$computer.Manufacturer;model=[string]$computer.Model;cpu=[string]$cpu.Name;logicalProcessors=[int]$computer.NumberOfLogicalProcessors;memoryBytes=[long]$computer.TotalPhysicalMemory;bootTime=$os.LastBootUpTime.ToUniversalTime().ToString('o');addresses=$network;drives=@(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3'|ForEach-Object{@{name=[string]$_.DeviceID;size=[long]$_.Size;free=[long]$_.FreeSpace}})}
}catch{$report.warnings+='Inventaire système partiellement indisponible.'}
try{$profiles=@(Get-NetFirewallProfile);if($profiles.Count){$report.firewall=if(@($profiles|Where-Object{-not $_.Enabled}).Count){'disabled'}else{'enabled'}}}catch{$report.warnings+='État du pare-feu indisponible.'}
# System observations are independent of the antivirus file traversal. No
# command line or user document content is uploaded with these observations.
try{
  $processes=@(Get-CimInstance Win32_Process);$report.systemMonitor.processes=$processes.Count
  $byId=@{};foreach($process in $processes){$byId[[int]$process.ProcessId]=$process}
  foreach($process in $processes){
    $parent=$byId[[int]$process.ParentProcessId]
    $shell=$process.Name -match '^(powershell|pwsh|cmd|wscript|cscript|mshta)\.exe$'
    $office=$parent -and $parent.Name -match '^(winword|excel|powerpnt|outlook)\.exe$'
    $encoded=$process.Name -match '^(powershell|pwsh)\.exe$' -and $process.CommandLine -match '(?i)\s-(enc|encodedcommand)\s'
    if($shell -and ($office -or $encoded) -and $process.ParentProcessId -ne $byId[$PID].ParentProcessId){
      # Exclude our own fixed inventory shell; its command uses -File, never -EncodedCommand.
      $when=if($process.CreationDate){$process.CreationDate.ToUniversalTime().ToString('o')}else{(Get-Date).ToUniversalTime().ToString('o')}
      $report.events+=@{id='wolfguard-process:'+([string]$process.ProcessId)+':'+$when;occurredAt=$when;provider='WolfGuard · surveillance système';title=if($office){'Interpréteur lancé par une application Office'}else{'Commande PowerShell encodée à vérifier'};resource=[string]$process.ExecutablePath;detail='Observation comportementale à examiner, sans verdict de malveillance. Processus : '+$process.Name+' ; parent : '+$parent.Name;status='alert';severity='medium'}
    }
  }
}catch{$report.systemMonitor.limitations+='Inventaire des processus indisponible.'}
try{$report.systemMonitor.services=@(Get-CimInstance Win32_Service -Property Name,State).Count}catch{$report.systemMonitor.limitations+='Inventaire des services indisponible.'}
try{$report.systemMonitor.connections=@(Get-NetTCPConnection -State Established -ErrorAction Stop).Count}catch{$report.systemMonitor.limitations+='Inventaire des connexions indisponible.'}
try{$report.systemMonitor.startupEntries=@(Get-CimInstance Win32_StartupCommand).Count}catch{$report.systemMonitor.limitations+='Inventaire du démarrage indisponible.'}
foreach($log in @(@{Name='System';Ids=@(7045,7040,104)},@{Name='Security';Ids=@(1102,4720,4732,4625)})){
  try{
    $logErrors=@()
    $rows=@(Get-WinEvent -FilterHashtable @{LogName=$log.Name;Id=$log.Ids;StartTime=(Get-Date).AddMinutes(-2)} -MaxEvents 30 -ErrorAction SilentlyContinue -ErrorVariable logErrors)
    if(@($logErrors|Where-Object{$_.FullyQualifiedErrorId -notlike 'NoMatchingEventsFound*'}).Count){throw 'LOG_UNAVAILABLE'}
    $report.systemMonitor.eventLogs+= $log.Name
    foreach($row in $rows){
      $title=switch($row.Id){7045{'Nouveau service système installé'}7040{'Mode de démarrage d’un service modifié'}104{'Journal système effacé'}1102{'Journal de sécurité effacé'}4720{'Compte utilisateur créé'}4732{'Membre ajouté à un groupe local'}4625{'Échec de connexion au système'}default{'Événement système'}}
      $important=$row.Id -in @(104,1102,4625)
      $report.events+=@{id='wolfguard-log:'+$log.Name+':'+$row.RecordId+':'+$row.TimeCreated.ToUniversalTime().ToString('o');occurredAt=$row.TimeCreated.ToUniversalTime().ToString('o');provider='WolfGuard · journal '+$log.Name;title=$title;resource='';detail=([string]$row.Message).Substring(0,[Math]::Min(1600,([string]$row.Message).Length));status=if($important){'alert'}else{'info'};severity=if($important){'medium'}else{'info'}}
    }
  }catch{$report.systemMonitor.limitations+='Journal '+$log.Name+' inaccessible avec les droits de l’agent.'}
}
$report.events=@($report.events|Select-Object -First 100)
$report|ConvertTo-Json -Depth 8 -Compress
