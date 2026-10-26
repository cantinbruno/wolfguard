'use strict';

function passiveWorkbenchDefaults() {
  return {
    reference: null,
    comparisonMode: 'previous',
    previousReport: null,
    networkDelta: null,
    processRows: [],
    hostRows: [],
    pendingResults: [],
    retaining: false,
    failures: 0,
    nextRefreshAt: 0,
    lastAttempt: null,
    queryCache: null
  }
}

function passiveComplete(report) {
  return !!report && !report.cancelled && !report.warnings?.length
}

function passiveCompileQuery(query) {
  const tokens = query.match(/[^\s"]+:"[^"]*"|"[^"]*"|\S+/g) || [],
    errors = [];
  const predicates = tokens.map(token => {
    const negative = token.startsWith('-');
    if (negative) token = token.slice(1);
    token = token.replaceAll('"', '');
    const colon = token.indexOf(':'),
      key = colon > 0 ? token.slice(0, colon).toLowerCase() : '',
      value = colon > 0 ? token.slice(colon + 1) : token;
    const includes = text => protocolSearch(String(text ?? '')).includes(protocolSearch(value));
    let match, valid = true;
    if (['ip', 'remote'].includes(key)) {
      try {
        const [network, prefix] = value.includes('/') ? ipaddr.parseCIDR(value) : [ipaddr.parse(value), null], bytes = network.toByteArray(), bits = prefix ?? bytes.length * 8;
        const addressMatches = address => {
          const info = passiveAddressInfo(address),
            candidate = bytes.length === 4 && info.mappedBytes ? info.mappedBytes : info.bytes;
          if (candidate.length !== bytes.length || network.zoneId != null && String(address || '').split('%')[1] !== network.zoneId) return false;
          for (let bit = 0; bit < bits; bit += 8) {
            const mask = 255 << (8 - Math.min(8, bits - bit));
            if ((candidate[bit >> 3] & mask) !== (bytes[bit >> 3] & mask)) return false
          }
          return true
        };
        match = row => key === 'remote' ? addressMatches(row.remoteAddress) : addressMatches(row.address) || addressMatches(row.remoteAddress);
      } catch {
        errors.push('Adresse ou réseau invalide : ' + value);
        valid = false;
        match = () => false
      }
    } else if (key === 'port') {
      const parts = /^(\d{1,5})(?:-(\d{1,5}))?$/.exec(value),
        start = Number(parts?.[1]),
        end = Number(parts?.[2] ?? parts?.[1]);
      if (!parts || start < 1 || end > 65535 || end < start) {
        errors.push('Port ou plage invalide : ' + value);
        valid = false;
        match = () => false
      } else match = row => [row.port, row.remotePort].some(port => port != null && port >= start && port <= end);
    } else if (key === 'pid') {
      if (!/^\d+$/.test(value)) {
        errors.push('PID invalide : ' + value);
        valid = false;
        match = () => false
      } else match = row => row.processId != null && row.processId === Number(value);
    } else if (['process', 'state', 'source', 'iface', 'transport'].includes(key)) {
      match = row => includes(({
        process: row.processName,
        state: row.observationState,
        source: (row.source || '') + ' ' + (SCAN_SOURCES[row.source] || ''),
        iface: row.interfaceName,
        transport: row.transport
      })[key]);
    } else match = row => protocolSearch([row.address, row.port, row.remoteAddress, row.remotePort, row.transport, row.macAddress, row.interfaceName, row.processName, row.processId, row.observationState, row.detail, SCAN_STATUS[row.status], SCAN_SOURCES[row.source], scanServiceLabel(row.port, row.transport)].join(' ')).includes(protocolSearch(token));
    return row => valid && (negative ? !match(row) : match(row));
  });
  return {
    query,
    errors,
    matches: row => predicates.every(predicate => predicate(row))
  };
}

function passiveQueryPredicate() {
  if (scanView.queryCache?.query !== scanView.query) scanView.queryCache = passiveCompileQuery(scanView.query);
  return scanView.queryCache
}

function passiveProcessInventory(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!['TCP', 'UDP'].includes(row.transport)) continue;
    const key = row.processId == null ? 'unknown' : String(row.processId);
    if (!groups.has(key)) groups.set(key, {
      key,
      pid: row.processId,
      name: row.processName || (row.processId === 0 ? 'Aucun propriétaire attribué' : 'Processus inaccessible ou terminé'),
      listeners: 0,
      udp: 0,
      connections: 0,
      peers: new Set(),
      ports: new Set(),
      interfaces: new Set(),
      rows: []
    });
    const group = groups.get(key);
    group.rows.push(row);
    if (row.status === 'listening') group.listeners++;
    if (row.status === 'bound') group.udp++;
    if (row.status === 'connection') group.connections++;
    if (row.remoteAddress && !['Toutes les interfaces', 'Multicast', 'Broadcast', 'Inconnue'].includes(passiveAddressKind(row.remoteAddress))) group.peers.add(row.remoteAddress);
    if (row.port != null) group.ports.add(row.port + '/' + row.transport);
    if (row.interfaceName) group.interfaces.add(row.interfaceName);
  }
  return [...groups.values()].sort((a, b) => b.connections - a.connections || b.listeners - a.listeners || a.name.localeCompare(b.name, 'fr') || (a.pid ?? -1) - (b.pid ?? -1));
}

function passiveRenderProcesses(page) {
  scanView.processRows = page;
  return page.map((process, index) => '<tr><td><button class="passive-address-button" type="button" data-passive-process="' + index + '">' + esc(process.name) + '</button><small>PID ' + esc(process.pid ?? 'non disponible') + '</small></td><td>' + process.listeners + '</td><td>' + process.udp + '</td><td>' + process.connections + '</td><td>' + process.peers.size + '</td><td>' + esc([...process.ports].slice(0, 10).join(' · ')) + (process.ports.size > 10 ? ' · +' + (process.ports.size - 10) : '') + '</td><td>' + esc([...process.interfaces].join(' · ')) + '</td></tr>').join('')
}

function showPassiveGroup(title, rows, intro) {
  $('#passiveDialogTitle').textContent = title;
  $('#passivePrepareTargets')?.remove();
  $('#passiveObservationDetail').innerHTML = '<p>' + esc(intro) + '</p><div class="passive-group-list">' + rows.slice(0, 200).map(row => '<article><strong>' + esc(passiveEndpoint(row.address, row.port)) + '</strong><span>' + esc(row.transport + ' · ' + (row.observationState || SCAN_STATUS[row.status] || row.status)) + '</span><span>Pair : ' + esc(passiveEndpoint(row.remoteAddress, row.remotePort)) + '</span><span>' + esc(passiveProcess(row)) + '</span></article>').join('') + '</div>' + (rows.length > 200 ? '<p>200 observations affichées ; les exports contiennent toutes les observations filtrées.</p>' : '');
  $('#passiveCopyStatus').textContent = '';
  $('#passiveObservationDialog').showModal();
}

function showPassiveProcess(index) {
  const process = scanView.processRows[index];
  if (process) showPassiveGroup(process.name + ' · PID ' + (process.pid ?? '—'), process.rows, process.listeners + ' écoutes TCP · ' + process.udp + ' sockets UDP · ' + process.connections + ' connexions TCP · ' + process.peers.size + ' pairs connus.')
}

function showPassiveHost(index) {
  const host = scanView.hostRows[index];
  if (host) {
    showPassiveGroup(host.address, filteredScanResults().filter(row => row.address === host.address || row.remoteAddress === host.address), [...host.sources].join(' · ') + (host.macs.size ? ' · MAC : ' + [...host.macs].join(', ') : ''));
    passivePrepareActions([host.address])
  }
}

function passiveComputeComparison(view, report, previous) {
  view.changes = null;
  view.changeKeys = new Map();
  const reference = view.comparisonMode === 'reference' ? view.reference : previous;
  if (!passiveComplete(report) || !passiveComplete(reference) || reference.scope !== report.scope) return;
  const before = new Map(reference.results.map(row => [passiveRowKey(row), row])),
    after = new Map(report.results.map(row => [passiveRowKey(row), row]));
  const added = [],
    removed = [],
    changed = [];
  for (const [key, row] of after) {
    const old = before.get(key);
    if (!old) {
      added.push(row);
      view.changeKeys.set(key, 'added')
    } else if (old.observationState !== row.observationState || old.macAddress !== row.macAddress || old.processName !== row.processName) {
      changed.push({
        before: old,
        after: row
      });
      view.changeKeys.set(key, 'changed')
    }
  }
  for (const [key, row] of before)
    if (!after.has(key)) removed.push(row);
  view.changes = {
    comparedAt: reference.finishedAt,
    mode: view.comparisonMode,
    added,
    removed,
    changed
  };
}

function passiveNetworkComparison(current, previous, reference) {
  if (!passiveComplete(current) || !current.context) return null;
  const result = {
      hasReference: passiveComplete(reference) && !!reference.context,
      addedRoutes: [],
      removedRoutes: [],
      interfaces: [],
      rates: []
    },
    context = current.context;
  if (result.hasReference) {
    const routeKey = route => JSON.stringify([route.destination, route.nextHop, route.interfaceIndex, route.metric]),
      before = new Map(reference.context.routes.map(route => [routeKey(route), route])),
      after = new Map(context.routes.map(route => [routeKey(route), route]));
    result.addedRoutes = [...after].filter(([key]) => !before.has(key)).map(([, route]) => route);
    result.removedRoutes = [...before].filter(([key]) => !after.has(key)).map(([, route]) => route);
    const fields = {
      status: 'État de liaison',
      addresses: 'Adresses IP',
      gateways: 'Passerelles',
      dnsServers: 'Serveurs DNS',
      dhcpServers: 'Serveurs DHCP',
      dhcpEnabled: 'DHCP',
      dnsSuffix: 'Suffixe DNS',
      macAddress: 'Adresse MAC',
      speed: 'Vitesse de liaison'
    };
    const older = new Map(reference.context.interfaces.map(adapter => [adapter.id, adapter]));
    for (const adapter of context.interfaces) {
      const old = older.get(adapter.id);
      if (!old) {
        result.interfaces.push({
          name: adapter.name,
          fields: ['Interface apparue']
        });
        continue
      }
      const changes = Object.entries(fields).filter(([field]) => JSON.stringify(Array.isArray(adapter[field]) ? [...adapter[field]].sort() : adapter[field]) !== JSON.stringify(Array.isArray(old[field]) ? [...old[field]].sort() : old[field])).map(([, label]) => label);
      if (changes.length) result.interfaces.push({
        name: adapter.name,
        fields: changes
      });
      older.delete(adapter.id)
    }
    for (const adapter of older.values()) result.interfaces.push({
      name: adapter.name,
      fields: ['Interface disparue']
    });
  }
  if (passiveComplete(previous) && previous.context) {
    const elapsed = (Date.parse(context.capturedAt) - Date.parse(previous.context.capturedAt)) / 1000;
    if (elapsed >= 0.5 && Number.isFinite(elapsed))
      for (const adapter of context.interfaces) {
        const old = previous.context.interfaces.find(entry => entry.id === adapter.id);
        if (!old) continue;
        const received = adapter.bytesReceived - old.bytesReceived,
          sent = adapter.bytesSent - old.bytesSent;
        if ([adapter.bytesReceived, adapter.bytesSent, old.bytesReceived, old.bytesSent].some(value => value == null) || received < 0 || sent < 0) continue;
        result.rates.push({
          id: adapter.id,
          name: adapter.name,
          seconds: elapsed,
          receivedBytesPerSecond: received / elapsed,
          sentBytesPerSecond: sent / elapsed
        });
      }
  }
  return result;
}

function renderPassiveWorkbench() {
  return `<div class="passive-workbench-toolbar"><div class="passive-view-buttons" role="group" aria-label="Vue des résultats">${[['observations','Observations'],['hosts','Adresses'],['processes','Processus']].map(([value,label])=>'<button type="button" data-passive-presentation="'+value+'" aria-pressed="'+(scanView.presentation===value)+'">'+label+'</button>').join('')}</div><div class="passive-reference-controls"><button id="passivePinReference" type="button" class="secondary protocol-button">Garder comme référence</button><label class="scan-field"><span class="sr-only">Comparer avec</span><select id="passiveComparison" aria-label="Comparer avec"><option value="previous">Comparer au relevé précédent</option><option value="reference">Comparer à ma référence</option></select></label><button id="passiveClearReference" type="button" class="secondary protocol-button" hidden>Oublier la référence</button></div></div><p id="passiveReferenceStatus" class="passive-results-help" role="status"></p><div class="passive-focus-controls" role="group" aria-label="Filtres rapides">${[['all','Tout'],['local-ports','Ports liés'],['connection','Connexions'],['observed','Voisins'],['changes','Nouveautés / modifications']].map(([value,label])=>'<button type="button" data-passive-focus="'+value+'">'+label+'</button>').join('')}</div><details class="passive-query-help"><summary>Rechercher par IP, réseau, port ou processus</summary><p>Combine les critères avec des espaces. Utilise « - » pour exclure un critère et des guillemets pour un nom avec espaces.</p><div>${['port:443','state:Established','ip:192.168.1.0/24','pid:1234','-transport:UDP'].map(value=>'<button type="button" data-passive-query="'+value+'">'+value+'</button>').join('')}</div><p>Autres critères : remote:, process:, source:, iface: et port:8000-8100.</p></details><p id="passiveQueryError" class="network-error" role="status" hidden></p>`
}

function bindPassiveWorkbench() {
  for (const button of document.querySelectorAll('[data-passive-presentation]')) button.onclick = () => {
    scanView.presentation = button.dataset.passivePresentation;
    scanView.page = 0;
    updateScanResults()
  };
  for (const button of document.querySelectorAll('[data-passive-focus]')) button.onclick = () => {
    scanView.filter = button.dataset.passiveFocus;
    scanView.page = 0;
    updateScanResults()
  };
  for (const button of document.querySelectorAll('[data-passive-query]')) button.onclick = () => {
    scanView.query = button.dataset.passiveQuery;
    $('#scanSearch').value = scanView.query;
    scanView.page = 0;
    updateScanResults();
    $('#scanSearch').focus()
  };
  const compare = () => {
    if (scanView.report) {
      passiveComputeComparison(scanView, scanView.report, scanView.previousReport);
      scanView.networkDelta = passiveNetworkComparison(scanView.report, scanView.previousReport, scanView.comparisonMode === 'reference' ? scanView.reference : scanView.previousReport);
      scanView.overviewKey = ''
    }
    updateScanResults()
  };
  $('#passivePinReference').onclick = () => {
    if (!passiveComplete(scanView.report)) return;
    scanView.reference = scanView.report;
    scanView.comparisonMode = 'reference';
    compare()
  };
  $('#passiveComparison').onchange = event => {
    scanView.comparisonMode = event.target.value;
    compare()
  };
  $('#passiveClearReference').onclick = () => {
    scanView.reference = null;
    scanView.comparisonMode = 'previous';
    compare()
  };
  $('#passiveExportReport').onclick = exportPassiveReport;
}

function updatePassiveWorkbench() {
  const view = scanView;
  for (const button of document.querySelectorAll('[data-passive-presentation]')) button.setAttribute('aria-pressed', String(view.presentation === button.dataset.passivePresentation));
  for (const button of document.querySelectorAll('[data-passive-focus]')) button.setAttribute('aria-pressed', String(view.filter === button.dataset.passiveFocus));
  $('#passivePinReference').disabled = view.busy || !passiveComplete(view.report);
  $('#passiveClearReference').hidden = !view.reference;
  $('#passiveComparison').value = view.comparisonMode;
  $('#passiveComparison option[value="reference"]').disabled = !view.reference;
  $('#passiveReferenceStatus').textContent = view.reference ? 'Référence conservée à ' + passiveTime(view.reference.finishedAt) + ' · ' + (SCAN_PASSIVE_SCOPES[view.reference.scope] || view.reference.scope) + (view.report?.scope !== view.reference.scope ? ' · Sélectionne la même source pour comparer.' : '') : 'Les comparaisons portent sur deux relevés complets de la même source.';
  const query = passiveQueryPredicate();
  $('#passiveQueryError').hidden = !query.errors.length;
  $('#passiveQueryError').textContent = query.errors.join(' · ');
  $('#passiveExportReport').disabled = !view.report;
}

function updatePassiveNetworkExtras() {
  const view = scanView,
    report = view.report;
  if (!report) return;
  const statuses = {
    complete: 'Disponible',
    partial: 'Partielle',
    unavailable: 'Indisponible',
    limited: 'Limitée',
    skipped: 'Non lue',
    cancelled: 'Annulée'
  };
  $('#passiveSources').innerHTML = (report.sources || []).map(source => '<div><strong>' + esc(source.label) + '</strong><span class="scan-state ' + (source.status === 'complete' ? 'is-listening' : 'is-no-response') + '">' + esc(statuses[source.status] || source.status) + '</span><span>' + source.count.toLocaleString('fr-FR') + ' entrées · ' + source.durationMs + ' ms</span></div>').join('') || '<p>Le détail des sources n’est pas fourni par ce relevé.</p>';
  const delta = view.networkDelta;
  $('#passiveNetworkDelta').innerHTML = delta ? (delta.hasReference ? '<p>Configuration : ' + delta.addedRoutes.length + ' routes apparues · ' + delta.removedRoutes.length + ' routes disparues · ' + delta.interfaces.length + ' interfaces modifiées.</p>' : '<p>Aucune référence de configuration comparable.</p>') + delta.interfaces.map(adapter => '<p><strong>' + esc(adapter.name) + '</strong> · ' + esc(adapter.fields.join(' · ')) + '</p>').join('') + (delta.rates.length ? '<h3>Débit moyen entre les deux derniers relevés complets</h3>' + delta.rates.map(rate => '<p><strong>' + esc(rate.name) + '</strong> · réception ' + passiveBytes(rate.receivedBytesPerSecond) + '/s · envoi ' + passiveBytes(rate.sentBytesPerSecond) + '/s · sur ' + rate.seconds.toLocaleString('fr-FR', {
    maximumFractionDigits: 1
  }) + ' s</p>').join('') : '<p>Deux relevés espacés sont nécessaires pour calculer un débit moyen ; un compteur remis à zéro est ignoré.</p>') : '<p>Un second relevé complet permettra de comparer la configuration réseau.</p>';
  const entries = view.history.filter(entry => entry.scope === report.scope && entry.complete).slice().reverse();
  if (entries.length < 2) {
    $('#passiveHistoryChart').innerHTML = '';
    return
  }
  const min = Math.min(...entries.map(entry => entry.count)),
    max = Math.max(...entries.map(entry => entry.count)),
    points = entries.map((entry, index) => (index * 600 / (entries.length - 1)).toFixed(1) + ',' + (64 - (entry.count - min) / Math.max(1, max - min) * 52).toFixed(1)).join(' ');
  $('#passiveHistoryChart').innerHTML = '<svg viewBox="0 0 600 80" role="img" aria-label="Évolution du nombre d’observations, de ' + min + ' à ' + max + '"><polyline points="' + points + '" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><p>' + entries.length + ' relevés · de ' + min + ' à ' + max + ' observations</p>';
}

function passiveDownload(text, type, extension, label = 'rapport') {
  const url = URL.createObjectURL(new Blob([text], {
      type
    })),
    link = document.createElement('a');
  link.href = url;
  link.download = 'WolfGuard-passif-' + label + '-' + (scanView.report?.startedAt || now()).replace(/[:.]/g, '-') + '.' + extension;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function passiveCsv(table) {
  const cell = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
  return '\ufeff' + table.map(row => row.map(cell).join(';')).join('\r\n')
}

function passiveGroupedExport(rows) {
  if (scanView.presentation === 'hosts') return [
    ['Adresse', 'Famille', 'Origine', 'MAC', 'Interfaces', 'Ports connus', 'Processus locaux', 'Observations'], ...passiveHostInventory(rows).map(host => [host.address, passiveFamily(host.address), [...host.sources].join(' · '), [...host.macs].join(' · '), [...host.interfaces].join(' · '), [...host.ports].join(' · '), [...host.processes].join(' · '), host.observations])
  ];
  return [
    ['Processus', 'PID', 'Écoutes TCP', 'Sockets UDP', 'Connexions TCP', 'Pairs connus', 'Ports locaux', 'Interfaces'], ...passiveProcessInventory(rows).map(process => [process.name, process.pid, process.listeners, process.udp, process.connections, process.peers.size, [...process.ports].join(' · '), [...process.interfaces].join(' · ')])
  ];
}

function passiveExportMetadata(rows) {
  return {
    presentation: scanView.presentation,
    filters: {
      query: scanView.query,
      status: scanView.filter,
      interface: scanView.interfaceFilter,
      family: scanView.familyFilter,
      transport: scanView.transportFilter,
      binding: scanView.bindingFilter
    },
    refresh: {
      inProgress: scanView.busy,
      monitoring: scanView.monitoring,
      nextRefreshAt: scanView.nextRefreshAt ? new Date(scanView.nextRefreshAt).toISOString() : null,
      error: scanView.error || null
    },
    comparisonMode: scanView.comparisonMode,
    reference: scanView.reference ? {
      scanId: scanView.reference.scanId,
      scope: scanView.reference.scope,
      finishedAt: scanView.reference.finishedAt
    } : null,
    changes: scanView.changes,
    networkChanges: scanView.networkDelta,
    history: scanView.history,
    changesScope: 'Relevés complets de la source sélectionnée, indépendamment des filtres d’affichage.',
    hosts: passiveHostInventory(rows).map(host => ({
      ...host,
      sources: [...host.sources],
      macs: [...host.macs],
      interfaces: [...host.interfaces],
      ports: [...host.ports],
      processes: [...host.processes]
    })),
    processes: passiveProcessInventory(rows).map(({
      rows: observations,
      peers,
      ports,
      interfaces,
      ...process
    }) => ({
      ...process,
      observations: observations.length,
      peers: [...peers],
      ports: [...ports],
      interfaces: [...interfaces]
    }))
  }
}

function exportPassiveReport() {
  const view = scanView,
    report = view.report;
  if (!report) return;
  const rows = filteredScanResults(),
    table = (headers, data) => '<div class="table"><table><thead><tr>' + headers.map(label => '<th>' + esc(label) + '</th>').join('') + '</tr></thead><tbody>' + data.map(row => '<tr>' + row.map(value => '<td>' + esc(value ?? '—') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  const observations = table(['Adresse locale / voisin', 'Port', 'Transport', 'Observation', 'Pair distant', 'Processus / PID', 'Interface', 'MAC', 'Source'], rows.map(row => [row.address, row.port, row.transport, (SCAN_STATUS[row.status] || row.status) + ' · ' + (row.observationState || ''), passiveEndpoint(row.remoteAddress, row.remotePort), passiveProcess(row), row.interfaceName, row.macAddress, SCAN_SOURCES[row.source] || row.source]));
  const processTable = table(['Processus', 'PID', 'Écoutes TCP', 'UDP', 'Connexions TCP', 'Pairs'], passiveProcessInventory(rows).map(process => [process.name, process.pid, process.listeners, process.udp, process.connections, process.peers.size]));
  const changes = view.changes,
    context = report.context;
  const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'"><title>WolfGuard — rapport passif</title><style>body{font:14px system-ui,sans-serif;color:#172e39;background:#f5f8fa;max-width:1500px;margin:30px auto;padding:0 24px;line-height:1.6}h1{color:#165a4d}h2{margin-top:30px;border-bottom:2px solid #b5d4ce;padding-bottom:8px}header,p.note{background:#fff;border:1px solid #d6e1e5;padding:18px;border-radius:8px}.table{overflow:auto}table{border-collapse:collapse;width:100%;background:white;font-size:12px}td,th{border:1px solid #d7e1e5;padding:9px;text-align:left;overflow-wrap:anywhere}th{background:#e5f0ed}li{overflow-wrap:anywhere}@media print{body{margin:0;padding:0;background:white}.table{overflow:visible}thead{display:table-header-group}tr{break-inside:avoid}h2{break-after:avoid}table{font-size:9px}}</style></head><body><header><h1>WolfGuard · scan passif</h1><p>Relevé du ' + esc(new Date(report.finishedAt).toLocaleString('fr-FR')) + ' · ' + esc(SCAN_PASSIVE_SCOPES[report.scope] || report.scope) + ' · ' + rows.length + ' observations exportées sur ' + report.results.length + '.</p><p>Recherche : ' + esc(view.query || 'aucune') + ' · État : ' + esc(view.filter) + ' · Interface : ' + esc(view.interfaceFilter) + ' · Famille : ' + esc(view.familyFilter) + ' · Transport : ' + esc(view.transportFilter) + ' · Liaison : ' + esc(view.bindingFilter) + '</p><p>' + (report.warnings?.length ? esc(report.warnings.join(' · ')) : report.cancelled ? 'Relevé annulé.' : 'Relevé complet.') + '</p></header><p class="note">Lecture des tables locales, sans sonde ni capture de paquets. Une entrée en cache peut être ancienne ; une écoute ne confirme pas l’accès depuis le réseau. Ce fichier autonome peut être imprimé depuis le navigateur.</p><h2>Sources de collecte</h2>' + table(['Source', 'État', 'Entrées', 'Durée (ms)'], (report.sources || []).map(source => [source.label, source.status, source.count, source.durationMs])) + '<h2>Observations filtrées</h2>' + observations + '<h2>Processus des observations filtrées</h2>' + processTable + (changes ? '<h2>Changements depuis ' + esc(passiveTime(changes.comparedAt)) + '</h2><p>' + changes.added.length + ' nouvelles · ' + changes.removed.length + ' disparues · ' + changes.changed.length + ' modifiées. Comparaison complète de la source, indépendante des filtres ci-dessus.</p>' + table(['Changement', 'Adresse', 'Port', 'Pair', 'Processus'], [...changes.added.map(row => ['Apparue', row.address, row.port, passiveEndpoint(row.remoteAddress, row.remotePort), passiveProcess(row)]), ...changes.removed.map(row => ['Disparue', row.address, row.port, passiveEndpoint(row.remoteAddress, row.remotePort), passiveProcess(row)]), ...changes.changed.map(({
    before,
    after
  }) => ['Modifiée : ' + (before.observationState || '—') + ' → ' + (after.observationState || '—'), after.address, after.port, passiveEndpoint(after.remoteAddress, after.remotePort), passiveProcess(after)])]) : '') + (context ? '<h2>Configuration complète des interfaces</h2>' + table(['Interface', 'État', 'Adresses', 'MAC', 'DNS', 'Passerelles', 'DHCP'], context.interfaces.map(adapter => [adapter.name, adapter.status, adapter.addresses.join(' · '), adapter.macAddress, adapter.dnsServers.join(' · '), adapter.gateways.join(' · '), adapter.dhcpServers.join(' · ')])) + '<h2>Routes IPv4 / IPv6</h2>' + table(['Destination', 'Prochain saut', 'Index interface', 'Métrique de route', 'Famille'], context.routes.map(route => [route.destination, route.nextHop, route.interfaceIndex, route.metric, route.family])) : '') + '<h2>Historique de session</h2>' + table(['Heure', 'Source', 'Observations', 'Complet'], view.history.map(entry => [passiveTime(entry.at), SCAN_PASSIVE_SCOPES[entry.scope] || entry.scope, entry.count, entry.complete ? 'Oui' : 'Non'])) + '</body></html>';
  passiveDownload(html, 'text/html;charset=utf-8', 'html');
}
