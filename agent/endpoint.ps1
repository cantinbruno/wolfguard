param([ValidateSet('collect','enable-protection','quick-scan')][string]$Operation='collect')
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
$admin=(New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if($Operation -ne 'collect'){
  try{
    if(-not $admin){throw 'ADMIN_REQUIRED'}
    if($Operation -eq 'quick-scan'){Start-MpScan -ScanType QuickScan -ErrorAction Stop;@{ok=$true;message='Analyse antivirus rapide terminée.'}|ConvertTo-Json -Compress;exit}
    $inputText=[Console]::In.ReadToEnd();if($inputText.Length -gt 2048){throw 'INVALID_POLICY'}
    $policy=$inputText|ConvertFrom-Json
    if($policy.mode -ne 'protect'){throw 'INVALID_POLICY'}
    $changes=@()
    if($policy.realtime -eq $true){
      $defender=Get-MpComputerStatus
      if($defender.AMRunningMode -notin @('Normal','EDR Block Mode')){throw 'THIRD_PARTY_PROVIDER'}
      if(-not $defender.RealTimeProtectionEnabled){Set-MpPreference -DisableRealtimeMonitoring $false;$changes+='Protection en temps réel activée'}
    }
    if($policy.firewall -eq $true){Get-NetFirewallProfile|Where-Object{-not $_.Enabled}|ForEach-Object{Set-NetFirewallProfile -Name $_.Name -Enabled True;$changes+='Pare-feu '+$_.Name+' activé'}}
    @{ok=$true;message=if($changes.Count){$changes -join '. '}else{'Les protections demandées sont déjà activées.'}}|ConvertTo-Json -Compress
  }catch{@{ok=$false;code=if($_.Exception.Message -eq 'ADMIN_REQUIRED'){'ADMIN_REQUIRED'}elseif($_.Exception.Message -eq 'THIRD_PARTY_PROVIDER'){'THIRD_PARTY_PROVIDER'}else{'PROTECTION_ACTION_FAILED'};message='La modification des protections n''a pas été confirmée. Vérifie les privilèges administrateur, l''antivirus actif et la protection contre les altérations.'}|ConvertTo-Json -Compress}
  exit
}
$report=@{supported=$false;provider='Microsoft Defender';antivirus='unknown';realtime='unknown';firewall='unknown';signatures='unknown';signatureVersion='';canEnforce=$admin;events=@();warnings=@()}
try{
  $mp=Get-MpComputerStatus
  $report.supported=$true
  if($mp.AMRunningMode -in @('Normal','EDR Block Mode')){
    $report.antivirus=if($mp.AntivirusEnabled -and $mp.AMServiceEnabled){'enabled'}else{'disabled'}
    $report.realtime=if($mp.RealTimeProtectionEnabled){'enabled'}else{'disabled'}
    $report.signatures=if($mp.DefenderSignaturesOutOfDate -eq $false -and $mp.AntivirusSignatureAge -le 2){'enabled'}else{'disabled'}
    $report.signatureVersion=[string]$mp.AntivirusSignatureVersion
  }else{$report.antivirus='passive';$report.realtime='passive';$report.canEnforce=$false;$report.warnings+='Defender est en mode passif. Les protections d''un antivirus tiers nécessitent leur propre intégration.'}
}catch{$report.warnings+='État de Microsoft Defender indisponible.'}
try{$profiles=@(Get-NetFirewallProfile);if($profiles.Count){$report.firewall=if(@($profiles|Where-Object{-not $_.Enabled}).Count){'disabled'}else{'enabled'}}}catch{$report.warnings+='État du pare-feu indisponible.'}
try{
  $detections=@(Get-CimInstance -Namespace 'root/Microsoft/Windows/Defender' -ClassName MSFT_MpThreatDetection|Sort-Object LastThreatStatusChangeTime -Descending|Select-Object -First 60)
  $threats=@{};Get-MpThreat|ForEach-Object{$threats[[string]$_.ThreatID]=$_};$report.activeThreats=@($threats.Values|Where-Object{$_.IsActive}).Count
  foreach($row in $detections){
    $threat=$threats[[string]$row.ThreatID];$when=$row.LastThreatStatusChangeTime;if(-not $when){$when=$row.InitialDetectionTime};if(-not $when){continue}
    $status='alert'
    if($row.ActionSuccess -and $row.ThreatStatusErrorCode -eq 0){$status=switch([int]$row.ThreatStatusID){2{'cleaned'}3{'quarantined'}4{'removed'}6{'blocked'}default{'alert'}}}
    elseif([int]$row.ThreatStatusID -ge 100 -or $row.ThreatStatusErrorCode -ne 0){$status='failed'}
    $severity=switch([int]$threat.SeverityID){5{'critical'}4{'high'}1{'low'}default{'medium'}}
    $name=if($threat.ThreatName){[string]$threat.ThreatName}else{'Menace détectée par Defender'}
    $report.events+=@{id='defender-detection:'+[string]$row.DetectionID;occurredAt=$when.ToUniversalTime().ToString('o');provider='Microsoft Defender';title=$name;resource=(@($row.Resources)|Select-Object -First 3)-join ' · ';detail='État natif : '+[string]$row.ThreatStatusID+' · Action confirmée : '+[string]$row.ActionSuccess;status=$status;severity=$severity}
  }
}catch{$report.warnings+='Historique des détections Defender indisponible.'}
try{
  $events=@(Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Windows Defender/Operational';Id=1121,1123,1126;StartTime=(Get-Date).AddDays(-7)} -MaxEvents 40 -ErrorAction SilentlyContinue -ErrorVariable blockErrors)
  if(@($blockErrors|Where-Object{$_.FullyQualifiedErrorId -notlike 'NoMatchingEventsFound*'}).Count){$report.warnings+='Journal des blocages Defender inaccessible ou incomplet.'}
  foreach($row in $events){$report.events+=@{id='defender-block:'+([string]$row.RecordId)+':'+$row.TimeCreated.ToUniversalTime().ToString('o');occurredAt=$row.TimeCreated.ToUniversalTime().ToString('o');provider='Microsoft Defender';title=switch($row.Id){1121{'Comportement bloqué par une règle de réduction de surface d''attaque'}1123{'Accès à un dossier protégé bloqué'}1126{'Connexion bloquée par la protection réseau'}};resource='';detail=([string]$row.Message).Substring(0,[Math]::Min(1600,([string]$row.Message).Length));status='blocked';severity='high'}}
}catch{$report.warnings+='Journal des blocages Defender indisponible.'}
$report|ConvertTo-Json -Depth 7 -Compress
