'use strict';

let contextMenuVersion = 0;

function closeContextMenu() {
  contextMenuVersion++;
  document.querySelector('#ctxMenu')?.remove()
}

function showContextMenu(e, actions, label = 'Actions de navigation') {
  const previousFocus = document.activeElement;
  const menu = document.createElement('div');
  menu.id = 'ctxMenu';
  menu.className = 'context-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', label);
  for (const action of actions) {
    if (!action) {
      const separator = document.createElement('div');
      separator.className = 'ctx-sep';
      separator.setAttribute('role', 'separator');
      menu.appendChild(separator);
      continue
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action.label;
    button.dataset.action = action.id;
    button.disabled = !!action.disabled;
    button.setAttribute('role', 'menuitem');
    if (action.danger) button.className = 'danger';
    button.addEventListener('click', async () => {
      closeContextMenu();
      if ($('#app').classList.contains('hidden')) return;
      try {
        await action.run()
      } catch {
        appNotify('Impossible d’effectuer cette action.', {kind: 'error'})
      }
    });
    menu.appendChild(button);
  }
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeContextMenu();
      if (previousFocus?.isConnected) previousFocus.focus();
      return;
    }
    if (event.key === 'Tab') {
      closeContextMenu();
      return
    }
    const buttons = [...menu.querySelectorAll('button:not(:disabled)')];
    let index = buttons.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') index = (index + 1) % buttons.length;
    else if (event.key === 'ArrowUp') index = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[index]?.focus();
  });
  document.body.appendChild(menu);
  const box = menu.getBoundingClientRect(),
    anchor = e.target?.closest?.('.tree-row')?.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(e.clientX || anchor?.left || 8, innerWidth - box.width - 8)) + 'px';
  menu.style.top = Math.max(8, Math.min(e.clientY || anchor?.bottom || 8, innerHeight - box.height - 8)) + 'px';
  menu.querySelector('button:not(:disabled)')?.focus({
    preventScroll: true
  });
}
async function itemContextMenu(e, id) {
  e.preventDefault();
  e.stopPropagation();
  closeContextMenu();
  const version = contextMenuVersion,
    item = await get('items', id);
  if (!item || isDeleted(item) || version !== contextMenuVersion) return;
  const actions = [{
    id: 'open-item',
    label: 'Ouvrir',
    run: () => openItem(id)
  }, {
    id: 'edit-item',
    label: 'Modifier',
    run: async () => {
      await openItem(id);
      await setMode('edit')
    }
  }];
  const copy = async value => {
    if (!await copyText(value)) appNotify('Impossible de copier dans le presse-papiers.', {kind: 'error'})
  };
  if (item.type === 'vault') {
    const data = await vaultData(item, false);
    if (version !== contextMenuVersion) return;
    const revealed = state.item === id && state.mode === 'view' && $('#showPassword')?.getAttribute('aria-pressed') === 'true';
    actions.push(null, {
      id: 'toggle-password',
      label: revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe',
      disabled: !data.password,
      run: async () => {
        await openItem(id);
        if (!revealed) $('#showPassword')?.click()
      }
    }, {
      id: 'copy-username',
      label: 'Copier l’identifiant',
      disabled: !data.username,
      run: () => copy(data.username)
    }, {
      id: 'copy-password',
      label: 'Copier le mot de passe',
      disabled: !data.password,
      run: () => copy(data.password)
    }, {
      id: 'copy-url',
      label: 'Copier l’URL',
      disabled: !data.url,
      run: () => copy(data.url)
    });
  } else if (sectionForItem(item) === 'library') {
    actions.push(null, {
      id: 'copy-library-item',
      label: 'Copier la fiche',
      run: () => copy(libraryText(item))
    });
  }
  actions.push(null, {
    id: 'duplicate-item',
    label: 'Dupliquer',
    run: () => duplicateItem(id)
  }, {
    id: 'delete-item',
    label: 'Supprimer',
    danger: true,
    run: () => deleteItem(id)
  });
  showContextMenu(e, actions, 'Actions pour ' + (item.title || 'Sans titre'));
}

async function deleteFolderDirect(id) {
  closeContextMenu();
  const folders = await activeFolders();
  const items = await activeItems();
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        changed = true;
      }
    }
  }
  for (const x of items.filter(x => x.folderId && ids.has(x.folderId))) await del('items', x.id);
  for (const f of folders.filter(f => ids.has(f.id))) await del('folders', f.id);
  if (state.folder && ids.has(state.folder)) state.folder = null;
  state.item = null;
  await renderWorkspace();
}
async function folderContextMenu(e, id) {
  e.preventDefault();
  e.stopPropagation();
  closeContextMenu();
  const version = contextMenuVersion,
    folder = await get('folders', id);
  if (!folder || isDeleted(folder) || version !== contextMenuVersion) return;
  const children = document.querySelector('#unifiedTree .tree-children[data-folder-id="' + CSS.escape(id) + '"]');
  const expanded = children ? !children.classList.contains('collapsed') : expandedFolders.has(id);
  showContextMenu(e, [{
      id: 'open-folder',
      label: 'Ouvrir',
      run: async () => {
        expandedFolders.add(id);
        await selectFolder(id)
      }
    }, {
      id: 'toggle-folder',
      label: expanded ? 'Replier' : 'Déplier',
      run: () => toggleFolderCollapse(id)
    }, {
      id: 'edit-folder',
      label: 'Renommer / déplacer',
      run: () => folderMenu(id)
    }, {
      id: 'new-subfolder',
      label: 'Créer un sous-dossier',
      run: () => newFolder(id)
    },
    null, {
      id: 'delete-folder',
      label: 'Supprimer',
      danger: true,
      run: async () => {
        if (await appConfirm('Supprimer définitivement ce dossier et tout son contenu ?', {title: 'Supprimer ce dossier ?', confirmLabel: 'Supprimer', danger: true})) await deleteFolderDirect(id)
      }
    }
  ], 'Actions pour ' + folder.name);
}

function navigationContextMenu(e) {
  e.preventDefault();
  e.stopPropagation();
  closeContextMenu();
  if (state.section === 'protocol') return;
  const actions = [{
    id: 'new-folder',
    label: 'Nouveau dossier',
    run: () => newFolder(null)
  }];
  const create = run => async () => {
    state.folder = null;
    state.item = null;
    await run()
  };
  if (state.section === 'vault') actions.push({
    id: 'new-vault',
    label: 'Nouvel accès',
    run: create(newVault)
  });
  else if (state.section === 'library') actions.push({
    id: 'new-library-item',
    label: 'Nouvelle fiche',
    run: create(newLibraryItem)
  });
  showContextMenu(e, actions);
}
document.addEventListener('click', e => {
  if (!e.target.closest?.('#ctxMenu')) closeContextMenu()
});
