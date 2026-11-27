'use strict';

// "Historique" of a memo: previous versions with a preview and restore.
async function openMemoHistory(id) {
  const key = state.vaultKey;
  const item = await get('items', id);
  if (!item || !itemActionSessionValid(key)) return;
  const history = (item.history || []).filter(memoHistoryValid);
  const canEdit = !window.WolfGuardAccess || (WolfGuardAccess.can('library.edit') && item.accessLevel !== 'read');
  const rows = history.map((version, index) => {
    const text = itemContentText(version.content).replace(/\s+/g, ' ').trim();
    return '<li class="memo-version"><div class="memo-version-head"><strong>' + esc(new Date(version.at).toLocaleString('fr-FR')) + '</strong><span class="muted">' + esc(version.title) + '</span></div>'
      + '<p class="memo-version-preview">' + esc(text.slice(0, 280) || 'Contenu vide') + (text.length > 280 ? '…' : '') + '</p>'
      + (canEdit ? '<button type="button" class="secondary" data-memo-restore="' + index + '">Restaurer cette version</button>' : '') + '</li>';
  }).join('');
  modal('Historique de la fiche', (history.length
    ? '<p class="muted">Les ' + history.length + ' dernières versions enregistrées, de la plus récente à la plus ancienne. Restaurer une version la remet en place et conserve la version actuelle dans l’historique.</p><ol class="memo-history">' + rows + '</ol>'
    : '<p class="muted">Aucune version précédente : l’historique commence au prochain enregistrement de cette fiche.</p>')
    + '<div class="actions"><button class="secondary" data-wg-click="closeModal()">Fermer</button></div>');
  for (const button of document.querySelectorAll('[data-memo-restore]')) {
    button.onclick = async () => {
      if (!itemActionSessionValid(key)) return;
      if (!await appConfirm('Remplacer le contenu actuel par cette version ? La version actuelle restera dans l’historique.', {title: 'Restaurer cette version ?', confirmLabel: 'Restaurer'})) return;
      const current = await get('items', id);
      if (!current || !itemActionSessionValid(key)) return;
      try {
        const restored = restoreMemoVersion(current, Number(button.dataset.memoRestore), now());
        if (db?.saveEditedItem) await db.saveEditedItem(restored, current); else await put('items', restored);
        closeModal();
        appNotify('Version restaurée.');
        state.item = id; state.mode = 'view';
        await renderWorkspace();
      } catch (error) {
        appNotify(error.message || 'Restauration impossible.', {kind: 'error'});
      }
    };
  }
}
