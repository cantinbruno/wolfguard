'use strict';

const PROTOCOL_PROTECTIONS = {
  tls: 'TLS',
  upgrade: 'TLS à activer',
  native: 'Protection du protocole',
  clear: 'Sans chiffrement natif',
  configurable: 'Selon configuration',
  na: 'Sans objet',
  unknown: 'Non documentée'
};
const PROTOCOL_PROTECTION_HELP = {
  tls: 'Le service décrit utilise TLS ; vérifier le certificat et la configuration.',
  upgrade: 'TLS se négocie sur ce port et doit être exigé par la configuration.',
  native: 'Protection prévue par le protocole. Les garanties exactes sont décrites dans la fiche.',
  clear: 'Le service décrit ne chiffre pas son transport par défaut.',
  configurable: 'Le chiffrement ou la protection dépend de la version et des options déployées.',
  na: 'Numéro réservé, non attribué ou plage privée : aucun service unique dont qualifier la protection.',
  unknown: 'La protection de cette identité de service et de ce transport reste à qualifier. Le registre IANA ne précise pas le chiffrement.'
};
const protocolReferenceTitle = data => data.service || 'Service';
const protocolFamilyLabel = id => PROTOCOL_FAMILIES.find(family => family.id === id)?.label || 'Autres';
const protocolProtectionLabel = data => String(data.protection || '').split('/').map(value => PROTOCOL_PROTECTIONS[value] || value).join(' / ');
const protocolProtectionHTML = data => String(data.protection || '').split('/').filter(Boolean).map(value => {
  const transports = data.protectionTransports?.[value] || [],
    mixed = String(data.protection || '').includes('/') && String(data.transport || '').includes('/');
  const detail = transports.length ? ' · ' + transports.join('/') : '';
  return '<span class="matrix-protection protection-' + esc(value) + '" title="' + esc((PROTOCOL_PROTECTION_HELP[value] || '') + detail) + '">' + esc(PROTOCOL_PROTECTIONS[value] || value) + (mixed && transports.length ? ' <small>(' + esc(transports.join('/')) + ')</small>' : '') + '</span>';
}).join(' ');
const protocolRFCs = data => [...new Set([...(data.reference || '').matchAll(/RFC\s*(\d+)/gi)].map(match => match[1]).concat((data.sources || []).map(source => source.title.match(/^RFC (\d+)/)?.[1]).filter(Boolean)))];
const protocolSources = data => [...new Map((data.sources || []).map(source => [source.url, source])).values()];
const protocolSourceLinks = data => protocolSources(data).map(source => '<a class="reference-source" href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' + esc(source.title) + '</a>').join('');
const protocolUsageDescription = data => data.usage || '';
const protocolUsageSummary = data => data.usage || '';

function protocolMatrixRow(data, index) {
  const endpoint = protocolEndpoint(data),
    bounds = endpoint.value.split('-').map(Number),
    alias = data.aliases || '';
  const diagnosis = protocolDiagnostic(data);
  return {
    data,
    id: data.id || 'reference-' + index,
    start: endpoint.value ? bounds[0] : Infinity,
    end: endpoint.value ? (bounds[1] ?? bounds[0]) : Infinity,
    alias,
    family: data.family,
    text: protocolSearch([data.service, data.port, data.number, data.transport, data.usage, data.flow, data.notes, data.security, alias, protocolFamilyLabel(data.family), data.protection, protocolProtectionLabel(data), ...(data.sources || []).map(source => source.title), ...(diagnosis?.symptoms || []), ...(diagnosis?.checks || [])].join(' '))
  };
}

function protocolQueryTerms(query) {
  return (protocolSearch(query).replace(/(\d),\s+(?=\d)/g, '$1,').match(/(?:[^\s"]*"[^"]*"|[^\s"]+)/g) || []).map(term => term.replace(/"/g, ''));
}

function groupProtocolRows(rows) {
  const groups = new Map(),
    order = ['TCP', 'UDP', 'SCTP', 'DCCP', 'IP', ''];
  for (const row of rows) {
    const key = JSON.stringify([row.data.kind, protocolEndpoint(row.data).value || row.data.service]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups].map(([id, variants]) => {
    variants.sort((a, b) => order.indexOf(a.data.transport) - order.indexOf(b.data.transport));
    const first = variants[0],
      data = {
        ...first.data
      },
      values = key => [...new Set(variants.map(row => row.data[key] || '').filter(Boolean))];
    for (const key of ['service', 'transport', 'protection', 'origin', 'status']) data[key] = values(key).join(key === 'service' ? ' / ' : '/');
    data.protectionTransports = Object.fromEntries(values('protection').map(value => [value, [...new Set(variants.filter(row => row.data.protection === value).map(row => row.data.transport).filter(Boolean))]]));
    for (const key of ['usage', 'flow', 'notes', 'security']) data[key] = values(key).join('\n');
    data.sources = protocolSources({
      sources: variants.flatMap(row => row.data.sources || [])
    });
    data.checkedAt = values('checkedAt').sort().at(-1) || '';
    return {
      ...first,
      id,
      data,
      variants,
      alias: [...new Set(variants.map(row => row.alias).filter(Boolean))].join(' / ')
    };
  });
}

function protocolMatrixMatches(row, terms) {
  return terms.every(raw => {
    const negate = raw.startsWith('-'),
      term = negate ? raw.slice(1) : raw;
    const endpoint = term.match(/^(?:(port|ip):)?(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)?(?:\/(tcp|udp|sctp|dccp|ip))?$/);
    let result;
    if (endpoint && endpoint[2]) {
      const kind = endpoint[1] || (endpoint[3] === 'ip' ? 'ip' : 'port');
      result = row.data.kind === kind && (!endpoint[3] || row.data.transport === endpoint[3].toUpperCase()) && endpoint[2].split(',').some(value => {
        const [start, end = start] = value.split('-').map(Number);
        return start <= end && end <= (kind === 'ip' ? 255 : 65535) && row.start <= end && row.end >= start;
      });
    } else {
      const field = term.match(/^(type|service|transport|usage|securite|security|rfc|source|statut):(.+)$/);
      if (field) {
        const key = {
          type: 'kind',
          securite: 'protection',
          security: 'protection',
          rfc: 'reference',
          source: 'origin',
          statut: 'status'
        } [field[1]] || field[1];
        result = key === 'kind' ? row.data.kind === field[2] : key === 'reference' ? protocolRFCs(row.data).includes(field[2].replace(/^rfc/, '')) : key === 'usage' ? protocolSearch(row.family + ' ' + protocolFamilyLabel(row.family)).includes(field[2]) : key === 'protection' ? protocolSearch(row.data.protection + ' ' + protocolProtectionLabel(row.data)).includes(field[2]) : protocolSearch(row.data[key] || (key === 'origin' ? 'practical' : '')).includes(field[2]);
      } else result = row.text.includes(term);
    }
    return negate ? !result : result;
  });
}

function protocolDisplayFilter(row) {
  if (row.variants?.length > 1) return [...new Set(row.variants.map(protocolDisplayFilter).filter(Boolean))].join(' || ');
  if (!Number.isFinite(row.start)) return '';
  const test = field => row.start === row.end ? field + ' == ' + row.start : field + ' in {' + row.start + '..' + row.end + '}';
  if (row.data.kind === 'ip') return test('ip.proto') + ' || ' + test('ipv6.nxt');
  if (['TCP', 'UDP'].includes(row.data.transport)) return test(row.data.transport.toLowerCase() + '.port');
  if (row.data.transport === 'SCTP') return test('sctp.srcport') + ' || ' + test('sctp.dstport');
  if (row.data.transport === 'DCCP') return test('dccp.srcport') + ' || ' + test('dccp.dstport');
  return '';
}

function protocolProfiles(row) {
  const profiles = new Map();
  for (const variant of row.variants || [row]) {
    const key = variant.data.profileId || variant.id,
      previous = profiles.get(key);
    if (previous) previous.transport = [...new Set([...previous.transport.split('/'), variant.data.transport])].join('/');
    else profiles.set(key, {
      ...variant.data
    });
  }
  return [...profiles.values()];
}

function protocolReferenceText(row) {
  return protocolProfiles(row).map(data => [
    data.service, (data.kind === 'ip' ? 'Numéro de protocole IP : ' : 'Port / plage : ') + protocolEndpoint(data).value,
    'Transport : ' + data.transport, 'Usage : ' + data.usage, 'Sens du flux : ' + data.flow,
    'Protection : ' + protocolProtectionLabel(data), 'Particularités : ' + data.notes,
    'Conseil d’exploitation : ' + data.security, ...(data.protectionBasis ? ['Qualification de la protection : ' + data.protectionBasis, 'Protection vérifiée le ' + data.protectionCheckedAt] : []), 'Sources consultées le ' + data.checkedAt,
    ...protocolSources(data).map(source => source.title + ' — ' + source.url), protocolDiagnosticText(data)
  ].join('\n')).join('\n\n');
}

function exportProtocolMatrix(rows) {
  const cell = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""') + '"';
  const lines = [
    ['Type', 'Port / numéro IP', 'Transport', 'Service', 'Usage', 'Protection', 'Sens du flux', 'Particularités', 'Conseil exploitation', 'Sources', 'Fiches (JSON)', 'Date consultation', 'Origine', 'Statut IANA', 'Références IANA', 'Diagnostics (JSON)'], ...rows.map(row => [
      row.data.kind, protocolEndpoint(row.data).value, row.data.transport, row.data.service, row.data.usage, protocolProtectionLabel(row.data), row.data.flow, row.data.notes, row.data.security,
      protocolSources(row.data).map(source => source.title + ' — ' + source.url).join('\n'), JSON.stringify(row.variants.map(variant => variant.data)), row.data.checkedAt,
      [...new Set(row.variants.map(variant => variant.data.origin || 'practical'))].join('/'), row.data.status || '', row.variants.map(variant => variant.data.reference || '').filter(Boolean).join('\n'), JSON.stringify(protocolProfiles(row).map(profile => ({
        profileId: profile.profileId,
        diagnostic: protocolDiagnostic(profile)
      })).filter(profile => profile.diagnostic))
    ])
  ];
  const url = URL.createObjectURL(new Blob(['\ufeff' + lines.map(line => line.map(cell).join(';')).join('\r\n')], {
    type: 'text/csv;charset=utf-8'
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'WolfGuard-ports-protocoles.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copyProtocolReference(button, text) {
  const copied = await copyText(text);
  if (!button.isConnected) return;
  const previous = button.innerHTML;
  button.innerHTML = copied ? PROTOCOL_ICONS.check : 'Copie impossible';
  setTimeout(() => {
    if (button.isConnected) button.innerHTML = previous
  }, 1400);
}

function protocolProfileHTML(profile) {
  const diagnostic = protocolDiagnosticHTML(profile);
  return `<section class="reference-variant ${diagnostic?'has-diagnostic':''}" data-profile="${esc(profile.profileId)}">
    <div class="reference-profile-label">${profile.origin==='iana'?'Registre IANA · '+esc(PROTOCOL_REGISTRY_STATUS[profile.status]||profile.status):'Fiche pratique documentée'}</div><h3>${esc(profile.service)}</h3><div class="reference-variant-heading">${protocolTransportHTML(profile.transport)}${protocolProtectionHTML(profile)}</div><p class="reference-profile-usage">${esc(profile.usage)}</p>
    <div class="reference-profile-layout"><div class="reference-knowledge"><div class="reference-flow-card"><span>${protocolFamilyIcon('network')}</span><div><h4>Sens du flux</h4><p>${esc(profile.flow)}</p></div></div><dl class="reference-facts"><dt>Particularités</dt><dd>${esc(profile.notes)}</dd><dt>Conseil d'exploitation</dt><dd>${esc(profile.security)}</dd>${profile.reference?'<dt>Références IANA</dt><dd>'+esc(profile.reference)+'</dd>':''}${profile.registered?'<dt>Enregistrement</dt><dd>'+esc(profile.registered)+'</dd>':''}${profile.modified?'<dt>Modification IANA</dt><dd>'+esc(profile.modified)+'</dd>':''}${profile.protectionBasis?'<dt>Qualification de la protection</dt><dd>'+esc(profile.protectionBasis)+'</dd><dt>Protection vérifiée le</dt><dd>'+esc(profile.protectionCheckedAt)+'</dd>':''}<dt>${profile.origin==='iana'?'Registre récupéré le':'Source consultée le'}</dt><dd>${esc(profile.checkedAt)}</dd></dl><div class="reference-profile-sources">${protocolSourceLinks(profile)}</div></div>${diagnostic}</div>
  </section>`;
}

function openProtocolReference(row, trigger, context) {
  const {
    data
  } = row, filter = protocolDisplayFilter(row), position = context.filtered.findIndex(item => item.id === row.id), profiles = protocolProfiles(row);
  const related = context.rows.filter(other => other.id !== row.id && other.data.kind === data.kind && other.start <= row.end && other.end >= row.start);
  modal(protocolReferenceTitle(data), `<div class="protocol-reference-detail">
    <div class="reference-topline"><span>${data.kind==='ip'?'Protocole IP · Sans port TCP/UDP':data.kind==='service'?'Service sans port attribué':'Port / plage'} · ${esc(protocolFamilyLabel(row.family))}</span><div>${protocolProtectionHTML(data)}</div></div>
    <div class="protocol-reference-endpoint"><div class="reference-endpoint-number"><span>${data.kind==='ip'?'Numéro de protocole IP':data.kind==='service'?'Service enregistré':'Port / plage'}</span><strong>${esc(protocolEndpoint(data).value||'—')}</strong></div><div class="reference-endpoint-transport">${protocolTransportHTML(data.transport)}<small>${profiles.length} fiche${profiles.length===1?'':'s'} pour ce résultat</small></div><span class="reference-endpoint-icon" aria-hidden="true">${protocolFamilyIcon(row.family)}</span></div>
    <div class="reference-profiles">${profiles.map(protocolProfileHTML).join('')}</div>
    ${filter?'<section class="reference-section"><h3>Filtre Wireshark</h3><div class="reference-filter"><code>'+esc(filter)+'</code><button type="button" class="secondary protocol-icon" id="protocolFilterCopy" title="Copier le filtre Wireshark" aria-label="Copier le filtre Wireshark">'+ITEM_ACTION_ICONS.copy+'</button></div></section>':''}
    ${related.length?'<section class="reference-section"><h3>Autres fiches sur cette plage'+(related.length>80?' · 80 sur '+related.length:'')+'</h3><div class="reference-related">'+related.slice(0,80).map(other=>'<button type="button" data-related="'+esc(other.id)+'"><span>'+esc(other.data.service)+'</span><span>'+esc(other.data.transport)+'</span><code>'+esc(protocolEndpoint(other.data).value)+'</code>'+PROTOCOL_ICONS.open+'</button>').join('')+'</div></section>':''}
    <p class="reference-checked">Une attribution IANA ne garantit ni le service réellement présent, ni son chiffrement. Les fiches pratiques décrivent des usages documentés ; vérifier les paramètres de votre environnement.</p>
    <footer class="reference-footer"><div class="reference-stepper"><button type="button" id="protocolReferencePrevious" class="secondary protocol-icon" title="Résultat précédent" aria-label="Résultat précédent" ${position<=0?'disabled':''}>${PROTOCOL_ICONS.back}</button><span>${position<0?'':(position+1)+' / '+context.filtered.length}</span><button type="button" id="protocolReferenceNext" class="secondary protocol-icon" title="Résultat suivant" aria-label="Résultat suivant" ${position<0||position>=context.filtered.length-1?'disabled':''}>${PROTOCOL_ICONS.open}</button></div><div class="actions"><button type="button" class="secondary protocol-button" id="protocolReferenceCopy">${ITEM_ACTION_ICONS.copy}Copier la fiche</button><button type="button" class="primary protocol-button" id="protocolReferenceClose">Fermer</button></div></footer>
  </div>`);
  const dialog = $('#modalRoot .modal');
  dialog.classList.add('protocol-reference-modal');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', data.service);
  const close = () => {
    closeModal();
    trigger?.focus({
      preventScroll: true
    })
  };
  $('#protocolReferenceClose').onclick = close;
  $('#protocolReferenceCopy').onclick = event => copyProtocolReference(event.currentTarget, protocolReferenceText(row));
  if (filter) $('#protocolFilterCopy').onclick = event => copyProtocolReference(event.currentTarget, filter);
  dialog.querySelectorAll('[data-diagnostic-copy]').forEach(button => button.onclick = event => copyProtocolReference(event.currentTarget, button.closest('.diagnostic-command').querySelector('code').textContent));
  const open = next => {
    if (next) openProtocolReference(next, trigger, context)
  };
  $('#protocolReferencePrevious').onclick = () => open(context.filtered[position - 1]);
  $('#protocolReferenceNext').onclick = () => open(context.filtered[position + 1]);
  dialog.querySelectorAll('[data-related]').forEach(button => button.onclick = () => open(context.rows.find(other => other.id === button.dataset.related)));
  dialog.onkeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close()
    }
    if (event.key === 'Tab') {
      const nodes = [...dialog.querySelectorAll('a[href],button:not([disabled]),summary')].filter(node => node.getClientRects().length),
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
  $('#protocolReferenceClose').focus({
    preventScroll: true
  });
}
