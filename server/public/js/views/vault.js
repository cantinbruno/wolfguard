'use strict';

/* V3.3.4 - Restored helpers */
async function vaultData(item, autoMigrate = true) {
  if (!item) return {
    username: '',
    password: '',
    url: '',
    host: '',
    notes: '',
    custom: []
  };
  if (item.vaultBlobEnc) {
    try {
      const parsed = JSON.parse(await decSecret(item.vaultBlobEnc));
      return {
        username: parsed.username || '',
        password: parsed.password || '',
        url: parsed.url || '',
        host: parsed.host || '',
        notes: parsed.notes || '',
        custom: Array.isArray(parsed.custom) ? parsed.custom : []
      };
    } catch (e) {
      console.warn('Lecture coffre chiffré impossible', e);
      return {
        username: '',
        password: '',
        url: '',
        host: '',
        notes: '',
        custom: []
      };
    }
  }
  let password = '';
  try {
    password = await decSecret(item.passwordEnc)
  } catch {}
  const data = {
    username: item.username || '',
    password,
    url: item.url || '',
    host: item.host || '',
    notes: item.notes || '',
    custom: Array.isArray(item.custom) ? item.custom : []
  };
  if (autoMigrate && item.type === 'vault') {
    try {
      item.vaultBlobEnc = await encSecret(JSON.stringify(data));
      item.encryptionVersion = 2;
      delete item.username;
      delete item.passwordEnc;
      delete item.url;
      delete item.host;
      delete item.notes;
      delete item.custom;
      await put('items', item);
    } catch (e) {
      console.warn('Migration coffre ignorée', e)
    }
  }
  return data;
}

function generatePassword(opts = {}) {
  const length = Math.max(8, Math.min(128, Number(opts.length) || 24));
  const sets = [];
  if (opts.lower !== false) sets.push('abcdefghijkmnopqrstuvwxyz');
  if (opts.upper !== false) sets.push('ABCDEFGHJKLMNPQRSTUVWXYZ');
  if (opts.numbers !== false) sets.push('23456789');
  if (opts.symbols !== false) sets.push('!@#$%&*+-_=?.');
  if (!sets.length) sets.push('abcdefghijkmnopqrstuvwxyz');
  const all = sets.join('');
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return [...arr].map(n => all[n % all.length]).join('');
}

function openPasswordGenerator() {
  modal('Générateur de mot de passe', `
    <div class="field"><label>Longueur</label><input id="pgLen" type="number" min="8" max="128" value="24"></div>
    <div class="generator-options">
      <label><input id="pgLower" type="checkbox" checked> Minuscules</label>
      <label><input id="pgUpper" type="checkbox" checked> Majuscules</label>
      <label><input id="pgNum" type="checkbox" checked> Chiffres</label>
      <label><input id="pgSym" type="checkbox" checked> Symboles</label>
    </div>
    <div class="generated-password"><code id="pgOut"></code><button class="secondary" id="pgRegen">↻</button></div>
    <div class="actions"><button class="primary" id="pgUse">Utiliser</button><button class="secondary" id="pgCopy">Copier</button><button class="secondary" data-wg-click="closeModal()">Annuler</button></div>`);
  const regen = () => $('#pgOut').textContent = generatePassword({
    length: $('#pgLen').value,
    lower: $('#pgLower').checked,
    upper: $('#pgUpper').checked,
    numbers: $('#pgNum').checked,
    symbols: $('#pgSym').checked
  });
  $('#pgRegen').onclick = regen;
  $('#pgLen').oninput = regen;
  ['pgLower', 'pgUpper', 'pgNum', 'pgSym'].forEach(id => $('#' + id).onchange = regen);
  regen();
  $('#pgCopy').onclick = () => copySecret($('#pgOut').textContent);
  $('#pgUse').onclick = () => {
    const f = $('#fPass');
    if (f) f.value = $('#pgOut').textContent;
    closeModal()
  };
}

function vaultCatalogItemHTML(entry) {
  return '<div class="workspace-item-heading"><span class="workspace-item-icon catalog-vault-icon" aria-hidden="true">' + workspaceSectionIcon('vault') + '</span><div class="catalog-vault-title"><button type="button" class="workspace-item-title">' + esc(entry.item.title || 'Sans titre') + '</button>' + workspaceCatalogDateHTML(entry.item) + '</div></div>' +
    workspaceCatalogMetaHTML(entry) + '<div class="catalog-vault-security">' + settingsIcon('lock') + '<code aria-label="Mot de passe masqu\u00e9">\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022</code></div>';
}
async function renderVaultWorkspace() {
  await renderUnifiedExplorer();
  if (state.item) {
    const item = await get('items', state.item);
    if (item) await renderVaultDetail(item);
  } else {
    await renderVaultCatalog();
  }
}
async function renderVaultDetail(item) {
  if (!item) return;
  if (state.mode === 'edit') return renderVaultEdit(item);
  const key = state.vaultKey;
  const d = await vaultData(item, true);
  const password = String(d.password || '');
  const crumb = await breadcrumbHTML(item);
  if (!itemActionSessionValid(key)) return;
  $('#detailHost').innerHTML = `
    <div class="vault-view">
      <div class="detail-head">
        <div class="detail-title">${crumb}<h2>${esc(item.title||'Sans titre')}</h2><div class="muted">${esc(d.username||'Aucun identifiant')}</div></div>
        <div class="detail-actions">${itemActionsHTML(item)}</div>
      </div>
      <div class="vault-view-body">
        <div class="info-box"><div class="label">Identifiant</div><div class="value secret-line"><span>${esc(d.username||'—')}</span>${d.username?'<button type="button" id="copyUsername" class="ghost" aria-label="Copier l’identifiant">Copier</button>':''}</div></div>
        <div class="info-box"><div class="label">Mot de passe</div><div class="value secret-line"><span id="passMask" class="secret-mask">${password?'••••••••••••':'Aucun mot de passe'}</span><button type="button" id="showPassword" class="ghost" aria-label="Afficher le mot de passe" aria-controls="passMask" aria-pressed="false" ${password?'':'disabled'}>Afficher</button><button type="button" id="copyPassword" class="ghost" aria-label="Copier le mot de passe" ${password?'':'disabled'}>Copier</button></div></div>
        <div class="info-box"><div class="label">URL</div><div class="value secret-line"><span>${esc(d.url||'—')}</span>${d.url?'<button type="button" id="copyUrl" class="ghost" aria-label="Copier l’URL">Copier</button>':''}</div></div>
        <div class="info-box"><div class="label">IP / Hostname</div><div class="value">${esc(d.host||'—')}</div></div>
        ${(d.custom||[]).length?`<div class="custom-grid">${d.custom.map(c=>`<div class="info-box"><div class="label">${esc(c.k||'Champ')}</div><div class="value">${esc(c.v||'—')}</div></div>`).join('')}</div>`:''}
        <div class="info-box vault-notes"><div class="label">Notes</div><div class="value">${esc(d.notes||'Aucune note.')}</div></div>
        
      </div>
    </div>`;
  const mask = $('#passMask'),
    show = $('#showPassword');
  let revealed = false;
  let revealTimer=null;
  const conceal=()=>{
    clearTimeout(revealTimer);revealTimer=null;revealed=false;
    mask.textContent=password?'••••••••••••':'Aucun mot de passe';
    show.textContent='Afficher';show.setAttribute('aria-label','Afficher le mot de passe');show.setAttribute('aria-pressed','false');
  };
  show.addEventListener('click', () => {
    if(!itemActionSessionValid(key))return;
    clearTimeout(revealTimer);
    revealed = !revealed;
    mask.textContent = revealed ? password : '••••••••••••';
    show.textContent = revealed ? 'Masquer' : 'Afficher';
    show.setAttribute('aria-label', revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    show.setAttribute('aria-pressed', String(revealed));
    if(revealed)revealTimer=setTimeout(conceal,15000);
  });
  const bindCopy = (button, value) => {
    if (!button) return;
    let feedbackTimer;
    button.addEventListener('click', async () => {
      if(!itemActionSessionValid(key))return;
      const copied = await copySecret(value);
      if (!button.isConnected) return;
      if (!copied) {
        appNotify('Impossible de copier dans le presse-papiers.', {kind: 'error'});
        return
      }
      clearTimeout(feedbackTimer);
      button.textContent = 'Copié';
      feedbackTimer = setTimeout(() => {
        button.textContent = 'Copier'
      }, 1800);
    });
  };
  bindCopy($('#copyUsername'), d.username);
  bindCopy($('#copyPassword'), password);
  bindCopy($('#copyUrl'), d.url);
  await renderItemRelations(item, $('#detailHost .vault-view-body'));
}

async function renderVaultEdit(item) {
  const key = state.vaultKey;
  const folders = await foldersForSection('vault');
  const d = await vaultData(item, true);
  const crumb = await breadcrumbHTML(item);
  if (!itemActionSessionValid(key)) return;
  $('#detailHost').innerHTML = `
    <div class="vault-edit">
      <div class="edit-banner" style="margin:14px 20px 0"><div>${crumb}<b>Modification de l'accès</b><div class="muted" style="font-size:12px">Tous les champs sensibles de cette fiche sont chiffrés ensemble.</div></div><button class="secondary" data-wg-click="setMode('view')">Annuler</button></div>
      <div class="vault-edit-body">
        <div class="field"><label>Nom</label><input id="fTitle" value="${esc(item.title)}"></div>
        <div class="field"><label>Dossier</label><select id="fFolder"><option value="">Racine</option>${folderSelectOptions(folders,item.folderId)}</select></div>
        <div class="field"><label>Identifiant</label><input id="fUser" value="${esc(d.username||'')}"></div>
        <div class="field"><label>Mot de passe</label><input id="fPass" type="password" autocomplete="new-password" spellcheck="false" value="${esc(d.password||'')}"><div class="password-tools"><button class="secondary" data-wg-click="openPasswordGenerator()">⚙ Générer</button><button class="secondary" data-wg-click="copySecret($('#fPass').value)">Copier</button></div></div>
        <div class="field third"><label>URL</label><input id="fUrl" value="${esc(d.url||'')}"></div>
        <div class="field third"><label>IP / Hostname</label><input id="fHost" value="${esc(d.host||'')}"></div>
        <div class="custom-editor"><div class="field wide"><label>Champs personnalisés</label><div id="customFields">${(d.custom||[]).map(customRow).join('')}</div><button class="secondary" style="margin-top:8px" data-wg-click="addCustom()">＋ Ajouter un champ</button></div></div>
        <div class="field notes-field"><label>Notes</label><textarea id="fNotes">${esc(d.notes||'')}</textarea></div>
      </div>
      <div class="vault-edit-footer"><button class="primary" data-wg-click="saveVault('${item.id}')">Enregistrer</button><button class="secondary" data-wg-click="duplicateItem('${item.id}')">Dupliquer</button><button class="danger" data-wg-click="deleteItem('${item.id}')">Supprimer</button></div>
    </div>`;
}

function customRow(x = {
  k: '',
  v: ''
}) {
  return `<div class="kv-row"><input class="ck" value="${esc(x.k)}" placeholder="Nom du champ"><input class="cv" value="${esc(x.v)}" placeholder="Valeur"><button class="secondary" data-wg-click="this.parentElement.remove()">×</button></div>`
}
window.addCustom = () => $('#customFields').insertAdjacentHTML('beforeend', customRow());

async function saveVault(id) {
  let x = await get('items', id);
  await baseForm(x);
  const d = {
    username: $('#fUser').value,
    password: $('#fPass').value,
    url: $('#fUrl').value,
    host: $('#fHost').value,
    notes: $('#fNotes').value,
    custom: [...document.querySelectorAll('#customFields .kv-row')].map(r => ({
      k: r.querySelector('.ck').value,
      v: r.querySelector('.cv').value
    })).filter(a => a.k || a.v)
  };
  x.vaultBlobEnc = await encSecret(JSON.stringify(d));
  x.encryptionVersion = 2;
  delete x.username;
  delete x.passwordEnc;
  delete x.url;
  delete x.host;
  delete x.notes;
  delete x.custom;
  await put('items', x);
  state.mode = 'view';
  await renderWorkspace();
}
