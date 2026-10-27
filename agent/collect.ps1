$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$rows = New-Object 'System.Collections.Generic.List[object]'
$warnings = New-Object 'System.Collections.Generic.List[string]'
try {
  foreach ($neighbor in @(Get-NetNeighbor -ErrorAction Stop)) {
    $rows.Add(@{address=[string]$neighbor.IPAddress;port=$null;transport=$(if ($neighbor.IPAddress -like '*:*') {'NDP'} else {'ARP'});status='observed';source='agent-neighbor';macAddress=[string]$neighbor.LinkLayerAddress;interfaceName=[string]$neighbor.InterfaceIndex;detail=[string]$neighbor.State})
  }
} catch { $warnings.Add('Lecture des voisins indisponible sur ce poste.') }
try {
  foreach ($connection in @(Get-NetTCPConnection -ErrorAction Stop)) {
    $processName = ''
    try { $processName = [string](Get-Process -Id $connection.OwningProcess -ErrorAction Stop).ProcessName } catch {}
    $rows.Add(@{address=[string]$connection.LocalAddress;port=[int]$connection.LocalPort;transport='TCP';status=$(if ([string]$connection.State -eq 'Listen') {'listening'} else {'connection'});source='agent-tcp-table';remoteAddress=[string]$connection.RemoteAddress;remotePort=[int]$connection.RemotePort;pid=[int]$connection.OwningProcess;processName=$processName;detail=[string]$connection.State})
  }
} catch { $warnings.Add('Lecture des connexions TCP indisponible sur ce poste.') }
try {
  foreach ($endpoint in @(Get-NetUDPEndpoint -ErrorAction Stop)) {
    $rows.Add(@{address=[string]$endpoint.LocalAddress;port=[int]$endpoint.LocalPort;transport='UDP';status='bound';source='agent-udp-table';pid=[int]$endpoint.OwningProcess;detail='Socket UDP locale'})
  }
} catch { $warnings.Add('Lecture des sockets UDP indisponible sur ce poste.') }
@{results=@($rows.ToArray());warnings=@($warnings.ToArray())} | ConvertTo-Json -Depth 5 -Compress
