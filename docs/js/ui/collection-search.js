'use strict';

function collectionSearchTerms(query) {
  return workspaceCatalogText(query).trim().split(/\s+/).filter(Boolean);
}

function collectionSearchMatches(text, terms) {
  return terms.every(term => text.includes(term))
}

function collectionSearchClearHTML(id) {
  return '<button type="button" id="' + id + '" class="collection-search-clear" title="Effacer la recherche" aria-label="Effacer la recherche" hidden>' + PROTOCOL_ICONS.clear + '</button>';
}

function bindCollectionSearch(input, button, update) {
  const refresh = () => {
    button.hidden = !input.value;
    update()
  };
  const clear = () => {
    input.value = '';
    refresh();
    input.focus({
      preventScroll: true
    })
  };
  input.oninput = refresh;
  input.onkeydown = event => {
    if (event.key === 'Escape' && input.value) {
      event.preventDefault();
      event.stopPropagation();
      clear()
    }
  };
  button.onclick = clear;
  refresh();
}

function initWorkspaceTreeSearch(folders) {
  const input = $('#treeFilter'),
    view = workspaceView(),
    parents = new Map(folders.map(folder => [folder.id, folder]));
  const chains = new Map();
  const chain = id => {
    if (chains.has(id)) return chains.get(id);
    const result = [],
      seen = new Set();
    let current = id;
    while (parents.has(current) && !seen.has(current)) {
      seen.add(current);
      result.push(current);
      current = parents.get(current).parentId;
    }
    chains.set(id, result);
    return result;
  };
  const folderText = id => workspaceCatalogText(chain(id).map(key => parents.get(key).name).join(' '));
  const itemRows = [...document.querySelectorAll('#unifiedTree [data-tree-filter]')].map(node => ({
    node,
    folder: node.dataset.treeFolderId,
    text: node.dataset.treeFilter + ' ' + folderText(node.dataset.treeFolderId)
  }));
  const folderRows = [...document.querySelectorAll('#unifiedTree .tree-children')].map(children => {
    const node = children.previousElementSibling;
    return {children, node, id: children.dataset.folderId, text: folderText(children.dataset.folderId),
      caret: node.querySelector('.tree-caret'), label: node.querySelector('.tree-label'), icon: node.querySelector('.tree-icon'), iconReady: false};
  });
  input.value = view.navigationQuery || '';
  bindCollectionSearch(input, $('#clearTreeFilter'), () => {
    view.navigationQuery = input.value;
    const terms = collectionSearchTerms(input.value),
      visibleFolders = new Set();
    for (const row of folderRows)
      if (collectionSearchMatches(row.text, terms)) chain(row.id).forEach(id => visibleFolders.add(id));
    for (const row of itemRows) {
      const visible = collectionSearchMatches(row.text, terms);
      if (visible) {
        row.node.style.removeProperty('display');
        chain(row.folder).forEach(id => visibleFolders.add(id))
      } else row.node.style.setProperty('display', 'none', 'important');
    }
    for (const row of folderRows) {
      if (!terms.length || visibleFolders.has(row.id)) row.node.style.removeProperty('display');
      else row.node.style.setProperty('display', 'none', 'important');
      const expanded = terms.length ? visibleFolders.has(row.id) && row.children.children.length > 0 : expandedFolders.has(row.id);
      row.children.classList.toggle('collapsed', !expanded);
      const caret = row.caret, updateIcon = !row.iconReady || caret.getAttribute('aria-expanded') !== String(expanded);
      caret.title = expanded ? 'Replier' : 'D\u00e9plier';
      caret.setAttribute('aria-expanded', String(expanded));
      caret.setAttribute('aria-label', caret.title + ' ' + row.label.textContent);
      if (updateIcon) {
        row.icon.innerHTML = expanded ? workspaceNavigationIcon('folder-open') : PROTOCOL_ICONS.folder;
        row.iconReady = true;
      }
    }
    const empty = $('#workspaceTreeEmpty');
    empty.hidden = !terms.length || itemRows.some(row => row.node.style.display !== 'none') || visibleFolders.size > 0;
  });
}

function resetCollectionSearch() {
  for (const view of workspaceViews.values()) {
    view.query = '';
    view.navigationQuery = ''
  }
  if (typeof protocolView !== 'undefined') protocolView.query = '';
  for (const id of ['treeFilter', 'workspaceLocalSearch', 'commandLocalSearch', 'protocolSearch']) {
    const input = $('#' + id);
    if (input) input.value = '';
  }
}
