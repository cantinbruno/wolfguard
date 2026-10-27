'use strict';

const ITEM_RELATION_ICON = '<svg class="lucide lucide-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
async function renderItemRelations(item, host) {
  if (!host || state.mode === 'edit') return;
  const key = state.vaultKey,
    items = (await activeItems()).filter(workspaceModules.allowsItem);
  if (!host.isConnected || state.item !== item.id || state.mode !== 'view' || !itemActionSessionValid(key)) return;
  const linked = relatedItemRecords(item, items).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fr'));
  const block = document.createElement('section');
  block.className = 'item-relations';
  block.setAttribute('aria-label', 'Fiches li\u00e9es');
  block.innerHTML = '<header class="item-relations-head"><h3>' + ITEM_RELATION_ICON + 'Fiches li\u00e9es <span>' + linked.length + '</span></h3><button type="button" class="secondary workspace-icon" data-manage-relations title="G\u00e9rer les liens" aria-label="G\u00e9rer les liens">' + PROTOCOL_ICONS.plus + '</button></header>' + (linked.length ? '<div class="item-relations-list">' + linked.map(target => '<button type="button" class="item-related-link" data-related-id="' + esc(target.id) + '"><span class="item-related-icon relation-' + sectionForItem(target) + '">' + sectionItemIcon(target) + '</span><span class="item-related-name"><strong>' + esc(target.title || 'Sans titre') + '</strong><small>' + esc(typeLabel(target.type)) + '</small></span>' + PROTOCOL_ICONS.open + '</button>').join('') + '</div>' : '<p class="item-relations-empty">Aucune fiche li\u00e9e.</p>');
  host.querySelector(':scope > .item-relations')?.remove();
  host.appendChild(block);
  block.querySelector('[data-manage-relations]').onclick = () => openItemRelations(item.id);
  block.querySelectorAll('[data-related-id]').forEach(button => button.onclick = () => openById(button.dataset.relatedId));
}
async function openItemRelations(id) {
  const key = state.vaultKey,
    previousFocus = document.activeElement;
  if (!itemActionSessionValid(key)) return;
  const items = (await activeItems()).filter(workspaceModules.allowsItem),
    folders = await activeFolders(),
    source = items.find(item => item.id === id);
  if (!source || !itemActionSessionValid(key)) return;
  const names = new Map(folders.map(folder => [folder.id, folder.name])),
    selected = new Set(relatedItemRecords(source, items).map(item => item.id));
  const entries = items.filter(item => item.id !== id).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fr')).map(item => {
    const folder = names.get(item.folderId) || '',
      tags = Array.isArray(item.tags) ? item.tags : [];
    return {
      item,
      folder,
      section: primarySectionFor(sectionForItem(item)),
      search: workspaceCatalogText([item.title, folder, ...tags].join(' '))
    };
  });
  modal('Fiches li\u00e9es', `<div class="relation-picker">
    <div class="relation-picker-source">${ITEM_RELATION_ICON}<span>${esc(source.title||'Sans titre')}</span></div>
    <div class="relation-picker-filters"><label class="workspace-catalog-search">${PROTOCOL_ICONS.search}<input id="relationSearch" type="search" maxlength="200" placeholder="Rechercher une fiche" aria-label="Rechercher une fiche" autocomplete="off">${collectionSearchClearHTML('clearRelationSearch')}</label>
      <select id="relationSection" aria-label="Section"><option value="all">Toutes les sections</option>${[['library','Mes fiches'],['tools','Outils'],['checklist','Checklist']].map(([section,label])=>'<option value="'+section+'">'+label+'</option>').join('')}</select></div>
    <div class="relation-picker-state"><label><input id="relationSelectedOnly" type="checkbox">S\u00e9lectionn\u00e9es</label><span id="relationCount" role="status" aria-live="polite"></span></div>
    <div id="relationChoices" class="relation-picker-list"></div><p id="relationEmpty" class="item-relations-empty" hidden>Aucune fiche.</p>
    <p id="relationError" class="network-error" role="alert" hidden></p>
    <div class="relation-picker-footer"><span id="relationSelectionCount"></span><button type="button" class="secondary" id="relationCancel">Annuler</button><button type="button" class="primary" id="relationSave">${ITEM_RELATION_ICON}Enregistrer</button></div>
  </div>`);
  const dialog = $('#modalRoot .modal');
  dialog.classList.add('relation-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.querySelector('h2').id = 'relationDialogTitle';
  dialog.setAttribute('aria-labelledby', 'relationDialogTitle');
  const container = $('#relationChoices');
  for (const entry of entries) {
    const row = document.createElement('label');
    row.className = 'relation-choice';
    row.innerHTML = '<input type="checkbox" data-relation-id="' + esc(entry.item.id) + '" ' + (selected.has(entry.item.id) ? 'checked' : '') + '><span class="item-related-icon relation-' + entry.section + '">' + sectionItemIcon(entry.item) + '</span><span class="item-related-name"><strong>' + esc(entry.item.title || 'Sans titre') + '</strong><small>' + esc(typeLabel(entry.item.type)) + (entry.folder ? ' \u00b7 ' + esc(entry.folder) : '') + '</small></span>';
    entry.node = row;
    container.appendChild(row);
    row.querySelector('input').onchange = event => {
      if (event.target.checked) selected.add(entry.item.id);
      else selected.delete(entry.item.id);
      update()
    };
  }
  const update = () => {
    const terms = collectionSearchTerms($('#relationSearch').value),
      section = $('#relationSection').value,
      selectedOnly = $('#relationSelectedOnly').checked;
    let count = 0;
    for (const entry of entries) {
      entry.node.hidden = !(collectionSearchMatches(entry.search, terms) && (section === 'all' || entry.section === section) && (!selectedOnly || selected.has(entry.item.id)));
      if (!entry.node.hidden) count++
    }
    $('#relationCount').textContent = count + ' / ' + entries.length + ' fiches';
    $('#relationSelectionCount').textContent = selected.size + ' lien(s)';
    $('#relationEmpty').hidden = count > 0;
  };
  bindCollectionSearch($('#relationSearch'), $('#clearRelationSearch'), update);
  $('#relationSection').onchange = update;
  $('#relationSelectedOnly').onchange = update;
  const close = () => {
    closeModal();
    if (previousFocus?.isConnected && !$('#app').classList.contains('hidden')) previousFocus.focus({
      preventScroll: true
    })
  };
  $('#relationCancel').onclick = close;
  const wrap = dialog.parentElement;
  wrap.onclick = event => {
    if (event.target === wrap) close()
  };
  dialog.onkeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return
    }
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button,input,select')].filter(control => !control.disabled && control.getClientRects().length);
    const first = controls[0],
      last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus()
    }
  };
  $('#relationSave').onclick = async event => {
    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true;
    $('#relationError').hidden = true;
    try {
      await saveItemRelations(id, [...selected], key);
      if (!dialog.isConnected || !itemActionSessionValid(key)) return;
      closeModal();
      if (state.item === id && state.mode === 'view') {
        await renderWorkspace();
        $('#detailHost [data-manage-relations]')?.focus({
          preventScroll: true
        });
      }
    } catch (error) {
      if (dialog.isConnected && itemActionSessionValid(key)) {
        $('#relationError').hidden = false;
        $('#relationError').textContent = error.message
      }
    } finally {
      if (button.isConnected) button.disabled = false
    }
  };
  $('#relationSearch').focus();
}
