'use strict';

// "Créer un lien à usage unique" on a vault entry: the chosen fields are
// encrypted in the browser, the link works once and expires on its own.
function openVaultShare(itemId) {
  const key = state.vaultKey;
  (async () => {
    const item = await get('items', itemId);
    if (!item || item.secretsRestricted || !itemActionSessionValid(key)) return;
    const data = await vaultData(item, false);
    const fields = [['username', 'Identifiant', data.username], ['password', 'Mot de passe', data.password], ['url', 'URL', data.url], ['notes', 'Notes', data.notes]].filter(field => field[2]);
    if (!fields.length) { appNotify('Cet accès ne contient aucun champ à partager.', {kind: 'error'}); return; }
    modal('Partager avec un lien à usage unique', `
      <p class="muted">Le lien ne fonctionne qu’une fois : dès que la personne l’ouvre, il est détruit. Les champs sont chiffrés dans ton navigateur et la clé reste dans le lien, le serveur ne peut pas les lire. Envoie ce lien par un canal différent de celui du mot de passe habituel.</p>
      <fieldset class="share-fields"><legend>Champs à partager</legend>${fields.map(([name, label]) => '<label><input type="checkbox" class="share-field" value="' + name + '"' + (name !== 'notes' ? ' checked' : '') + '> ' + esc(label) + '</label>').join('')}</fieldset>
      <div class="field"><label for="shareDuration">Validité</label><select id="shareDuration"><option value="3600000">1 heure</option><option value="86400000" selected>24 heures</option><option value="604800000">7 jours</option></select></div>
      <div id="shareResult" role="status" aria-live="polite"></div>
      <div class="actions"><button class="primary" id="shareCreate">Créer le lien</button><button class="secondary" data-wg-click="closeModal()">Fermer</button></div>`);
    $('#shareCreate').onclick = async () => {
      const chosen = [...document.querySelectorAll('.share-field:checked')].map(box => box.value);
      const out = $('#shareResult'), button = $('#shareCreate');
      if (!chosen.length) { out.textContent = 'Choisis au moins un champ à partager.'; return; }
      if (!itemActionSessionValid(key)) return;
      button.disabled = true;
      out.textContent = 'Création du lien…';
      try {
        const payload = {title: item.title || '', fields: Object.fromEntries(fields.filter(field => chosen.includes(field[0])).map(field => [field[0], field[2]]))};
        const sealed = await WolfGuardShare.seal(payload);
        const created = await WolfGuardCloud.agentRequest('share/create', {cipher: sealed.cipher, duration: Number($('#shareDuration').value)});
        const url = WolfGuardShare.link(location.origin, created.id, sealed.key);
        out.replaceChildren();
        const input = document.createElement('input');
        input.id = 'shareLink'; input.readOnly = true; input.value = url; input.setAttribute('aria-label', 'Lien de partage');
        const copy = document.createElement('button');
        copy.type = 'button'; copy.className = 'secondary'; copy.id = 'shareCopy'; copy.textContent = 'Copier le lien';
        copy.onclick = async () => { copy.textContent = (await copySecret(url)) ? 'Copié' : 'Réessayer'; };
        const revoke = document.createElement('button');
        revoke.type = 'button'; revoke.className = 'secondary'; revoke.id = 'shareRevoke'; revoke.textContent = 'Annuler ce lien';
        revoke.onclick = async () => {
          revoke.disabled = true;
          try { await WolfGuardCloud.agentRequest('share/revoke', {id: created.id}); out.textContent = 'Lien annulé : il ne fonctionne plus.'; }
          catch (error) { revoke.disabled = false; out.textContent = error.message || 'Annulation impossible.'; }
        };
        const note = document.createElement('p');
        note.className = 'muted';
        note.textContent = 'Valable jusqu’au ' + new Date(created.expiresAt).toLocaleString('fr-FR') + ', ou jusqu’à la première ouverture.';
        out.append(input, document.createElement('br'), copy, ' ', revoke, note);
        input.select();
      } catch (error) {
        out.textContent = error.message || 'Création impossible.';
        button.disabled = false;
      }
    };
  })().catch(() => appNotify('Partage impossible pour le moment.', {kind: 'error'}));
}
