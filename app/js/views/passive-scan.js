'use strict';

function passiveScanDefaults() {
  return {
    monitoring: false,
    monitorTimer: 0,
    intervalSeconds: 15,
    history: [],
    changes: null,
    changeKeys: new Map(),
    addressCache: new Map(),
    interfaceFilter: 'all',
    familyFilter: 'all',
    transportFilter: 'all',
    bindingFilter: 'all',
    sort: 'source',
    presentation: 'observations',
    detailRows: [],
    overviewKey: '',
    ...passiveWorkbenchDefaults()
  }
}

function passiveRowKey(row) {
  return JSON.stringify([row.source, row.address, row.port, row.transport, row.remoteAddress, row.remotePort, row.interfaceName, row.processId])
}

function passiveAddressInfo(address) {
  if (scanView.addressCache.has(address)) return scanView.addressCache.get(address);
  let info = {
    family: '—',
    range: 'unknown',
    bytes: []
  };
  try {
    const ip = ipaddr.parse(address),
      mapped = ip.kind() === 'ipv6' && ip.isIPv4MappedAddress() ? ip.toIPv4Address() : null;
    info = {
      family: ip.kind() === 'ipv4' ? 'IPv4' : 'IPv6',
      range: mapped ? mapped.range() : ip.range(),
      bytes: ip.toByteArray(),
      mappedBytes: mapped?.toByteArray()
    }
  } catch {}
  if (scanView.addressCache.size < 131072) scanView.addressCache.set(address, info);
  return info;
}

function passiveFamily(address) {
  return passiveAddressInfo(address).family
}

function passiveAddressKind(address) {
  try {
    const range = passiveAddressInfo(address).range;
    return ({
      unknown: 'Inconnue',
      unspecified: 'Toutes les interfaces',
      loopback: 'Boucle locale',
      private: 'Privée',
      uniqueLocal: 'Privée',
      linkLocal: 'Lien local',
      multicast: 'Multicast',
      broadcast: 'Broadcast',
      reserved: 'Réservée',
      carrierGradeNat: 'Partagée (CGNAT)'
    })[range] || 'Unicast';
  } catch {
    return 'Inconnue'
  }
}

function passiveBinding(row) {
  const kind = passiveAddressKind(row.address);
  return kind === 'Toutes les interfaces' ? 'all' : kind === 'Boucle locale' ? 'loopback' : 'specific'
}

function passiveEndpoint(address, port) {
  return !address ? '—' : (address.includes(':') ? '[' + address + ']' : address) + (port == null ? '' : ':' + port)
}

function passiveProcess(row) {
  return row.processId == null ? 'Non disponible' : row.processId === 0 ? 'PID 0 · aucun propriétaire attribué' : (row.processName || 'Processus terminé ou inaccessible') + ' · PID ' + row.processId
}

function passiveTime(value) {
  return value ? new Date(value).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) : '—'
}

function passiveBytes(value) {
  if (value == null) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let unit = 0;
  while (value >= 1024 && unit < 4) {
    value /= 1024;
    unit++
  }
  return value.toLocaleString('fr-FR', {
    maximumFractionDigits: 1
  }) + ' ' + units[unit]
}

function renderPassiveFollowControls() {
  return `<div class="passive-follow-controls"><label class="scan-field">Intervalle de suivi<select id="passiveInterval">${[5,15,30,60].map(seconds=>'<option value="'+seconds+'" '+(scanView.intervalSeconds===seconds?'selected':'')+'>'+seconds+' secondes</option>').join('')}</select></label><button type="button" id="passiveFollow" class="secondary protocol-button">${networkToolIcon('reset')}Suivre les changements</button><p>Relève les tables locales à intervalle régulier. Le suivi continue dans les autres sections et s’arrête au verrouillage.</p></div>`
}

function renderPassiveOverviewShell() {
  return `<section class="passive-overview" id="passiveOverview" aria-label="Synthèse de l’observation" hidden><div id="passiveMetrics" class="passive-metrics"></div><div id="passiveChanges" class="passive-changes" role="status" aria-live="polite"></div><details id="passiveChangesDetails" class="passive-details" hidden><summary>Voir les derniers changements</summary><div id="passiveChangesList"></div></details><details class="passive-details"><summary id="passiveNetworkSummary">Configuration réseau locale</summary><div id="passiveNetworkDetails"></div><div id="passiveNetworkDelta" class="passive-network-delta"></div></details><details class="passive-details"><summary>Qualité des sources de collecte</summary><div id="passiveSources" class="passive-sources"></div></details><details class="passive-details"><summary>Historique de cette session</summary><div id="passiveHistoryChart" class="passive-history-chart"></div><ol id="passiveHistory" class="passive-history"></ol></details></section><dialog id="passiveObservationDialog" class="passive-dialog" aria-labelledby="passiveDialogTitle"><header><h2 id="passiveDialogTitle">Détail de l’observation</h2><button type="button" id="passiveCloseDetail" class="secondary protocol-button">Fermer</button></header><div id="passiveObservationDetail"></div><button type="button" id="passiveCopyDetail" class="secondary protocol-button">Copier le détail</button><p id="passiveCopyStatus" role="status"></p></dialog>`
}

function renderPassiveFilters() {
  return `${renderPassiveWorkbench()}<div class="passive-filters" id="passiveFilters"><label class="scan-field">Interface<select id="passiveInterface"><option value="all">Toutes les interfaces</option></select></label><label class="scan-field">Famille IP<select id="passiveFamily"><option value="all">IPv4 et IPv6</option><option value="IPv4">IPv4</option><option value="IPv6">IPv6</option></select></label><label class="scan-field">Transport<select id="passiveTransport"><option value="all">Tous</option>${['ARP','NDP','TCP','UDP'].map(value=>'<option>'+value+'</option>').join('')}</select></label><label class="scan-field">Liaison locale<select id="passiveBinding"><option value="all">Toutes</option><option value="wildcard">Toutes les interfaces</option><option value="loopback">Boucle locale</option><option value="specific">Adresse précise</option></select></label><label class="scan-field">Trier par<select id="passiveSort"><option value="source">Source / adresse</option><option value="address">Adresse IP</option><option value="port">Port local</option><option value="process">Processus / PID</option><option value="state">État observé</option></select></label><button type="button" id="passiveResetFilters" class="secondary protocol-button">Réinitialiser les filtres</button></div><p class="passive-results-help">Clique sur une adresse pour voir le détail. Le CSV suit la vue affichée. Le JSON et le rapport HTML incluent les observations, la configuration et les changements.</p>`
}

function bindPassiveControls() {
  bindPassiveWorkbench();
  $('#passiveFollow').onclick = () => {
    if (scanView.busy || scanView.monitoring || !desktopBridge.available) return;
    scanView.failures = 0;
    scanView.monitoring = true;
    startNetworkScan()
  };
  $('#passiveInterval').onchange = event => {
    scanView.intervalSeconds = Number(event.target.value)
  };
  for (const [id, key] of Object.entries({
      passiveInterface: 'interfaceFilter',
      passiveFamily: 'familyFilter',
      passiveTransport: 'transportFilter',
      passiveBinding: 'bindingFilter',
      passiveSort: 'sort'
    })) {
    $('#' + id).value = scanView[key];
    $('#' + id).onchange = event => {
      scanView[key] = event.target.value;
      scanView.page = 0;
      updateScanResults()
    };
  }
  $('#passiveResetFilters').onclick = () => {
    Object.assign(scanView, {
      interfaceFilter: 'all',
      familyFilter: 'all',
      transportFilter: 'all',
      bindingFilter: 'all',
      sort: 'source',
      query: '',
      filter: 'all',
      page: 0
    });
    $('#scanSearch').value = '';
    for (const [id, value] of Object.entries({
        passiveFamily: 'all',
        passiveTransport: 'all',
        passiveBinding: 'all',
        passiveSort: 'source'
      })) $('#' + id).value = value;
    updateScanResults()
  };
  $('#passiveCloseDetail').onclick = () => $('#passiveObservationDialog').close();
  $('#passiveObservationDialog').onclick = event => {
    if (event.target === $('#passiveObservationDialog')) {
      const bounds = event.target.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close()
    }
  };
  $('#passiveCopyDetail').onclick = async () => {
    const text = $('#passiveObservationDetail').innerText,
      copied = await copyText(text);
    if ($('#passiveCopyStatus')) $('#passiveCopyStatus').textContent = copied ? 'Détail copié.' : 'Copie impossible.'
  };
}

function updatePassiveControls() {
  updatePassiveWorkbench();
  const view = scanView;
  $('#passiveFollow').disabled = view.busy || view.monitoring || !desktopBridge.available;
  $('#passiveInterval').disabled = view.busy || view.monitoring;
  const picker = $('#passiveInterface'),
    names = [...new Set(view.results.map(row => row.interfaceName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
  if (view.interfaceFilter !== 'all' && !names.includes(view.interfaceFilter)) names.push(view.interfaceFilter);
  picker.innerHTML = '<option value="all">Toutes les interfaces</option>' + names.map(name => '<option value="' + esc(name) + '" ' + (view.interfaceFilter === name ? 'selected' : '') + '>' + esc(name) + '</option>').join('');
}

function passiveCompareAddress(a, b) {
  try {
    const left = passiveAddressInfo(a),
      right = passiveAddressInfo(b);
    if (left.family !== right.family) return left.family === 'IPv4' ? -1 : 1;
    const l = left.bytes,
      r = right.bytes;
    for (let index = 0; index < l.length; index++)
      if (l[index] !== r[index]) return l[index] - r[index];
    return a.localeCompare(b)
  } catch {
    return (a || '').localeCompare(b || '')
  }
}

function passiveFilterAndSort(rows) {
  const view = scanView;
  return rows.filter(row => (view.interfaceFilter === 'all' || row.interfaceName === view.interfaceFilter) && (view.familyFilter === 'all' || passiveFamily(row.address) === view.familyFilter) && (view.transportFilter === 'all' || row.transport === view.transportFilter) && (view.bindingFilter === 'all' || passiveBinding(row) === (view.bindingFilter === 'wildcard' ? 'all' : view.bindingFilter)))
    .sort((a, b) => {
      let result = 0;
      if (view.sort === 'port') result = (a.port ?? 65536) - (b.port ?? 65536);
      else if (view.sort === 'process') result = (a.processName || '').localeCompare(b.processName || '', 'fr') || (a.processId ?? -1) - (b.processId ?? -1);
      else if (view.sort === 'state') result = (a.observationState || '').localeCompare(b.observationState || '');
      else if (view.sort === 'source') result = (a.source || '').localeCompare(b.source || '');
      return result || passiveCompareAddress(a.address, b.address) || (a.port ?? 0) - (b.port ?? 0) || (a.processId ?? 0) - (b.processId ?? 0);
    });
}

function passiveHostInventory(rows) {
  const hosts = new Map();
  const adapters = scanView.report?.context?.interfaces || [],
    gateways = new Set(adapters.flatMap(adapter => adapter.gateways)),
    dns = new Set(adapters.flatMap(adapter => adapter.dnsServers));
  const add = (address, row, remote) => {
    if (!address || ['Toutes les interfaces', 'Multicast', 'Broadcast'].includes(passiveAddressKind(address))) return;
    if (!hosts.has(address)) hosts.set(address, {
      address,
      sources: new Set(),
      macs: new Set(),
      interfaces: new Set(),
      ports: new Set(),
      processes: new Set(),
      observations: 0
    });
    const host = hosts.get(address);
    host.observations++;
    host.sources.add(remote ? 'Pair d’une connexion TCP' : row.status === 'observed' ? 'Voisin en cache' : 'Adresse locale');
    if (!remote && row.macAddress) host.macs.add(row.macAddress);
    if (row.interfaceName) host.interfaces.add(row.interfaceName);
    const port = remote ? row.remotePort : row.port;
    if (port != null) host.ports.add(port + '/' + row.transport);
    if (row.processName) host.processes.add(row.processName);
    if (gateways.has(address)) host.sources.add('Passerelle configurée');
    if (dns.has(address)) host.sources.add('DNS configuré');
  };
  for (const row of rows) {
    add(row.address, row, false);
    if (row.remoteAddress && row.remoteAddress !== row.address) add(row.remoteAddress, row, true)
  }
  return [...hosts.values()].sort((a, b) => passiveCompareAddress(a.address, b.address));
}

function passiveRenderRows(page) {
  scanView.detailRows = page;
  return page.map((row, index) => `<tr><td class="scan-address"><button type="button" class="passive-address-button" data-passive-detail="${index}">${esc(row.address)}</button><small>${passiveFamily(row.address)} · ${esc(passiveAddressKind(row.address))}</small>${scanView.changeKeys.has(passiveRowKey(row))?'<span class="passive-change-badge">'+(scanView.changeKeys.get(passiveRowKey(row))==='added'?'Nouveau':'Modifié')+'</span>':''}</td><td>${row.port==null?'—':row.source==='tcp-connection'?esc(row.port):'<button type="button" class="scan-port-reference" data-scan-reference="'+esc(row.port)+'" data-scan-transport="'+esc(row.transport)+'">'+esc(row.port)+'</button>'}<small>${row.port==null?'':esc(scanServiceLabel(row.port,row.transport))}</small></td><td>${esc(row.transport)}</td><td><span class="scan-state is-${esc(row.status)}" title="${esc(row.detail)}">${esc(SCAN_STATUS[row.status]||row.status)}</span><small>${esc(row.observationState||'')}</small></td><td class="scan-observation-context">${esc(scanObservationContext(row))}</td><td class="passive-process">${esc(row.processName||(row.processId===0?'Non attribué':row.processId==null?'—':'Terminé / inaccessible'))}<small>${row.processId==null?'':'PID '+esc(row.processId)}</small></td><td class="scan-service">${esc(scanRowUsage(row))}</td></tr>`).join('');
}

function passiveRenderHosts(page) {
  scanView.hostRows = page;
  const list = values => esc([...values].slice(0, 8).join(' · ')) + (values.size > 8 ? ' · +' + (values.size - 8) : '');
  return page.map((host, index) => `<tr><td class="scan-address"><button type="button" class="passive-address-button" data-passive-host="${index}">${esc(host.address)}</button><small>${passiveFamily(host.address)} · ${esc(passiveAddressKind(host.address))}</small></td><td>${list(host.sources)}</td><td class="scan-observation-context">${list(host.macs)||'—'}</td><td>${list(host.interfaces)||'—'}</td><td>${list(host.ports)||'—'}</td><td>${list(host.processes)||'—'}</td><td>${host.observations}</td></tr>`).join('');
}

function showPassiveDetail(index) {
  const row = scanView.detailRows[index];
  if (!row) return;
  $('#passiveDialogTitle').textContent = 'Détail de l’observation';
  const fields = {
    'Adresse locale / voisin': row.address,
    'Famille': passiveFamily(row.address),
    'Type d’adresse': passiveAddressKind(row.address),
    'Port local': row.port,
    'Transport': row.transport,
    'Usage indicatif du port': row.port == null ? '—' : scanServiceLabel(row.port, row.transport),
    'Observation': SCAN_STATUS[row.status] || row.status,
    'État Windows': row.observationState,
    'Interface': row.interfaceName,
    'Adresse MAC': row.macAddress,
    'Pair distant': passiveEndpoint(row.remoteAddress, row.remotePort),
    'Processus': passiveProcess(row),
    'Source': SCAN_SOURCES[row.source] || row.source,
    'Relevé terminé à': passiveTime(scanView.report?.finishedAt),
    'Détail': row.detail
  };
  $('#passiveObservationDetail').innerHTML = '<dl>' + Object.entries(fields).map(([label, value]) => '<div><dt>' + esc(label) + '</dt><dd>' + esc(value ?? '—') + '</dd></div>').join('') + '</dl><p>Un état en cache peut être ancien. Une liaison sur toutes les interfaces décrit la configuration locale, sans confirmer l’accès à travers le pare-feu. Le nom d’un processus peut devenir indisponible après sa fermeture.</p>';
  $('#passiveCopyStatus').textContent = '';
  passivePrepareActions([row.address, row.remoteAddress]);
  $('#passiveObservationDialog').showModal();
}

function completePassiveSnapshot(view, report, previous) {
  view.previousReport = previous;
  view.failures = 0;
  view.lastAttempt = null;
  passiveComputeComparison(view, report, previous);
  view.networkDelta = passiveNetworkComparison(report, previous, view.comparisonMode === 'reference' ? view.reference : previous);
  view.history.unshift({
    at: report.finishedAt,
    count: report.results.length,
    scope: report.scope,
    complete: passiveComplete(report),
    added: view.changes?.added.length ?? null,
    removed: view.changes?.removed.length ?? null,
    changed: view.changes?.changed.length ?? null
  });
  view.history.length = Math.min(view.history.length, 30);
}

function stopPassiveMonitoring(view) {
  clearTimeout(view.monitorTimer);
  view.monitorTimer = 0;
  view.nextRefreshAt = 0;
  view.monitoring = false
}

function schedulePassiveSnapshot(view) {
  if (!view.monitoring) return;
  if (view.lastAttempt?.cancelled || !view.error && (view.report?.cancelled || view.report?.warnings?.length) || view.failures >= 3) {
    stopPassiveMonitoring(view);
    return
  }
  const delay = Math.min(60000, view.intervalSeconds * 1000 * (view.error ? 2 ** Math.max(0, view.failures - 1) : 1));
  view.nextRefreshAt = Date.now() + delay;
  view.monitorTimer = setTimeout(() => {
    view.monitorTimer = 0;
    view.nextRefreshAt = 0;
    if (!view.monitoring || $('#app').classList.contains('hidden')) {
      stopPassiveMonitoring(view);
      return
    }
    startNetworkScan(view)
  }, delay);
}

function updatePassiveOverview() {
  const view = scanView,
    report = view.report,
    overview = $('#passiveOverview');
  overview.hidden = !report;
  if (!report) return;
  const processes = new Set(view.results.filter(row => row.processId > 0).map(row => row.processId)),
    peers = new Set(view.results.filter(row => row.remoteAddress && !['Toutes les interfaces', 'Multicast', 'Broadcast'].includes(passiveAddressKind(row.remoteAddress))).map(row => row.remoteAddress)),
    wide = view.results.filter(row => ['listening', 'bound'].includes(row.status) && passiveBinding(row) === 'all'),
    unresolved = view.results.filter(row => ['Incomplete', 'Unreachable'].includes(row.observationState));
  $('#passiveMetrics').innerHTML = [
    [processes.size, 'processus propriétaires'],
    [peers.size, 'pairs TCP connus'],
    [wide.length, 'liaisons sur toutes les interfaces'],
    [unresolved.length, 'voisins incomplets / injoignables en cache']
  ].map(([count, label]) => '<div><strong>' + count.toLocaleString('fr-FR') + '</strong><span>' + label + '</span></div>').join('');
  const changes = view.changes;
  $('#passiveChanges').textContent = (view.monitoring ? 'Suivi toutes les ' + view.intervalSeconds + ' s · ' : '') + 'Relevé à ' + passiveTime(report.finishedAt) + ' · ' + (changes ? 'Depuis ' + passiveTime(changes.comparedAt) + ' : ' + changes.added.length + ' nouvelles, ' + changes.removed.length + ' disparues, ' + changes.changed.length + ' modifiées.' : report.cancelled || report.warnings?.length ? 'Relevé partiel : comparaison des changements suspendue.' : 'Premier relevé de cette source : référence pour la prochaine comparaison.');
  updatePassiveNetworkExtras();
  const key = report.scanId;
  if (view.overviewKey === key) return;
  view.overviewKey = key;
  $('#passiveChangesDetails').hidden = !changes || !changes.added.length && !changes.removed.length && !changes.changed.length;
  $('#passiveChangesList').innerHTML = changes ? [
    [changes.added, 'Nouvelles'],
    [changes.removed, 'Disparues'],
    [changes.changed.map(change => change.after), 'Modifiées']
  ].filter(([rows]) => rows.length).map(([rows, label]) => '<h3>' + label + ' · ' + rows.length + '</h3><ul>' + rows.slice(0, 20).map(row => '<li>' + esc(passiveEndpoint(row.address, row.port) + ' · ' + (row.processName || SCAN_SOURCES[row.source] || row.source) + (row.remoteAddress ? ' → ' + passiveEndpoint(row.remoteAddress, row.remotePort) : '') + ' · ' + (row.observationState || '')) + '</li>').join('') + '</ul>' + (rows.length > 20 ? '<p>20 entrées affichées ; liste complète dans le JSON.</p>' : '')).join('') + '<p>Une entrée disparue peut simplement avoir expiré du cache ou quitté la table locale.</p>' : '';
  $('#passiveHistory').innerHTML = view.history.map(entry => '<li><time>' + passiveTime(entry.at) + '</time><span>' + entry.count + ' observations · ' + esc(SCAN_PASSIVE_SCOPES[entry.scope] || entry.scope) + ' · ' + (!entry.complete ? 'partiel' : entry.added == null ? 'référence' : '+' + entry.added + ' / −' + entry.removed + ' / ' + entry.changed + ' modifiées') + '</span></li>').join('');
  const context = report.context;
  $('#passiveNetworkSummary').textContent = context ? 'Configuration locale · ' + context.interfaces.length + ' interfaces · ' + context.routes.length + ' routes' : 'Configuration locale indisponible';
  if (!context) {
    $('#passiveNetworkDetails').textContent = 'Ce relevé ne contient pas la configuration des interfaces.';
    return
  }
  const array = values => values?.length ? values.map(value => esc(value)).join('<br>') : '—';
  $('#passiveNetworkDetails').innerHTML = '<p>Configuration lue sur ce PC à ' + passiveTime(context.capturedAt) + '. DNS et DHCP désignent les serveurs configurés ; aucune requête ne leur est envoyée. Les compteurs sont des totaux Windows ; le débit moyen est calculé entre deux relevés complets.</p><div class="passive-interface-grid">' + context.interfaces.map(adapter => '<article><header><h3>' + esc(adapter.name) + '</h3><span class="scan-state ' + (adapter.status === 'Up' ? 'is-listening' : '') + '">' + esc(({
    Up: 'Connectée',
    Down: 'Déconnectée',
    Unknown: 'Inconnue',
    Dormant: 'En veille',
    NotPresent: 'Absente',
    LowerLayerDown: 'Liaison inactive'
  })[adapter.status] || adapter.status) + '</span></header><p>' + esc(adapter.description) + ' · ' + esc(adapter.type) + (adapter.speed > 0 ? ' · ' + (adapter.speed / 1000000).toLocaleString('fr-FR') + ' Mbit/s' : '') + '</p><dl>' + Object.entries({
    'Adresses / préfixes': array(adapter.addresses),
    'MAC': esc(adapter.macAddress || '—'),
    'Passerelles': array(adapter.gateways),
    'DNS configurés': array(adapter.dnsServers),
    'Suffixe DNS': esc(adapter.dnsSuffix || '—'),
    'DHCP': (adapter.dhcpEnabled == null ? '—' : adapter.dhcpEnabled ? 'Activé' : 'Désactivé') + '<br>' + array(adapter.dhcpServers),
    'Index IPv4 / IPv6': esc((adapter.ipv4Index ?? '—') + ' / ' + (adapter.ipv6Index ?? '—')),
    'Octets reçus / envoyés': passiveBytes(adapter.bytesReceived) + ' / ' + passiveBytes(adapter.bytesSent)
  }).map(([label, value]) => '<div><dt>' + label + '</dt><dd>' + value + '</dd></div>').join('') + '</dl></article>').join('') + '</div><div class="passive-routes-wrap"><table class="passive-routes"><caption>Routes IPv4 / IPv6 · métrique de route (hors métrique d’interface)</caption><thead><tr><th>Destination</th><th>Prochain saut</th><th>Interface</th><th>Métrique</th><th>Famille</th></tr></thead><tbody>' + context.routes.map(route => {
    const adapter = context.interfaces.find(adapter => (route.family === 'IPv4' ? adapter.ipv4Index : adapter.ipv6Index) === route.interfaceIndex);
    return '<tr><td>' + esc(route.destination) + '</td><td>' + (['0.0.0.0', '::'].includes(route.nextHop) ? 'Sur le lien' : esc(route.nextHop)) + '</td><td>' + esc(adapter?.name || route.interfaceIndex) + '</td><td>' + esc(route.metric) + '</td><td>' + esc(route.family) + '</td></tr>'
  }).join('') + '</tbody></table></div>';
}
