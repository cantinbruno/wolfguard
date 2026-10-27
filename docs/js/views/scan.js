'use strict';

const SCAN_PORT_PRESETS = {
  common: '21,22,23,25,53,80,110,135,139,143,389,443,445,465,587,636,993,995,1433,1521,2049,2375,3000,3306,3389,5432,5900,5985,5986,6379,8006,8080,8443,9090',
  windows: '53,88,135,139,389,445,464,636,3268,3269,3389,5985,5986,8530,8531,9389',
  web: '80,443,3000,8000,8006,8080,8081,8443,9000,9090,9443',
  database: '1433,1521,3306,5432,5984,6379,6432,7474,7687,8123,9042,9200,27017',
  first: '1-1024',
  all: '1-65535'
};
const SCAN_DEFAULTS = {
  strategy: 'passive',
  passiveScope: 'all',
  target: '',
  targetKind: 'host',
  mode: 'tcp',
  preset: 'common',
  ports: SCAN_PORT_PRESETS.common,
  discoveryPorts: '22,80,443,445,3389',
  identifyServices: false,
  timeoutMs: 2500,
  concurrency: 32
};
const SCAN_STATUS = {
  open: 'Ouvert',
  closed: 'Fermé',
  reachable: 'Répond',
  'no-response': 'Sans réponse',
  unreachable: 'Injoignable',
  error: 'Erreur',
  observed: 'En cache',
  listening: 'En écoute locale',
  bound: 'Socket locale',
  connection: 'Connexion connue'
};
const SCAN_SOURCES = {
  active: 'Test actif',
  'arp-cache': 'Cache ARP',
  'ndp-cache': 'Cache NDP',
  'tcp-listener': 'Écoute TCP locale',
  'udp-socket': 'Socket UDP locale',
  'tcp-connection': 'Table TCP locale'
};
const SCAN_PASSIVE_SCOPES = {
  all: 'Toutes les observations',
  neighbours: 'Voisins connus · ARP / NDP',
  listeners: 'Ports locaux · TCP / UDP',
  connections: 'Connexions TCP connues'
};

function createScanView(strategy) {
  return {
    values: {
      ...SCAN_DEFAULTS,
      strategy,
      mode: strategy === 'active' ? 'discovery' : 'tcp'
    },
    results: [],
    report: null,
    scanId: null,
    busy: false,
    stopping: false,
    error: '',
    completed: 0,
    total: 0,
    hosts: 0,
    query: '',
    filter: 'all',
    page: 0,
    frame: 0,
    runTarget: '',
    runMode: 'tcp',
    runStrategy: strategy,
    startedAt: '',
    profiles: [],
    serviceCache: new Map(),
    networks: null,
    networkRequest: 0,
    networkError: '',
    ...passiveScanDefaults(),
    ...scanConsoleDefaults()
  }
}
const scanViews = {
  passive: createScanView('passive'),
  active: createScanView('active')
};
let scanView = scanViews.passive;

function syncScanNavigation() {
  for (const [strategy, view] of Object.entries(scanViews)) document.querySelector('[data-section="scan-' + strategy + '"]')?.classList.toggle('scan-running', view.busy || view.monitoring);
}

function scanDisplayStrategy() {
  return scanView.report || scanView.busy || scanView.results.length ? scanView.runStrategy : scanView.values.strategy
}

function scanObservationContext(row) {
  const peer = row.remoteAddress ? (row.remoteAddress.includes(':') ? '[' + row.remoteAddress + ']' : row.remoteAddress) + (row.remotePort == null ? '' : ':' + row.remotePort) : '';
  return [peer, row.interfaceName, row.macAddress, row.observationState].filter(Boolean).join(' · ') || row.detail || '—';
}

function scanRowUsage(row) {
  return row.source && row.source !== 'active' ? SCAN_SOURCES[row.source] || row.source : scanServiceLabel(row.port, row.transport)
}

function scanDestinationInfo(values) {
  const target = values.target.trim();
  if (!target) throw new Error('Choisis la destination du scan ou saisis son adresse.');
  if (values.targetKind === 'cidr') {
    const subnet = networkMath.subnet(target);
    if (subnet.family !== 'ipv4' || subnet.prefix < 24) throw new Error('Choisis un réseau IPv4 de /24 à /32, ou précise une plage de 256 adresses maximum.');
    return subnet.cidr + ' · ' + subnet.hosts.toLocaleString('fr-FR') + ' adresses ciblées';
  }
  if (values.targetKind === 'range') {
    const parts = target.split('-').map(part => part.trim());
    if (parts.length !== 2 || !parts.every(part => ipaddr.IPv4.isValidFourPartDecimal(part))) throw new Error('Saisis la première et la dernière IP, par exemple 192.168.1.10-192.168.1.50.');
    const integer = part => ipaddr.parse(part).toByteArray().reduce((value, byte) => value * 256 + byte, 0),
      count = integer(parts[1]) - integer(parts[0]) + 1;
    if (count < 1 || count > 256) throw new Error('La plage doit être croissante et contenir au maximum 256 adresses.');
    return parts[0] + ' → ' + parts[1] + ' · ' + count + ' adresses ciblées';
  }
  if (target.includes('/') || /^\d+(?:\.\d+){3}\s*-/.test(target)) throw new Error('Sélectionne « Réseau CIDR » ou « Plage IPv4 » pour cette destination.');
  return target === '127.0.0.1' || target === '::1' ? 'Ce PC · ' + target : 'Machine à scanner : ' + target;
}

function updateScanDestination() {
  if (!$('#scanTarget')) return;
  const kind = scanView.values.targetKind;
  $('#scanTargetLabel').textContent = {
    host: 'Adresse IP locale de la machine à scanner',
    cidr: 'Réseau de destination (CIDR)',
    range: 'Plage de destination (première IP - dernière IP)'
  } [kind];
  $('#scanTarget').placeholder = {
    host: 'Ex. 192.168.1.10 ou 127.0.0.1',
    cidr: 'Ex. 192.168.1.0/24',
    range: 'Ex. 192.168.1.10-192.168.1.50'
  } [kind];
  try {
    $('#scanDestinationPreview').textContent = scanDestinationInfo(scanView.values)
  } catch (error) {
    $('#scanDestinationPreview').textContent = scanView.values.target.trim() ? error.message : 'Aucune destination choisie. Saisis une adresse, sélectionne un réseau local ou clique sur « Ce PC ».'
  }
}

function setScanDestination(kind, target) {
  if (scanView.busy) return;
  Object.assign(scanView.values, {
    targetKind: kind,
    target
  });
  $('#scanTargetKind').value = kind;
  $('#scanTarget').value = target;
  $('#scanLocalNetwork').value = '';
  scanView.error = '';
  updateScanDestination();
  updateScanForm();
}

function renderScanNetworkOptions(view = scanView) {
  if (view !== scanView || !isScanSection(state.section)) return;
  const picker = $('#scanLocalNetwork');
  if (!picker) return;
  picker.innerHTML = '<option value="">' + (view.networks === null ? 'Chargement des réseaux…' : view.networkError ? 'Réseaux indisponibles — saisie manuelle' : view.networks.length ? 'Choisir un réseau de ce PC…' : 'Aucun réseau IPv4 connecté') + '</option>' + (view.networks || []).map((network, index) => '<option value="' + index + '" ' + (!network.selectable ? 'disabled' : '') + '>' + esc(network.name + ' · ' + network.cidr + (!network.selectable ? ' (trop grand : préciser une plage)' : '')) + '</option>').join('');
  picker.disabled = view.busy || !view.networks?.length;
}
async function loadScanNetworks(refresh = false) {
  const view = scanView;
  if (!desktopBridge.available) return;
  if (view.networks !== null && !refresh) {
    renderScanNetworkOptions(view);
    return
  }
  const request = ++view.networkRequest;
  view.networks = null;
  view.networkError = '';
  renderScanNetworkOptions(view);
  try {
    const networks = await desktopBridge.call('network.interfaces');
    if (request !== view.networkRequest) return;
    if (!Array.isArray(networks)) throw new Error('Liste des réseaux indisponible.');
    view.networks = networks;
  } catch (error) {
    if (request !== view.networkRequest) return;
    view.networks = [];
    view.networkError = error.message
  }
  renderScanNetworkOptions(view);
}

function scanPortList(text) {
  if (!text.trim() || text.length > 10000) throw new Error('Indique des ports entre 1 et 65535.');
  const ports = new Set();
  for (const part of text.split(/[,;\s]+/).filter(Boolean)) {
    if (!/^\d{1,5}(?:-\d{1,5})?$/.test(part)) throw new Error('Port ou plage invalide : ' + part);
    const [start, end = start] = part.split('-').map(Number);
    if (start < 1 || end > 65535 || end < start) throw new Error('Les ports doivent être compris entre 1 et 65535, dans l’ordre croissant.');
    for (let port = start; port <= end; port++) ports.add(port);
  }
  return [...ports].sort((a, b) => a - b);
}

function scanServiceLabel(port, transport = 'TCP') {
  if (port == null) return 'Test ICMP';
  const key = transport + ':' + port;
  if (!scanView.serviceCache.has(key)) {
    const matches = scanView.profiles.filter(profile => {
      if (profile.kind !== 'port' || profile.transport !== transport) return false;
      const [start, end = start] = profile.port.split('-').map(Number);
      return port >= start && port <= end;
    });
    scanView.serviceCache.set(key, [...new Set(matches.map(profile => profile.service))].join(' / '));
  }
  return scanView.serviceCache.get(key) || '—';
}

function resetScanTool() {
  webScanWorkspace.reset();
  $('#passiveObservationDialog')?.close();
  $('#activeObservationDialog')?.close();
  for (const [strategy, view] of Object.entries(scanViews)) {
    stopPassiveMonitoring(view);
    if (view.busy && view.scanId) desktopBridge.call('network.cancelScan', {
      scanId: view.scanId
    }).catch(() => {});
    cancelAnimationFrame(view.frame);
    const networkRequest = view.networkRequest + 1;
    Object.assign(view, createScanView(strategy), {
      networkRequest
    });
  }
  syncScanNavigation();
}

function scheduleScanRender(view = scanView) {
  if (view !== scanView || view.frame || !isScanSection(state.section) || $('#app').classList.contains('hidden')) return;
  view.frame = requestAnimationFrame(() => {
    view.frame = 0;
    if (view === scanView && isScanSection(state.section) && !$('#app').classList.contains('hidden')) updateScanResults()
  });
}

desktopBridge.on('scan.progress', update => {
  const view = Object.values(scanViews).find(view => view.busy && view.scanId === update.scanId);
  if (!view) return;
  view.completed = update.completed;
  view.total = update.total;
  if (!view.retaining) view.hosts = update.hosts;
  const results = view.values.strategy === 'passive' ? view.pendingResults : view.results;
  for (const result of update.results || []) results.push(result);
  if (view.values.strategy === 'passive' && !view.retaining) view.results = results;
  scheduleScanRender(view);
});

async function renderScanWorkspace() {
  if (!desktopBridge.available) return webScanWorkspace.render(state.section === 'scan-active' ? 'active' : 'passive');
  scanView = scanViews[state.section === 'scan-active' ? 'active' : 'passive'];
  const view = scanView,
    passive = view.values.strategy === 'passive';
  view.overviewKey = '';
  $('#content').classList.add('scan-content');
  const values = scanView.values;
  const option = (value, label, current) => '<option value="' + value + '" ' + (value === current ? 'selected' : '') + '>' + label + '</option>';
  $('#content').innerHTML = `<section class="scan-page" aria-labelledby="scanTitle">
    <header class="scan-heading"><div class="scan-title"><span>${workspaceSectionIcon('scan')}</span><div><div class="scan-eyebrow">Exploration réseau <span>${passive?'Observation locale':'Sondes réseau'}</span></div><h1 id="scanTitle">Scan ${passive?'passif':'actif'}</h1><p>${passive?'Comprendre l’activité réseau de ce PC, sans envoyer de sonde.':'Découvrir les machines, explorer leurs ports et examiner les réponses.'}</p></div></div><div class="scan-actions"><span class="scan-export-label">Exporter les résultats</span><button type="button" id="scanCopy" class="secondary protocol-button">${ITEM_ACTION_ICONS.copy}Copier</button><button type="button" id="scanExport" class="secondary protocol-button">${networkToolIcon('download')}Exporter CSV</button><button type="button" id="scanExportJson" class="secondary protocol-button">JSON</button>${passive?'<button type="button" id="passiveExportReport" class="secondary protocol-button">Rapport HTML</button>':'<button type="button" id="scanExportReport" class="secondary protocol-button">Rapport HTML</button>'}</div></header>
    ${!desktopBridge.available?'<p class="network-error" role="status">Les tests réseau nécessitent l’application Windows WolfGuard.exe.</p>':''}
    <form id="scanForm" class="scan-form" novalidate>
      <div id="scanPassiveFields" class="scan-passive-fields"><div><h2>Observer sans envoyer de sonde</h2><p>Lecture du cache ARP/NDP, des ports locaux et des connexions TCP existantes. Aucun ping, connexion de test ou requête DNS.</p><p class="scan-passive-limit">Instantané local : une entrée en cache ne confirme pas qu’une machine est encore joignable. Ce mode ne capture pas les paquets.</p></div><label class="scan-field">Informations à observer<select id="scanPassiveScope">${Object.entries(SCAN_PASSIVE_SCOPES).map(([value,label])=>option(value,label,values.passiveScope)).join('')}</select></label></div>
      <div id="scanActiveFields">
      <div class="scan-destination-heading"><h2>Cible du scan</h2><div class="scan-destination-shortcuts"><button type="button" id="scanThisPc" class="secondary protocol-button">Ce PC</button><label class="scan-local-label"><span>Réseaux de ce PC</span><select id="scanLocalNetwork" aria-label="Choisir un réseau de destination" disabled><option value="">Chargement des réseaux…</option></select></label><button type="button" id="scanRefreshNetworks" class="secondary protocol-icon" title="Actualiser les réseaux" aria-label="Actualiser les réseaux">${networkToolIcon('reset')}</button></div></div>
      <div class="scan-destination-fields"><label class="scan-field">Destination<select id="scanTargetKind">${option('host','Une machine',values.targetKind)}${option('cidr','Réseau CIDR',values.targetKind)}${option('range','Plage IPv4',values.targetKind)}</select></label><label class="scan-field scan-target"><span id="scanTargetLabel">Adresse IP locale de la machine à scanner</span><input id="scanTarget" name="target" maxlength="253" value="${esc(values.target)}" placeholder="Ex. 192.168.1.10 ou 127.0.0.1" autocomplete="off" spellcheck="false" aria-describedby="scanDestinationPreview scanError"></label></div>
      <p class="scan-field-help scan-destination-preview" id="scanDestinationPreview" aria-live="polite"></p>
      <div class="scan-main-fields"><label class="scan-field">Objectif du scan<select id="scanMode">${option('discovery','Découverte des machines',values.mode)}${option('tcp','Analyse des ports TCP',values.mode)}${option('icmp','Test ICMP (ping)',values.mode)}</select></label><p class="scan-active-help">Les tests envoient du trafic vers la destination choisie.</p></div>
      <div id="scanPortFields" class="scan-port-fields"><label class="scan-field">Sélection de ports<select id="scanPreset">${[['common','Ports courants'],['windows','Windows / Active Directory'],['web','Web / administration'],['database','Bases de données'],['first','Ports 1 à 1 024'],['all','Tous les ports (1 à 65 535)'],['custom','Personnalisée']].map(([value,label])=>option(value,label,values.preset)).join('')}</select></label><label class="scan-field scan-ports">Ports TCP<input id="scanPorts" name="ports" maxlength="10000" value="${esc(values.ports)}" placeholder="22,80,443 ou 1-1024" autocomplete="off" spellcheck="false" aria-describedby="scanError"></label></div>
      <div id="scanDiscoveryFields" class="scan-field"><label for="scanDiscoveryPorts">Ports TCP de découverte (8 maximum)</label><input id="scanDiscoveryPorts" value="${esc(values.discoveryPorts)}" autocomplete="off" spellcheck="false"><p class="scan-field-help">Le ping et ces ports sont testés pour chaque adresse. Un refus TCP confirme aussi une machine répondante.</p></div>
      <label id="scanIdentifyLabel" class="scan-identify-label"><input id="scanIdentifyServices" type="checkbox" ${values.identifyServices?'checked':''}><span>Identifier les services et certificats TLS<small>Requête HTTP HEAD sur les ports web usuels, négociation TLS sur les ports TLS usuels, lecture des bannières sur les autres ports ouverts. Maximum 256 identifications par analyse.</small></span></label>
      <p id="scanPlan" class="scan-plan" role="status"></p>
      <details class="scan-advanced"><summary>Réglages du scan</summary><div><label class="scan-field">Délai par test (ms)<input type="number" id="scanTimeout" min="100" max="5000" step="100" value="${values.timeoutMs}"></label><label class="scan-field">Tests simultanés<input type="number" id="scanConcurrency" min="1" max="64" value="${values.concurrency}"></label><p>Jusqu’à 256 adresses et 65 536 tests par scan. En CIDR, les adresses réseau et broadcast sont exclues pour /24 à /30.</p></div></details>
      </div>
      ${passive?renderPassiveFollowControls():''}
      <div class="scan-start-actions scan-launch"><button type="submit" id="scanStart" class="primary protocol-button">${workspaceSectionIcon('scan')}Observer ce PC</button><button type="button" id="scanStop" class="secondary protocol-button" hidden>${networkToolIcon('stop')}Arrêter</button></div>
      <p id="scanBusyNotice" class="scan-field-help" role="status" hidden></p>
      <p id="scanError" class="network-error" role="alert" hidden></p>
    </form>
    <div class="scan-progress-panel"><div class="scan-progress-description"><span id="scanState" role="status" aria-live="polite"></span><span id="scanProgressCount"></span></div><progress id="scanProgress" max="1" value="0" aria-label="Progression du scan"></progress><div class="scan-stats"><span><strong id="scanHostCount">0</strong> <span id="scanHostLabel">adresses observées</span></span><span><strong id="scanOpenCount">0</strong> <span id="scanOpenLabel">ports locaux</span></span><span><strong id="scanRespondingCount">0</strong> <span id="scanRespondingLabel">voisins en cache</span></span></div><p id="scanWarnings" class="scan-warnings" role="status" hidden></p></div>
    ${passive?renderPassiveOverviewShell():''}
    <h2 class="scan-results-heading" id="scanResultHeading">Résultats du scan passif</h2>
    <div class="scan-result-controls"><label class="scan-result-search">${PROTOCOL_ICONS.search}<input id="scanSearch" type="search" maxlength="200" aria-label="Rechercher dans les résultats" placeholder="Filtrer : IP, port, MAC, interface, état…" value="${esc(scanView.query)}"></label><label class="scan-field scan-status-field">Afficher<select id="scanFilter"></select></label><span id="scanResultCount" role="status" aria-live="polite"></span></div>
    ${passive?renderPassiveFilters():''}
    <div class="scan-table-wrap" id="scanResultsPanel" role="region" aria-label="Résultats du scan" tabindex="0"><table class="scan-table"><thead id="scanTableHead"></thead><tbody id="scanRows"></tbody></table><div id="scanEmpty" class="scan-empty"></div></div>
    <footer class="scan-footer"><p id="scanFootnote"></p><div id="scanPagination"></div></footer>
  </section>`;
  mountScanConsole(passive);
  const form = $('#scanForm');
  const sync = () => {
    Object.assign(scanView.values, {
      passiveScope: $('#scanPassiveScope').value,
      target: $('#scanTarget').value,
      targetKind: $('#scanTargetKind').value,
      mode: $('#scanMode').value,
      preset: $('#scanPreset').value,
      ports: $('#scanPorts').value,
      timeoutMs: Number($('#scanTimeout').value),
      concurrency: Number($('#scanConcurrency').value),
      discoveryPorts: $('#scanDiscoveryPorts').value,
      identifyServices: $('#scanIdentifyServices').checked
    });
    updateScanDestination();
    if (!passive) updateScanConsole()
  };
  form.oninput = event => {
    sync();
    if (event.target.id === 'scanTarget') $('#scanLocalNetwork').value = ''
  };
  $('#scanThisPc').onclick = () => setScanDestination('host', '127.0.0.1');
  $('#scanRefreshNetworks').onclick = () => loadScanNetworks(true);
  $('#scanTargetKind').onchange = () => {
    const kind = $('#scanTargetKind').value;
    let target = $('#scanTarget').value;
    try {
      scanDestinationInfo({
        targetKind: kind,
        target
      })
    } catch {
      target = ''
    }
    setScanDestination(kind, target)
  };
  $('#scanLocalNetwork').onchange = event => {
    const index = event.target.value;
    if (index === '') return;
    const network = scanView.networks?.[Number(index)];
    if (network?.selectable) {
      setScanDestination('cidr', network.cidr);
      event.target.value = index
    }
  };
  $('#scanPreset').onchange = event => {
    const ports = SCAN_PORT_PRESETS[event.target.value];
    if (ports) $('#scanPorts').value = ports;
    sync()
  };
  $('#scanPorts').oninput = () => {
    $('#scanPreset').value = 'custom';
    sync()
  };
  $('#scanMode').onchange = () => {
    sync();
    if (!scanView.report) scanView.activePresentation = scanView.values.mode === 'discovery' ? 'hosts' : 'tests';
    updateScanResults()
  };
  form.onsubmit = event => {
    event.preventDefault();
    sync();
    startNetworkScan()
  };
  $('#scanStop').onclick = stopNetworkScan;
  $('#scanSearch').oninput = event => {
    scanView.query = event.target.value;
    scanView.page = 0;
    updateScanResults()
  };
  $('#scanFilter').onchange = event => {
    scanView.filter = event.target.value;
    scanView.page = 0;
    updateScanResults()
  };
  $('#scanCopy').onclick = async () => {
    const rows = filteredScanResults(),
      grouped = scanView.runStrategy === 'active' ? activeExportTable(rows) : scanView.presentation !== 'observations' ? passiveGroupedExport(rows) : null,
      text = grouped ? grouped.map(row => row.join('\t')).join('\n') : ['Scan passif · ' + scanView.runTarget, 'État : ' + scanStateText(), ...(scanView.report?.warnings || []), ...rows.map(row => [row.address, row.port ?? '—', row.transport, SCAN_STATUS[row.status] || row.status, '', scanRowUsage(row), scanObservationContext(row) + ' · ' + passiveProcess(row)].join('\t'))].join('\n');
    const button = $('#scanCopy');
    const copied = await copyText(text);
    if (button?.isConnected) {
      button.innerHTML = copied ? 'Copié' : 'Copie impossible';
      setTimeout(() => {
        if (button.isConnected) button.innerHTML = ITEM_ACTION_ICONS.copy + 'Copier'
      }, 1500)
    }
  };
  $('#scanExport').onclick = () => exportScanResults('csv');
  $('#scanExportJson').onclick = () => exportScanResults('json');
  $('#scanResultsPanel').onclick = event => {
    const process = event.target.closest('[data-passive-process]');
    if (process) {
      showPassiveProcess(Number(process.dataset.passiveProcess));
      return
    }
    const host = event.target.closest('[data-passive-host]');
    if (host) {
      showPassiveHost(Number(host.dataset.passiveHost));
      return
    }
    const activeDetail = event.target.closest('[data-active-detail]');
    if (activeDetail) {
      showActiveDetail(Number(activeDetail.dataset.activeDetail));
      return
    }
    const activePorts = event.target.closest('[data-active-ports]');
    if (activePorts) {
      const item = scanView.activeRows[Number(activePorts.dataset.activePorts)];
      if (item) prepareActiveTarget(item.address);
      return
    }
    const detail = event.target.closest('[data-passive-detail]');
    if (detail) {
      showPassiveDetail(Number(detail.dataset.passiveDetail));
      return
    }
    const button = event.target.closest('[data-scan-reference]');
    if (!button) return;
    Object.assign(protocolView, {
      scope: 'all',
      query: button.dataset.scanReference + '/' + (button.dataset.scanTransport || 'TCP').toLowerCase(),
      family: 'all',
      transport: 'all',
      range: 'all',
      protection: 'all',
      sort: 'port-asc',
      page: 0
    });
    openSection('protocol');
  };
  if (passive) bindPassiveControls();
  else $('#scanExportReport').onclick = exportActiveReport;
  updateScanResults();
  updateScanDestination();
  if (!passive) loadScanNetworks();
  $('#content').scrollTop = 0;
  loadProtocolReference().then(catalog => {
    view.profiles = catalog.entries;
    view.serviceCache.clear();
    scheduleScanRender(view)
  }).catch(() => {});
}

function updateScanForm() {
  if (!$('#scanForm')) return;
  const passive = scanView.values.strategy === 'passive';
  $('.scan-page').dataset.strategy = scanView.values.strategy;
  $('.scan-page').dataset.phase = scanView.error ? 'error' : scanView.busy || scanView.monitoring ? 'running' : scanView.report ? 'complete' : 'ready';
  $('#scanPassiveFields').hidden = !passive;
  $('#scanActiveFields').hidden = passive;
  for (const input of $('#scanForm').querySelectorAll('input,select')) input.disabled = scanView.busy || scanView.monitoring;
  $('#scanLocalNetwork').disabled = scanView.busy || !scanView.networks?.length;
  $('#scanThisPc').disabled = scanView.busy;
  $('#scanRefreshNetworks').disabled = scanView.busy || !desktopBridge.available;
  $('#scanPortFields').hidden = scanView.values.mode === 'icmp';
  const otherScan = Object.values(scanViews).find(view => view !== scanView && (view.busy || view.monitoring));
  $('#scanStart').disabled = scanView.busy || scanView.monitoring || !desktopBridge.available;
  $('#scanBusyNotice').hidden = !otherScan;
  $('#scanBusyNotice').textContent = otherScan ? 'Un scan ' + (otherScan.values.strategy === 'passive' ? 'passif' : 'actif') + ' est en cours dans l’autre section. Les deux collectes peuvent fonctionner en parallèle.' : '';
  $('#scanStart').innerHTML = workspaceSectionIcon('scan') + (passive ? 'Observer ce PC' : 'Lancer le scan actif');
  $('#scanStop').hidden = !scanView.busy && !scanView.monitoring;
  $('#scanStop').disabled = scanView.stopping;
  $('#scanStop').innerHTML = networkToolIcon('stop') + (scanView.stopping ? 'Arrêt en cours…' : scanView.monitoring ? 'Arrêter le suivi' : 'Arrêter');
  $('#scanError').hidden = !scanView.error;
  $('#scanError').textContent = scanView.error;
  syncScanNavigation();
  if (passive) updatePassiveControls();
  updateScanConsole();
}

function scanStateText() {
  if (!desktopBridge.available) return 'Scan disponible dans l’application Windows';
  if (scanDisplayStrategy() === 'passive') {
    if (scanView.busy) return scanView.stopping ? 'Arrêt de l’observation…' : scanView.retaining ? 'Actualisation en cours · dernier relevé conservé' : 'Observation locale en cours…';
    if (scanView.error) return (scanView.report ? 'Actualisation impossible · dernier relevé conservé' : 'Observation impossible') + (scanView.monitoring ? ' · nouvelle tentative à ' + passiveTime(scanView.nextRefreshAt) : scanView.failures >= 3 ? ' · suivi arrêté après trois échecs' : '');
    if (scanView.monitoring) return 'Suivi passif en cours · prochain relevé à ' + passiveTime(scanView.nextRefreshAt);
    if (scanView.lastAttempt?.cancelled) return 'Actualisation arrêtée · dernier relevé conservé';
    if (scanView.report) return (scanView.report.cancelled ? 'Observation arrêtée' : scanView.report.warnings?.length ? 'Observation terminée avec des limites' : 'Observation terminée') + ' · Ce PC';
    return scanView.error ? 'Observation non effectuée' : 'Prêt à observer ce PC';
  }
  if (scanView.busy) return scanView.stopping ? 'Arrêt en cours…' : scanView.total ? 'Scan en cours · ' + scanView.runTarget : 'Validation de la cible locale…';
  if (scanView.report) return (scanView.report.cancelled ? 'Scan arrêté' : 'Scan terminé') + ' · ' + scanView.runTarget;
  return scanView.error ? 'Scan non effectué' : 'Prêt à scanner';
}

function filteredScanResults() {
  if (scanDisplayStrategy() === 'passive') {
    const query = passiveQueryPredicate();
    return passiveFilterAndSort(scanView.results.filter(row => (scanView.filter === 'all' || scanView.filter === 'local-ports' && ['listening', 'bound'].includes(row.status) || scanView.filter === 'changes' && scanView.changeKeys.has(passiveRowKey(row)) || row.status === scanView.filter) && query.matches(row)));
  }
  const query = protocolSearch(scanView.query.trim());
  const rows = activeDisplayedRows().filter(row => (scanView.filter === 'all' || scanView.filter === 'responding' && ['open', 'reachable'].includes(row.status) || row.status === scanView.filter) && (!query || protocolSearch([row.address, row.port, row.transport, SCAN_STATUS[row.status], scanRowUsage(row), row.detail, row.interfaceName, row.macAddress, row.remoteAddress, row.remotePort, row.observationState, row.processId, row.processName, row.service?.protocol, row.service?.product, row.service?.banner, scanServiceLabel(row.port, row.transport)].join(' ')).includes(query)));
  return scanDisplayStrategy() === 'passive' ? passiveFilterAndSort(rows) : rows;
}

function updateScanResults() {
  syncScanNavigation();
  if (!isScanSection(state.section) || !$('#scanRows')) return;
  updateScanForm();
  const passive = scanDisplayStrategy() === 'passive';
  const filters = passive ? [
    ['all', 'Toutes les observations'],
    ['local-ports', 'Ports liés TCP / UDP'],
    ['observed', 'Voisins en cache'],
    ['listening', 'Écoutes TCP locales'],
    ['bound', 'Sockets UDP locales'],
    ['connection', 'Connexions TCP'],
    ['changes', 'Nouvelles / modifiées']
  ] : [
    ['all', 'Tous les résultats'],
    ['responding', 'Ouverts / répondants'],
    ['closed', 'Ports fermés'],
    ['no-response', 'Sans réponse'],
    ['unreachable', 'Injoignables'],
    ['error', 'Erreurs']
  ];
  if (!filters.some(([value]) => value === scanView.filter)) scanView.filter = 'all';
  $('#scanFilter').innerHTML = filters.map(([value, label]) => '<option value="' + value + '" ' + (scanView.filter === value ? 'selected' : '') + '>' + label + '</option>').join('');
  $('#scanResultHeading').textContent = 'Résultats du scan ' + (passive ? 'passif' : 'actif');
  const hosts = passive && scanView.presentation === 'hosts',
    processes = passive && scanView.presentation === 'processes';
  $('#scanTableHead').innerHTML = '<tr>' + (processes ? ['Processus / PID', 'Écoutes TCP', 'Sockets UDP', 'Connexions TCP', 'Pairs connus', 'Ports locaux', 'Interfaces'] : hosts ? ['Adresse observée', 'Origine de l’observation', 'MAC connue', 'Interface locale', 'Ports connus', 'Processus locaux', 'Observations'] : passive ? ['Adresse locale / voisin', 'Port / usage indicatif', 'Transport', 'Observation / état Windows', 'Pair / interface / MAC', 'Processus propriétaire', 'Source'] : ['Adresse IP', 'Port', 'Transport', 'État', 'Délai', 'Usage courant / référentiel']).map(label => '<th scope="col">' + label + '</th>').join('') + '</tr>';
  $('.scan-table').classList.toggle('is-passive', passive);
  $('.scan-table').classList.toggle('is-host-inventory', hosts);
  $('.scan-table').classList.toggle('is-process-inventory', processes);
  const filtered = filteredScanResults(),
    displayRows = processes ? passiveProcessInventory(filtered) : hosts ? passiveHostInventory(filtered) : filtered,
    page = collectionPageSlice(displayRows, scanView);
  $('#scanRows').innerHTML = processes ? passiveRenderProcesses(page) : hosts ? passiveRenderHosts(page) : passive ? passiveRenderRows(page) : page.map(row => `<tr><td class="scan-address">${esc(row.address)}</td><td>${row.port==null?'—':'<button type="button" class="scan-port-reference" data-scan-reference="'+esc(row.port)+'" data-scan-transport="'+esc(row.transport)+'" title="Consulter le référentiel du port '+esc(row.port)+'/'+esc(row.transport)+'">'+esc(row.port)+'</button>'}</td><td>${esc(row.transport)}</td><td><span class="scan-state is-${esc(row.status)}" title="${esc(row.detail)}">${esc(SCAN_STATUS[row.status]||row.status)}</span></td><td class="scan-latency">${row.latencyMs==null?'—':row.latencyMs.toLocaleString('fr-FR',{maximumFractionDigits:1})+' ms'}</td><td class="scan-service" title="Repère du référentiel, sans identification du service réel">${esc(scanRowUsage(row))}</td></tr>`).join('');
  const displayCount = passive ? displayRows.length : renderActiveTable(filtered);
  $('#scanEmpty').hidden = displayCount > 0;
  $('#scanEmpty').textContent = filtered.length && !displayCount ? processes ? 'Ces observations ne contiennent aucun processus TCP/UDP.' : 'Les adresses génériques ne désignent pas une machine distincte. Consulte la vue Observations.' : scanView.busy ? (passive ? 'Lecture des informations locales…' : 'Les résultats apparaissent au fil des tests.') : scanView.results.length ? 'Aucun résultat pour ces filtres.' : scanView.report?.cancelled ? 'Collecte arrêtée avant la réception d’un résultat.' : passive ? scanView.report ? 'Aucune entrée disponible dans les sources sélectionnées. Cela ne prouve pas l’absence de machines sur le réseau.' : 'Clique sur « Observer ce PC » pour lire les informations locales disponibles.' : 'Saisis une cible puis lance le scan actif.';
  $('#scanState').textContent = scanStateText();
  if (!desktopBridge.available && !scanView.results.length) $('#scanEmpty').textContent = 'Ouvre l’application Windows WolfGuard pour effectuer ce scan.';
  $('#scanProgressCount').textContent = passive ? scanView.completed.toLocaleString('fr-FR') + ' observation' + (scanView.completed === 1 ? '' : 's') : scanView.total ? scanView.completed.toLocaleString('fr-FR') + ' / ' + scanView.total.toLocaleString('fr-FR') + (scanView.runMode === 'discovery' ? ' machines' : ' tests') : '';
  $('#scanProgress').max = Math.max(1, scanView.total);
  $('#scanProgress').value = scanView.completed;
  if (scanView.busy && !scanView.total) $('#scanProgress').removeAttribute('value');
  $('#scanHostCount').textContent = scanView.hosts.toLocaleString('fr-FR');
  $('#scanHostLabel').textContent = passive ? 'adresses observées' : 'adresses ciblées';
  $('#scanOpenLabel').textContent = passive ? 'ports locaux' : 'ports ouverts';
  $('#scanRespondingLabel').textContent = passive ? 'voisins en cache' : 'hôtes avec réponse';
  $('#scanOpenCount').textContent = (passive ? scanView.results.filter(row => ['listening', 'bound'].includes(row.status)).length : activeHostInventory(scanView.results).reduce((sum, host) => sum + host.open.size, 0)).toLocaleString('fr-FR');
  $('#scanRespondingCount').textContent = (passive ? scanView.results.filter(row => row.status === 'observed').length : new Set(scanView.results.filter(row => ['open', 'closed', 'reachable'].includes(row.status)).map(row => row.address)).size).toLocaleString('fr-FR');
  $('#scanWarnings').hidden = !scanView.report?.warnings?.length;
  $('#scanWarnings').textContent = (scanView.report?.warnings || []).join(' · ');
  $('#scanFootnote').textContent = passive ? 'Instantané des tables locales, sans sonde ni capture de paquets. Les entrées en cache peuvent être anciennes. Une écoute locale ne confirme pas l’accès depuis un autre poste.' : (activeDisplayedReport()?.mode || scanView.runMode) === 'discovery' ? 'Présence confirmée par réponse ICMP ou TCP, y compris un refus TCP. Une absence de réponse ne prouve pas une machine éteinte. Les MAC connues proviennent du cache voisin Windows.' : 'Un port ouvert confirme une connexion TCP. Les services observés proviennent des réponses reçues ; les autres libellés restent des repères de ports. Sans réponse ne signifie pas fermé.';
  $('#scanResultCount').textContent = displayCount.toLocaleString('fr-FR') + (!passive && scanView.activePresentation !== 'tests' ? ' machines' : processes ? ' processus' : hosts ? ' adresses' : ' résultat' + (displayRows.length === 1 ? '' : 's'));
  $('#scanCopy').disabled = !displayCount;
  $('#scanExport').disabled = !displayCount;
  $('#scanExportJson').disabled = passive ? !scanView.report && !scanView.results.length : !activeDisplayedReport() && !filtered.length;
  renderCollectionPagination($('#scanPagination'), scanView, displayCount, () => {
    updateScanResults();
    $('#scanResultsPanel').scrollTop = 0
  });
  if (passive) updatePassiveOverview();
  else updateScanConsole();
}
async function startNetworkScan(view = scanView) {
  if (view.busy || !desktopBridge.available || $('#app').classList.contains('hidden')) return;
  const values = {
    ...view.values,
    target: view.values.target.trim()
  };
  try {
    if (values.strategy === 'active') {
      scanDestinationInfo(values);
      if (!Number.isInteger(values.timeoutMs) || values.timeoutMs < 100 || values.timeoutMs > 5000 || !Number.isInteger(values.concurrency) || values.concurrency < 1 || values.concurrency > 64) throw new Error('Délai : 100 à 5000 ms ; tests simultanés : 1 à 64.');
      if (values.mode === 'tcp') scanPortList(values.ports);
      if (values.mode === 'discovery' && scanPortList(values.discoveryPorts).length > 8) throw new Error('Choisis au maximum 8 ports TCP pour la découverte.');
    } else if (values.strategy !== 'passive' || !Object.hasOwn(SCAN_PASSIVE_SCOPES, values.passiveScope)) throw new Error('Choisis une source d’observation valide.');
  } catch (error) {
    view.error = error.message;
    stopPassiveMonitoring(view);
    updateScanResults();
    return
  }
  const previousReport = view.report;
  const retaining = values.strategy === 'passive' && !!previousReport;
  if (!view.monitoring) view.failures = 0;
  const scanId = uid();
  if (values.strategy === 'active') view.activePresentation = values.mode === 'discovery' ? 'hosts' : 'tests';
  Object.assign(view, {
    scanId,
    busy: true,
    stopping: false,
    error: '',
    pendingResults: [],
    retaining,
    lastAttempt: null,
    results: retaining ? view.results : [],
    report: retaining ? previousReport : null,
    completed: 0,
    total: 0,
    hosts: retaining ? view.hosts : 0,
    page: retaining ? view.page : 0,
    filter: values.strategy === 'passive' ? view.filter : 'all',
    runTarget: values.strategy === 'passive' ? 'Ce PC' : values.target,
    runMode: values.strategy === 'passive' ? 'passive' : values.mode,
    runStrategy: values.strategy,
    startedAt: now()
  });
  updateScanResults();
  try {
    const request = values.strategy === 'passive' ? {
      strategy: 'passive',
      passiveScope: values.passiveScope,
      scanId
    } : {
      ...values,
      scanId
    };
    const report = await desktopBridge.call('network.scan', request);
    if (view.scanId !== scanId) return;
    if (retaining && report.cancelled) {
      view.lastAttempt = {
        cancelled: true
      };
      Object.assign(view, {
        completed: previousReport.completed,
        total: previousReport.total
      })
    } else {
      if (values.strategy === 'passive') completePassiveSnapshot(view, report, previousReport);
      if (values.strategy === 'active' && report.mode === 'discovery') {
        view.discoveredHosts = new Map(report.results.map(row => [row.address, row]));
        view.discoveryReport = report;
      }
      Object.assign(view, {
        report,
        results: report.results,
        completed: report.completed,
        total: report.total,
        hosts: report.hosts
      });
    }
    Object.assign(view, {
      busy: false,
      stopping: false,
      retaining: false,
      pendingResults: []
    });
  } catch (error) {
    if (view.scanId !== scanId) return;
    if (view.stopping) {
      if (retaining) view.lastAttempt = {
        cancelled: true
      };
      else view.report = {
        scanId,
        target: view.runTarget,
        mode: view.runMode,
        strategy: view.runStrategy,
        startedAt: view.startedAt,
        finishedAt: now(),
        completed: view.completed,
        total: view.total,
        hosts: view.hosts,
        cancelled: true,
        results: view.results,
        scope: view.values.passiveScope,
        warnings: []
      }
    } else {
      view.error = error.message || 'Le scan a échoué.';
      view.failures++;
      view.lastAttempt = {
        error: view.error
      }
    }
    if (retaining) {
      view.completed = previousReport.completed;
      view.total = previousReport.total
    }
    view.busy = false;
    view.stopping = false;
    view.retaining = false;
    view.pendingResults = [];
  }
  if (values.strategy === 'passive') schedulePassiveSnapshot(view);
  updateScanResults();
}
async function stopNetworkScan() {
  const view = scanView;
  stopPassiveMonitoring(view);
  if (!view.busy) {
    updateScanResults();
    return
  }
  if (!view.busy || view.stopping) return;
  const scanId = view.scanId;
  view.stopping = true;
  updateScanResults();
  try {
    await desktopBridge.call('network.cancelScan', {
      scanId
    })
  } catch (error) {
    if (view.scanId === scanId && view.busy) {
      view.error = error.message;
      view.stopping = false;
      scheduleScanRender(view)
    }
  }
}

function exportScanResults(format) {
  const rows = filteredScanResults(),
    report = (scanView.runStrategy === 'active' ? activeDisplayedReport() : scanView.report) || {
      scanId: scanView.scanId,
      target: scanView.runTarget,
      mode: scanView.runMode,
      startedAt: scanView.startedAt,
      completed: scanView.completed,
      total: scanView.total,
      hosts: scanView.hosts,
      inProgress: scanView.busy
    };
  const passive = scanView.runStrategy === 'passive',
    exportStartedAt = report.startedAt || scanView.startedAt;
  if (passive && format === 'csv' && scanView.presentation !== 'observations') {
    passiveDownload(passiveCsv(passiveGroupedExport(rows)), 'text/csv;charset=utf-8', 'csv', scanView.presentation);
    return
  }
  if (!passive && format === 'csv') {
    downloadActiveData(passiveCsv(activeExportTable(rows)), 'text/csv;charset=utf-8', 'csv');
    return
  }
  let text, type;
  if (format === 'json') {
    text = JSON.stringify({
      ...report,
      strategy: scanView.runStrategy,
      results: rows,
      ...(passive ? passiveExportMetadata(rows) : {
        presentation: scanView.activePresentation,
        activeTaskInProgress: scanView.busy
      })
    }, null, 2);
    type = 'application/json'
  } else {
    const cell = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""') + '"';
    text = '\ufeff' + [
      ['Adresse IP', 'Port local ou testé', 'Transport', 'État', 'Délai (ms)', 'Usage indicatif ou source', 'Détail', 'Cible', 'Début', 'Collecte complète', 'Mode de scan', 'Interface', 'MAC', 'Adresse distante', 'Port distant', 'État observé', 'Limites', 'PID', 'Processus', 'Famille IP', 'Type d’adresse'], ...rows.map(row => [row.address, row.port, row.transport, SCAN_STATUS[row.status], row.latencyMs, scanRowUsage(row), row.detail, scanView.runTarget, exportStartedAt, !(passive && scanView.report ? report.cancelled || report.warnings?.length : scanView.busy || report.cancelled || scanView.error || report.warnings?.length), scanView.runStrategy, row.interfaceName, row.macAddress, row.remoteAddress, row.remotePort, row.observationState, (report.warnings || []).join(' · '), row.processId, row.processName, passiveFamily(row.address), passiveAddressKind(row.address)])
    ].map(row => row.map(cell).join(';')).join('\r\n');
    type = 'text/csv;charset=utf-8';
  }
  const url = URL.createObjectURL(new Blob([text], {
      type
    })),
    link = document.createElement('a');
  link.href = url;
  link.download = 'WolfGuard-scan-' + scanView.runStrategy + '-' + (exportStartedAt || now()).replace(/[:.]/g, '-') + '.' + format;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
