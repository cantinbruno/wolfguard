$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$rows = New-Object 'System.Collections.Generic.List[object]'
$warnings = New-Object 'System.Collections.Generic.List[string]'
$interfaces = @{}
$interfaceNames = @{}
$localAddresses = New-Object 'System.Collections.Generic.List[string]'
try {
  foreach ($address in @(Get-NetIPAddress -ErrorAction Stop)) {
    $interfaces[[string]$address.IPAddress] = [string]$address.InterfaceAlias
    $interfaceNames[[int]$address.InterfaceIndex] = [string]$address.InterfaceAlias
    $localAddresses.Add([string]$address.IPAddress)
  }
} catch { $warnings.Add('Noms des interfaces locales indisponibles.') }
try {
  foreach ($neighbor in @(Get-NetNeighbor -ErrorAction Stop)) {
    $rows.Add(@{address=[string]$neighbor.IPAddress;port=$null;transport=$(if ($neighbor.IPAddress -like '*:*') {'NDP'} else {'ARP'});status='observed';source='agent-neighbor';macAddress=[string]$neighbor.LinkLayerAddress;interfaceName=[string]$interfaceNames[[int]$neighbor.InterfaceIndex];detail=[string]$neighbor.State})
  }
} catch { $warnings.Add('Lecture des voisins indisponible sur ce poste.') }
try {
  $processes = @{}
  foreach ($process in @(Get-Process -ErrorAction SilentlyContinue)) { $processes[[int]$process.Id] = [string]$process.ProcessName }
  foreach ($connection in @(Get-NetTCPConnection -ErrorAction Stop)) {
    $rows.Add(@{address=[string]$connection.LocalAddress;port=[int]$connection.LocalPort;transport='TCP';status=$(if ([string]$connection.State -eq 'Listen') {'listening'} else {'connection'});remoteAddress=[string]$connection.RemoteAddress;remotePort=[int]$connection.RemotePort;pid=[int]$connection.OwningProcess;processName=$processes[[int]$connection.OwningProcess];interfaceName=$interfaces[[string]$connection.LocalAddress];detail=[string]$connection.State;source='agent-tcp-table'})
  }
} catch { $warnings.Add('Table des connexions TCP indisponible.') }
try {
  foreach ($socket in @(Get-NetUDPEndpoint -ErrorAction Stop)) {
    $rows.Add(@{address=[string]$socket.LocalAddress;port=[int]$socket.LocalPort;transport='UDP';status='bound';pid=[int]$socket.OwningProcess;processName=$processes[[int]$socket.OwningProcess];interfaceName=$interfaces[[string]$socket.LocalAddress];detail='Socket UDP locale';source='agent-udp-table'})
  }
} catch { $warnings.Add('Table des sockets UDP indisponible.') }
try {
  foreach ($entry in @(Get-DnsClientCache -ErrorAction Stop | Where-Object { $_.Type -in 1,28 })) {
    $rows.Add(@{address=[string]$entry.Data;port=$null;transport='DNS';status='observed';hostname=[string]$entry.Entry;ttl=[int]$entry.TimeToLive;detail=('Cache DNS local · TTL restant : '+$entry.TimeToLive+' s');source='agent-dns-cache'})
  }
} catch { $warnings.Add('Cache DNS local indisponible.') }
$warnings.Add('Tables et caches locaux uniquement. Aucune sonde, résolution DNS réseau ou capture de paquets.')

@{results=@($rows.ToArray());warnings=@($warnings.ToArray());localAddresses=@($localAddresses.ToArray())} | ConvertTo-Json -Depth 5 -Compress
