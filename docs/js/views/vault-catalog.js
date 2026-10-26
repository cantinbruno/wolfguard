'use strict';

// Vault collections use public metadata only; secrets are decrypted in the detail view.
async function renderVaultCatalog() {
  trackWorkspaceCollection();
  const key = state.vaultKey;
  const view = workspaceView('vault');
  const {
    folders,
    items
  } = await explorerData();
  const folder = folders.find(record => record.id === state.folder);
  const scoped = workspaceScopedItems(folders, items);
  const names = new Map(folders.map(record => [record.id, record.name]));
  const entries = scoped.map(item => ({
    item,
    folderName: names.get(item.folderId) || '',
    search: workspaceCatalogText([item.title, names.get(item.folderId), ...(item.tags || [])].join(' '))
  }));

  $('#detailHost').innerHTML = `<div class="workspace-catalog section-catalog catalog-vault">
    <header class="workspace-catalog-heading">${workspaceNavigationButton()}<div><h2>${esc(folder?.name || 'Tous les accès')}</h2><p id="workspaceResultsCount" role="status" aria-live="polite"></p></div></header>
    <div class="catalog-controls"><label class="workspace-catalog-search">${PROTOCOL_ICONS.search}<input id="workspaceLocalSearch" type="search" maxlength="200" aria-label="Rechercher dans le coffre" placeholder="Rechercher dans le coffre" value="${esc(view.query)}">${collectionSearchClearHTML('clearWorkspaceSearch')}</label>
      <label class="catalog-select"><span>Tri</span><select id="workspaceCatalogSort"><option value="title" ${view.sort === 'title' ? 'selected' : ''}>Titre A–Z</option><option value="recent" ${view.sort === 'recent' ? 'selected' : ''}>Modification récente</option></select></label>
    </div>
    <div class="workspace-catalog-scroll">${view.layout === 'list' ? '<div class="catalog-vault-columns" aria-hidden="true"><span>Accès</span><span>Dossier</span><span>Protection</span><span>Actions</span></div>' : ''}<div id="workspaceCatalogItems" class="workspace-catalog-items ${view.layout === 'cards' ? 'is-grid' : 'is-list'}"></div><div id="workspaceCatalogEmpty" class="workspace-catalog-empty" hidden></div></div>
  </div>`;

  function renderEntry(entry) {
    const {
      item
    } = entry;
    const node = document.createElement('article');
    node.className = 'workspace-catalog-item';
    node.dataset.workspaceItem = item.id;
    node.draggable = true;
    node.innerHTML = vaultCatalogItemHTML(entry) + '<div class="workspace-item-actions">' + itemActionsHTML(item) + '</div>';
    node.querySelector('.workspace-item-title').onclick = () => {
      if (!itemActionSessionValid(key)) return;
      view.focusId = item.id;
      return openItem(item.id);
    };
    node.ondragstart = event => itemDragStart(event, item.id);
    node.ondragend = dragEnd;
    node.oncontextmenu = event => itemContextMenu(event, item.id);
    return node;
  }

  let previousFilter = JSON.stringify([view.query, view.sort]);

  function update() {
    view.query = $('#workspaceLocalSearch').value;
    view.sort = $('#workspaceCatalogSort').value;
    const filter = JSON.stringify([view.query, view.sort]);
    if (filter !== previousFilter) {
      view.page = 0;
      previousFilter = filter;
    }
    const terms = collectionSearchTerms(view.query);
    const filtered = entries.filter(entry => collectionSearchMatches(entry.search, terms));
    filtered.sort((a, b) => (view.sort === 'recent' ? timestamp(b.item.updatedAt || b.item.createdAt) - timestamp(a.item.updatedAt || a.item.createdAt) : 0) || (a.item.title || '').localeCompare(b.item.title || '', 'fr'));
    $('#workspaceCatalogItems').replaceChildren(...collectionPageSlice(filtered, view).map(renderEntry));
    $('#workspaceResultsCount').textContent = filtered.length + ' / ' + scoped.length + ' accès';
    const empty = $('#workspaceCatalogEmpty');
    empty.hidden = filtered.length > 0;
    empty.textContent = scoped.length ? 'Aucun résultat.' : 'Cette collection est vide.';
    renderCollectionPagination($('.workspace-catalog-scroll'), view, filtered.length, update);
  }

  $('#workspaceCatalogSort').onchange = update;
  bindCollectionSearch($('#workspaceLocalSearch'), $('#clearWorkspaceSearch'), update);
}
