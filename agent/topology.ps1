$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$routes = @(Get-NetRoute -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.State -ne 'Dead' } | ForEach-Object {
  @{prefix=$_.DestinationPrefix;gateway=$_.NextHop;interfaceName=$_.InterfaceAlias;interfaceIndex=$_.InterfaceIndex;metric=($_.RouteMetric+$_.InterfaceMetric)}
})
$neighbors = @(Get-NetNeighbor -ErrorAction SilentlyContinue | Where-Object { $_.State -notin @('Unreachable','Incomplete') } | ForEach-Object {
  @{address=$_.IPAddress;macAddress=$_.LinkLayerAddress;interfaceIndex=$_.InterfaceIndex;state=[string]$_.State}
})
@{routes=$routes;neighbors=$neighbors} | ConvertTo-Json -Depth 5 -Compress
