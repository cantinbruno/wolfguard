'use strict';

// Import of CSV exports (Bitwarden, KeePass, 1Password, Chrome, Edge, Firefox)
// into the open vault folder. The file is read in the browser only; every
// secret is encrypted before it is saved and nothing of the file is kept.
function openVaultImport() {
  modal('Importer des accès (CSV)', `
    <p class="muted">Exporte tes mots de passe depuis Bitwarden, KeePass, 1Password, Chrome, Edge ou Firefox au format CSV, puis choisis le fichier. Il est lu dans ton navigateur, chiffré à l’import et jamais conservé. <strong>Supprime ensuite le fichier CSV : il contient tes mots de passe en clair.</strong></p>
    <div class="field"><label for="vaultImportFile">Fichier CSV</label><input id="vaultImportFile" type="file" accept=".csv,text/csv,text/plain"></div>
    <div id="vaultImportPreview" class="muted" role="status" aria-live="polite"></div>
    <div class="actions"><button class="primary" id="vaultImportRun" disabled>Importer</button><button class="secondary" data-wg-click="closeModal()">Annuler</button></div>`);
  const key = state.vaultKey, folderId = normalFolder();
  let ready = [];
  const preview = $('#vaultImportPreview'), run = $('#vaultImportRun');
  $('#vaultImportFile').onchange = async event => {
    ready = [];
    run.disabled = true;
    const file = event.target.files[0];
    if (!file) { preview.textContent = ''; return; }
    if (file.size > 5 * 1024 * 1024) { preview.textContent = 'Fichier trop volumineux (5 Mo maximum).'; return; }
    preview.textContent = 'Lecture du fichier…';
    try {
      const mapped = WolfGuardVaultTools.mapCredentialRows(WolfGuardVaultTools.parseCSV(await file.text()));
      if (!mapped.entries.length) { preview.textContent = 'Aucun accès reconnu. Vérifie que le fichier est un export CSV avec les colonnes nom, identifiant et mot de passe.'; return; }
      const existing = new Set();
      for (const item of await all('items')) {
        if (item.type !== 'vault' || item.deletedAt || item.secretsRestricted) continue;
        const data = await vaultData(item, false);
        existing.add(WolfGuardVaultTools.entryKey({title: item.title, username: data.username, url: data.url}));
      }
      let duplicates = 0, invalidTotp = 0;
      for (const entry of mapped.entries) {
        const identity = WolfGuardVaultTools.entryKey(entry);
        if (existing.has(identity)) { duplicates++; continue; }
        existing.add(identity);
        if (entry.totp && !WolfGuardVaultTools.parseTotp(entry.totp)) { entry.totp = ''; invalidTotp++; }
        ready.push(entry);
      }
      const list = ready.slice(0, 5).map(entry => '<li>' + esc(entry.title) + (entry.username ? ' · ' + esc(entry.username) : '') + '</li>').join('');
      preview.innerHTML = '<p><strong>' + ready.length + '</strong> accès prêts à importer'
        + (duplicates ? ', ' + duplicates + ' déjà présent' + (duplicates > 1 ? 's' : '') + ' (ignorés)' : '')
        + (mapped.skipped ? ', ' + mapped.skipped + ' ligne' + (mapped.skipped > 1 ? 's' : '') + ' sans identifiant ni mot de passe (ignorées)' : '')
        + (invalidTotp ? ', ' + invalidTotp + ' secret TOTP invalide (non importé)' : '') + '.</p>' + (list ? '<ul>' + list + (ready.length > 5 ? '<li>…</li>' : '') + '</ul>' : '');
      run.disabled = !ready.length;
    } catch (error) {
      preview.textContent = error.message || 'Lecture du fichier impossible.';
    }
  };
  run.onclick = async () => {
    if (!itemActionSessionValid(key) || !ready.length) return;
    run.disabled = true;
    $('#vaultImportFile').disabled = true;
    let done = 0;
    try {
      for (const entry of ready) {
        if (!itemActionSessionValid(key)) throw new Error('Session expirée : import interrompu.');
        await put('items', {
          id: uid(), type: 'vault', title: entry.title,
          vaultBlobEnc: await encSecret(JSON.stringify({username: entry.username, password: entry.password, url: entry.url, host: '', notes: entry.notes, totp: entry.totp, custom: []})),
          encryptionVersion: 2, tags: entry.folder ? [entry.folder] : [], folderId, favorite: false, createdAt: now(), updatedAt: now()
        });
        done++;
        if (done % 10 === 0 || done === ready.length) preview.textContent = 'Import en cours : ' + done + ' / ' + ready.length;
      }
      ready = [];
      closeModal();
      appNotify(done + ' accès importés. Supprime maintenant le fichier CSV.');
      await renderWorkspace();
    } catch (error) {
      preview.textContent = (error.message || 'Import interrompu.') + ' ' + done + ' accès déjà importés.';
      run.disabled = false;
      $('#vaultImportFile').disabled = false;
    }
  };
}
