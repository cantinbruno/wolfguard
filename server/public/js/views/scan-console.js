'use strict';

function scanConsoleDefaults() {
  return {
    panel: 'results',
    activePresentation: 'hosts',
    activeRows: [],
    discoveredHosts: new Map(),
    discoveryReport: null,
    configCollapsed: false,
    filtersOpen: false
  }
}

function activeDisplayedReport() {
  return scanView.activePresentation === 'discovery' ? scanView.discoveryReport : scanView.report
}

function activeDisplayedRows() {
  return scanView.activePresentation === 'discovery' && scanView.discoveryReport ? scanView.discoveryReport.results : scanView.results
}

function mountScanConsole(passive) {
  const page = $('.scan-page'),
    form = $('#scanForm'),
    layout = document.createElement('div'),
    configuration = document.createElement('aside'),
    stage = document.createElement('div');
  layout.className = 'scan-console';
  configuration.className = 'scan-configuration';
  configuration.setAttribute('aria-label', 'Configuration du scan');
  stage.className = 'scan-stage';
  configuration.innerHTML = '<header class="scan-configuration-heading"><h2>' + (passive ? 'Observer ce poste' : 'Préparer l’analyse') + '</h2><button type="button" id="scanToggleConfig" aria-expanded="true" class="secondary protocol-button">Réduire</button></header>';
  configuration.append(form);
  layout.append(configuration, stage);
  const metricPaths = ['M4 5h16v11H4z M8 21h8 M12 16v5', 'M5 4v16 M19 4v16 M5 8h14 M5 16h14 M9 8v8 M15 8v8', 'M12 3a9 9 0 1 0 9 9 M12 7a5 5 0 1 0 5 5 M12 12l8-8'];
  for (const [index, metric] of [...$('.scan-stats').children].entries()) {
    const icon = document.createElement('span');
    icon.className = 'scan-stat-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="' + metricPaths[index] + '"/></svg>';
    metric.prepend(icon);
  }
  const remaining = [...page.children].filter(element => !element.matches('.scan-heading,.network-error,dialog'));
  for (const element of remaining)
    if (element !== layout) stage.append(element);
  page.append(layout);
  const results = document.createElement('section');
  results.id = 'scanPanelResults';
  results.className = 'scan-console-panel';
  const heading = $('#scanResultHeading');
  let current = heading;
  while (current) {
    const next = current.nextElementSibling;
    results.append(current);
    current = next
  }
  stage.append(results);
  if (passive) {
    const nav = document.createElement('nav');
    nav.className = 'scan-panel-navigation';
    nav.setAttribute('aria-label', 'Résultats et contexte');
    nav.setAttribute('role', 'tablist');
    nav.innerHTML = [
      ['results', 'Résultats'],
      ['network', 'Réseau local'],
      ['history', 'Évolution']
    ].map(([value, label]) => '<button type="button" role="tab" id="scanTab-' + value + '" data-scan-panel="' + value + '" aria-controls="scanPanel' + value[0].toUpperCase() + value.slice(1) + '">' + label + '</button>').join('');
    stage.insertBefore(nav, results.parentNode === stage ? results : stage.lastChild);
    const network = document.createElement('section'),
      history = document.createElement('section');
    network.id = 'scanPanelNetwork';
    history.id = 'scanPanelHistory';
    network.className = history.className = 'scan-console-panel';
    network.innerHTML = '<p id="scanNetworkEmpty" class="scan-context-empty">Lance une observation pour afficher les interfaces, les routes et la qualité des sources locales.</p>';
    history.innerHTML = '<p id="scanHistoryEmpty" class="scan-context-empty">Les relevés et leurs changements apparaîtront ici après une observation.</p>';
    network.append($('#passiveMetrics'), $('#passiveNetworkSummary').parentElement, $('#passiveSources').parentElement);
    history.append($('.passive-reference-controls'), $('#passiveReferenceStatus'), $('#passiveChangesDetails'), $('#passiveHistory').parentElement);
    $('.passive-workbench-toolbar').append($('.passive-focus-controls'));
    const advanced = document.createElement('details');
    advanced.className = 'scan-advanced-filters';
    advanced.innerHTML = '<summary>Filtres avancés et recherche par critères</summary>';
    const filters = $('#passiveFilters'),
      help = filters.nextElementSibling;
    filters.parentElement.insertBefore(advanced, filters);
    advanced.append(filters, $('.passive-query-help'), help);
    advanced.open = scanView.filtersOpen;
    advanced.ontoggle = () => {
      scanView.filtersOpen = advanced.open
    };
    for (const details of network.querySelectorAll('details')) details.open = true;
    history.querySelector('details:last-child').open = true;
    stage.append(results, network, history);
    for (const panel of [results, network, history]) {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'scanTab-' + panel.id.replace('scanPanel', '').toLowerCase())
    }
    for (const button of nav.querySelectorAll('button')) button.onclick = () => setScanPanel(button.dataset.scanPanel);
    nav.onkeydown = event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const buttons = [...nav.querySelectorAll('button')],
        index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].click();
      buttons[next].focus()
    };
    setScanPanel(scanView.panel);
  } else {
    const controls = document.createElement('div');
    controls.className = 'active-result-toolbar';
    controls.innerHTML = '<div class="passive-view-buttons" role="group" aria-label="Vue des résultats actifs"><button type="button" data-active-view="hosts">Machines</button><button type="button" data-active-view="tests">Détail des tests</button><button type="button" data-active-view="discovery" hidden>Découverte conservée</button></div><p id="activeResultSummary"></p>';
    results.insertBefore(controls, results.firstChild);
    stage.append(results);
    for (const button of controls.querySelectorAll('[data-active-view]')) button.onclick = () => {
      scanView.activePresentation = button.dataset.activeView;
      scanView.page = 0;
      scanView.filter = 'all';
      updateScanResults()
    };
    const dialog = document.createElement('dialog');
    dialog.id = 'activeObservationDialog';
    dialog.className = 'passive-dialog active-observation-dialog';
    dialog.setAttribute('aria-labelledby', 'activeDialogTitle');
    dialog.innerHTML = '<header><h2 id="activeDialogTitle">Résultat réseau</h2><button type="button" id="activeCloseDetail" class="secondary protocol-button">Fermer</button></header><div id="activeObservationDetail"></div><button type="button" id="activePreparePorts" class="primary protocol-button">Préparer l’analyse des ports</button>';
    page.append(dialog);
    $('#activeCloseDetail').onclick = () => dialog.close();
  }
  $('#scanToggleConfig').onclick = () => {
    scanView.configCollapsed = !scanView.configCollapsed;
    form.hidden = scanView.configCollapsed;
    $('#scanToggleConfig').setAttribute('aria-expanded', String(!scanView.configCollapsed));
    $('#scanToggleConfig').textContent = scanView.configCollapsed ? 'Afficher' : 'Réduire';
    page.classList.toggle('scan-config-collapsed', scanView.configCollapsed)
  };
  if (scanView.configCollapsed) {
    form.hidden = true;
    $('#scanToggleConfig').setAttribute('aria-expanded', 'false');
    $('#scanToggleConfig').textContent = 'Afficher';
    page.classList.add('scan-config-collapsed')
  }
}

function setScanPanel(value) {
  if (!['results', 'network', 'history'].includes(value)) value = 'results';
  scanView.panel = value;
  for (const button of document.querySelectorAll('[data-scan-panel]')) {
    const selected = button.dataset.scanPanel === value;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1
  }
  for (const name of ['Results', 'Network', 'History']) {
    const panel = $('#scanPanel' + name);
    if (panel) panel.hidden = name.toLowerCase() !== value
  }
}

function updateScanConsole() {
  const passive = scanView.values.strategy === 'passive';
  if (passive) {
    $('#scanNetworkEmpty').hidden = !!scanView.report;
    $('#scanHistoryEmpty').hidden = !!scanView.history.length;
    return
  }
  const mode = scanView.values.mode;
  $('#scanDiscoveryFields').hidden = mode !== 'discovery';
  $('#scanIdentifyLabel').hidden = mode !== 'tcp';
  $('#scanPortFields').hidden = mode !== 'tcp';
  $('#scanStart').lastChild.textContent = mode === 'discovery' ? 'Découvrir les machines' : mode === 'icmp' ? 'Tester la réponse ICMP' : 'Analyser les ports';
  let count = 1,
    valid = true;
  try {
    scanDestinationInfo(scanView.values);
    if (scanView.values.targetKind === 'cidr') count = Number(networkMath.subnet(scanView.values.target).hosts);
    else if (scanView.values.targetKind === 'range') {
      const parts = scanView.values.target.split('-').map(value => ipaddr.parse(value.trim()).toByteArray().reduce((total, byte) => total * 256 + byte, 0));
      count = parts[1] - parts[0] + 1
    }
  } catch {
    valid = false
  }
  let ports = [];
  try {
    ports = mode === 'icmp' ? [] : scanPortList(mode === 'discovery' ? scanView.values.discoveryPorts : scanView.values.ports);
    if (mode === 'discovery' && ports.length > 8) valid = false
  } catch {
    valid = false
  }
  const budget = count * (mode === 'discovery' ? ports.length + 1 : mode === 'icmp' ? 1 : ports.length);
  const dns = scanView.values.targetKind === 'host' && !ipaddr.isValid(scanView.values.target.trim());
  $('#scanPlan').textContent = valid ? (dns ? 'Nom DNS (estimation par adresse résolue)' : count.toLocaleString('fr-FR') + ' adresse' + (count > 1 ? 's' : '')) + ' · ' + budget.toLocaleString('fr-FR') + (mode === 'discovery' ? ' sondes maximum' : ' tests') + ' · ' + scanView.values.concurrency + ' simultanés' + (budget > 65536 && mode !== 'discovery' ? ' · Réduis le nombre de ports ou la plage.' : '') + (mode === 'tcp' && scanView.values.identifyServices ? ' · identification facultative, jusqu’à 1,5 s supplémentaire par port ouvert' : '') : 'Choisis une destination et les tests à effectuer. La découverte vérifie le ping et jusqu’à 8 ports TCP.';
  for (const button of document.querySelectorAll('[data-active-view]')) button.setAttribute('aria-pressed', String(scanView.activePresentation === button.dataset.activeView));
  $('[data-active-view="discovery"]').hidden = !scanView.discoveryReport;
  const inventory = activeHostInventory(activeDisplayedRows()),
    report = activeDisplayedReport(),
    open = inventory.reduce((sum, host) => sum + host.open.size, 0),
    found = inventory.filter(host => host.responding).length;
  $('#activeResultSummary').textContent = activeDisplayedRows().length ? (scanView.activePresentation === 'discovery' ? 'Découverte de ' + report.target + ' · ' : '') + found + ' machine' + (found > 1 ? 's' : '') + ' ayant répondu · ' + open + ' ports TCP ouverts' + (report?.active ? ' · ' + report.active.durationSeconds.toLocaleString('fr-FR', {
    maximumFractionDigits: 1
  }) + ' s' : '') : 'Les réponses réseau apparaîtront ici. « Sans réponse » ne signifie pas qu’une machine est éteinte.';
  $('#scanExportReport').disabled = !report;
}

function activeHostInventory(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.address)) map.set(row.address, {
      address: row.address,
      responding: false,
      open: new Set(),
      closed: 0,
      silent: 0,
      rows: [],
      services: new Set(),
      macAddress: row.macAddress || scanView.discoveredHosts.get(row.address)?.macAddress,
      interfaceName: row.interfaceName
    });
    const host = map.get(row.address);
    host.rows.push(row);
    host.responding ||= ['open', 'closed', 'reachable'].includes(row.status);
    if (row.status === 'open' && row.port != null) host.open.add(row.port);
    if (row.status === 'closed') host.closed++;
    if (row.status === 'no-response') host.silent++;
    for (const evidence of row.evidence || []) {
      if (evidence.status === 'open' && evidence.port != null) host.open.add(evidence.port);
      if (evidence.status === 'closed') host.closed++
    }
    if (row.service?.status === 'observed') host.services.add(row.service.protocol + (row.service.product ? ' · ' + row.service.product : ''))
  }
  return [...map.values()].sort((a, b) => Number(b.responding) - Number(a.responding) || passiveCompareAddress(a.address, b.address));
}

function activeServiceLabel(row) {
  return row.service?.status === 'observed' ? row.service.protocol + (row.service.product ? ' · ' + row.service.product : '') : row.port == null ? '—' : 'Repère : ' + scanServiceLabel(row.port, row.transport)
}

function renderActiveTable(filtered) {
  const hosts = scanView.activePresentation !== 'tests',
    data = hosts ? activeHostInventory(filtered) : filtered,
    page = collectionPageSlice(data, scanView);
  scanView.activeRows = page;
  $('.scan-table').classList.toggle('is-active-hosts', hosts);
  $('#scanTableHead').innerHTML = '<tr>' + (hosts ? ['Machine', 'Présence observée', 'Ports TCP ouverts', 'Réponses / services', 'MAC connue', 'Actions'] : ['Adresse', 'Port', 'Transport', 'Résultat', 'Délai', 'Service / preuve']).map(label => '<th scope="col">' + label + '</th>').join('') + '</tr>';
  $('#scanRows').innerHTML = hosts ? page.map((host, index) => '<tr><td class="scan-address"><button type="button" class="passive-address-button" data-active-detail="' + index + '">' + esc(host.address) + '</button></td><td><span class="scan-state ' + (host.responding ? 'is-reachable' : 'is-no-response') + '">' + (host.responding ? 'Réponse confirmée' : 'Non confirmée') + '</span></td><td>' + ([...host.open].sort((a, b) => a - b).join(', ') || '—') + '</td><td class="scan-service">' + esc([...host.services].join(' · ') || host.rows[0].detail) + '</td><td class="scan-observation-context">' + esc(host.macAddress || '—') + '</td><td><button type="button" class="secondary protocol-button" data-active-ports="' + index + '" ' + (scanView.busy ? 'disabled' : '') + '>Analyser les ports</button></td></tr>').join('') : page.map((row, index) => '<tr><td class="scan-address"><button type="button" class="passive-address-button" data-active-detail="' + index + '">' + esc(row.address) + '</button></td><td>' + (row.port == null ? '—' : '<button type="button" class="scan-port-reference" data-scan-reference="' + row.port + '" data-scan-transport="' + esc(row.transport) + '">' + row.port + '</button>') + '</td><td>' + esc(row.transport) + '</td><td><span class="scan-state is-' + esc(row.status) + '" title="' + esc(row.detail) + '">' + esc(SCAN_STATUS[row.status] || row.status) + '</span></td><td class="scan-latency">' + (row.latencyMs == null ? '—' : row.latencyMs.toLocaleString('fr-FR') + ' ms') + '</td><td class="scan-service">' + esc(activeServiceLabel(row)) + (row.service?.status === 'observed' ? '<small>Réponse observée · <button type="button" class="passive-address-button" data-active-detail="' + index + '">Voir la preuve</button></small>' : '') + '</td></tr>').join('');
  return data.length;
}

function showActiveDetail(index) {
  const item = scanView.activeRows[index];
  if (!item) return;
  const rows = item.rows || [item],
    address = item.address;
  $('#activeDialogTitle').textContent = address;
  $('#activeObservationDetail').innerHTML = rows.map(row => '<article class="active-evidence"><h3>' + esc(row.port == null ? row.transport : row.transport + ' / ' + row.port) + '</h3><p>' + esc(row.detail) + '</p>' + (row.evidence ? '<dl>' + row.evidence.map(proof => '<div><dt>' + esc(proof.transport + (proof.port == null ? '' : ' ' + proof.port)) + '</dt><dd>' + esc(SCAN_STATUS[proof.status] || proof.status) + (proof.latencyMs == null ? '' : ' · ' + proof.latencyMs + ' ms') + '</dd></div>').join('') + '</dl>' : '') + (row.service ? '<h4>' + esc(row.service.protocol) + '</h4><p>' + esc(row.service.note || 'Réponse reçue du service distant.') + '</p>' + (row.service.banner ? '<pre>' + esc(row.service.banner) + '</pre>' : '') + (row.service.certificate ? '<dl>' + Object.entries({
    'Sujet': row.service.certificate.subject,
    'Émetteur': row.service.certificate.issuer,
    'Début': row.service.certificate.notBefore,
    'Expiration': row.service.certificate.notAfter,
    'Protocole négocié': row.service.certificate.protocol,
    'Validation locale': row.service.certificate.validation
  }).map(([label, value]) => '<div><dt>' + label + '</dt><dd>' + esc(value) + '</dd></div>').join('') + '</dl>' : '') : '') + '</article>').join('');
  $('#activePreparePorts').disabled = scanView.busy;
  $('#activePreparePorts').onclick = () => {
    if (scanView.busy) return;
    $('#activeObservationDialog').close();
    prepareActiveTarget(address)
  };
  $('#activeObservationDialog').showModal();
}
async function prepareActiveTarget(address) {
  const active = scanViews.active;
  if (active.busy) return;
  Object.assign(active.values, {
    target: address,
    targetKind: 'host',
    mode: 'tcp',
    preset: 'common',
    ports: SCAN_PORT_PRESETS.common
  });
  active.error = '';
  active.configCollapsed = false;
  await openSection('scan-active');
  $('#scanTarget')?.focus();
}

function passivePrepareActions(addresses) {
  $('#passivePrepareTargets')?.remove();
  const usable = [...new Set(addresses)].filter(address => address && !['Toutes les interfaces', 'Multicast', 'Broadcast', 'Inconnue'].includes(passiveAddressKind(address)));
  if (!usable.length) return;
  const controls = document.createElement('div');
  controls.id = 'passivePrepareTargets';
  controls.className = 'scan-passive-target-actions';
  for (const address of usable) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary protocol-button';
    button.textContent = 'Préparer un scan actif de ' + address;
    button.disabled = scanViews.active.busy;
    button.onclick = () => {
      $('#passiveObservationDialog').close();
      prepareActiveTarget(address)
    };
    controls.append(button)
  }
  $('#passiveObservationDialog').insertBefore(controls, $('#passiveCopyDetail'));
}

function downloadActiveData(text, type, extension) {
  const url = URL.createObjectURL(new Blob([text], {
      type
    })),
    link = document.createElement('a');
  link.href = url;
  link.download = 'WolfGuard-actif-' + (activeDisplayedReport()?.startedAt || now()).replace(/[:.]/g, '-') + '.' + extension;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function activeExportTable(rows) {
  if (scanView.activePresentation !== 'tests') return [
    ['Machine', 'Réponse confirmée', 'Ports TCP ouverts', 'Services observés', 'MAC connue'], ...activeHostInventory(rows).map(host => [host.address, host.responding ? 'Oui' : 'Non confirmée', [...host.open].sort((a, b) => a - b).join(', '), [...host.services].join(' · '), host.macAddress])
  ];
  return [
    ['Adresse', 'Port', 'Transport', 'Résultat', 'Délai (ms)', 'Détail', 'Service observé', 'Produit annoncé', 'Bannière', 'Certificat TLS', 'Preuves de découverte'], ...rows.map(row => [row.address, row.port, row.transport, SCAN_STATUS[row.status] || row.status, row.latencyMs, row.detail, row.service?.protocol, row.service?.product, row.service?.banner, row.service?.certificate ? JSON.stringify(row.service.certificate) : '', row.evidence ? JSON.stringify(row.evidence) : ''])
  ]
}

function exportActiveReport() {
  const rows = filteredScanResults(),
    report = activeDisplayedReport();
  if (!report) return;
  const proofs = rows.filter(row => row.evidence || row.service).map(row => '<h3>' + esc(passiveEndpoint(row.address, row.port)) + '</h3><pre>' + esc(JSON.stringify({
    evidence: row.evidence,
    service: row.service
  }, null, 2)) + '</pre>').join('');
  const table = activeExportTable(rows),
    html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WolfGuard — analyse réseau</title><style>body{font:14px system-ui;max-width:1400px;margin:30px auto;padding:20px;color:#203140}table{border-collapse:collapse;width:100%;font-size:12px}td,th{padding:9px;border:1px solid #ccd7df;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere}th{background:#e6edf3}.table{overflow:auto}h1{color:#315c6e}@media print{.table{overflow:visible}tr{break-inside:avoid}table{font-size:9px}}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f5f8;padding:12px;font-size:11px;line-height:1.6}</style></head><body><h1>WolfGuard · analyse réseau</h1><p>Cible : ' + esc(report.target) + ' · ' + esc(report.mode) + ' · ' + esc(new Date(report.finishedAt).toLocaleString('fr-FR')) + '</p><p>' + report.completed + ' / ' + report.total + ' ' + (report.mode === 'discovery' ? 'machines traitées' : 'tests') + ' · ' + (report.cancelled ? 'Analyse arrêtée, résultats partiels.' : 'Analyse terminée.') + '</p><p>Une réponse TCP refusée confirme un hôte répondant. L’absence de réponse ne prouve pas qu’une machine est éteinte. Les services affichés comme observés proviennent des réponses reçues ; les repères de ports ne constituent pas une identification.</p><div class="table"><table><thead><tr>' + table[0].map(value => '<th>' + esc(value) + '</th>').join('') + '</tr></thead><tbody>' + table.slice(1).map(row => '<tr>' + row.map(value => '<td>' + esc(value ?? '—') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' + (proofs ? '<h2>Réponses et preuves reçues</h2>' + proofs : '') + '</body></html>';
  const url = URL.createObjectURL(new Blob([html], {
      type: 'text/html;charset=utf-8'
    })),
    link = document.createElement('a');
  link.href = url;
  link.download = 'WolfGuard-actif-' + report.startedAt.replace(/[:.]/g, '-') + '.html';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
