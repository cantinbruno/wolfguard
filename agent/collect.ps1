$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$rows = New-Object 'System.Collections.Generic.List[object]'
$warnings = New-Object 'System.Collections.Generic.List[string]'
try {
  foreach ($neighbor in @(Get-NetNeighbor -ErrorAction Stop)) {
    $rows.Add(@{address=[string]$neighbor.IPAddress;port=$null;transport=$(if ($neighbor.IPAddress -like '*:*') {'NDP'} else {'ARP'});status='observed';source='agent-neighbor';macAddress=[string]$neighbor.LinkLayerAddress;interfaceName=[string]$neighbor.InterfaceIndex;detail=[string]$neighbor.State})
  }
} catch { $warnings.Add('Lecture des voisins indisponible sur ce poste.') }
$warnings.Add('Cache ARP/NDP uniquement, sans sonde. Une entrée ne confirme pas la présence actuelle du voisin.')

@{results=@($rows.ToArray());warnings=@($warnings.ToArray())} | ConvertTo-Json -Depth 5 -Compress
