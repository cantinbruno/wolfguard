'use strict';

const WORKSPACE_VIEW_KEY = 'itw-section-layout-';
const WORKSPACE_LIBRARY_VIEW_KEY = 'itw-library-layout-grid';
const workspaceViews = new Map();
const WORKSPACE_LAYOUT_ICONS = {
  cards: '<svg class="lucide lucide-layout-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  list: '<svg class="lucide lucide-list" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>'
};
const WORKSPACE_NAV_ICON_PATHS = {
  house: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h2M14 10h2M8 14h2M14 14h2M8 18h2M14 18h2"/>',
  terminal: '<path d="m4 17 6-5-6-5"/><path d="M12 19h8"/>',
  files: '<path d="M15 2H6a2 2 0 0 0-2 2v12"/><path d="M15 2v6h6"/><path d="M21 8v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9z"/>',
  'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4-4L7 21"/>',
  'folder-open': '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  ellipsis: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'
};

function workspaceNavigationIcon(name) {
  return '<svg class="lucide lucide-' + name + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + WORKSPACE_NAV_ICON_PATHS[name] + '</svg>';
}

function workspaceSectionIcon(section) {
  if (section === 'home') return workspaceNavigationIcon('house');
  if (['scan', 'scan-passive', 'scan-active'].includes(section)) return '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.4-6.4M5.6 5.6a9 9 0 0 1 12.8 12.8"/><circle cx="8" cy="15" r="1"/><circle cx="15" cy="16" r="1"/></svg>';
  if (section === 'library') return workspaceNavigationIcon('file-text');
  if (section === 'tools') return workspaceNavigationIcon('calculator');
  if (section === 'vault') return settingsIcon('key-round');
  if (section === 'memo') return PROTOCOL_ICONS.reference;
  if (section === 'personal') return workspaceNavigationIcon('file-text');
  if (section === 'protocol') return protocolFamilyIcon('network');
  return workspaceNavigationIcon(section === 'command' ? 'terminal' : 'files');
}

function workspaceNavigationHeadingHTML(section, count) {
  const protocol = section === 'protocol',
    title = protocol ? 'Ports & protocoles' : sectionName();
  const unit = {
    library: 'fiches',
    vault: 'acc\u00e8s',
    memo: 'm\u00e9mos',
    personal: 'notes',
    protocol: 'services',
    command: 'commandes',
    template: 'templates',
    tools: 'module'
  } [section];
  return `<div class="workspace-navigation-heading${protocol?' protocol-navigation-heading':''}">
    <span class="workspace-navigation-symbol${protocol?' protocol-heading-symbol':''}" aria-hidden="true">${workspaceSectionIcon(section)}</span>
    <div><h2>${esc(title)}</h2><p id="${protocol?'protocolCount':'workspaceNavigationCount'}" role="status" aria-live="polite">${count} ${unit}</p></div>
  </div>`;
}

function workspaceFolderCounts(folders, items) {
  const parents = new Map(folders.map(folder => [folder.id, folder.parentId])),
    counts = new Map(folders.map(folder => [folder.id, 0]));
  for (const item of items) {
    let id = item.folderId;
    const seen = new Set();
    while (parents.has(id) && !seen.has(id)) {
      seen.add(id);
      counts.set(id, counts.get(id) + 1);
      id = parents.get(id)
    }
  }
  return counts;
}

function workspaceView(section = state.section) {
  if (!workspaceViews.has(section)) {
    let layout;
    try {
      layout = localStorage.getItem(section === 'library' ? WORKSPACE_LIBRARY_VIEW_KEY : WORKSPACE_VIEW_KEY + section)
    } catch {}
    const defaultLayout = ['vault', 'command', 'protocol'].includes(section) ? 'list' : 'cards';
    workspaceViews.set(section, {
      layout: ['cards', 'list'].includes(layout) ? layout : defaultLayout,
      query: '',
      kind: 'all',
      sort: section === 'personal' ? 'recent' : 'title',
      navigationQuery: '',
      navigationOpen: false,
      catalogFolder: null,
      scrollTop: 0,
      focusId: null
    });
  }
  return workspaceViews.get(section);
}

function workspaceToolbarHTML(section, layout) {
  const create = {
    library: ['newLibraryItem', 'Nouvelle fiche'],
    vault: ['newVault', 'Nouvel accès']
  } [section];
  if (!create) return '';
  return `<div class="workspace-tools">
    <div class="workspace-view-switch" role="group" aria-label="Affichage ${esc(sectionName())}">
      ${['cards','list'].map(mode=>`<button type="button" class="workspace-icon" data-workspace-layout="${mode}" title="${mode==='cards'?'Vue en grille':'Vue en liste'}" aria-label="${mode==='cards'?'Vue en grille':'Vue en liste'}" aria-pressed="${mode===layout}">${WORKSPACE_LAYOUT_ICONS[mode]}</button>`).join('')}
    </div>
    <button type="button" class="primary workspace-icon" title="${create[1]}" aria-label="${create[1]}" data-wg-click="${create[0]}()">${PROTOCOL_ICONS.plus}</button>
    <button type="button" class="secondary workspace-icon" title="Nouveau dossier" aria-label="Nouveau dossier" data-wg-click="newFolder()">${PROTOCOL_ICONS.folder}</button>
  </div>`;
}
async function setWorkspaceLayout(layout) {
  if (!['cards', 'list'].includes(layout) || state.section === 'protocol' || !await confirmDiscardChanges()) return;
  const view = workspaceView();
  rememberWorkspaceLayout(state.section, layout);
  view.navigationOpen = false;
  saveExplorerScroll();
  view.scrollTop = 0;
  if (state.item) state.folder = view.catalogFolder;
  state.item = null;
  state.mode = 'view';
  await renderWorkspace();
}

function rememberWorkspaceLayout(section, layout) {
  workspaceView(section).layout = layout;
  try {
    localStorage.setItem(section === 'library' ? WORKSPACE_LIBRARY_VIEW_KEY : WORKSPACE_VIEW_KEY + section, layout)
  } catch {}
}

function workspaceNavigationButton() {
  return '<button type="button" id="workspaceNavigationBtn" class="secondary workspace-icon workspace-navigation-toggle" title="Navigation" aria-label="Ouvrir la navigation" aria-controls="workspaceNavigation" aria-expanded="false">' + PROTOCOL_ICONS.folder + '</button>';
}

function setWorkspaceNavigation(open, focus = true) {
  const workspace = $('.standard-workspace');
  if (!workspace) return;
  const view = workspaceView();
  view.navigationOpen = !!open;
  workspace.classList.toggle('navigation-open', view.navigationOpen);
  const trigger = $('#workspaceNavigationBtn');
  trigger?.setAttribute('aria-expanded', String(view.navigationOpen));
  const backdrop = workspace.querySelector('.workspace-navigation-backdrop');
  if (backdrop) backdrop.hidden = !view.navigationOpen;
  if (focus && innerWidth <= 760)(view.navigationOpen ? workspace.querySelector('[data-workspace-layout]') : trigger)?.focus({
    preventScroll: true
  });
}

function initWorkspaceControls() {
  if (state.section === 'protocol') return;
  const workspace = $('.unified-workspace'),
    navigation = $('.explorer-pane');
  workspace.classList.add('standard-workspace');
  navigation.id = 'workspaceNavigation';
  document.querySelectorAll('[data-workspace-layout]').forEach(button => button.onclick = () => setWorkspaceLayout(button.dataset.workspaceLayout));
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'secondary workspace-icon workspace-navigation-close';
  close.title = 'Fermer la navigation';
  close.setAttribute('aria-label', close.title);
  close.innerHTML = PROTOCOL_ICONS.clear;
  close.onclick = () => setWorkspaceNavigation(false);
  navigation.querySelector('.explorer-head').appendChild(close);
  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'workspace-navigation-backdrop';
  backdrop.setAttribute('aria-label', close.title);
  backdrop.onclick = () => setWorkspaceNavigation(false);
  workspace.appendChild(backdrop);
  if (state.item) workspaceView().navigationOpen = false;
  setWorkspaceNavigation(workspaceView().navigationOpen, false);
}

function installWorkspaceDetailNavigation() {
  if (state.section === 'protocol') return;
  const host = $('#detailHost');
  if (!host) return;
  if (!$('#workspaceNavigationBtn')) {
    const bar = document.createElement('div');
    bar.className = 'workspace-detail-navigation';
    bar.innerHTML = workspaceNavigationButton() + (state.item ? '<button type="button" id="workspaceBack" class="secondary workspace-icon" title="Retour \u00e0 la collection" aria-label="Retour \u00e0 la collection">' + PROTOCOL_ICONS.back + '</button>' : '');
    if (state.item) bar.querySelector('#workspaceBack').onclick = async () => {
      if (!await confirmDiscardChanges()) return;
      const view = workspaceView();
      state.item = null;
      state.folder = view.catalogFolder;
      state.mode = 'view';
      await renderWorkspace();
      const id = CSS.escape(view.focusId || '');
      ($('#workspaceCatalogItems [data-workspace-item="' + id + '"] .workspace-item-title'))?.focus({
        preventScroll: true
      });
    };
    (host.querySelector('.reader-navigation-slot') || host).prepend(bar);
  }
  $('#workspaceNavigationBtn').onclick = () => setWorkspaceNavigation(!workspaceView().navigationOpen);
  setWorkspaceNavigation(workspaceView().navigationOpen, false);
  if (!state.item) {
    const scroll = $('.workspace-catalog-scroll');
    if (scroll) scroll.scrollTop = workspaceView().scrollTop
  }
}

function saveWorkspaceCatalogScroll() {
  if (state.section === 'protocol' || state.item) return;
  const scroll = $('.workspace-catalog-scroll');
  if (scroll) workspaceView().scrollTop = scroll.scrollTop;
}

function trackWorkspaceCollection() {
  const view = workspaceView();
  if (view.catalogFolder !== state.folder) {
    view.scrollTop = 0;
    view.focusId = null;
    view.page = 0
  }
  view.catalogFolder = state.folder;
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.section !== 'protocol' && workspaceView().navigationOpen && $('.standard-workspace')) {
    event.preventDefault();
    setWorkspaceNavigation(false);
  }
});

function workspaceScopedItems(folders, items) {
  if (!state.folder) return items;
  const ids = new Set([state.folder]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders)
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        changed = true
      }
  }
  return items.filter(item => ids.has(item.folderId));
}

function workspaceCatalogText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function workspaceCatalogDateHTML(item) {
  const date = new Date(item.updatedAt || item.createdAt || '');
  if (!Number.isFinite(date.getTime())) return '<span class="catalog-date">Sans date</span>';
  return '<time class="catalog-date" datetime="' + date.toISOString() + '" title="' + esc(date.toLocaleString('fr-FR')) + '">' + esc(date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })) + '</time>';
}

function workspaceCatalogMetaHTML({
  folderName
}) {
  return folderName ? '<div class="workspace-item-meta"><span class="catalog-folder">' + PROTOCOL_ICONS.folder + esc(folderName) + '</span></div>' : '';
}
