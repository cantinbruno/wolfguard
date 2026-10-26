'use strict';

/* SEARCH */
window.workspaceSearch = new WorkspaceSearch({
  readItems: async () => (await activeItems()).filter(workspaceModules.allowsItem),
  readFolders: activeFolders,
  readActivity: () => all('activity'),
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
