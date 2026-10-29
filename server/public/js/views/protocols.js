'use strict';

const PROTOCOL_FAMILY_ICONS = {
  all: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  web: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
  network: '<rect x="9" y="2" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/>',
  identity: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  remote: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4m-5-9 3-3-3-3M13 12h4"/>',
  data: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0"/>',
  messaging: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  monitoring: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  other: '<rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><path d="M6 6.5h.01M6 17.5h.01"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'
};
const PROTOCOL_FAMILIES = [{
  id: 'all',
  label: 'Tous'
}, {
  id: 'web',
  label: 'Web & API',
  match: /^(https?\b|restconf\b|docker\b|kubernetes\b)/
}, {
  id: 'vpn',
  label: 'VPN & tunnels'
}, {
  id: 'database',
  label: 'Bases de données'
}, {
  id: 'containers',
  label: 'Conteneurs & clusters'
}, {
  id: 'printing',
  label: 'Impression'
}, {
  id: 'identity',
  label: 'Identit\u00e9',
  match: /^(ldaps?\b|kerberos\b|radius\b|tacacs|adws\b|cisco ise\b)/
}, {
  id: 'remote',
  label: 'Acc\u00e8s distant',
  match: /^(ssh\b|telnet\b|rdp\b|vnc\b|winrm\b|rpc\b)/
}, {
  id: 'network',
  label: 'R\u00e9seau',
  match: /^(dns\b|mdns\b|llmnr\b|dhcp|ntp\b|nts\b|bgp\b|ipsec\b|ike\b|l2tp\b|openvpn\b|wireguard\b|pptp\b|capwap\b|vxlan\b|gtp-|netconf\b|gnmi\b|bfd\b|rip|ptp\b|pcp\b|icmp|ospf\b|gre\b|esp\b|ah\b|vrrp\b)/
}, {
  id: 'data',
  label: 'Fichiers & donn\u00e9es',
  match: /^(mysql\b|mssql\b|postgresql\b|oracle\b|mongodb\b|redis\b|elasticsearch\b|nfs\b|smb\b|netbios\b|t?ftps?\b|git\b|ipp\b|rsync\b|iscsi\b|rpcbind\b)/
}, {
  id: 'messaging',
  label: 'Communication',
  match: /^(smtps?\b|imaps?\b|pop3s?\b|exchange\b|xmpp\b|amqp|mqtt\b|sip\b|h\.323\b|rtsp\b)/
}, {
  id: 'monitoring',
  label: 'Supervision',
  match: /^(snmp\b|syslog\b|forti(analyzer|manager|client)\b|check point\b|nessus\b|kibana\b|ipfix\b|sflow\b|centreon\b|prometheus\b|grafana\b)/
}, {
  id: 'other',
  label: 'Autres'
}];
const protocolView = {
  query: '',
  family: 'all',
  transport: 'all',
  sort: 'port-asc',
  range: 'all',
  protection: 'all',
  scope: 'all',
  scrollTop: 0,
  focusId: null
};
const protocolSearch = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const protocolKey = (service, port, transport) => JSON.stringify([String(service ?? '').trim().toLowerCase(), String(port ?? '').trim(), String(transport ?? '').toUpperCase().split('/').filter(Boolean).sort()]);

function protocolReferenceMap(items) {
  const references = new Map();
  for (const item of items.filter(x => x.type === 'protocol' && x.documentType === 'procedure')) {
    const doc = new DOMParser().parseFromString(item.content || '', 'text/html');
    for (const row of doc.querySelectorAll('table tr')) {
      const cells = [...row.querySelectorAll('td')].map(cell => cell.textContent.trim());
      if (cells.length < 4) continue;
      references.set(protocolKey(cells[0], cells[1], cells[2]), {
        usage: cells[3]
      });
    }
  }
  return references;
}

function protocolData(item, references = new Map()) {
  if (item.protocol) return {
    ...item.protocol,
    port: String(item.protocol.port ?? '')
  };
  const doc = new DOMParser().parseFromString(item.content || '', 'text/html'),
    fields = {};
  for (const row of doc.querySelectorAll('table tr')) {
    const label = row.querySelector('th')?.textContent.trim().toLowerCase(),
      value = row.querySelector('td')?.textContent.trim();
    if (label && value) fields[label] = value;
  }
  const title = String(item.title || ''),
    match = title.match(/^(.*?)\s+[\u2014\u2013-]\s+(\d+)\/(TCP(?:\/UDP)?|UDP(?:\/TCP)?|SCTP|IP)$/i);
  // Some legacy summary cells lost the second transport; their titles retained it.
  const service = match?.[1] || title,
    port = fields.port || match?.[2] || '',
    transport = (match?.[3] || fields.transport || '').toUpperCase();
  const heading = [...doc.querySelectorAll('h2,h3')].find(h => protocolSearch(h.textContent) === 'securite');
  let security = '';
  for (let node = heading?.nextElementSibling; node && !/^H[1-6]$/.test(node.tagName); node = node.nextElementSibling) {
    if (['P', 'UL', 'OL'].includes(node.tagName)) security += (security ? ' ' : '') + node.textContent.trim();
  }
  return {
    service,
    port,
    transport,
    usage: references.get(protocolKey(service, port, transport))?.usage || fields.usage || item.description || '',
    security
  };
}

function protocolTransportHTML(value) {
  return '<div class="protocol-transports">' + String(value || '').split('/').filter(Boolean).map(part => '<span class="protocol-transport ' + (part === 'TCP' ? 'is-tcp' : part === 'UDP' ? 'is-udp' : 'is-other') + '">' + esc(part) + '</span>').join('') + '</div>';
}

function protocolEndpoint(data) {
  const isIP = data.transport === 'IP',
    value = String((isIP ? data.number : data.port) ?? '');
  return {
    isIP,
    value,
    label: data.kind === 'mixed' ? 'NUM\u00c9RO' : isIP ? 'N\u00b0 IP' : 'PORT',
    copyLabel: data.kind === 'mixed' ? 'Copier le num\u00e9ro' : isIP ? 'Copier le num\u00e9ro IP' : 'Copier le port'
  };
}

function protocolCopyButton(data) {
  const endpoint = protocolEndpoint(data);
  return '<button type="button" class="primary protocol-icon item-action-button" title="' + endpoint.copyLabel + '" aria-label="' + endpoint.copyLabel + ' ' + esc(endpoint.value) + '" data-copy-kind="' + (data.kind === 'mixed' ? 'number' : endpoint.isIP ? 'ip' : 'port') + '" data-copy-port="' + esc(endpoint.value) + '" ' + (endpoint.value ? '' : 'disabled') + '>' + ITEM_ACTION_ICONS.copy + '</button>';
}

function protocolFamilyIcon(name) {
  return '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (PROTOCOL_FAMILY_ICONS[name] || PROTOCOL_FAMILY_ICONS.other) + '</svg>';
}

function protocolFamily(data) {
  for (const value of [data.service, data.alias]) {
    const family = PROTOCOL_FAMILIES.find(family => family.match?.test(protocolSearch(value).trim()));
    if (family) return family;
  }
  return PROTOCOL_FAMILIES.at(-1);
}
async function copyProtocolPort(button) {
  if (button.disabled) return;
  button.protocolCopyLabel ??= button.getAttribute('aria-label');
  if (!await copyText(button.dataset.copyPort)) {
    appNotify('Impossible de copier dans le presse-papiers.', {kind: 'error'});
    return
  }
  if (!button.isConnected) return;
  clearTimeout(button.protocolCopyTimer);
  const feedback = button.dataset.copyKind === 'number' ? 'Num\u00e9ro copi\u00e9' : button.dataset.copyKind === 'ip' ? 'Num\u00e9ro IP copi\u00e9' : 'Port copi\u00e9';
  button.protocolCopyTitle ??= button.title;
  button.innerHTML = PROTOCOL_ICONS.check;
  button.title = feedback;
  button.setAttribute('aria-label', feedback);
  button.protocolCopyTimer = setTimeout(() => {
    if (!button.isConnected) return;
    button.innerHTML = ITEM_ACTION_ICONS.copy;
    button.title = button.protocolCopyTitle;
    button.setAttribute('aria-label', button.protocolCopyLabel);
  }, 1400);
}
async function renderProtocolWorkspace() {
  state.folder = null;
  state.item = null;
  state.mode = 'view';
  $('#content').classList.add('protocol-content');
  $('#content').innerHTML = '<div class="protocol-workspace protocol-matrix-workspace"><section class="detail-pane"><div id="detailHost"></div></section></div>';
  await renderProtocolMatrix();
}
async function showProtocolCatalog() {
  await renderProtocolWorkspace()
}

function protocolEditFields(data) {
  const transports = [...new Set(['TCP', 'UDP', 'TCP/UDP', 'SCTP', 'IP', data.transport].filter(Boolean))];
  return `<div class="protocol-editor-fields">
    <div class="field"><label for="protocolServiceEdit">Service</label><input id="protocolServiceEdit" required value="${esc(data.service)}"></div>
    <div class="field" data-protocol-port-field><label for="protocolPortEdit">Port / plage</label><input id="protocolPortEdit" type="text" inputmode="numeric" pattern="[0-9]{1,5}(-[0-9]{1,5})?" value="${esc(data.port)}"></div>
    <div class="field" data-protocol-number-field><label for="protocolNumberEdit">Num\u00e9ro IP</label><input id="protocolNumberEdit" type="number" min="0" max="255" step="1" value="${esc(data.number??'')}"></div>
    <div class="field"><label for="protocolTransportEdit">Transport</label><select id="protocolTransportEdit">${transports.map(value=>`<option value="${esc(value)}" ${value===data.transport?'selected':''}>${esc(value)}</option>`).join('')}</select></div>
    <div class="field wide"><label for="protocolUsageEdit">Usage</label><textarea id="protocolUsageEdit" rows="2">${esc(data.usage)}</textarea></div>
    <div class="field wide"><label for="protocolSecurityEdit">Sécurité</label><textarea id="protocolSecurityEdit" rows="2">${esc(data.security)}</textarea></div>
  </div>`;
}

function initProtocolEditFields() {
  const transport = $('#protocolTransportEdit');
  if (!transport) return;
  const update = () => {
    const ip = transport.value === 'IP';
    $('[data-protocol-port-field]').hidden = ip;
    $('#protocolPortEdit').disabled = ip;
    $('[data-protocol-number-field]').hidden = !ip;
    $('#protocolNumberEdit').disabled = !ip;
    const port = $('#protocolPortEdit'),
      value = port.value.trim(),
      bounds = value.split('-').map(Number);
    const valid = !value || /^\d{1,5}(-\d{1,5})?$/.test(value) && bounds.every(number => number >= 0 && number <= 65535) && (bounds.length === 1 || bounds[0] <= bounds[1]);
    port.setCustomValidity(ip || valid ? '' : 'Indique un port entre 0 et 65535 ou une plage croissante.');
  };
  transport.onchange = update;
  $('#protocolPortEdit').oninput = update;
  update();
}
