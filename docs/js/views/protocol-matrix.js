'use strict';

let protocolReferencePromise = null,
  protocolRegistryPromise = null;
const PROTOCOL_REGISTRY_STATUS = {
  assigned: 'Attribué',
  reserved: 'Réservé',
  unassigned: 'Non attribué',
  deprecated: 'Historique / obsolète',
  experimental: 'Expérimental',
  dynamic: 'Dynamique / privé'
};

function freezeProtocolCatalog(catalog) {
  for (const data of catalog.entries) {
    for (const source of data.sources) Object.freeze(source);
    Object.freeze(data.sources);
    Object.freeze(data)
  }
  Object.freeze(catalog.sources);
  Object.freeze(catalog.entries);
  return Object.freeze(catalog);
}

function loadProtocolReference() {
  if (!protocolReferencePromise) protocolReferencePromise = fetch('data/ports-practical.json').then(async response => {
    if (!response.ok) throw new Error('Référentiel indisponible');
    const catalog = await response.json();
    if (!Array.isArray(catalog.entries) || !Array.isArray(catalog.sources) || catalog.entries.some(data => !data.service || !data.usage || !data.sources?.length || data.sources.some(source => !/^https:\/\//.test(source.url)))) throw new Error('Référentiel incomplet');
    return freezeProtocolCatalog(catalog);
  }).catch(error => {
    protocolReferencePromise = null;
    throw error
  });
  return protocolReferencePromise;
}

function loadProtocolRegistry() {
  if (!protocolRegistryPromise) protocolRegistryPromise = Promise.all([
    fetch('data/ports-iana.json').then(response => {
      if (!response.ok) throw new Error('Registre IANA indisponible');
      return response.json()
    }),
    fetch('data/ports-protection.json').then(async response => {
      if (!response.ok) throw new Error('Qualifications indisponibles');
      const data = await response.json();
      if (data.schemaVersion !== 1 || !Array.isArray(data.entries) || !Array.isArray(data.sources)) throw new Error('Qualifications invalides');
      const identities = new Set();
      for (const entry of data.entries) {
        const key = registryProtectionKey(entry.kind, entry.endpoint, entry.transport, entry.service);
        if (identities.has(key) || !['tls', 'upgrade', 'native', 'clear', 'configurable'].includes(entry.protection) || !entry.security || !entry.sources?.length || entry.sources.some(source => !/^https:\/\//.test(source.url))) throw new Error('Qualification incomplète');
        identities.add(key);
      }
      return data;
    }).catch(() => null)
  ]).then(([raw, qualification]) => {
    if (!Array.isArray(raw.entries) || !raw.entries.length) throw new Error('Registre IANA incomplet');
    const sources = [{
      id: 'iana-ports',
      title: 'IANA — Services et ports',
      url: 'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml',
      checkedAt: raw.retrievedAt
    }, {
      id: 'iana-ip',
      title: 'IANA — Numéros de protocoles IP',
      url: 'https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml',
      checkedAt: raw.retrievedAt
    }];
    const qualifications = new Map((qualification?.entries || []).map(entry => [registryProtectionKey(entry.kind, entry.endpoint, entry.transport, entry.service), entry]));
    const entries = raw.entries.map((record, index) => {
      const endpoint = String(record.kind === 'ip' ? record.number : record.port || ''),
        bounds = endpoint.split('-').map(Number);
      if (!['port', 'ip', 'service'].includes(record.kind) || record.kind !== 'service' && (!/^\d+(?:-\d+)?$/.test(endpoint) || bounds[0] > bounds.at(-1) || bounds.at(-1) > (record.kind === 'ip' ? 255 : 65535))) throw new Error('Numéro IANA invalide');
      const absent = ['reserved', 'unassigned', 'dynamic'].includes(record.status);
      const documented = !absent ? qualifications.get(registryProtectionKey(record.kind, endpoint, record.transport, record.service)) : null;
      return {
        ...record,
        id: 'iana-' + index,
        profileId: 'iana-' + index,
        origin: 'iana',
        family: 'other',
        protection: absent ? 'na' : documented?.protection || 'unknown',
        service: record.service || PROTOCOL_REGISTRY_STATUS[record.status] || 'Sans nom de service',
        usage: record.usage || 'Aucune description fournie par le registre IANA.',
        flow: 'Le registre ne précise pas le sens du flux.',
        notes: [record.kind === 'service' ? 'Nom de service sans numéro de port attribué.' : 'Attribution officielle ; le service déployé peut utiliser un autre port.', record.notes, record.unauthorized ? 'Usage non autorisé signalé : ' + record.unauthorized : ''].filter(Boolean).join('\n'),
        security: absent ? 'Aucun service unique à qualifier pour cette attribution. Identifier le service réellement configuré avant toute règle réseau.' : documented?.security || 'Le registre IANA ne décrit pas le chiffrement. La protection de ce service reste à qualifier à partir de sa documentation.',
        ...(documented ? {
          protectionBasis: documented.notes,
          protectionCheckedAt: qualification.checkedAt
        } : {}),
        aliases: [record.service, record.reference, record.status, PROTOCOL_REGISTRY_STATUS[record.status], record.serviceCode].filter(Boolean).join(' '),
        sources: [sources[record.kind === 'ip' ? 1 : 0], ...(documented?.sources || [])],
        checkedAt: raw.retrievedAt
      };
    });
    const extraSources = (qualification?.sources || []).filter(source => !['https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml', 'https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml'].includes(source.url));
    return freezeProtocolCatalog({
      entries,
      sources: [...sources, ...extraSources],
      profileCount: entries.length,
      checkedAt: raw.retrievedAt,
      enrichmentAvailable: !!qualification
    });
  }).catch(error => {
    protocolRegistryPromise = null;
    throw error
  });
  return protocolRegistryPromise;
}

function registryProtectionKey(kind, endpoint, transport, service) {
  return JSON.stringify([kind, String(endpoint), String(transport || '').toUpperCase(), String(service || '').toLowerCase()]);
}

function openProtocolSources(catalog) {
  modal('Sources du référentiel', `<div class="protocol-reference-detail"><p>${catalog.profileCount} fiches pratiques documentées et registre IANA embarqué. Les dates et les sources figurent dans chaque fiche.</p><div class="reference-source-list">${protocolSourceLinks({sources:catalog.sources})}</div><div class="actions"><button type="button" class="primary protocol-button" id="protocolSourcesClose">Fermer</button></div></div>`);
  const dialog = $('#modalRoot .modal');
  dialog.classList.add('protocol-reference-modal');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Sources du référentiel');
  const close = () => {
    closeModal();
    $('#protocolSources')?.focus({
      preventScroll: true
    })
  };
  $('#protocolSourcesClose').onclick = close;
  dialog.onkeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close()
    }
    if (event.key === 'Tab') {
      const nodes = [...dialog.querySelectorAll('a,button')],
        first = nodes[0],
        last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus()
      }
    }
  };
  $('#protocolSourcesClose').focus({
    preventScroll: true
  });
}
async function renderProtocolMatrix() {
  const host = $('#detailHost');
  host.innerHTML = '<div class="protocol-matrix-loading" role="status">Chargement des fiches...</div>';
  const loaded = await Promise.allSettled([loadProtocolReference(), loadProtocolRegistry()]);
  const empty = {
    entries: [],
    sources: [],
    profileCount: 0,
    checkedAt: ''
  };
  const catalog = loaded[0].status === 'fulfilled' ? loaded[0].value : empty,
    registry = loaded[1].status === 'fulfilled' ? loaded[1].value : empty;
  const loadError = loaded.some(result => result.status === 'rejected') || registry.enrichmentAvailable === false;
  if (!host.isConnected || state.section !== 'protocol' || state.item) return;
  const practical = catalog.entries.map(protocolMatrixRow),
    registered = registry.entries.map(protocolMatrixRow),
    allEntries = [...practical, ...registered];
  const number = value => value.toLocaleString('fr-FR');
  let rows = [];
  const scopeRows = new Map();
  const compare = new Intl.Collator('fr', {
    numeric: true
  }).compare;
  const options = (entries, current) => entries.map(([value, label]) => `<option value="${value}" ${current===value?'selected':''}>${label}</option>`).join('');
  host.innerHTML = `<section class="protocol-matrix" aria-labelledby="protocolMatrixTitle">
    <header class="matrix-heading"><div class="matrix-title"><span class="matrix-symbol">${protocolFamilyIcon('network')}</span><div><div class="matrix-eyebrow">Votre bibliothèque réseau</div><h1 id="protocolMatrixTitle">Ports &amp; protocoles<span class="matrix-title-dot">.</span></h1><p>Identifier un service. Comprendre un flux. Trouver quoi vérifier.</p></div></div><div class="matrix-actions"><span class="matrix-offline"><i></i>Disponible hors ligne</span><button type="button" class="secondary protocol-button" id="protocolSources" ${!catalog.entries.length&&!registry.entries.length?'disabled':''}>${PROTOCOL_ICONS.reference}Sources</button><button type="button" class="secondary protocol-button" id="protocolExport" title="Exporter tous les résultats filtrés en CSV"><span class="matrix-export-icon">${PROTOCOL_ICONS.open}</span>Exporter CSV</button></div></header>
    ${loadError?'<div class="matrix-load-error" role="alert">Une partie du référentiel est indisponible. <button type="button" id="protocolRetry" class="secondary protocol-button">Réessayer</button></div>':''}
    <div class="matrix-filters">
      <label class="matrix-search">${PROTOCOL_ICONS.search}<input id="protocolSearch" type="search" maxlength="200" aria-label="Rechercher dans les ports et protocoles" title="Exemples : 443/tcp ; 80,443 ; port:8000-8100 ; service:ssh ; usage:vpn ; securite:tls ; ip:47 ; -udp" placeholder="Rechercher un port, un service ou un symptôme…" value="${esc(protocolView.query)}" autocomplete="off"></label>
      <label>Usage<select id="protocolFamily">${options(PROTOCOL_FAMILIES.filter(family=>family.id==='all'||family.id==='other'||practical.some(row=>row.family===family.id)).map(family=>[family.id,family.id==='all'?'Tous les usages':family.label]),protocolView.family)}</select></label>
      <label>Transport<select id="protocolTransport">${options([['all','Tous'],['TCP','TCP'],['UDP','UDP'],['SCTP','SCTP'],['DCCP','DCCP'],['IP','IP · sans port'],['none','Non précisé']],protocolView.transport)}</select></label>
      <label>Plage de ports<select id="protocolRange">${options([['all','Toutes'],['system','0 - 1023'],['registered','1024 - 49151'],['dynamic','49152 - 65535']],protocolView.range)}</select></label>
      <label>Protection<select id="protocolProtection">${options([['all','Toutes'],['tls','TLS'],['upgrade','TLS à activer'],['native','Protocole natif'],['clear','Non chiffré'],['configurable','Configurable'],['na','Sans objet'],['unknown','Non documentée']],protocolView.protection)}</select></label>
      <button type="button" id="protocolClear" class="secondary protocol-icon" title="Réinitialiser les filtres" aria-label="Réinitialiser les filtres">${PROTOCOL_ICONS.clear}</button>
    </div>
    <div class="matrix-result-bar"><span id="protocolResultsCount" role="status" aria-live="polite"></span><div class="matrix-result-options"><button type="button" class="matrix-search-help" id="protocolSearchHelp" aria-label="Aide à la recherche">${PROTOCOL_ICONS.search}<span>Astuces de recherche</span></button><label class="matrix-quick-label">Source<select id="protocolScope" aria-label="Source du référentiel">${options([['practical','Fiches pratiques'],['iana','Registre IANA'],['all','Toutes les sources']],protocolView.scope)}</select></label><label class="matrix-quick-label">Accès rapide<select id="protocolQuick" aria-label="Accès rapide">${options([['','Choisir un besoin'],['dns','DNS'],['active directory','Active Directory'],['vpn','VPN'],['service:https','HTTPS'],['service:ssh','SSH'],['rdp','Bureau distant'],['smb','Partages SMB'],['service:smtp','Messagerie SMTP'],['fortinet','Fortinet'],['cisco ise','Cisco ISE'],['kubernetes','Kubernetes']],'')}</select></label></div></div>
    <div id="protocolSearchExamples" class="matrix-search-examples" hidden><span>Essayez une recherche précise</span>${['443/tcp','80,443','port:8000-8100','service:ssh','securite:tls','ip:47'].map(query=>'<button type="button" data-protocol-example="'+esc(query)+'"><code>'+esc(query)+'</code></button>').join('')}<p>Combinez les termes ; ajoutez − devant un terme pour l’exclure. La recherche parcourt aussi les symptômes documentés.</p></div>
    <div id="protocolMatrixPanel" role="region" class="protocol-table-wrap matrix-scroll" tabindex="0" aria-label="Tableau des ports et protocoles">
      <table class="matrix-table"><caption class="matrix-sr-only">Ports, transports, services, usages pratiques, protection et sources documentaires</caption><colgroup><col><col><col><col><col><col><col></colgroup><thead><tr>
      ${[['port','Port / N° IP'],['transport','Transport'],['service','Service / protocole']].map(([key,label])=>`<th scope="col" data-sort-column="${key}" aria-sort="none"><button type="button" data-sort="${key}">${label}<span class="matrix-sort-icon">${PROTOCOL_ICONS.open}</span></button></th>`).join('')}
      <th scope="col">À quoi ça sert / sens du flux</th><th scope="col">Protection</th><th scope="col">Sources</th><th scope="col" class="matrix-action-head">Actions</th></tr></thead><tbody id="protocolRows"></tbody></table>
      <div id="protocolEmpty" class="protocol-empty" hidden>${PROTOCOL_ICONS.search}<h2>Aucune fiche pour ces filtres</h2><p>Le référentiel contient les usages documentés. Un numéro de port ne permet pas d'identifier à lui seul l'application.</p><button type="button" id="protocolEmptyReset" class="secondary protocol-button">Réinitialiser les filtres</button></div>
    </div><footer class="matrix-footer"><span class="matrix-reference-date" id="protocolScopeNote"></span><div id="protocolPagination"></div></footer>
  </section>`;
  let filtered = [];
  const scroll = host.querySelector('.matrix-scroll');
  const update = (reset = false) => {
    if (reset) {
      protocolView.page = 0;
      protocolView.scrollTop = 0
    }
    const entries = protocolView.scope === 'iana' ? registered : protocolView.scope === 'all' ? allEntries : practical;
    if (!scopeRows.has(protocolView.scope)) scopeRows.set(protocolView.scope, groupProtocolRows(entries));
    rows = scopeRows.get(protocolView.scope);
    const terms = protocolQueryTerms(protocolView.query),
      range = {
        system: [0, 1023],
        registered: [1024, 49151],
        dynamic: [49152, 65535]
      } [protocolView.range];
    filtered = groupProtocolRows(entries.filter(row =>
      (protocolView.protection === 'all' || row.data.protection === protocolView.protection) &&
      (protocolView.family === 'all' || row.family === protocolView.family) &&
      (protocolView.transport === 'all' || row.data.transport === (protocolView.transport === 'none' ? '' : protocolView.transport)) &&
      (!range || row.data.kind === 'port' && row.start <= range[1] && row.end >= range[0]) && protocolMatrixMatches(row, terms)
    ));
    const [sort, direction] = protocolView.sort.split('-'), sign = direction === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      if (sort === 'port') {
        if (a.data.kind !== b.data.kind) return ['port', 'ip', 'service'].indexOf(a.data.kind) - ['port', 'ip', 'service'].indexOf(b.data.kind);
        if (a.start !== b.start) return (a.start - b.start) * sign;
      } else {
        const comparison = compare(String(a.data[sort] || ''), String(b.data[sort] || ''));
        if (comparison) return comparison * sign
      }
      return compare(a.data.kind, b.data.kind) || compare(a.data.service, b.data.service) || compare(a.data.transport, b.data.transport);
    });
    $('#protocolRows').innerHTML = collectionPageSlice(filtered, protocolView).map(row => {
      const {
        data,
        id
      } = row, endpoint = protocolEndpoint(data), sources = protocolSources(data);
      const practicalProfiles = row.variants.filter(variant => variant.data.origin !== 'iana'),
        label = practicalProfiles.length ? protocolFamilyLabel(practicalProfiles[0].family) + (row.variants.some(variant => variant.data.origin === 'iana') ? ' · IANA' : ' · Fiche pratique') : 'Registre IANA';
      return `<tr data-protocol-id="${esc(id)}" data-kind="${data.kind}" class="${protocolView.focusId===id?'is-selected':''}"><td class="matrix-port">${data.kind==='ip'?'<small>N° IP</small><br>':''}${esc(endpoint.value||'—')}</td><td>${protocolTransportHTML(data.transport)}</td><td><button type="button" class="protocol-service" data-open-protocol="${esc(id)}">${esc(data.service)}</button><span class="matrix-service-context">${esc(label)}</span></td><td class="matrix-usage"><div class="matrix-usage-text">${esc(data.usage)}</div>${data.origin==='iana'?'':'<span class="matrix-flow">'+esc(data.flow)+'</span>'}</td><td class="matrix-protection-cell">${protocolProtectionHTML(data)}</td><td class="matrix-sources">${sources.slice(0,2).map(source=>'<a href="'+esc(source.url)+'" title="'+esc(source.title)+'" target="_blank" rel="noopener noreferrer">'+esc(source.title.split('—')[0].trim())+'</a>').join('')}${sources.length>2?'<button type="button" data-open-protocol="'+esc(id)+'" title="Consulter toutes les sources">+'+(sources.length-2)+'</button>':''}</td><td><div class="protocol-row-actions">${protocolCopyButton(data)}</div></td></tr>`;
    }).join('');
    $('#protocolEmpty').hidden = filtered.length > 0;
    const profiles = new Set(filtered.flatMap(row => row.variants.map(variant => variant.data.profileId))).size;
    $('#protocolResultsCount').textContent = number(filtered.length) + ' résultat' + (filtered.length === 1 ? '' : 's') + ' / ' + number(rows.length) + ' · ' + number(profiles) + (protocolView.scope === 'practical' ? ' fiche' : ' entrée') + (profiles === 1 ? '' : 's');
    $('#protocolExport').disabled = !filtered.length;
    $('#protocolScopeNote').textContent = protocolView.scope === 'practical' ? number(catalog.profileCount) + ' fiches documentées · Lecture seule' : protocolView.scope === 'iana' ? number(registry.entries.length) + ' entrées IANA · Registre du ' + registry.checkedAt : 'Fiches pratiques et attributions IANA · Lecture seule';
    for (const header of host.querySelectorAll('[data-sort-column]')) header.setAttribute('aria-sort', header.dataset.sortColumn === sort ? (direction === 'asc' ? 'ascending' : 'descending') : 'none');
    renderCollectionPagination($('#protocolPagination'), protocolView, filtered.length, () => {
      protocolView.scrollTop = 0;
      update();
      scroll.scrollTop = 0;
      scroll.querySelector('.protocol-service')?.focus({
        preventScroll: true
      })
    });
    scroll.scrollTop = protocolView.scrollTop;
  };
  scroll.onscroll = () => {
    protocolView.scrollTop = scroll.scrollTop
  };
  scroll.onclick = async event => {
    const copy = event.target.closest('[data-copy-port]');
    if (copy) {
      await copyProtocolPort(copy);
      return
    }
    if (event.target.closest('a')) return;
    const element = event.target.closest('tr[data-protocol-id]');
    if (!element) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && element.contains(selection.anchorNode)) return;
    const row = filtered.find(row => row.id === element.dataset.protocolId);
    if (!row) return;
    const trigger = event.target.closest('[data-open-protocol]') || element.querySelector('.protocol-service');
    protocolView.focusId = row.id;
    openProtocolReference(row, trigger, {
      rows,
      filtered
    });
  };
  scroll.onkeydown = event => {
    if (!event.target.closest('.protocol-service') || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...scroll.querySelectorAll('.protocol-service')],
      index = buttons.indexOf(event.target);
    buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))]?.focus();
  };
  const applyQuery = value => {
    protocolView.query = value;
    update(true)
  };
  $('#protocolSearch').oninput = event => {
    $('#protocolQuick').value = '';
    applyQuery(event.target.value)
  };
  for (const [id, key] of [
      ['protocolFamily', 'family'],
      ['protocolTransport', 'transport'],
      ['protocolRange', 'range'],
      ['protocolProtection', 'protection']
    ]) $('#' + id).onchange = event => {
    protocolView[key] = event.target.value;
    update(true)
  };
  $('#protocolQuick').onchange = event => {
    if (!event.target.value) return;
    $('#protocolSearch').value = event.target.value;
    applyQuery(event.target.value)
  };
  host.querySelectorAll('[data-sort]').forEach(button => button.onclick = () => {
    protocolView.sort = button.dataset.sort + '-' + (protocolView.sort === button.dataset.sort + '-asc' ? 'desc' : 'asc');
    update(true)
  });
  const reset = () => {
    Object.assign(protocolView, {
      query: '',
      family: 'all',
      transport: 'all',
      protection: 'all',
      range: 'all',
      sort: 'port-asc'
    });
    $('#protocolSearch').value = '';
    $('#protocolQuick').value = '';
    for (const id of ['protocolFamily', 'protocolTransport', 'protocolRange', 'protocolProtection']) $('#' + id).value = 'all';
    update(true);
    $('#protocolSearch').focus()
  };
  $('#protocolClear').onclick = reset;
  $('#protocolEmptyReset').onclick = reset;
  $('#protocolScope').onchange = event => {
    protocolView.scope = event.target.value;
    update(true)
  };
  $('#protocolSearchHelp').setAttribute('aria-expanded', 'false');
  $('#protocolSearchHelp').setAttribute('aria-controls', 'protocolSearchExamples');
  $('#protocolSearchHelp').onclick = () => {
    const examples = $('#protocolSearchExamples');
    examples.hidden = !examples.hidden;
    $('#protocolSearchHelp').setAttribute('aria-expanded', String(!examples.hidden))
  };
  host.querySelectorAll('[data-protocol-example]').forEach(button => button.onclick = () => {
    $('#protocolSearch').value = button.dataset.protocolExample;
    applyQuery(button.dataset.protocolExample)
  });
  $('#protocolExport').onclick = () => exportProtocolMatrix(filtered);
  $('#protocolSources').onclick = () => openProtocolSources({
    profileCount: catalog.profileCount,
    sources: protocolSources({
      sources: [...catalog.sources, ...registry.sources, ...Object.values(PROTOCOL_DIAGNOSTIC_SOURCES)]
    })
  });
  if ($('#protocolRetry')) $('#protocolRetry').onclick = () => {
    if (registry.enrichmentAvailable === false) protocolRegistryPromise = null;
    return renderProtocolMatrix()
  };
  update();
}
