'use strict';

/* OPEN / MODE */
async function openItem(id) {
  if (!await confirmDiscardChanges()) return;
  try {
    saveExplorerScroll();
    const x = await get('items', id);
    if (!x || x.deletedAt) return;
    state.item = id;
    state.folder = x.folderId || null;
    state.mode = 'view';

    // Afficher immédiatement : l'ouverture ne dépend plus des statistiques.
    await renderWorkspace();

    // Statistiques non bloquantes.
    try {
      await updateItemRecord(id, record => {
        record.viewCount = (record.viewCount || 0) + 1;
        record.lastViewedAt = now()
      });
      await logActivity(x);
    } catch (err) {
      console.warn('Statistiques non enregistrées :', err);
    }
  } catch (err) {
    console.error('Erreur ouverture élément :', err);
    const host = $('#detailHost');
    if (host) host.innerHTML = '<div class="explorer-empty">Impossible d’ouvrir cet élément. Recharge la page puis réessaie.</div>';
  }
}
async function setMode(m) {
  state.mode = m;
  await renderWorkspace()
}

/* CREATE */
function normalFolder() {
  return state.folder || null
}

/* SAVE */
async function baseForm(item) {
  item.title = $('#fTitle')?.value.trim() || 'Sans titre';
  item.folderId = $('#fFolder')?.value || null;
  if ($('#fTags')) item.tags = $('#fTags').value.split(',').map(s => s.trim()).filter(Boolean);
  item.updatedAt = now();
  return item;
}

/* ACTIONS */
async function toggleFavorite(id) {
  const x = await get('items', id);
  x.favorite = !x.favorite;
  x.updatedAt = now();
  await put('items', x);
  await renderWorkspace()
}
async function duplicateItem(id) {
  const x = await get('items', id);
  const c = structuredClone(x);
  c.id = uid();
  c.title = (x.title || 'Sans titre') + ' - copie';
  c.createdAt = c.updatedAt = now();
  await put('items', c);
  state.folder = c.folderId || null;
  state.item = c.id;
  state.mode = 'view';
  await renderWorkspace()
}
async function deleteItem(id) {
  const key = state.vaultKey;
  if (!itemActionSessionValid(key)) return;
  const x = await get('items', id);
  if (!x || !itemActionSessionValid(key)) return;
  if (!await appConfirm('Supprimer définitivement cet élément ?', {title: 'Supprimer cet \u00e9l\u00e9ment ?', confirmLabel: 'Supprimer', danger: true})) return;
  if (!itemActionSessionValid(key)) return;
  await del('items', id);
  state.item = null;
  state.mode = 'view';
  await renderWorkspace();
}
/* FOLDERS */
async function newFolder(parentOverride = undefined) {
  const folders = await foldersForSection(state.section);
  const initialParent = parentOverride !== undefined ? parentOverride : (state.folder && !String(state.folder).startsWith('@') ? state.folder : null);
  modal('Nouveau dossier', `
    <div class="field"><label>Nom</label><input id="folderName"></div>
    <div class="field"><label>Dossier parent</label>
      <select id="folderParent"><option value="">Racine</option>${folderSelectOptions(folders,initialParent)}</select>
    </div>
    <div class="actions"><button class="primary" id="saveFolder">Créer</button><button class="secondary" onclick="closeModal()">Annuler</button></div>`);
  $('#saveFolder').onclick = async () => {
    const n = $('#folderName').value.trim();
    if (!n) return;
    await put('folders', {
      id: uid(),
      section: state.section,
      name: n,
      parentId: $('#folderParent').value || null
    });
    closeModal();
    await renderWorkspace();
  };
}
async function folderMenu(id) {
  const f = await get('folders', id);
  if (!f) return;
  const folders = await foldersForSection(state.section);
  const descendants = [];
  for (const candidate of folders) {
    if (candidate.id !== id && await isFolderDescendant(candidate.id, id)) descendants.push(candidate.id);
  }
  const allowed = folders.filter(x => x.id !== id && !descendants.includes(x.id));
  modal('Dossier', `
    <div class="field"><label>Nom</label><input id="folderRename" value="${esc(f.name)}"></div>
    <div class="field"><label>Dossier parent</label>
      <select id="folderParentEdit"><option value="">Racine</option>${folderSelectOptions(allowed,f.parentId||null)}</select>
    </div>
    <div class="actions">
      <button class="primary" id="ren">Enregistrer</button>
      <button class="secondary" id="sub">Créer un sous-dossier</button>
      <button class="danger" id="df">Supprimer</button>
      <button class="secondary" onclick="closeModal()">Fermer</button>
    </div>`);
  $('#ren').onclick = async () => {
    f.name = $('#folderRename').value.trim() || f.name;
    f.parentId = $('#folderParentEdit').value || null;
    await put('folders', f);
    closeModal();
    await renderWorkspace();
  };
  $('#sub').onclick = () => {
    closeModal();
    newFolder(id)
  };
  $('#df').onclick = async () => {
    if (!await appConfirm('Supprimer définitivement ce dossier et tout son contenu ?', {title: 'Supprimer ce dossier ?', confirmLabel: 'Supprimer', danger: true})) return;
    await deleteFolderDirect(id);
    closeModal();
  };
}

async function openById(id) {
  const x = await get('items', id);
  if (!x || x.deletedAt || $('#app').classList.contains('hidden')) return;
  const sec = sectionForItem(x);
  if (await openSection(sec, id)) await logActivity(x);
}
