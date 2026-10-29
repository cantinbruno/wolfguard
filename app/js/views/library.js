'use strict';

async function newLibraryItem() {
  if (!await confirmDiscardChanges()) return;
  if (state.section !== 'library' && !await openSection('library')) return;
  const item = {
    id: uid(),
    type: 'memo',
    originalType: 'memo',
    unifiedDocument: true,
    unifiedDocumentVersion: 2,
    title: 'Nouvelle fiche',
    content: '',
    description: '',
    facets: libraryFacets(),
    commandBlocks: [],
    tags: [],
    attachments: [],
    folderId: normalFolder(),
    createdAt: now(),
    updatedAt: now()
  };
  await put('items', item);
  state.item = item.id;
  state.mode = 'edit';
  await renderWorkspace();
  $('#fTitle')?.select();
}

async function renderLibraryWorkspace() {
  await renderUnifiedExplorer();
  if (!state.item) return renderLibraryCatalog();
  const item = await get('items', state.item);
  if (!item) return;
  if (state.mode === 'edit') return renderLibraryEdit(item);
  const blocks = libraryCommands(item);
  await renderDocumentReader(libraryDocument(item), await breadcrumbHTML(item), {
    relations: false,
    outline: false
  });
  const root = $('#detailHost .document-reader');
  if (!root) return;
  root.classList.add('unified-reader');

  const heading = root.querySelector('.reader-document-heading'),
    title = heading.querySelector('h1'),
    metadata = heading.querySelector('.reader-metadata'),
    copy = document.createElement('div');
  copy.className = 'library-document-copy';
  const updated = readerDate(item.updatedAt || item.createdAt);
  metadata.innerHTML = updated ? '<span>Mis à jour le ' + updated + '</span>' : '';
  copy.append(title, metadata);

  heading.replaceChildren(copy);

  // Regrouping changes the content, not the established white reading sheet.
  // Guide commands already sit in their chapters; retain that stored order.
  if (item.consolidatedGuideVersion) {
    addLibraryCommandJump(heading,item,blocks,root.querySelector('.reader-rich-content .reader-code'));
    const extras=root.querySelector('.reader-extras');
    extras.classList.toggle('is-minimal',!extras.querySelector('section'));
    return;
  }

  const reference = root.querySelector('[data-library-part="reference"]');
  reference.querySelector(':scope > h2')?.remove();
  if (!reference.textContent.trim()) reference.remove();
  const memo = root.querySelector('[data-library-part="memo"]');
  memo.querySelector(':scope > h2')?.remove();
  if (!memo.textContent.trim() && !memo.querySelector('img,table,video,audio')) {
    memo.innerHTML = '<p class="library-part-empty">Aucune explication renseignée.</p>';
  }

  const commandPanel = root.querySelector('[data-library-part="command"]');
  if (blocks.length) {
    root.classList.add('has-command-panel');
    commandPanel.classList.add('library-command-panel');
    commandPanel.setAttribute('aria-label', 'Commandes de la fiche');
    commandPanel.querySelector('h2').innerHTML = '<span class="library-panel-title">' + workspaceSectionIcon('command') + 'Commandes</span>';
    addLibraryCommandJump(heading,item,blocks,commandPanel);
  } else commandPanel.remove();

  const extras = root.querySelector('.reader-extras');
  extras.classList.toggle('is-minimal', !extras.querySelector('section'));
}

function addLibraryCommandJump(heading,item,blocks,target) {
  if(!blocks.length || !target)return;
  if(!target.id)target.id='library-commands-'+String(item.id).replace(/[^a-zA-Z0-9_-]/g,'');
  const jump=document.createElement('a');
  jump.className='library-command-jump';
  jump.href='#'+target.id;
  jump.innerHTML=workspaceSectionIcon('command')+'<span>'+blocks.length+' commande'+(blocks.length>1?'s':'')+' ↓</span>';
  heading.append(jump);
}
async function renderLibraryCatalog() {
  trackWorkspaceCollection();
  const {
    folders,
    items
  } = await explorerData(), view = workspaceView(), key = state.vaultKey, folder = folders.find(folder => folder.id === state.folder), scoped = workspaceScopedItems(folders, items), names = new Map(folders.map(folder => [folder.id, folder.name]));
  view.kind = 'all';
  $('#detailHost').innerHTML = `<div class="workspace-catalog library-catalog">
    <header class="library-heading">${workspaceNavigationButton()}<div><h1>${esc(folder?.name||'Mes fiches')} <span class="library-heading-count">${scoped.length}</span></h1></div><button type="button" class="primary library-create" aria-label="Nouvelle fiche" data-wg-click="newLibraryItem()">${PROTOCOL_ICONS.plus}<span>Nouvelle fiche</span></button></header>
    <div class="catalog-controls"><label class="workspace-catalog-search">${PROTOCOL_ICONS.search}<input id="workspaceLocalSearch" type="search" maxlength="200" aria-label="Rechercher dans les fiches" placeholder="Titre, contenu, commande, dossier…" value="${esc(view.query)}">${collectionSearchClearHTML('clearWorkspaceSearch')}</label><label class="catalog-select"><span>Tri</span><select id="workspaceCatalogSort"><option value="title" ${view.sort==='title'?'selected':''}>Titre A–Z</option><option value="recent" ${view.sort==='recent'?'selected':''}>Modification récente</option></select></label><span id="workspaceResultsCount" role="status" aria-live="polite"></span></div>
    <div class="workspace-catalog-scroll ${view.layout==='cards'?'library-grid-view':'library-list-view'}"><div class="library-list-columns" aria-hidden="true"><span>Fiche</span><span>Dossier</span><span>Commandes</span><span>Mise à jour</span><span></span></div><div id="workspaceCatalogItems" class="workspace-catalog-items ${view.layout==='cards'?'is-grid':'is-list'}"></div><div id="workspaceCatalogEmpty" class="workspace-catalog-empty" hidden></div></div></div>`;
  const entries = scoped.map(item => ({
    item,
    commands: libraryCommands(item),
    folder: names.get(item.folderId) || '',
    search: workspaceCatalogText([item.title, libraryText(item), item.context, item.example, item.vendor, item.platform, ...(item.tags || []), names.get(item.folderId)].join(' '))
  }));
  let previous = JSON.stringify([view.query, view.kind, view.sort]);
  const update = () => {
    view.query = $('#workspaceLocalSearch').value;
    view.sort = $('#workspaceCatalogSort').value;
    const filter = JSON.stringify([view.query, view.kind, view.sort]);
    if (filter !== previous) {
      view.page = 0;
      previous = filter
    }
    const terms = collectionSearchTerms(view.query),
      filtered = entries.filter(entry => collectionSearchMatches(entry.search, terms));
    filtered.sort((a, b) => (view.sort === 'recent' ? timestamp(b.item.updatedAt) - timestamp(a.item.updatedAt) : 0) || (a.item.title || '').localeCompare(b.item.title || '', 'fr'));
    const nodes = collectionPageSlice(filtered, view).map(entry => {
      const {
        item
      } = entry, node = document.createElement('article');
      node.className = 'workspace-catalog-item library-card';
      node.dataset.workspaceItem = item.id;
      node.draggable = true;
      node.innerHTML = '<div class="workspace-item-heading"><span class="library-card-icon" aria-hidden="true">' + workspaceSectionIcon('library') + '</span><button type="button" class="workspace-item-title" title="' + esc(item.title || 'Sans titre') + '">' + esc(item.title || 'Sans titre') + '</button></div><span class="catalog-folder" title="' + esc(entry.folder || 'Mes fiches') + '">' + PROTOCOL_ICONS.folder + '<span>' + esc(entry.folder || 'Mes fiches') + '</span></span><span class="library-card-command-count' + (entry.commands.length ? ' has-commands' : '') + '" aria-label="' + entry.commands.length + ' commande' + (entry.commands.length > 1 ? 's' : '') + '">' + (entry.commands.length ? workspaceSectionIcon('command') + '<span>' + entry.commands.length + '<span class="library-command-unit"> commande' + (entry.commands.length > 1 ? 's' : '') + '</span></span>' : '—') + '</span><div class="library-card-updated">' + workspaceCatalogDateHTML(item) + '</div><div class="workspace-item-actions"><button type="button" class="secondary workspace-icon library-item-menu" aria-haspopup="menu" title="Actions de la fiche" aria-label="Actions pour ' + esc(item.title || 'Sans titre') + '">' + workspaceNavigationIcon('ellipsis') + '</button></div>';
      if (!entry.commands.length) node.querySelector('.library-card-command-count').innerHTML = '<span class="library-count-empty">—</span><span class="library-count-label">Fiche mémo</span>';
      if (view.layout === 'cards') {
        node.querySelector('.catalog-folder').remove();
        node.querySelector('.library-card-icon').innerHTML = workspaceSectionIcon(entry.commands.length ? 'command' : 'library');
      }
      const footer = document.createElement('div');
      footer.className = 'library-card-footer';
      footer.append(node.querySelector('.library-card-command-count'), node.querySelector('.library-card-updated'));
      if (view.layout === 'cards') footer.querySelector('.library-card-command-count').remove();
      node.append(footer);
      const open = () => {
        if (itemActionSessionValid(key)) {
          view.focusId = item.id;
          return openItem(item.id)
        }
      };
      node.querySelector('.workspace-item-title').onclick = open;
      node.querySelector('.library-item-menu').onclick = event => {
        if (!itemActionSessionValid(key)) return;
        const anchor = event.currentTarget.getBoundingClientRect();
        itemContextMenu({
          preventDefault: () => event.preventDefault(),
          stopPropagation: () => event.stopPropagation(),
          clientX: anchor.left,
          clientY: anchor.bottom + 4
        }, item.id);
      };
      node.onclick = event => {
        if (!event.target.closest('button,a,input') && window.getSelection()?.isCollapsed) open()
      };
      node.ondragstart = event => itemDragStart(event, item.id);
      node.ondragend = dragEnd;
      node.oncontextmenu = event => itemContextMenu(event, item.id);
      return node;
    });
    $('#workspaceCatalogItems').replaceChildren(...nodes);
    $('#workspaceResultsCount').textContent = filtered.length + ' / ' + scoped.length + ' fiches';
    const empty = $('#workspaceCatalogEmpty');
    empty.hidden = filtered.length > 0;
    empty.textContent = scoped.length ? 'Aucune fiche ne correspond à ces filtres.' : 'Créez votre première fiche pour réunir vos connaissances et vos commandes.';
    renderCollectionPagination($('.workspace-catalog-scroll'), view, filtered.length, update);
  };
  $('#workspaceCatalogSort').onchange = update;
  bindCollectionSearch($('#workspaceLocalSearch'), $('#clearWorkspaceSearch'), update);
}

function libraryCommandEditor(block = {}) {
  const node = document.createElement('section');
  node.className = 'library-command-editor';
  node.libraryOriginalBlock = block;
  node.innerHTML = '<div class="library-command-heading"><span class="library-command-editor-icon" aria-hidden="true">'+workspaceSectionIcon('command')+'</span><label>Nom du bloc<input data-command-field="title" value="' + esc(block.title || '') + '" placeholder="Ex. Vérifier la connectivité"></label><button type="button" class="secondary" data-remove-command aria-label="Retirer ce bloc de commande">' + ITEM_ACTION_ICONS.delete + '</button></div><label>Commande<textarea data-command-field="code" rows="3" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="Saisir une commande, avec {HOTE} si nécessaire">' + esc(block.code || '') + '</textarea></label><label class="library-command-context">Quand l’utiliser · facultatif<textarea data-command-field="context" rows="2" placeholder="Indiquer le contexte ou une précaution utile">' + esc(block.context || '') + '</textarea></label>';
  node.querySelector('[data-remove-command]').onclick = async () => {
    if (await appConfirm('Retirer ce bloc de la fiche ?')) {
      node.remove();
      updateLibraryCommandSection();
      $('#detailHost').dataset.editorDirty = 'true';
      $('#libraryCommandBlocks').dispatchEvent(new Event('input', {
        bubbles: true
      }));
    }
  };
  return node;
}

function updateLibraryCommandSection() {
  const section=$('#libraryCommandsSection');if(!section)return;
  const count=$('#libraryCommandBlocks').children.length;
  section.hidden=count===0;
  $('#libraryCommandCount').textContent=String(count);
}

function addLibraryCommand() {
  $('#libraryCommandBlocks').append(libraryCommandEditor());
  updateLibraryCommandSection();
  $('#libraryCommandsEmpty')?.remove();
  $('#libraryCommandBlocks').lastElementChild.querySelector('input')?.focus();
  $('#detailHost').dataset.editorDirty = 'true';
  $('#libraryCommandBlocks').dispatchEvent(new Event('input', {
    bubbles: true
  }));
}
async function renderLibraryEdit(item) {
  const folders = await foldersForSection('library');
  const referenceFields=[['description','Description de la fiche'],['context','Contexte et précautions'],['platform','Environnement'],['vendor','Éditeur / technologie'],['prerequisites','Prérequis']];
  const hasReference=referenceFields.some(([field])=>item[field]);
  const referenceEditor=hasReference?'<section class="library-editor-reference" aria-labelledby="libraryReferenceTitle"><h3 id="libraryReferenceTitle">Description et contexte</h3><div>'+referenceFields.map(([field,label])=>'<label>'+label+(['description','context','prerequisites'].includes(field)?'<textarea data-reference-field="'+field+'" rows="'+(field==='prerequisites'?2:3)+'">'+esc(item[field]??'')+'</textarea>':'<input data-reference-field="'+field+'" value="'+esc(item[field]??'')+'">')+'</label>').join('')+'</div></section>':'';
  selectedEditorImage = null;
  $('#detailHost').innerHTML = `<div class="library-editor"><header class="library-editor-heading"><h2>Modifier la fiche</h2><div class="actions"><button type="button" class="secondary" data-wg-click="cancelLibraryEdit()">Annuler</button><button type="button" class="primary" data-wg-click="saveLibraryItem('${item.id}')">Enregistrer</button></div></header>
    <div class="library-editor-scroll">
    <div class="library-editor-fields"><label for="fTitle">Titre de la fiche<input id="fTitle" value="${esc(item.title)}"></label><label for="fFolder">Dossier<select id="fFolder"><option value="">Racine des fiches</option>${folderSelectOptions(folders,item.folderId)}</select></label></div>
    ${referenceEditor}
    <div class="library-compose-surface" role="group" aria-label="Éditeur de la fiche">
      <div class="library-text-editor">
      <div class="library-compose-toolbar">${richTextToolbar()}<div class="library-compose-insert"><button type="button" class="secondary" data-wg-click="addLibraryCommand()">+ Ajouter une commande</button></div></div>
      <div id="richEditor" class="editor document-editor" contenteditable="true" role="textbox" aria-label="Contenu de la fiche" aria-multiline="true" data-placeholder="Rédigez votre fiche…" data-wg-click="editorObjectClick(event)">${documentHTML(libraryBody(item))}</div><input type="file" id="richEditorImagePicker" accept="image/*" class="hidden" data-wg-change="insertImageFromFile(this)">
      </div><section id="libraryCommandsSection" class="library-commands-editor" aria-labelledby="libraryCommandsTitle" hidden><header class="library-commands-editor-heading"><h3 id="libraryCommandsTitle">Commandes de la fiche <span id="libraryCommandCount"></span></h3><p>Code et contexte restent enregistrés avec ce mémo.</p></header><div id="libraryCommandBlocks"></div></section>
    </div>
    </div></div>`;
  const commands=libraryCommands(item),inlineCodes=new Set();let originalHeading='';
  for(const pre of $('#richEditor').querySelectorAll('h1,h2,h3,h4,pre')){
    if(pre.tagName!=='PRE'){originalHeading=pre.textContent.trim();continue;}
    const code=pre.textContent;inlineCodes.add(code);
    pre.libraryOriginalHeading=originalHeading;
    // Keep extra command metadata on the editable node, outside the saved HTML.
    const original=commands.find(block=>block.fromMemo && block.code===code);
    if(original)pre.libraryOriginalBlock=original;
  }
  $('#libraryCommandBlocks').append(...commands.filter(block=>!block.fromMemo || !inlineCodes.has(block.code)).map(block=>libraryCommandEditor({...block,...(block.fromMemo?{fromMemo:false}:{})})));
  updateLibraryCommandSection();
  enableEditorImagePaste();
  $('#detailHost').dataset.editorDirty = 'false';
}
async function cancelLibraryEdit() {
  if (await confirmDiscardChanges()) {
    state.mode = 'view';
    await renderWorkspace()
  }
}

function libraryItemFromEditor(source) {
  const reference={};
  for(const input of document.querySelectorAll('.library-editor-reference [data-reference-field]')){
    const field=input.dataset.referenceField;
    if(['description','context','platform','vendor','prerequisites'].includes(field)&&input.value!==String(source[field]??''))reference[field]=input.value;
  }
  const commandBlocks = [...document.querySelectorAll('.library-command-editor')].map(node => ({
    ...node.libraryOriginalBlock,
    ...Object.fromEntries([...node.querySelectorAll('[data-command-field]')].map(input => [input.dataset.commandField, input.value]))
  }));
  const content = documentHTML($('#richEditor').innerHTML);
  let heading='';
  for(const node of $('#richEditor').querySelectorAll('h1,h2,h3,h4,pre')){
    if(node.tagName!=='PRE'){heading=node.textContent.trim();continue;}
    const code=node.textContent;
    if(!code.trim() || commandBlocks.some(block=>block.code===code))continue;
    const original=node.libraryOriginalBlock || {};
    const title=heading===node.libraryOriginalHeading?original.title||heading:heading||original.title;
    commandBlocks.push({...original,title:title||'Commande',code,context:original.context||'',fromMemo:true});
  }
  return {
    ...source,
    ...reference,
    type: 'memo',
    unifiedDocument: true,
    unifiedDocumentVersion: 2,
    originalType: source.originalType || source.type,
    title: $('#fTitle').value.trim() || 'Sans titre',
    folderId: $('#fFolder').value || null,
    content,
    commandBlocks,
    facets: libraryFacets(),
    updatedAt: now()
  };
}
async function saveLibraryItem(id) {
  const key = state.vaultKey;
  if (!itemActionSessionValid(key) || state.item !== id) return;
  const source = await get('items', id);
  if (!source || !itemActionSessionValid(key)) return;
  const item = libraryItemFromEditor(source);
  const commandBlocks = item.commandBlocks;
  if (JSON.stringify(libraryCommands(source)) !== JSON.stringify(commandBlocks) && source.quality) item.quality = {
    ...source.quality,
    validation: 'a-revalider',
    reviewedAt: null,
    impact: 'À revalider'
  };
  await put('items', item);
  state.folder = item.folderId;
  state.mode = 'view';
  await renderWorkspace();
}
