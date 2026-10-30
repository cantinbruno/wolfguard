'use strict';

async function openSection(section, itemId = null, options = {}) {
  if (LIBRARY_SECTIONS.includes(section)) section = 'library';
  if (section === 'home') section = 'library';
  if (!workspaceModules.allows(section)) return false;
  const crossing = primarySectionFor(section) !== primarySectionFor(state.section);
  if (!(crossing && state.section === 'library') && !await confirmDiscardChanges()) return false;
  if (section === 'library' && itemId && primaryWorkspaces.memo?.dirty && primaryWorkspaces.memo.state.item !== itemId && !await appConfirm('Quitter le mémo en cours sans enregistrer ses modifications ?')) return false;
  if ($('#app').classList.contains('hidden') && !state.vaultKey) return false;
  return sectionTransition.navigate(section, async isCurrent => {
    if (section === 'library') await ensureUnifiedLibrary();
    if (!desktopBridge.available && section === 'vault') await flattenRedundantSectionRoots();

    if (!isCurrent()) return false;
    closeContextMenu();
    hideSearch();
    rememberPrimaryWorkspace(section);
    if (options.tool && ['ip', 'hash', 'text'].includes(options.tool)) networkToolsView.tool = options.tool;
    if (options.resume?.section === 'tools') networkToolsView.tool = ['ip', 'hash', 'text'].includes(options.resume.tool) ? options.resume.tool : 'ip';
    state.section = section;
    state.folder = options.resume?.folder || null;
    state.item = options.resume?.item || null;
    state.mode = 'view';
    $('#sidebar').classList.add('hidden');
    $('#content').style.padding = '';
    $('#content').style.overflow = '';
    $('#content').classList.remove('vault-content', 'protocol-content', 'section-accent-library', 'section-accent-vault', 'section-accent-memo', 'section-accent-personal', 'section-accent-command', 'section-accent-protocol', 'section-accent-template', 'section-accent-tools');
    $('#content').classList.add('explorer-content', 'section-accent-' + (isScanSection(section) ? 'scan' : section));
    if (!isScanSection(section)) $('#content').classList.remove('scan-content', 'section-accent-scan');
    topNavigation.setActive(section);
    if (section === 'library' && restoreMemoWorkspace(itemId)) return true;
    if (section === 'library') primaryWorkspaces.memo = null;
    await renderWorkspace();
    if (itemId && isCurrent()) {
      state.item = itemId;
      await renderWorkspace();
    }
  });
}
async function isFolderDescendant(candidateId, ancestorId) {
  let current = await get('folders', candidateId);
  const seen = new Set();
  while (current && current.parentId && !seen.has(current.id)) {
    if (current.parentId === ancestorId) return true;
    seen.add(current.id);
    current = await get('folders', current.parentId);
  }
  return false;
}

function writeDragPayload(e, kind, id) {
  dragState = {
    kind,
    id
  };
  try {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-itw-drag', JSON.stringify({
      kind,
      id
    }));
    e.dataTransfer.setData('text/plain', kind + ':' + id);
  } catch {}
}

function readDragPayload(e) {
  try {
    const raw = e.dataTransfer.getData('application/x-itw-drag');
    if (raw) return JSON.parse(raw);
    const txt = e.dataTransfer.getData('text/plain');
    const p = txt.split(':');
    if (p.length >= 2) return {
      kind: p.shift(),
      id: p.join(':')
    };
  } catch {}
  return dragState?.id ? dragState : null;
}

function itemDragStart(e, id) {
  writeDragPayload(e, 'item', id);
  e.currentTarget.classList.add('dragging');
}

function folderDragStart(e, id) {
  writeDragPayload(e, 'folder', id);
  e.currentTarget.classList.add('dragging');
}

function folderDragOver(e, id) {
  e.preventDefault();
  e.stopPropagation();
  try {
    e.dataTransfer.dropEffect = 'move'
  } catch {}
  e.currentTarget.classList.add('drop-target');
}

function rootDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  try {
    e.dataTransfer.dropEffect = 'move'
  } catch {}
  e.currentTarget.classList.add('drop-target');
}

function dragLeave(e) {
  e.currentTarget.classList.remove('drop-target')
}

function dragEnd(e) {
  document.querySelectorAll('.dragging,.drop-target').forEach(x => x.classList.remove('dragging', 'drop-target'));
  dragState = {
    kind: null,
    id: null
  };
}
async function dropOnFolder(e, targetFolderId) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drop-target');
  const payload = readDragPayload(e);
  if (!payload?.id) return;

  if (payload.kind === 'item') {
    const item = await get('items', payload.id);
    if (item) {
      item.folderId = targetFolderId;
      item.updatedAt = now();
      await put('items', item);
      state.folder = targetFolderId;
    }
  } else if (payload.kind === 'folder') {
    if (payload.id === targetFolderId) return dragEnd(e);
    if (await isFolderDescendant(targetFolderId, payload.id)) {
      appNotify('Impossible de déplacer un dossier dans un de ses sous-dossiers.', {kind: 'error'});
      return dragEnd(e);
    }
    const folder = await get('folders', payload.id);
    if (folder) {
      folder.parentId = targetFolderId;
      await put('folders', folder);
      state.folder = targetFolderId;
    }
  }

  dragState = {
    kind: null,
    id: null
  };
  await renderWorkspace();
}
async function dropOnRoot(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drop-target');
  const payload = readDragPayload(e);
  if (!payload?.id) return;

  if (payload.kind === 'item') {
    const item = await get('items', payload.id);
    if (item) {
      item.folderId = null;
      item.updatedAt = now();
      await put('items', item)
    }
  } else if (payload.kind === 'folder') {
    const folder = await get('folders', payload.id);
    if (folder) {
      folder.parentId = null;
      await put('folders', folder)
    }
  }

  dragState = {
    kind: null,
    id: null
  };
  state.folder = null;
  await renderWorkspace();
}

async function selectFolder(id) {
  if (!await confirmDiscardChanges()) return;
  saveExplorerScroll();
  state.folder = id;
  state.item = null;
  state.mode = 'view';
  await renderWorkspace()
}

function sectionTypes() {
  return {
    library: LIBRARY_TYPES,
    vault: ['vault'],
    protocol: ['protocol']
  } [state.section] || []
}
async function filteredItems() {
  let items = (await activeItems()).filter(x => sectionTypes().includes(x.type));
  if (state.folder) items = items.filter(x => x.folderId === state.folder);
  return items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

function sectionName() {
  return {
    library: 'Mes fiches',
    tools: 'Outils',
    vault: 'Coffre-fort',
    protocol: 'Ports & services',
    'scan-active': 'Scan actif',
    'scan-map': 'Cartographie du réseau',
    'scan-vulnerability': 'Scan de vulnérabilités',
    'scan-passive': 'Scan passif'
  } [state.section] || ''
}

function sectionItemIcon(item) {
  if (item.type === 'vault') return workspaceSectionIcon('vault');
  if (item.type === 'procedure') return workspaceNavigationIcon('file-text');
  if (item.type === 'command') return workspaceSectionIcon('command');
  if (item.type === 'protocol') return protocolFamilyIcon(protocolFamily(protocolData(item)).id);
  if (item.type === 'memo') return workspaceSectionIcon('memo');
  if (item.type === 'personal') return workspaceSectionIcon('personal');
  if (item.type === 'mail') return workspaceNavigationIcon('mail');
  return workspaceSectionIcon('template');
}

function sectionItemLabel(item) {
  return item.title || 'Sans titre';
}
async function explorerData() {
  const folders = (db?.native ? (await db.readOnly('folders')).filter(folder => !isDeleted(folder) && !folder.consolidatedFolder) : await activeFolders())
    .filter(f => f.section === state.section)
    .map(f => ({
      ...f,
      parentId: f.parentId || null
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const items = (db?.native ? (await db.readOnly('items')).filter(item => !isDeleted(item) && !item.consolidatedInto) : await activeItems())
    .filter(x => sectionTypes().includes(x.type))
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  return {
    folders,
    items
  };
}

function renderUnifiedTree(folders, items, parentId = null, depth = 0, counts = workspaceFolderCounts(folders, items)) {
  const childFolders = folders.filter(f => (f.parentId || null) === (parentId || null));
  const childItems = items.filter(i => (i.folderId || null) === (parentId || null));

  let out = '';

  for (const f of childFolders) {
    const subFolders = folders.filter(x => (x.parentId || null) === f.id);
    const subItems = items.filter(x => (x.folderId || null) === f.id);
    const hasChildren = subFolders.length > 0 || subItems.length > 0;
    const collapsed = !expandedFolders.has(f.id);

    out += `
      <div class="tree-row tree-folder-row ${state.folder===f.id && !state.item?'active':''}"
           style="padding-left:${8+depth*10}px"
           draggable="true"
           data-wg-dragstart="folderDragStart(event,'${f.id}')"
           data-wg-dragend="dragEnd(event)"
           data-wg-dragover="folderDragOver(event,'${f.id}')"
           data-wg-dragenter="folderDragOver(event,'${f.id}')"
           data-wg-dragleave="dragLeave(event)"
           data-wg-drop="dropOnFolder(event,'${f.id}')"
           data-wg-click="selectFolder('${f.id}')"
           data-wg-contextmenu="folderContextMenu(event,'${f.id}')">
        <button type="button" class="tree-caret ${hasChildren?'':'empty'}"
              data-wg-click="event.stopPropagation();toggleFolderCollapse('${f.id}')"
              title="${collapsed?'Déplier':'Replier'}" aria-label="${collapsed?'Déplier':'Replier'} ${esc(f.name)}" aria-expanded="${!collapsed}" ${hasChildren?'':'disabled tabindex="-1"'}>${workspaceNavigationIcon('chevron-right')}</button>
        <span class="tree-icon">${collapsed?PROTOCOL_ICONS.folder:workspaceNavigationIcon('folder-open')}</span>
        <span class="tree-label" title="${esc(f.name)}">${esc(f.name)}</span>
        <span class="tree-folder-count" title="${counts.get(f.id)||0} élément(s)">${counts.get(f.id)||0}</span>
        <span class="tree-actions"><button type="button" title="Actions du dossier" aria-label="Actions du dossier ${esc(f.name)}" data-wg-click="event.stopPropagation();folderMenu('${f.id}')">${workspaceNavigationIcon('ellipsis')}</button></span>
      </div>
      <div class="tree-children ${collapsed?'collapsed':''}" data-folder-id="${esc(f.id)}">
        ${renderUnifiedTree(folders,items,f.id,depth+1,counts)}
      </div>
    `;
  }

  for (const item of childItems) {
    out += `
      <div class="tree-row tree-item-row ${state.item===item.id?'active':''}"
           style="padding-left:${8+depth*10}px"
           draggable="true"
           data-wg-dragstart="itemDragStart(event,'${item.id}')"
           data-wg-dragend="dragEnd(event)"
           data-wg-click="openItem('${item.id}')"
           data-wg-contextmenu="itemContextMenu(event,'${item.id}')"
           data-tree-folder-id="${esc(item.folderId||'')}"
           data-tree-filter="${esc(workspaceCatalogText(item.type==='vault'?[item.title,...(item.tags||[])].join(' '):[
             item.title,sectionForItem(item)==='library'?libraryText(item):item.type==='command'?item.content:itemContentText(item.content),item.description,item.context,item.example,item.vendor,item.platform,...(item.tags||[])
           ].join(' ')))}">
        <span class="tree-caret empty"></span>
        <span class="tree-icon">${sectionItemIcon(item)}</span>
        <span class="tree-label" title="${esc(sectionItemLabel(item))}">${esc(sectionItemLabel(item))}</span>
      </div>
    `;
  }

  return out;
}

function toggleFolderCollapse(id) {
  const children = document.querySelector(`#unifiedTree .tree-children[data-folder-id="${CSS.escape(id)}"]`);
  const expanded = children ? !children.classList.contains('collapsed') : expandedFolders.has(id);
  const nextExpanded = !expanded;
  if (nextExpanded) expandedFolders.add(id);
  else expandedFolders.delete(id);
  if (!children) return;
  const row = children.previousElementSibling,
    caret = row?.querySelector('.tree-caret'),
    icon = row?.querySelector('.tree-icon'),
    name = row?.querySelector('.tree-label')?.textContent || '';
  const tree = children.closest('#unifiedTree');
  const rowTop = row?.getBoundingClientRect().top;
  const restorePosition = () => {
    if (!tree?.isConnected || !row?.isConnected || !Number.isFinite(rowTop)) return;
    tree.scrollTop += row.getBoundingClientRect().top - rowTop;
  };
  children.classList.toggle('collapsed', !nextExpanded);
  restorePosition();
  requestAnimationFrame(() => {
    restorePosition();
    requestAnimationFrame(restorePosition);
  });
  if (caret) {
    caret.setAttribute('aria-expanded', String(nextExpanded));
    caret.title = nextExpanded ? 'Replier' : 'D\u00e9plier';
    caret.setAttribute('aria-label', (nextExpanded ? 'Replier ' : 'D\u00e9plier ') + name);
  }
  if (icon) icon.innerHTML = nextExpanded ? workspaceNavigationIcon('folder-open') : PROTOCOL_ICONS.folder;
}

function getExplorerWidth() {
  const raw = Number(localStorage.getItem('itw-explorer-width'));
  return Number.isFinite(raw) && raw >= 190 && raw <= 520 ? raw : 260;
}

function applyExplorerWidth(px) {
  const value = Math.max(190, Math.min(520, Math.round(px)));
  document.documentElement.style.setProperty('--explorer-width', value + 'px');
  localStorage.setItem('itw-explorer-width', String(value));
  return value;
}

function initWorkspaceSplitter() {
  const splitter = $('#workspaceSplitter');
  const workspace = document.querySelector('.unified-workspace');
  if (!splitter || !workspace) return;

  const setWidth = px => {
    const value = applyExplorerWidth(px);
    splitter.setAttribute('aria-valuenow', String(value));
    return value;
  };
  setWidth(getExplorerWidth());

  let dragging = false;
  let tip = null;

  const stop = () => {
    if (!dragging) return;
    dragging = false;
    splitter.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    tip?.remove();
    tip = null;
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', stop);
  };

  const move = e => {
    if (!dragging) return;
    const rect = workspace.getBoundingClientRect();
    const w = setWidth(e.clientX - rect.left);
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'explorer-width-tip';
      document.body.appendChild(tip);
    }
    tip.textContent = w + ' px';
    tip.style.left = (e.clientX + 12) + 'px';
    tip.style.top = (e.clientY - 12) + 'px';
  };

  splitter.onmousedown = e => {
    if (e.button !== 0) return;
    dragging = true;
    splitter.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    e.preventDefault();
  };

  splitter.ondblclick = () => {
    setWidth(260);
  };
  splitter.onkeydown = e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const width = e.key === 'Home' ? 190 : e.key === 'End' ? 520 : getExplorerWidth() + (e.key === 'ArrowLeft' ? -10 : 10);
    setWidth(width);
  };
}

function saveExplorerScroll() {
  saveWorkspaceCatalogScroll();
  const tree = document.querySelector('.explorer-tree');
  if (tree) explorerScrollTop = tree.scrollTop;
}

function restoreExplorerScroll() {
  const tree = document.querySelector('.explorer-tree');
  if (tree) tree.scrollTop = explorerScrollTop;
}

async function renderUnifiedExplorer(detailHtml = '') {
  const {
    folders,
    items
  } = await explorerData();
  const sec = sectionName();

  $('#content').innerHTML = `
    <div class="unified-workspace library-workspace">
      <section class="explorer-pane library-navigation">
        <div class="explorer-head">
          ${workspaceNavigationHeadingHTML(state.section,state.section==='protocol'?items.filter(item=>item.documentType!=='procedure').length:items.length)}
          ${workspaceToolbarHTML(state.section,state.section==='protocol'?protocolView.layout:workspaceView().layout)}
          <label class="workspace-tree-search">${PROTOCOL_ICONS.search}<input class="explorer-search" id="treeFilter" type="search" maxlength="200" placeholder="Filtrer la navigation…" aria-label="Filtrer la navigation ${esc(sec)}">${collectionSearchClearHTML('clearTreeFilter')}</label>
        </div>

        ${state.section==='protocol'?'':`<div class="tree-root-drop"
             data-wg-dragover="rootDragOver(event)"
             data-wg-dragenter="rootDragOver(event)"
             data-wg-dragleave="dragLeave(event)"
             data-wg-drop="dropOnRoot(event)" title="Déposer ici pour placer à la racine">
          ${PROTOCOL_ICONS.folder}<span>Racine</span>
        </div>

        <div id="unifiedTree" class="explorer-tree" data-wg-contextmenu="navigationContextMenu(event)">
          <div class="tree-row tree-overview-row ${!state.folder && !state.item?'active':''}" data-wg-click="selectFolder(null)">
            <span class="tree-caret"></span>
            <span class="tree-icon">${WORKSPACE_LAYOUT_ICONS.cards}</span>
            <span class="tree-label">Tous</span><span class="tree-folder-count">${items.length}</span>
          </div>
          ${renderUnifiedTree(folders,desktopBridge.available?[]:items,null,0,workspaceFolderCounts(folders,items))}
          <p id="workspaceTreeEmpty" class="workspace-tree-empty" role="status" aria-live="polite" hidden>Aucun résultat.</p>
        </div>`}
      </section>

      <div id="workspaceSplitter" class="workspace-splitter" role="separator" aria-label="Redimensionner la navigation" aria-orientation="vertical" aria-valuemin="190" aria-valuemax="520" tabindex="0" title="Glisser pour redimensionner · Double-clic pour réinitialiser"></div>
      <section class="detail-pane">
        <div id="detailHost">${detailHtml||'<div class="explorer-empty">Sélectionne un élément dans l’arborescence.</div>'}</div>
      </section>
    </div>`;

  initWorkspaceSplitter();
  initWorkspaceControls();
  requestAnimationFrame(restoreExplorerScroll);

  if (state.section !== 'protocol') initWorkspaceTreeSearch(folders);
}

async function renderWorkspace() {
  if (state.section === 'modules') renderModulesWorkspace();
  else if (isScanSection(state.section)) await renderScanWorkspace();
  else if (state.section === 'tools') await renderNetworkTools();
  else if (state.section === 'protocol') await renderProtocolWorkspace();
  else if (state.section === 'library') await renderLibraryWorkspace();
  else if (state.section === 'vault') await renderVaultWorkspace();
  else throw new Error('Espace de travail inconnu.');
  if (['library', 'vault'].includes(state.section)) installWorkspaceDetailNavigation();
  if (workspaceModules.has('tools')) mountToolboxNavigation();
  syncMemoDraftIndicator();
}
