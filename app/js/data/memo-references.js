'use strict';

const MEMO_REFERENCES_SETTING = 'memo-references-version';
const MEMO_REFERENCES_VERSION = 2;
const MEMO_PORT_REFERENCE = 'ports-services';
const MEMO_OSI_REFERENCE = 'osi-model';

// Plan one additive migration; edited or deleted references are never regenerated.
function buildMemoReferences(snapshot, catalog, stamp = new Date().toISOString()) {
  const operations = [];
  const version = Number(snapshot.settings?.find(row => row.key === MEMO_REFERENCES_SETTING)?.value) || 0;
  if (version >= MEMO_REFERENCES_VERSION) return {operations};
  const items = snapshot.items || [], folders = snapshot.folders || [];
  const used = new Set([...items, ...folders].map(row => row.id));
  const uniqueId = base => {
    let id = base, index = 0;
    while (used.has(id)) id = base + '-' + (++index);
    used.add(id);
    return id;
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  let folder = folders.find(row => !row.deletedAt && row.section === 'library' && !row.parentId && ['referentiel','referentiels'].includes(row.name.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLocaleLowerCase('fr')));
  if (!folder) {
    folder = {id:uniqueId('memo-reference-folder'), name:'Référentiels', section:'library', parentId:null, createdAt:stamp, updatedAt:stamp};
    operations.push({action:'put', store:'folders', record:folder});
  }
  if (version < 1 && !items.some(item => item.referenceCatalogId === MEMO_PORT_REFERENCE)) {
    const groups = new Map();
    for (const entry of catalog.entries) {
      if (entry.kind !== 'port') continue;
      if (!entry.port || !entry.service || !entry.usage) throw new Error('Une entrée du référentiel des ports est incomplète.');
      const identity = JSON.stringify([entry.port, entry.service, entry.usage]);
      if (!groups.has(identity)) groups.set(identity, {...entry, transports:new Set()});
      groups.get(identity).transports.add(entry.transport);
    }
    if (!groups.size) throw new Error('Le référentiel des ports est vide.');
    const rows = [...groups.values()].sort((a,b) => parseInt(a.port,10) - parseInt(b.port,10) || a.service.localeCompare(b.service,'fr'));
    const content = '<h1>Ports et services</h1><p>Retrouve les ports usuels, leur service et une courte description. Le transport figure à côté du numéro de port.</p>' +
      '<p>Les ports indiqués sont des repères : certaines applications utilisent une valeur configurable. Un port ouvert ne suffit pas à identifier le service réellement utilisé.</p>' +
      '<h2>Tableau des ports et services</h2><table><caption>Ports, services et descriptions</caption><thead><tr><th scope="col">Port</th><th scope="col">Service</th><th scope="col">Description</th></tr></thead><tbody>' +
      rows.map(row => '<tr><td><strong>' + escape(row.port) + '</strong><br>' + escape([...row.transports].join(' / ')) + '</td><td>' + escape(row.service) + '</td><td>' + escape(row.usage) + '</td></tr>').join('') +
      '</tbody></table><p>Catalogue pratique WolfGuard · Révision du catalogue : ' + escape(catalog.checkedAt || 'non renseignée') + '.</p>';
    operations.push({action:'put', store:'items', record:{
      id:uniqueId('memo-reference-ports-services'), referenceCatalogId:MEMO_PORT_REFERENCE,
      type:'memo', originalType:'memo', documentType:'memo', unifiedDocument:true, unifiedDocumentVersion:2,
      title:'Ports et services', description:'Tableau des ports usuels : numéro, transport, service et courte description.',
      folderId:folder.id, content, tags:['référentiel','ports','services','réseau'], facets:['memo','command','template','reference'],
      favorite:false, attachments:[], commandBlocks:[], createdAt:stamp, updatedAt:stamp
    }});
  }
  if (!items.some(item => item.referenceCatalogId === MEMO_OSI_REFERENCE)) {
    // Editorial checks (not displayed in the memo):
    // https://www.iso.org/standard/20269.html
    // https://docs.oracle.com/cd/E19455-01/806-1017/6jab5di2d/index.html
    // https://www.rfc-editor.org/rfc/rfc1122.html
    const layers = [
      ['7 · Application', 'Fournir les services réseau utilisés par les applications.', 'HTTP, DNS, SMTP, SSH.', 'Nom demandé, réponse du service, authentification et erreur applicative.'],
      ['6 · Présentation', 'Représenter les données : encodage, sérialisation, compression et chiffrement.', 'UTF-8, JSON et formats d’image ; fonctions de présentation assurées par TLS.', 'Format attendu, encodage, certificat et négociation cryptographique.'],
      ['5 · Session', 'Établir, maintenir et terminer le dialogue entre applications ; organiser sa reprise.', 'Dialogue RPC, synchronisation et points de reprise.', 'Expiration du dialogue, reprise après coupure et état conservé par l’application.'],
      ['4 · Transport', 'Acheminer les données de bout en bout entre processus, avec les services propres au transport choisi.', 'TCP : segments, ordre et retransmissions. UDP : datagrammes, sans garantie de livraison.', 'Ports, établissement TCP, pertes, retransmissions et filtrage du flux.'],
      ['3 · Réseau', 'Adresser les hôtes et acheminer les paquets entre réseaux.', 'IPv4, IPv6, ICMP et routage ; repère : adresse IP.', 'Adresse, préfixe, passerelle et route vers la destination.'],
      ['2 · Liaison de données', 'Transporter les trames sur un lien et gérer leur adressage local.', 'Ethernet, Wi-Fi et VLAN ; repère : adresse MAC.', 'VLAN, voisinage local, apprentissage MAC et erreurs de trames.'],
      ['1 · Physique', 'Transmettre les bits sous forme de signaux sur un support.', 'Cuivre, fibre et radio ; connecteurs, modules optiques et répéteurs.', 'Alimentation, câble, lien, niveau du signal et vitesse négociée.']
    ];
    const content = '<h1>Modèle OSI</h1><p>Le modèle OSI décrit les communications réseau en sept couches. Il sert à situer une fonction et à organiser un diagnostic ; les protocoles réels ne se répartissent pas toujours dans une seule couche.</p>' +
      '<h2>Les sept couches, de 7 à 1</h2><table><caption>Couches OSI, rôles et repères de diagnostic</caption><thead><tr><th scope="col">Couche</th><th scope="col">Rôle</th><th scope="col">Exemples et repères</th><th scope="col">À contrôler</th></tr></thead><tbody>' +
      layers.map(layer => '<tr>' + layer.map((value,index) => '<' + (index ? 'td' : 'th scope="row"') + '>' + escape(value) + '</' + (index ? 'td' : 'th') + '>').join('') + '</tr>').join('') + '</tbody></table>' +
      '<h2>Encapsulation et adressage</h2><p>À l’émission : données applicatives → segment TCP ou datagramme UDP → paquet IP → trame → bits. À la réception, les en-têtes sont traités dans l’ordre inverse.</p>' +
      '<ul><li>Les ports identifient les extrémités du transport ; les adresses IP servent au routage et les adresses MAC au lien local.</li><li>Sur un trajet routé, la trame est renouvelée à chaque lien. Sur un lien Ethernet, le routeur utilise l’adresse MAC du prochain saut.</li></ul>' +
      '<h2>Correspondance avec TCP/IP</h2><table><caption>Correspondance pédagogique entre OSI et TCP/IP</caption><thead><tr><th scope="col">TCP/IP</th><th scope="col">Couches OSI rapprochées</th></tr></thead><tbody><tr><td>Application</td><td>7 · Application, 6 · Présentation, 5 · Session</td></tr><tr><td>Transport</td><td>4 · Transport</td></tr><tr><td>Internet</td><td>3 · Réseau</td></tr><tr><td>Accès réseau</td><td>2 · Liaison de données, 1 · Physique</td></tr></tbody></table>' +
      '<p>Cette correspondance est un repère de lecture. TLS s’intercale dans la pile des applications sécurisées ; les couches 5 à 7 sont souvent prises en charge ensemble par les logiciels.</p>' +
      '<h2>Diagnostiquer du bas vers le haut</h2><ol><li>Contrôler d’abord le lien physique et le réseau local : signal, VLAN et voisinage.</li><li>Vérifier l’adressage IP et le chemin vers la destination.</li><li>Tester le transport utilisé, sur le bon port et dans le bon sens.</li><li>Contrôler le nom DNS, puis la négociation TLS et la réponse du service lorsqu’ils sont utilisés.</li><li>Relier chaque observation au flux réellement défaillant. Un ping refusé ne prouve pas que le poste est indisponible ; un port ouvert ne prouve pas que l’application fonctionne.</li></ol>';
    operations.push({action:'put', store:'items', record:{
      id:uniqueId('memo-reference-osi-model'), referenceCatalogId:MEMO_OSI_REFERENCE,
      type:'memo', originalType:'memo', documentType:'memo', unifiedDocument:true, unifiedDocumentVersion:2,
      title:'Modèle OSI', description:'Les sept couches, leurs rôles, l’encapsulation, la correspondance TCP/IP et les repères de diagnostic.',
      folderId:folder.id, content, tags:['référentiel','OSI','réseau','TCP/IP'], facets:['memo','command','template','reference'],
      favorite:false, attachments:[], commandBlocks:[], createdAt:stamp, updatedAt:stamp
    }});
  }
  // Keep any personal records from the retired tool accessible in Memo.
  for (const oldFolder of folders.filter(row => version < 1 && row.section === 'protocol' && !row.deletedAt)) {
    operations.push({action:'put', store:'folders', record:{...oldFolder, section:'library', parentId:oldFolder.parentId || folder.id}});
  }
  const legacyFolders = new Set(folders.filter(row => row.section === 'protocol' && !row.deletedAt).map(row => row.id));
  for (const item of items.filter(row => version < 1 && row.type === 'protocol' && !row.deletedAt)) {
    operations.push({action:'put', store:'items', record:{...item, type:'memo', originalType:'protocol', documentType:'memo', unifiedDocument:true, unifiedDocumentVersion:2, folderId:legacyFolders.has(item.folderId) ? item.folderId : folder.id}});
  }
  operations.push({action:'put', store:'settings', record:{key:MEMO_REFERENCES_SETTING, value:MEMO_REFERENCES_VERSION}});
  return {operations};
}

function memoCitationRecords(item, related = []) {
  return [item, ...related].flatMap(record => [record.sources, record.references].flatMap(value => Array.isArray(value) ? value : []));
}

function cleanMemoCitationHTML(content, citations = []) {
  if (!content || (!citations.length && !/<(?:h[1-6]|p|section|div)\b[^>]*>(?:\s|<\/?(?:span|strong|b|em|i)\b[^>]*>)*(?:\d+[.)]\s*)?(?:sources?|r(?:[ée]|&(?:eacute|#0*233|#x0*e9);)f(?:[ée]|&(?:eacute|#0*233|#x0*e9);)rences?)/i.test(content) && !/reader-sources|data-memo-citations/.test(content))) return content;
  // Template content stays inert: cleaning a stored note must not load its media.
  const holder = document.createElement('template'); holder.innerHTML = content;
  const root = holder.content, fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');
  const urlKey = value => { try { return new URL(String(value)).href; } catch { return String(value || '').trim(); } };
  const urls = new Set(citations.map(source => source?.url).filter(Boolean).map(urlKey));
  const titles = new Set(citations.map(source => fold(typeof source === 'string' ? source : source?.title)).filter(Boolean));
  const referenceHeading = value => /^(?:sources?(?: (?:officielles?|documentaires?))?|references?(?: complementaires?| et pieces utiles)?|sources? et references?|references? et sources?)\s*[:.]?$/.test(fold(value).replace(/^\d+[.)]\s*/, ''));
  const protectedContent = node => node.nodeType === 1 && (node.matches('pre,code,table,img,video,audio') || node.querySelector('pre,code,table,img,video,audio'));
  let changed = false;
  for (const block of root.querySelectorAll('.reader-sources,[data-memo-citations]')) {
    if (block.closest('pre,code,table') || protectedContent(block)) continue;
    block.remove(); changed = true;
  }
  for (const heading of root.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    if (!root.contains(heading) || heading.closest('pre,code,table') || !referenceHeading(heading.textContent)) continue;
    const level = Number(heading.tagName[1]), parent = heading.parentElement;
    let next = heading.nextSibling;
    heading.remove(); changed = true;
    while (next) {
      if (next.nodeType === 1 && /^H[1-6]$/.test(next.tagName) && Number(next.tagName[1]) <= level) break;
      if (next.nodeType === 1 && [...next.querySelectorAll('h1,h2,h3,h4,h5,h6')].some(node => Number(node.tagName[1]) <= level)) break;
      if (protectedContent(next)) break;
      const following = next.nextSibling; next.remove(); next = following;
    }
    if (parent && !parent.textContent.trim() && !parent.children.length) parent.remove();
  }
  for (const paragraph of root.querySelectorAll('p')) {
    if (paragraph.closest('pre,code,table') || protectedContent(paragraph)) continue;
    const text = fold(paragraph.textContent);
    if (/^(?:references?(?: complementaires?)?|sources)\s*:/.test(text) || /^source\s*:/.test(text) && paragraph.querySelector('a[href]')) {
      paragraph.remove(); changed = true;
    }
  }
  // Older consolidated guides appended metadata as unlabelled lists. Remove
  // only citation entries, leaving instructional links and mixed lists intact.
  for (const list of root.querySelectorAll('ul,ol')) {
    if (!root.contains(list) || list.closest('pre,code,table')) continue;
    for (const entry of [...list.children].filter(node => node.tagName === 'LI')) {
      if (protectedContent(entry)) continue;
      const links = [...entry.querySelectorAll('a[href]')];
      const remainder = entry.cloneNode(true); remainder.querySelectorAll('a').forEach(link => link.remove());
      const citation = links.length
        ? links.every(link => urls.has(urlKey(link.getAttribute('href')))) && /^[\s()[\]{}:;,\.\-–—]*$/.test(remainder.textContent)
        : titles.has(fold(entry.textContent));
      if (citation) { entry.remove(); changed = true; }
    }
    if (!list.children.length && !list.textContent.trim()) list.remove();
  }
  return changed ? holder.innerHTML : content;
}

function cleanMemoCitationItem(item, related = []) {
  if (!['memo','procedure','personal','command','report','template','protocol'].includes(item.type)) return item;
  const content = item.type === 'command' && !item.unifiedDocument ? item.content : cleanMemoCitationHTML(item.content, memoCitationRecords(item, related));
  if (!Object.hasOwn(item, 'sources') && !Object.hasOwn(item, 'references') && content === item.content) return item;
  const cleaned = {...item, content}; delete cleaned.sources; delete cleaned.references;
  return cleaned;
}

function buildMemoCitationCleanup(snapshot, stamp = new Date().toISOString()) {
  const items = snapshot.items || [], byId = new Map(items.map(item => [item.id, item])), operations = [];
  for (const item of items) {
    if (item.deletedAt) continue;
    const related = (item.guideSourceIds || []).map(id => byId.get(id)).filter(Boolean);
    const cleaned = cleanMemoCitationItem(item, related);
    if (cleaned !== item) operations.push({action:'put', store:'items', record:{...cleaned, updatedAt:stamp}});
  }
  return {operations};
}
