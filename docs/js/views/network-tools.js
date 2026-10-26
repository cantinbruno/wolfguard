'use strict';

const NETWORK_TOOL_ICONS = {
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  radar: '<path d="M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 12l8-8"/><circle cx="12" cy="12" r="1"/>',
  analyze: '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',
  cidr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  mask: '<path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6"/>',
  membership: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  overlaps: '<rect x="3" y="3" width="12" height="12" rx="2"/><rect x="9" y="9" width="12" height="12" rx="2"/>',
  hash: '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="m16 3-2 18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 8 5-5 5 5M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2.5 6.2M3 3v8h8"/>'
};
const NETWORK_TOOL_DEFAULTS = {
  network: '192.0.2.37/24',
  mask: '',
  membership: '',
  overlaps: ''
};
const HASH_TOOL_DEFAULTS = {
  algorithm: 'auto',
  expected: ''
};
const networkToolsView = {
  tool: 'ip',
  values: {
    ...NETWORK_TOOL_DEFAULTS
  },
  page: 0,
  result: null,
  copy: '',
  timer: null,
  hash: {
    values: {
      ...HASH_TOOL_DEFAULTS
    },
    file: null,
    result: null,
    copy: '',
    busy: false,
    error: '',
    request: 0,
    controller: null,
    progress: null,
    cancelled: false,
    activeAlgorithm: '',
    sourceName: '',
    importRequest: 0,
    importBusy: false
  }
};

function networkToolIcon(name) {
  return '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + NETWORK_TOOL_ICONS[name] + '</svg>'
}

function resetNetworkTools() {
  clearTimeout(networkToolsView.timer);
  networkToolsView.tool = 'ip';
  networkToolsView.values = {
    ...NETWORK_TOOL_DEFAULTS
  };
  networkToolsView.result = null;
  networkToolsView.copy = '';
  networkToolsView.page = 0;
  resetHashToolState();
  resetTextTools();
  for (const input of document.querySelectorAll('[data-network-value]')) input.value = NETWORK_TOOL_DEFAULTS[input.dataset.networkValue] || '';
  if ($('#networkResult')) $('#networkResult').replaceChildren();
  if ($('#networkError')) {
    $('#networkError').textContent = '';
    $('#networkError').hidden = true
  }
  if ($('#networkCopy')) $('#networkCopy').disabled = true;
  for (const input of document.querySelectorAll('[data-hash-value]')) input.value = HASH_TOOL_DEFAULTS[input.dataset.hashValue] || '';
  if ($('#hash-file')) $('#hash-file').value = '';
  if ($('#hashResult')) $('#hashResult').replaceChildren();
  if ($('#hashError')) {
    $('#hashError').textContent = '';
    $('#hashError').hidden = true
  }
  if ($('#hashCopy')) $('#hashCopy').disabled = true;
  updateHashFormState();
  if ($('#hashResultSummary')) $('#hashResultSummary').textContent = '';
  if ($('#hashExport')) $('#hashExport').disabled = true;
}

function resetHashToolState() {
  const hash = networkToolsView.hash;
  cancelHashCalculation();
  hash.values = {
    ...HASH_TOOL_DEFAULTS
  };
  hash.file = null;
  hash.result = null;
  hash.copy = '';
  hash.error = '';
  hash.sourceName = '';
  hash.importBusy = false;
  hash.importRequest++;
}

function networkResultRow(label, value) {
  return '<div class="network-result-row"><dt>' + esc(label) + '</dt><dd>' + esc(value ?? '\u2014') + '</dd></div>'
}

function networkSummaryCard(label, value) {
  return '<div class="network-summary-card"><span>' + esc(label) + '</span><strong>' + esc(value ?? '\u2014') + '</strong></div>'
}

function networkPrefixHTML(prefix, bits) {
  return '<div class="network-prefix"><div class="network-prefix-labels"><span>R\u00e9seau : ' + prefix + ' bits</span><span>Adresse : ' + (bits - prefix) + ' bits</span></div><div class="network-prefix-track" aria-hidden="true" style="--network-bits:' + bits + '">' + Array.from({
    length: bits
  }, (_, index) => '<span class="' + (index < prefix ? 'is-network' : 'is-host') + '"></span>').join('') + '</div></div>';
}

function networkFieldHTML(name, label, value, placeholder, multiline = false, optional = false) {
  return '<div class="field network-field network-field-' + name + '"><label for="network-' + name + '">' + label + (optional ? '<span>Optionnel</span>' : '') + '</label>' + (multiline ? '<textarea' : '<input type="text"') + ' id="network-' + name + '" data-network-value="' + name + '" ' + (multiline ? 'rows="7"' : 'maxlength="200" value="' + esc(value) + '"') + ' placeholder="' + esc(placeholder) + '" autocomplete="off" spellcheck="false" aria-describedby="networkError">' + (multiline ? esc(value) + '</textarea>' : '') + '</div>';
}

function networkToolNavigationButton(tool, icon, label) {
  return '<button type="button" data-network-tool="' + tool + '" ' + (networkToolsView.tool === tool ? 'aria-current="page"' : '') + '>' + networkToolIcon(icon) + '<span>' + label + '</span></button>';
}
async function renderNetworkTools() {
  if (!['ip', 'hash', 'text'].includes(networkToolsView.tool)) networkToolsView.tool = 'ip';
  if (networkToolsView.tool === 'text') return renderTextTools();
  $('#content').innerHTML = '<div class="toolbox-network-workspace"><div id="detailHost">' + (networkToolsView.tool === 'hash' ? renderHashVerifierHTML() : renderNetworkAnalysisHTML()) + '</div></div>';
  if (networkToolsView.tool === 'hash') initHashVerifierTool();
  else initNetworkAnalysisTool();
}

function renderNetworkAnalysisHTML() {
  const values = networkToolsView.values;
  return `<div class="network-tools-page">
      <header class="network-tool-heading">${workspaceNavigationButton()}<span class="toolbox-page-symbol" aria-hidden="true">${networkToolIcon('cidr')}</span><div><h2>Analyse IP et sous-r\u00e9seaux</h2><p>Comprendre une adresse, calculer un masque et comparer des plages.</p></div><button type="button" class="secondary workspace-icon" id="networkReset" title="Effacer les champs" aria-label="Effacer les champs">${networkToolIcon('reset')}</button></header>
      <form id="networkToolForm" class="network-unified-form" novalidate>
        <div class="network-primary-fields">
          ${networkFieldHTML('network','R\u00e9seau ou adresse CIDR',values.network,'192.0.2.37/24')}
          <button type="submit" class="primary network-submit">${networkToolIcon('analyze')}Analyser</button>
        </div>
        <details id="networkAdvanced" class="network-advanced" ${(values.mask||values.membership||values.overlaps)?'open':''}><summary>Options avanc\u00e9es <span>Masque, appartenance, chevauchements</span>${PROTOCOL_ICONS.open}</summary><div class="network-unified-fields">
          ${networkFieldHTML('mask','Masque ou pr\u00e9fixe \u00e0 convertir',values.mask,'255.255.255.0 ou /24',false,true)}
          ${networkFieldHTML('membership','Adresse \u00e0 v\u00e9rifier',values.membership,'192.0.2.42',false,true)}
          ${networkFieldHTML('overlaps','Plages CIDR \u00e0 comparer',values.overlaps,'192.0.2.0/24\n192.0.2.128/25',true,true)}
        </div></details>
        <p id="networkError" class="network-error" role="alert" hidden></p>
      </form>
      <section class="network-tool-results network-unified-results" aria-label="R\u00e9sultats"><header><div><h3>R\u00e9sultats de l\u2019analyse</h3><p id="networkResultSummary"></p></div><button type="button" class="secondary workspace-icon" id="networkCopy" title="Copier tous les r\u00e9sultats" aria-label="Copier tous les r\u00e9sultats" disabled>${ITEM_ACTION_ICONS.copy}</button></header><div id="networkResult" aria-live="polite"></div></section>
    </div>`;
}

function initNetworkAnalysisTool() {
  const form = $('#networkToolForm'),
    key = state.vaultKey;
  const update = () => {
    if (!form.isConnected || state.section !== 'tools' || networkToolsView.tool !== 'ip' || !itemActionSessionValid(key)) return;
    for (const input of form.querySelectorAll('[data-network-value]')) networkToolsView.values[input.dataset.networkValue] = input.value;
    networkToolsView.page = 0;
    renderUnifiedNetworkResult();
  };
  form.onsubmit = event => {
    event.preventDefault();
    clearTimeout(networkToolsView.timer);
    update()
  };
  form.oninput = event => {
    if (event.target.dataset.networkValue) networkToolsView.values[event.target.dataset.networkValue] = event.target.value
  };
  $('#networkReset').onclick = () => {
    clearTimeout(networkToolsView.timer);
    for (const input of form.querySelectorAll('[data-network-value]')) {
      input.value = '';
      networkToolsView.values[input.dataset.networkValue] = ''
    }
    update();
    $('#network-network').focus();
  };
  $('#networkCopy').onclick = async event => {
    const button = event.currentTarget;
    if (!networkToolsView.copy || !itemActionSessionValid(key)) return;
    button.disabled = true;
    const copied = await copyText(networkToolsView.copy);
    if (!button.isConnected || !itemActionSessionValid(key)) return;
    button.disabled = false;
    if (copied) {
      button.innerHTML = ITEM_ACTION_ICONS.check;
      button.title = 'Copi\u00e9';
      setTimeout(() => {
        if (button.isConnected) {
          button.innerHTML = ITEM_ACTION_ICONS.copy;
          button.title = 'Copier tous les r\u00e9sultats'
        }
      }, 1600)
    } else {
      $('#networkError').hidden = false;
      $('#networkError').textContent = 'Copie impossible.'
    }
  };
  update();
}

function renderUnifiedNetworkResult() {
  const values = networkToolsView.values,
    host = $('#networkResult'),
    error = $('#networkError'),
    copy = $('#networkCopy'),
    summary = $('#networkResultSummary');
  error.hidden = true;
  error.textContent = '';
  copy.disabled = true;
  summary.textContent = '';
  networkToolsView.copy = '';
  networkToolsView.result = null;
  $('#networkToolForm').querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  if (!values.network.trim()) {
    host.innerHTML = '<div class="network-empty">Saisis au minimum un r\u00e9seau CIDR.</div>';
    $('#network-network').setAttribute('aria-invalid', 'true');
    return;
  }
  const calculate = (field, run) => {
    try {
      return run()
    } catch (problem) {
      $('#network-' + field).setAttribute('aria-invalid', 'true');
      throw problem
    }
  };
  try {
    const subnet = calculate('network', () => networkMath.subnet(values.network)),
      sections = [],
      copyLines = [];
    const networkRows = [
      ['R\u00e9seau CIDR', subnet.cidr],
      ['Masque', subnet.mask],
      ['Premi\u00e8re adresse', subnet.network.toString()],
      ['Derni\u00e8re adresse', subnet.last.toString()],
      ['Adresses totales', subnet.size.toLocaleString('fr-FR')]
    ];
    if (subnet.family === 'ipv4') networkRows.push(['Wildcard', subnet.wildcard], ['Broadcast', subnet.broadcast], ['Premi\u00e8re adresse h\u00f4te', subnet.firstHost], ['Derni\u00e8re adresse h\u00f4te', subnet.lastHost], ['Adresses h\u00f4tes' + (subnet.prefix === 31 ? ' (point \u00e0 point)' : ''), subnet.hosts.toLocaleString('fr-FR')]);
    sections.push('<details class="network-result-detail" open><summary>' + networkToolIcon('cidr') + '<strong>D\u00e9tails du sous-r\u00e9seau</strong><span>' + esc(subnet.cidr) + '</span>' + PROTOCOL_ICONS.open + '</summary><div class="network-result-detail-body">' + networkPrefixHTML(subnet.prefix, subnet.bits) + '<dl class="network-result-list">' + networkRows.map(row => networkResultRow(...row)).join('') + '</dl></div></details>');
    copyLines.push('SOUS-RESEAU', ...networkRows.map(row => row[0] + ' : ' + (row[1] ?? '\u2014')));
    if (values.mask.trim()) {
      const converted = calculate('mask', () => networkMath.mask(values.mask, subnet.family)),
        rows = [
          ['Pr\u00e9fixe CIDR', '/' + converted.prefix],
          ['Masque', converted.mask],
          ['Bits r\u00e9seau', converted.prefix],
          ['Bits adresse', converted.bits - converted.prefix],
          ['Adresses totales', converted.size.toLocaleString('fr-FR')]
        ];
      if (converted.wildcard) rows.push(['Wildcard', converted.wildcard]);
      sections.push('<details class="network-result-detail"><summary>' + networkToolIcon('mask') + '<strong>Conversion du masque</strong><span>/' + converted.prefix + '</span>' + PROTOCOL_ICONS.open + '</summary><div class="network-result-detail-body"><dl class="network-result-list">' + rows.map(row => networkResultRow(...row)).join('') + '</dl></div></details>');
      copyLines.push('', 'MASQUE', ...rows.map(row => row[0] + ' : ' + row[1]));
    }
    if (values.membership.trim()) {
      const membership = calculate('membership', () => networkMath.membership(values.membership, subnet.cidr)),
        rows = [
          ['Adresse', membership.address],
          ['R\u00e9seau', membership.range.cidr],
          ['Appartenance', membership.belongs ? 'Oui' : 'Non']
        ];
      if (membership.role) rows.push(['Type d\u2019adresse', membership.role]);
      sections.push('<details class="network-result-detail"><summary>' + networkToolIcon('membership') + '<strong>Appartenance</strong><span class="' + (membership.belongs ? 'is-match' : 'is-outside') + '">' + (membership.belongs ? 'Dans le r\u00e9seau' : 'Hors du r\u00e9seau') + '</span>' + PROTOCOL_ICONS.open + '</summary><div class="network-result-detail-body"><dl class="network-result-list">' + rows.map(row => networkResultRow(...row)).join('') + '</dl></div></details>');
      copyLines.push('', 'APPARTENANCE', ...rows.map(row => row[0] + ' : ' + row[1]));
    }
    let overlaps = null;
    if (values.overlaps.trim()) {
      overlaps = calculate('overlaps', () => networkMath.overlaps(values.overlaps));
      networkToolsView.result = {
        subnet,
        overlaps
      };
      sections.push('<details class="network-result-detail"><summary>' + networkToolIcon('overlaps') + '<strong>Chevauchements</strong><span>' + overlaps.pairs.length + ' d\u00e9tect\u00e9(s)</span>' + PROTOCOL_ICONS.open + '</summary><div id="networkOverlapResult" class="network-result-detail-body"></div></details>');
      copyLines.push('', 'CHEVAUCHEMENTS', overlaps.ranges.length + ' plages, ' + overlaps.pairs.length + ' chevauchement(s)', ...overlaps.pairs.map(pair => 'Lignes ' + pair.first.line + ' / ' + pair.second.line + ' : ' + pair.first.cidr + ' | ' + pair.second.cidr + ' | ' + pair.relation + ' | ' + pair.intersection));
    } else networkToolsView.result = {
      subnet,
      overlaps: null
    };
    const summaryCards = [
      ['R\u00e9seau', subnet.cidr],
      ['Masque', subnet.mask],
      ['Derni\u00e8re adresse', subnet.last.toString()],
      [subnet.family === 'ipv4' ? 'H\u00f4tes' : 'Adresses', subnet.family === 'ipv4' ? subnet.hosts.toLocaleString('fr-FR') : subnet.size.toLocaleString('fr-FR')]
    ];
    host.innerHTML = '<div class="network-summary-grid">' + summaryCards.map(card => networkSummaryCard(...card)).join('') + '</div><div class="network-result-details">' + sections.join('') + '</div>';
    if (overlaps) renderNetworkOverlapsPage();
    summary.textContent = subnet.family.toUpperCase() + ' \u00b7 /' + subnet.prefix;
    networkToolsView.copy = copyLines.join('\n');
    copy.disabled = false;
  } catch (problem) {
    host.innerHTML = '<div class="network-empty">Corrige le champ signal\u00e9 pour relancer l\u2019analyse.</div>';
    summary.textContent = 'Analyse incompl\u00e8te';
    error.hidden = false;
    error.textContent = problem.message;
    if ($('#network-mask')?.hasAttribute('aria-invalid') || $('#network-membership')?.hasAttribute('aria-invalid') || $('#network-overlaps')?.hasAttribute('aria-invalid')) $('#networkAdvanced').open = true;
  }
}

function renderNetworkOverlapsPage() {
  const data = networkToolsView.result?.overlaps;
  if (!data || !$('#networkOverlapResult')) return;
  const limit = 50,
    pages = Math.max(1, Math.ceil(data.pairs.length / limit));
  networkToolsView.page = Math.max(0, Math.min(pages - 1, networkToolsView.page));
  const start = networkToolsView.page * limit,
    pairs = data.pairs.slice(start, start + limit);
  $('#networkOverlapResult').innerHTML = '<div class="network-overlap-summary"><strong>' + data.pairs.length.toLocaleString('fr-FR') + ' chevauchement(s)</strong><span>' + data.ranges.length + ' plages</span></div>' + (pairs.length ? '<table class="network-overlap-table"><thead><tr><th>Plage A</th><th>Plage B</th><th>Relation</th></tr></thead><tbody>' + pairs.map(pair => '<tr><td data-label="Plage A"><code>' + esc(pair.first.cidr) + '</code><small>Ligne ' + pair.first.line + '</small></td><td data-label="Plage B"><code>' + esc(pair.second.cidr) + '</code><small>Ligne ' + pair.second.line + '</small></td><td data-label="Relation">' + pair.relation + '</td></tr>').join('') + '</tbody></table>' : '<div class="network-no-overlap">' + ITEM_ACTION_ICONS.check + 'Aucun chevauchement.</div>') + (pages > 1 ? '<div class="network-pagination"><button type="button" id="networkPrevious" class="secondary workspace-icon" title="Page pr\u00e9c\u00e9dente" aria-label="Page pr\u00e9c\u00e9dente" ' + (networkToolsView.page === 0 ? 'disabled' : '') + '>' + PROTOCOL_ICONS.back + '</button><span>' + (start + 1) + '\u2013' + (start + pairs.length) + ' / ' + data.pairs.length + '</span><button type="button" id="networkNext" class="secondary workspace-icon" title="Page suivante" aria-label="Page suivante" ' + (networkToolsView.page === pages - 1 ? 'disabled' : '') + '>' + PROTOCOL_ICONS.open + '</button></div>' : '');
  const previous = $('#networkPrevious'),
    next = $('#networkNext');
  if (previous) previous.onclick = () => {
    networkToolsView.page--;
    renderNetworkOverlapsPage()
  };
  if (next) next.onclick = () => {
    networkToolsView.page++;
    renderNetworkOverlapsPage()
  };
}

function renderHashVerifierHTML() {
  const values = networkToolsView.hash.values;
  return '<div class="network-tools-page hash-tools-page">' +
    '<header class="network-tool-heading">' + workspaceNavigationButton() + '<span class="toolbox-page-symbol" aria-hidden="true">' + networkToolIcon('hash') + '</span><div><h2>V\u00e9rifier un fichier</h2><p>Calculer une empreinte et comparer le fichier \u00e0 une r\u00e9f\u00e9rence.</p></div><button type="button" class="secondary workspace-icon" id="hashReset" title="Effacer les champs" aria-label="Effacer les champs">' + networkToolIcon('reset') + '</button></header>' +
    '<form id="hashToolForm" class="network-unified-form hash-tool-form" novalidate>' +
    '<div class="hash-primary-fields">' +
    '<div id="hashDropZone" class="hash-file-field"><input id="hash-file" class="hash-file-input" type="file" aria-label="Fichier \u00e0 v\u00e9rifier" aria-describedby="hashError"><label for="hash-file" class="hash-file-picker">' + networkToolIcon('file') + '<span><strong id="hashFileName">Choisir ou d\u00e9poser un fichier</strong><small id="hashFileMeta">Aucun fichier s\u00e9lectionn\u00e9</small></span>' + networkToolIcon('upload') + '</label><button type="button" class="secondary workspace-icon" id="hashRemove" title="Retirer le fichier" aria-label="Retirer le fichier" hidden>' + networkToolIcon('close') + '</button></div>' +
    '<div class="field network-field hash-algorithm-field"><label for="hash-algorithm">Algorithme</label><select id="hash-algorithm" data-hash-value="algorithm" aria-describedby="hashError"><option value="auto" ' + (values.algorithm === 'auto' ? 'selected' : '') + '>Automatique</option>' + Object.keys(fileHashTools.algorithms).map(algorithm => '<option value="' + algorithm + '" ' + (values.algorithm === algorithm ? 'selected' : '') + '>' + algorithm + '</option>').join('') + '</select></div>' +
    '<div class="hash-submit-actions"><button type="submit" id="hashSubmit" class="primary network-submit hash-submit">' + networkToolIcon('hash') + '<span>Calculer</span></button><button type="button" class="secondary network-submit hash-cancel" id="hashCancel" title="Annuler le calcul" aria-label="Annuler le calcul" hidden>' + networkToolIcon('stop') + '<span>Annuler</span></button></div>' +
    '</div>' +
    '<div class="field network-field hash-expected-field"><div class="hash-expected-label"><label for="hash-expected">Hash attendu <span>Optionnel</span></label><button type="button" class="secondary workspace-icon" id="hashImport" title="Importer une somme de contr\u00f4le" aria-label="Importer une somme de contr\u00f4le">' + networkToolIcon('upload') + '</button><input id="hash-checksum-file" type="file" accept=".md5,.sha1,.sha256,.sha384,.sha512,.txt,.asc,.sum" hidden></div><textarea id="hash-expected" data-hash-value="expected" rows="2" placeholder="Hash ou ligne SHA256SUMS" autocomplete="off" spellcheck="false" aria-describedby="hashError hashExpectedMeta">' + esc(values.expected) + '</textarea><p id="hashExpectedMeta" class="hash-expected-meta"></p></div>' +
    '<p id="hashError" class="network-error" role="alert" hidden></p>' +
    '</form>' +
    '<section class="network-tool-results network-unified-results hash-unified-results" aria-label="R\u00e9sultat du hachage"><header><div><h3>R\u00e9sultat</h3><p id="hashResultSummary" aria-live="polite"></p></div><div class="hash-result-actions"><button type="button" class="secondary workspace-icon" id="hashCopy" title="Copier le rapport" aria-label="Copier le rapport" disabled>' + ITEM_ACTION_ICONS.copy + '</button><button type="button" class="secondary workspace-icon" id="hashExport" title="T\u00e9l\u00e9charger la somme de contr\u00f4le" aria-label="T\u00e9l\u00e9charger la somme de contr\u00f4le" disabled>' + networkToolIcon('download') + '</button></div></header><div id="hashResult"></div></section>' +
    '</div>';
}

function cancelHashCalculation(cancelled = false) {
  const hash = networkToolsView.hash,
    wasBusy = hash.busy;
  hash.controller?.abort();
  hash.controller = null;
  hash.request++;
  hash.busy = false;
  hash.progress = null;
  hash.activeAlgorithm = '';
  hash.cancelled = cancelled && wasBusy;
}

function invalidateHashResult() {
  const hash = networkToolsView.hash;
  cancelHashCalculation();
  hash.result = null;
  hash.copy = '';
  hash.error = '';
}

function selectHashFile(files) {
  const hash = networkToolsView.hash;
  if (files.length > 1) {
    hash.error = 'S\u00e9lectionne un seul fichier \u00e0 v\u00e9rifier.';
    renderHashResult();
    return
  }
  invalidateHashResult();
  hash.file = files[0] || null;
  renderHashResult();
}

function syncHashAlgorithm() {
  const hash = networkToolsView.hash;
  if (hash.values.algorithm !== 'auto') return;
  try {
    const expected = fileHashTools.resolveExpected(hash.values.expected, 'auto', hash.file?.name || '');
    if ((hash.result && hash.result.algorithm !== expected.algorithm) || (hash.busy && hash.activeAlgorithm !== expected.algorithm)) invalidateHashResult();
  } catch {
    if (hash.busy) invalidateHashResult()
  }
}

function initHashVerifierTool() {
  const hash = networkToolsView.hash,
    form = $('#hashToolForm'),
    fileInput = $('#hash-file'),
    dropZone = $('#hashDropZone'),
    key = state.vaultKey;
  const active = () => form.isConnected && state.section === 'tools' && networkToolsView.tool === 'hash' && itemActionSessionValid(key);
  fileInput.onchange = () => {
    if (active()) selectHashFile([...fileInput.files])
  };
  let dragDepth = 0;
  dropZone.ondragenter = event => {
    if (!active() || !Array.from(event.dataTransfer?.types || []).includes('Files')) return;
    event.preventDefault();
    dragDepth++;
    dropZone.classList.add('is-dragging');
  };
  dropZone.ondragover = event => {
    if (!active()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  };
  dropZone.ondragleave = event => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) dropZone.classList.remove('is-dragging');
  };
  dropZone.ondrop = event => {
    event.preventDefault();
    dragDepth = 0;
    dropZone.classList.remove('is-dragging');
    if (!active()) return;
    const files = [...event.dataTransfer.files];
    if (files.length) {
      fileInput.value = '';
      selectHashFile(files)
    }
  };
  $('#hashRemove').onclick = () => {
    if (active()) {
      fileInput.value = '';
      selectHashFile([]);
      fileInput.focus()
    }
  };
  const updateValue = event => {
    if (!active() || !event.target.dataset.hashValue) return;
    hash.values[event.target.dataset.hashValue] = event.target.value;
    hash.error = '';
    if (event.target.dataset.hashValue === 'algorithm') invalidateHashResult();
    else {
      hash.sourceName = '';
      hash.importRequest++;
      hash.importBusy = false;
      syncHashAlgorithm()
    }
    renderHashResult();
  };
  form.oninput = updateValue;
  form.onchange = event => {
    if (event.target.dataset.hashValue && hash.values[event.target.dataset.hashValue] !== event.target.value) updateValue(event)
  };
  form.onsubmit = event => {
    event.preventDefault();
    if (active()) calculateHashFile(key)
  };
  $('#hashCancel').onclick = () => {
    if (active()) {
      cancelHashCalculation(true);
      renderHashResult()
    }
  };
  $('#hashReset').onclick = () => {
    if (!active()) return;
    resetHashToolState();
    form.reset();
    $('#hash-algorithm').value = hash.values.algorithm;
    $('#hash-expected').value = '';
    dropZone.classList.remove('is-dragging');
    renderHashResult();
    fileInput.focus();
  };
  $('#hashImport').onclick = () => {
    if (active()) $('#hash-checksum-file').click()
  };
  $('#hash-checksum-file').onchange = event => {
    const checksumFile = event.target.files?.[0];
    event.target.value = '';
    if (checksumFile && active()) importHashChecksum(checksumFile, key);
  };
  $('#hashCopy').onclick = event => copyHashValue(event.currentTarget, hash.copy, 'Copier le rapport', key);
  $('#hashExport').onclick = () => {
    if (!hash.result || !active()) return;
    const result = hash.result,
      extension = result.algorithm.toLowerCase().replace('-', '');
    downloadDataUrl(result.name + '.' + extension, 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileHashTools.checksum(result.hash, result.name)));
  };
  renderHashResult();
}
async function importHashChecksum(file, key) {
  const hash = networkToolsView.hash,
    form = $('#hashToolForm'),
    request = ++hash.importRequest;
  hash.importBusy = true;
  hash.error = '';
  updateHashFormState();
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('Le fichier de sommes de contr\u00f4le d\u00e9passe 2 Mo.');
    const text = await file.text();
    if (request !== hash.importRequest || !form?.isConnected || state.section !== 'tools' || networkToolsView.tool !== 'hash' || !itemActionSessionValid(key)) return;
    fileHashTools.parseChecksums(text);
    hash.values.expected = text;
    hash.sourceName = file.name;
    $('#hash-expected').value = text;
    syncHashAlgorithm();
  } catch (problem) {
    if (request === hash.importRequest && form?.isConnected && itemActionSessionValid(key)) hash.error = problem.message || 'Import impossible.';
  } finally {
    if (request === hash.importRequest) {
      hash.importBusy = false;
      renderHashResult()
    }
  }
}
async function copyHashValue(button, value, label, key) {
  if (!value || !itemActionSessionValid(key)) return;
  const request = networkToolsView.hash.request;
  button.disabled = true;
  const copied = await copyText(value);
  if (!button.isConnected || !itemActionSessionValid(key)) return;
  if (request !== networkToolsView.hash.request) {
    renderHashResult();
    return
  }
  button.disabled = false;
  if (copied) {
    button.innerHTML = ITEM_ACTION_ICONS.check;
    button.title = 'Copi\u00e9';
    button.setAttribute('aria-label', 'Copi\u00e9');
    setTimeout(() => {
      if (button.isConnected) {
        button.innerHTML = ITEM_ACTION_ICONS.copy;
        button.title = label;
        button.setAttribute('aria-label', label)
      }
    }, 1600);
  } else {
    networkToolsView.hash.error = 'Copie impossible.';
    renderHashResult()
  }
}
async function calculateHashFile(key) {
  const hash = networkToolsView.hash,
    file = hash.file;
  if (hash.busy || state.section !== 'tools' || networkToolsView.tool !== 'hash' || !itemActionSessionValid(key)) return;
  if (!file) {
    hash.error = 'S\u00e9lectionne un fichier \u00e0 v\u00e9rifier.';
    renderHashResult();
    return
  }
  let algorithm;
  try {
    algorithm = fileHashTools.resolveExpected(hash.values.expected, hash.values.algorithm, file.name).algorithm
  } catch (problem) {
    hash.error = problem.message;
    renderHashResult();
    return
  }
  const request = ++hash.request,
    controller = new AbortController(),
    started = performance.now();
  hash.controller = controller;
  hash.activeAlgorithm = algorithm;
  hash.progress = {
    loaded: 0,
    total: file.size
  };
  hash.busy = true;
  hash.cancelled = false;
  hash.error = '';
  hash.result = null;
  hash.copy = '';
  renderHashResult();
  try {
    const digest = await fileHashTools.digest(file, algorithm, {
      signal: controller.signal,
      onProgress: progress => {
        if (request !== hash.request) return;
        if (state.section !== 'tools' || networkToolsView.tool !== 'hash' || !itemActionSessionValid(key)) {
          controller.abort();
          return
        }
        hash.progress = progress;
        renderHashProgress();
      }
    });
    if (request !== hash.request || state.section !== 'tools' || networkToolsView.tool !== 'hash' || !itemActionSessionValid(key)) return;
    hash.result = {
      name: file.name || 'Fichier sans nom',
      size: file.size,
      lastModified: file.lastModified,
      algorithm,
      hash: digest,
      calculatedAt: now(),
      duration: performance.now() - started
    };
  } catch (problem) {
    if (request === hash.request) {
      if (problem.name === 'AbortError') hash.cancelled = true;
      else hash.error = problem.message || 'Calcul impossible.';
    }
  } finally {
    if (request === hash.request) {
      hash.busy = false;
      hash.controller = null;
      hash.activeAlgorithm = '';
      hash.progress = null;
      renderHashResult()
    }
  }
}

function hashFileSize(bytes) {
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let value = Number(bytes) || 0,
    unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++
  }
  return (unit ? value.toLocaleString('fr-FR', {
    maximumFractionDigits: value < 10 ? 1 : 0
  }) : String(value)) + ' ' + units[unit];
}

function updateHashFormState() {
  const hash = networkToolsView.hash;
  if (!$('#hashToolForm')) return;
  $('#hashFileName').textContent = hash.file?.name || 'Choisir ou déposer un fichier';
  $('#hashFileName').title = hash.file?.name || '';
  $('#hashFileMeta').textContent = hash.file ? hashFileSize(hash.file.size) : 'Aucun fichier s\u00e9lectionn\u00e9';
  $('#hashDropZone').classList.toggle('has-file', !!hash.file);
  $('#hashRemove').hidden = !hash.file;
  $('#hashSubmit').disabled = hash.busy;
  $('.hash-submit-actions').classList.toggle('is-busy', hash.busy);
  $('#hashSubmit span').textContent = hash.values.expected.trim() ? 'V\u00e9rifier' : 'Calculer';
  $('#hashCancel').hidden = !hash.busy;
  $('#hashImport').disabled = hash.importBusy;
  let expected = null,
    problem = '';
  try {
    expected = fileHashTools.resolveExpected(hash.values.expected, hash.values.algorithm, hash.file?.name || '')
  } catch (error) {
    problem = error.message
  }
  const expectedInput = $('#hash-expected');
  if (problem) expectedInput.setAttribute('aria-invalid', 'true');
  else expectedInput.removeAttribute('aria-invalid');
  $('#hashExpectedMeta').textContent = [hash.importBusy ? 'Import en cours...' : hash.sourceName, expected ? expected.algorithm + (expected.name ? ' \u00b7 ' + expected.name : '') : ''].filter(Boolean).join(' \u00b7 ');
  return {
    expected,
    problem
  };
}

function renderHashProgress() {
  const hash = networkToolsView.hash,
    meter = $('#hashProgress');
  if (!meter || !hash.progress) return;
  const {
    loaded,
    total
  } = hash.progress, percent = total ? Math.floor(loaded / total * 100) : 0;
  meter.max = total || 1;
  meter.value = loaded;
  $('#hashProgressValue').textContent = percent + ' %';
  $('#hashProgressSize').textContent = hashFileSize(loaded) + ' / ' + hashFileSize(total);
}

function hashResultState(result) {
  const hash = networkToolsView.hash;
  if (!result) return {
    comparison: {
      expected: '',
      match: null
    },
    error: ''
  };
  try {
    return {
      comparison: fileHashTools.compare(result.hash, hash.values.expected, result.algorithm, result.name),
      error: ''
    }
  } catch (problem) {
    return {
      comparison: {
        expected: '',
        match: null
      },
      error: problem.message
    }
  }
}

function renderHashResult() {
  const hash = networkToolsView.hash,
    host = $('#hashResult');
  if (!host || state.section !== 'tools' || networkToolsView.tool !== 'hash') return;
  const error = $('#hashError'),
    copy = $('#hashCopy'),
    summary = $('#hashResultSummary'),
    exportButton = $('#hashExport'),
    formState = updateHashFormState();
  hash.copy = '';
  copy.disabled = true;
  exportButton.disabled = true;
  summary.textContent = '';
  host.setAttribute('aria-busy', String(hash.busy));
  const setError = message => {
    error.hidden = !message;
    error.textContent = message || ''
  };
  setError(hash.error || formState?.problem);
  if (hash.busy) {
    summary.textContent = hash.activeAlgorithm + ' \u00b7 Calcul en cours';
    if (!$('#hashProgress')) host.innerHTML = '<div class="hash-progress"><div><strong>Calcul en cours</strong><span id="hashProgressValue">0 %</span></div><progress id="hashProgress" aria-label="Progression du calcul" max="1" value="0"></progress><span id="hashProgressSize"></span></div>';
    renderHashProgress();
    return;
  }
  if (!hash.file) {
    host.innerHTML = '<div class="network-empty hash-empty">' + networkToolIcon('file') + '<span>Choisis un fichier pour calculer son empreinte.</span></div>';
    return;
  }
  if (!hash.result) {
    summary.textContent = hash.cancelled ? 'Calcul annul\u00e9' : formState?.expected?.algorithm || '';
    host.innerHTML = '<div class="network-empty">' + (hash.cancelled ? 'Calcul annul\u00e9.' : 'Fichier pr\u00eat : <code>' + esc(hash.file.name || 'Fichier sans nom') + '</code>') + '</div>';
    return;
  }
  const result = hash.result,
    resultState = hashResultState(result),
    comparison = resultState.comparison,
    expectedInvalid = resultState.error || formState?.problem;
  setError(hash.error || expectedInvalid);
  const status = expectedInvalid ? 'Non v\u00e9rifi\u00e9' : comparison.match === true ? 'Conforme' : comparison.match === false ? 'Diff\u00e9rent' : 'Calcul\u00e9';
  const statusClass = comparison.match === true && !expectedInvalid ? 'is-match' : comparison.match === false && !expectedInvalid ? 'is-outside' : '';
  const rows = [
    ['Fichier', result.name],
    ['Taille', hashFileSize(result.size) + ' (' + result.size.toLocaleString('fr-FR') + ' octets)'],
    ['Modifi\u00e9', result.lastModified ? new Date(result.lastModified).toLocaleString('fr-FR') : '\u2014'],
    ['Algorithme', result.algorithm],
    ['Hash calcul\u00e9', result.hash],
    ['Dur\u00e9e du calcul', (result.duration / 1000).toLocaleString('fr-FR', {
      maximumFractionDigits: 2
    }) + ' s']
  ];
  if (hash.values.expected.trim()) rows.push(['Hash attendu', comparison.expected || hash.values.expected.trim()], ['Correspondance', expectedInvalid ? 'Non v\u00e9rifi\u00e9e' : comparison.match === true ? 'Oui' : comparison.match === false ? 'Non' : 'Non v\u00e9rifi\u00e9e']);
  const summaryCards = [
    ['Fichier', result.name],
    ['Algorithme', result.algorithm],
    ['Taille', hashFileSize(result.size)],
    ['\u00c9tat', status]
  ];
  host.innerHTML = '<div class="network-summary-grid hash-summary-grid">' + summaryCards.map(card => networkSummaryCard(...card)).join('') + '</div>' +
    '<div class="hash-digest-panel ' + statusClass + '"><div class="hash-digest-heading"><span>Hash calcul\u00e9</span><button type="button" class="secondary workspace-icon" id="hashDigestCopy" title="Copier le hash" aria-label="Copier le hash">' + ITEM_ACTION_ICONS.copy + '</button></div><code>' + esc(result.hash) + '</code></div>' +
    (comparison.match !== null && !expectedInvalid ? '<div class="hash-compare ' + statusClass + '">' + (comparison.match ? ITEM_ACTION_ICONS.check : networkToolIcon('close')) + '<span>' + (comparison.match ? 'Le fichier correspond au hash attendu.' : 'Le fichier ne correspond pas au hash attendu.') + '</span></div>' : '') +
    '<div class="network-result-details"><details class="network-result-detail"><summary>' + networkToolIcon('hash') + '<strong>D\u00e9tails du fichier</strong><span>' + esc(result.algorithm) + '</span>' + PROTOCOL_ICONS.open + '</summary><div class="network-result-detail-body"><dl class="network-result-list">' + rows.map(row => networkResultRow(...row)).join('') + '</dl></div></details></div>';
  summary.textContent = result.algorithm + ' \u00b7 ' + status;
  hash.copy = ['FICHIER', 'Nom : ' + result.name, 'Taille : ' + hashFileSize(result.size), 'Algorithme : ' + result.algorithm, 'Hash calcule : ' + result.hash].concat(hash.values.expected.trim() ? ['Hash attendu : ' + (comparison.expected || hash.values.expected.trim()), 'Correspondance : ' + (expectedInvalid ? 'Non verifiee' : comparison.match === true ? 'Oui' : comparison.match === false ? 'Non' : 'Non verifiee')] : []).join('\n');
  copy.disabled = false;
  exportButton.disabled = false;
  const key = state.vaultKey;
  $('#hashDigestCopy').onclick = event => copyHashValue(event.currentTarget, result.hash, 'Copier le hash', key);
}
