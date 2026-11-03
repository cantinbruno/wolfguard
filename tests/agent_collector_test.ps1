$ErrorActionPreference = 'Stop'
function Get-NetIPAddress { [pscustomobject]@{IPAddress='192.168.1.10';InterfaceAlias='Ethernet';InterfaceIndex=3} }
function Get-NetNeighbor { [pscustomobject]@{IPAddress='192.168.1.1';LinkLayerAddress='00:11:22:33:44:55';InterfaceIndex=3;State='Stale'} }
function Get-Process { [pscustomobject]@{Id=42;ProcessName='browser'} }
function Get-NetTCPConnection {
  [pscustomobject]@{LocalAddress='192.168.1.10';LocalPort=51000;RemoteAddress='8.8.8.8';RemotePort=443;State='Established';OwningProcess=42}
  [pscustomobject]@{LocalAddress='0.0.0.0';LocalPort=8080;RemoteAddress='0.0.0.0';RemotePort=0;State='Listen';OwningProcess=42}
}
function Get-NetUDPEndpoint { [pscustomobject]@{LocalAddress='192.168.1.10';LocalPort=5353;OwningProcess=42} }
function Get-DnsClientCache {
  [pscustomobject]@{Data='8.8.8.8';Entry='dns.example';Type=1;TimeToLive=120}
  [pscustomobject]@{Data='alias.example';Entry='dns.example';Type=5;TimeToLive=120}
}
$snapshot = (& "$PSScriptRoot/../agent/collect.ps1") | ConvertFrom-Json
if ($snapshot.results.Count -ne 5) { throw 'Incomplete collector results.' }
$tcp = @($snapshot.results | Where-Object { $_.status -eq 'connection' })[0]
if ($tcp.processName -ne 'browser' -or $tcp.pid -ne 42 -or $tcp.remotePort -ne 443 -or $tcp.interfaceName -ne 'Ethernet') { throw 'Connection ownership or endpoints lost.' }
$dns = @($snapshot.results | Where-Object { $_.transport -eq 'DNS' })
if ($dns.Count -ne 1 -or $dns[0].ttl -ne 120 -or $dns[0].hostname -ne 'dns.example') { throw 'DNS evidence lost.' }
function Get-NetTCPConnection { throw 'Unavailable table' }
$partial = (& "$PSScriptRoot/../agent/collect.ps1") | ConvertFrom-Json
if (@($partial.results | Where-Object { $_.transport -eq 'DNS' }).Count -ne 1 -or $partial.warnings.Count -lt 2) { throw 'One inaccessible source prevented partial collection.' }
Write-Output 'PASS: Windows local collector retains neighbors, sockets, DNS, interfaces and process ownership; source failures remain partial.'
