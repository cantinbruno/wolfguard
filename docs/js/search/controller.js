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
  openItem: id => String(id).startsWith('settings:') ? openSettings(String(id).slice(9)) : openById(id),
  icon: name => name === 'open' ? PROTOCOL_ICONS.open : name === 'settings' ? settingsIcon('sliders-horizontal') : workspaceSectionIcon(name),
  // Only the tabs this account can open are offered.
  settingsEntries: () => {
    const cloud = typeof WolfGuardCloud === 'undefined' ? null : WolfGuardCloud, admin = !cloud || cloud.isAdmin();
    const can = key => admin || !!cloud?.can?.(key);
    return [
      {tab: 'account', title: 'Mon compte', keywords: 'compte identité code personnel authenticator mfa double authentification téléphone session verrouillage'},
      {tab: 'data', title: 'Données', keywords: 'données import export transfert stockage espace'},
      {tab: 'interface', title: 'Interface', keywords: 'interface ambiance thème couleurs densité taille du texte animations'},
      {tab: 'modules', title: 'Sections', keywords: 'sections modules'},
      can('users.read') && {tab: 'users', title: 'Utilisateurs', keywords: 'utilisateurs comptes invitations droits effectifs'},
      can('users.permissions') && {tab: 'groups', title: 'Groupes', keywords: 'groupes droits autorisations permissions accès'},
      can('access.read') && {tab: 'access', title: 'Connexions', keywords: 'connexions sessions appareils adresses ip'},
      can('access.read') && {tab: 'blocking', title: 'Blocage', keywords: 'blocage adresses ip spamhaus réputation'},
      admin && {tab: 'journal', title: 'Journal', keywords: 'journal logs événements erreurs connexions échecs'},
      {tab: 'about', title: 'À propos', keywords: 'à propos wolfguard'}
    ].filter(Boolean);
  }
});

function searchGlobal(query) {
  return window.workspaceSearch.search(query)
}
window.hideSearch = () => window.workspaceSearch.hide();
