'use strict';

/* SEARCH */
window.workspaceSearch = new WorkspaceSearch({
  readItems: async () => (await readForDisplay('items')).filter(item=>!isDeleted(item)&&!item.consolidatedInto&&workspaceModules.allowsItem(item)),
  readFolders: async () => (await readForDisplay('folders')).filter(folder=>!isDeleted(folder)&&!folder.consolidatedFolder),
  readActivity: () => readForDisplay('activity'),
  sectionForItem,
  typeLabel,
  escape: esc,
  protocolMetadata: item => item.documentType === 'procedure' ? null : protocolData(item),
  isUnlocked: () => !$('#app').classList.contains('hidden'),
  openItem: id => openById(id),
  icon: name => name === 'open' ? PROTOCOL_ICONS.open : workspaceSectionIcon(name)
});

function searchGlobal(query) {
  return window.workspaceSearch.search(query)
}
window.hideSearch = () => window.workspaceSearch.hide();
