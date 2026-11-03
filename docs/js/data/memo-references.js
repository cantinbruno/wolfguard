'use strict';

const MEMO_REFERENCES_SETTING = 'memo-references-version';
const MEMO_PORT_REFERENCE = 'ports-services';

// Plan one additive migration; edited or deleted references are never regenerated.
function buildMemoReferences(snapshot, catalog, stamp = new Date().toISOString()) {
  const operations = [];
  if (snapshot.settings?.some(row => row.key === MEMO_REFERENCES_SETTING && Number(row.value) >= 1)) return {operations};
  const items = snapshot.items || [], folders = snapshot.folders || [];
  const used = new Set([...items, ...folders].map(row => row.id));
  const uniqueId = base => {
    let id = base, index = 0;
    while (used.has(id)) id = base + '-' + (++index);
    used.add(id);
    return id;
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  let folder = folders.find(row => !row.deletedAt && row.section === 'library' && !row.parentId && row.name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr') === 'referentiels');
  if (!folder) {
    folder = {id:uniqueId('memo-reference-folder'), name:'Référentiels', section:'library', parentId:null, createdAt:stamp, updatedAt:stamp};
    operations.push({action:'put', store:'folders', record:folder});
  }
  if (!items.some(item => item.referenceCatalogId === MEMO_PORT_REFERENCE)) {
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
      references:catalog.sources || [], favorite:false, attachments:[], commandBlocks:[], createdAt:stamp, updatedAt:stamp
    }});
  }
  // Keep any personal records from the retired tool accessible in Memo.
  for (const oldFolder of folders.filter(row => row.section === 'protocol' && !row.deletedAt)) {
    operations.push({action:'put', store:'folders', record:{...oldFolder, section:'library', parentId:oldFolder.parentId || folder.id}});
  }
  const legacyFolders = new Set(folders.filter(row => row.section === 'protocol' && !row.deletedAt).map(row => row.id));
  for (const item of items.filter(row => row.type === 'protocol' && !row.deletedAt)) {
    operations.push({action:'put', store:'items', record:{...item, type:'memo', originalType:'protocol', documentType:'memo', unifiedDocument:true, unifiedDocumentVersion:2, folderId:legacyFolders.has(item.folderId) ? item.folderId : folder.id}});
  }
  operations.push({action:'put', store:'settings', record:{key:MEMO_REFERENCES_SETTING, value:1}});
  return {operations};
}
