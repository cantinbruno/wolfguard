import {create, open, seal, validateEnvelope, checkPassword, generatePassword, MAX_BYTES} from './crypto.js';
import * as storage from './storage.js';

const $ = id => document.getElementById(id);
let session = null, localEnvelope = null, pendingBackup = null, section = 'memo', folder = null;
let generation = 0, saveQueue = Promise.resolve(), releaseTab = null, idleTimer, noticeTimer;
let busyAuth = false, pendingTransition = false;
const idleMs = 5 * 60 * 1000;
const text = (tag, value, className = '') => {
  const node = document.createElement(tag); node.textContent = value; node.className = className; return node;
};
function notify(message) {
  $('notice').textContent = message; $('notice').hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 5000);
}
function validatePayload(value) {
  const string = (s, max) => typeof s === 'string' && s.length <= max;
  if (!value || value.version !== 1 || !Array.isArray(value.items) || !Array.isArray(value.folders) || value.items.length > 10000 || value.folders.length > 1000) throw new Error('Contenu de sauvegarde invalide.');
  const ids = new Set();
  const folders = value.folders.map(f => {
    if (!f || !string(f.id, 100) || ids.has(f.id) || !string(f.name, 100) || !['memo', 'vault'].includes(f.section)) throw new Error('Dossier invalide.');
    ids.add(f.id); return {id: f.id, name: f.name, section: f.section};
  });
  ids.clear();
  const items = value.items.map(i => {
    if (!i || !string(i.id, 100) || ids.has(i.id) || !['memo', 'vault'].includes(i.type) || !string(i.title, 250) || !string(i.content, 500000) || !string(i.username, 2000) || !string(i.password, 2000) || !string(i.url, 2000) || !string(i.updatedAt, 50) || !Number.isFinite(Date.parse(i.updatedAt)) || (i.folder !== null && !folders.some(f => f.id === i.folder && f.section === i.type))) throw new Error('Fiche invalide.');
    ids.add(i.id);
    return {id: i.id, type: i.type, title: i.title, content: i.content, username: i.username, password: i.password, url: i.url, folder: i.folder, updatedAt: i.updatedAt};
  });
  return {version: 1, items, folders};
}
async function acquireTab() {
  if (releaseTab) return;
  if (!navigator.locks) throw new Error('Ce navigateur ne permet pas de sécuriser l’accès simultané. Utilise une version récente de Chrome, Edge, Firefox ou Safari.');
  await new Promise((resolve, reject) => {
    navigator.locks.request('wolfguard-web-editor', {mode: 'exclusive', ifAvailable: true}, async lock => {
      if (!lock) { reject(new Error('WolfGuard est déjà ouvert dans un autre onglet. Verrouille cet onglet avant de continuer ici.')); return; }
      await new Promise(release => { releaseTab = release; resolve(); });
    }).catch(reject);
  });
}
function release() { releaseTab?.(); releaseTab = null; }
function resetIdle() { clearTimeout(idleTimer); if (session) idleTimer = setTimeout(() => lock(), idleMs); }
function clearSensitiveUI() {
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  document.querySelectorAll('input:not([type=file]),textarea').forEach(input => { input.value = ''; });
  $('items').replaceChildren(); $('folders').replaceChildren();
  for (const id of ['generated-password','tool-output','hash-output','notice','editor-error','settings-error']) $(id).textContent = '';
  $('notice').hidden = true;
  $('item-folder').replaceChildren();
}
async function lock(message = '') {
  if (pendingTransition) return;
  pendingTransition = true;
  generation++; session = null; pendingBackup = null;
  clearTimeout(idleTimer); clearSensitiveUI();
  $('workspace').hidden = true; $('gate').hidden = false;
  renderGate();
  try { await saveQueue; localEnvelope = await storage.read(); }
  catch { message ||= 'Enregistrement local impossible. Ne ferme pas cet onglet si une sauvegarde est en cours.'; }
  finally { release(); pendingTransition = false; $('auth-submit').disabled = busyAuth; }
  if (message) $('auth-error').textContent = message;
}
function renderGate() {
  const existing = !!(pendingBackup || localEnvelope);
  $('confirmation').hidden = existing;
  $('master-confirm').required = !existing;
  $('master').autocomplete = existing ? 'current-password' : 'new-password';
  $('master').minLength = existing ? 1 : 14;
  $('gate-title').textContent = pendingBackup ? 'Ouvrir votre sauvegarde.' : existing ? 'Heureux de vous retrouver.' : 'Votre espace. Votre clé.';
  $('gate-description').textContent = pendingBackup ? 'Saisissez le mot de passe utilisé lors de son export. La restauration remplace l’espace local après votre confirmation.' : existing ? 'Votre espace est chiffré sur cet appareil. Entrez votre mot de passe maître pour le retrouver.' : 'Mémo, outils et coffre-fort. Un espace chiffré qui reste dans votre navigateur.';
  $('auth-submit').textContent = pendingBackup ? 'Déchiffrer et restaurer' : existing ? 'Déverrouiller mon espace →' : 'Créer mon espace chiffré →';
  $('cancel-restore').hidden = !pendingBackup;
  $('auth-error').textContent = '';
  $('auth-submit').disabled = busyAuth || pendingTransition;
  $('master').value = ''; $('master-confirm').value = '';
}
async function authenticate(event) {
  event.preventDefault();
  if (busyAuth || pendingTransition) return;
  busyAuth = true; $('auth-submit').disabled = true; $('auth-error').textContent = '';
  const attempt = generation;
  let password = $('master').value;
  let retained = false;
  try {
    if (!isSecureContext || !crypto.subtle) throw new Error('Ouvre WolfGuard via HTTPS ou localhost pour activer le chiffrement.');
    await acquireTab();
    await saveQueue;
    localEnvelope = await storage.read();
    let result;
    if (pendingBackup) {
      result = await open(pendingBackup, password);
      result.payload = validatePayload(result.payload);
      if (attempt !== generation || document.hidden) return;
      if (localEnvelope && !confirm('Remplacer l’espace local par cette sauvegarde ? Les modifications absentes de la sauvegarde seront perdues. Exportez votre espace actuel avant de continuer.')) return;
      result.envelope.revision = (localEnvelope?.revision ?? 0) + 1;
      await storage.write(result.envelope, localEnvelope?.revision ?? 0);
    } else if (localEnvelope) {
      result = await open(localEnvelope, password);
      result.payload = validatePayload(result.payload);
    } else {
      if (password !== $('master-confirm').value) throw new Error('Les mots de passe ne correspondent pas.');
      result = await create({version: 1, items: [], folders: []}, password);
      if (attempt !== generation || document.hidden) return;
      await storage.write(result.envelope, 0);
    }
    if (attempt !== generation || document.hidden) return;
    session = result; localEnvelope = result.envelope; pendingBackup = null; retained = true;
    $('master').value = ''; $('master-confirm').value = '';
    $('gate').hidden = true; $('workspace').hidden = false;
    selectSection('memo'); resetIdle();
    navigator.storage?.persist?.().catch(() => {});
  } catch (error) { $('auth-error').textContent = error.message; }
  finally { password = ''; busyAuth = false; $('auth-submit').disabled = false; if (!retained) release(); }
}
function mutate(change) {
  const current = session, epoch = generation;
  if (!current) return Promise.reject(new Error('L’espace est verrouillé.'));
  $('save-state').textContent = 'Chiffrement et enregistrement…';
  const work = saveQueue.then(async () => {
    if (session !== current || generation !== epoch) throw new Error('La session a été verrouillée.');
    const payload = structuredClone(current.payload); change(payload); validatePayload(payload);
    const envelope = await seal(payload, current.key, current.salt, current.envelope.revision + 1);
    await storage.write(envelope, current.envelope.revision);
    current.payload = payload; current.envelope = envelope; localEnvelope = envelope;
    if (session === current) $('save-state').textContent = 'Espace chiffré enregistré';
    return generation === epoch;
  });
  saveQueue = work.catch(() => {});
  return work.catch(error => { if (session === current) $('save-state').textContent = 'Échec de l’enregistrement'; throw error; });
}
function selectSection(next) {
  if (!session) return;
  section = next; folder = null; $('search').value = ''; document.body.dataset.section = next;
  document.querySelectorAll('[data-section]').forEach(button => { button.removeAttribute('aria-current'); if (button.dataset.section === next) button.setAttribute('aria-current', 'page'); });
  $('collection-view').hidden = next === 'tools'; $('tools-view').hidden = next !== 'tools';
  if (next === 'tools') { $('password-length').value = '24'; regenerate(); return; }
  const vault = next === 'vault';
  $('section-title').replaceChildren(text('span', vault ? 'Mon coffre-fort' : 'Mes mémos'), text('span', '.', 'accent'));
  $('section-eyebrow').textContent = vault ? 'VOS ACCÈS, SOUS VOTRE CONTRÔLE' : 'VOTRE BIBLIOTHÈQUE PERSONNELLE';
  $('section-description').textContent = vault ? 'Identifiants, mots de passe et notes confidentielles, réunis à l’abri.' : 'Une place pour vos idées, vos procédures et vos références.';
  $('new-item').textContent = vault ? '＋ Nouvel identifiant' : '＋ Nouveau mémo';
  $('search').placeholder = vault ? 'Rechercher dans mon coffre…' : 'Rechercher dans mes mémos…';
  renderCollection();
}
function renderFolders() {
  $('folders').replaceChildren();
  const scoped = session.payload.items.filter(i => i.type === section);
  const add = (id, name) => {
    const row = text('div', '', 'folder-row'), button = text('button', '', 'folder' + (folder === id ? ' active' : ''));
    button.type = 'button'; button.append(text('span', id ? '▱' : '▦'), text('span', name), text('small', String(id ? scoped.filter(i => i.folder === id).length : scoped.length), 'folder-count'));
    button.onclick = () => { folder = id; renderCollection(); }; row.append(button);
    if (id) {
      const remove = text('button', '×', 'icon-button folder-delete'); remove.type = 'button'; remove.ariaLabel = 'Supprimer le dossier ' + name;
      remove.onclick = async () => {
        if (!confirm('Supprimer ce dossier ? Les fiches seront conservées dans « Tous ».')) return;
        try { if (await mutate(data => { data.folders = data.folders.filter(f => f.id !== id); data.items.forEach(i => { if (i.folder === id) i.folder = null; }); })) { folder = null; renderCollection(); } }
        catch (error) { notify(error.message); }
      }; row.append(remove);
    }
    $('folders').append(row);
  };
  add(null, 'Tous'); session.payload.folders.filter(f => f.section === section).forEach(f => add(f.id, f.name));
}
function renderCollection() {
  if (!session || section === 'tools') return;
  renderFolders();
  const query = $('search').value.toLocaleLowerCase('fr').trim();
  const items = session.payload.items.filter(i => i.type === section && (!folder || i.folder === folder) && [i.title, i.content, i.username, i.url].join(' ').toLocaleLowerCase('fr').includes(query)).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  $('item-count').textContent = `${items.length} ${section === 'vault' ? 'identifiant' : 'mémo'}${items.length === 1 ? '' : 's'}`;
  $('items').replaceChildren();
  if (!items.length) {
    const empty = text('div', '', 'empty');
    empty.append(text('span', section === 'vault' ? '◇' : '▤', 'empty-symbol'), text('h2', query ? 'Aucun résultat' : section === 'vault' ? 'Votre coffre est prêt' : 'De la place pour vos idées'), text('p', query ? 'Essayez un autre terme de recherche.' : section === 'vault' ? 'Ajoutez votre premier identifiant pour le garder à l’abri.' : 'Créez votre premier mémo et organisez-le dans un dossier.'));
    $('items').append(empty);
  }
  for (const item of items) {
    const card = text('button', '', 'item-card'); card.type = 'button';
    card.append(text('span', item.type === 'vault' ? '◇  IDENTIFIANT' : '▤  MÉMO', 'item-type'), text('h2', item.title));
    if (item.type === 'vault') card.append(text('div', '••••••••', 'vault-mask'));
    else card.append(text('p', item.content.slice(0, 160) || 'Aucun contenu pour le moment.'));
    const date = text('time', 'Modifié le ' + new Date(item.updatedAt).toLocaleDateString('fr-FR')); date.dateTime = item.updatedAt; card.append(date);
    card.onclick = () => showEditor(item); $('items').append(card);
  }
}
function showEditor(item = null) {
  if (!session) return;
  $('editor-form').reset(); $('editor-error').textContent = '';
  const vault = section === 'vault';
  $('editor-title').textContent = item ? (vault ? 'Identifiant' : 'Modifier le mémo') : (vault ? 'Nouvel identifiant' : 'Nouveau mémo');
  $('editor-eyebrow').textContent = vault ? 'COFFRE-FORT' : 'MÉMO';
  $('item-id').value = item?.id ?? ''; $('item-title').value = item?.title ?? ''; $('item-content').value = item?.content ?? '';
  $('item-username').value = item?.username ?? ''; $('item-password').value = item?.password ?? ''; $('item-url').value = item?.url ?? '';
  $('item-password').type = 'password'; $('toggle-password').textContent = 'Afficher';
  $('vault-fields').hidden = !vault; $('delete-item').hidden = !item; $('content-label').textContent = vault ? 'Notes confidentielles' : 'Contenu';
  $('item-folder').replaceChildren();
  const option = (value, label) => { const node = text('option', label); node.value = value; return node; };
  $('item-folder').append(option('', 'Sans dossier'));
  session.payload.folders.filter(f => f.section === section).forEach(f => $('item-folder').append(option(f.id, f.name)));
  $('item-folder').value = item?.folder ?? folder ?? '';
  $('editor-dialog').showModal(); $('item-title').focus();
}
async function saveItem(event) {
  event.preventDefault(); if (!session) return;
  const id = $('item-id').value || crypto.randomUUID();
  const item = {id, type: section, title: $('item-title').value.trim(), content: $('item-content').value, username: section === 'vault' ? $('item-username').value : '', password: section === 'vault' ? $('item-password').value : '', url: section === 'vault' ? $('item-url').value : '', folder: $('item-folder').value || null, updatedAt: new Date().toISOString()};
  if (!item.title) { $('editor-error').textContent = 'Le titre est obligatoire.'; return; }
  $('save-item').disabled = true;
  try {
    if (await mutate(data => { const index = data.items.findIndex(i => i.id === id); if (index < 0) data.items.push(item); else data.items[index] = item; })) {
      $('editor-dialog').close(); renderCollection(); notify('Fiche chiffrée et enregistrée.');
    }
  } catch (error) { $('editor-error').textContent = error.message; }
  finally { $('save-item').disabled = false; }
}
function download(envelope) {
  const blob = new Blob([JSON.stringify(envelope)], {type: 'application/json'});
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = `WolfGuard-${new Date().toISOString().slice(0,10)}.wgweb`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function exportBackup() {
  const current = session; if (!current) return;
  await saveQueue;
  if (session !== current) return;
  download(current.envelope); notify('Sauvegarde chiffrée exportée. Conservez-la en lieu sûr.');
}
async function importBackup(event) {
  const file = event.target.files?.[0]; event.target.value = '';
  if (!file || busyAuth || pendingTransition) return;
  try {
    if (file.size > MAX_BYTES * 1.4) throw new Error('Sauvegarde trop volumineuse (limite : 32 Mo de contenu).');
    const backup = validateEnvelope(JSON.parse(await file.text()));
    if (session) {
      if (!confirm('Pour restaurer, votre espace sera verrouillé. Avez-vous exporté les modifications à conserver ?')) return;
      await lock();
    }
    pendingBackup = backup; renderGate(); $('master').focus();
  } catch (error) { notify(error instanceof SyntaxError ? 'Le fichier choisi n’est pas une sauvegarde WolfGuard Web.' : error.message); }
}
async function changePassword(event) {
  event.preventDefault(); const current = session; if (!current || pendingTransition) return;
  const epoch = generation;
  let oldPassword = $('current-password').value, password = $('new-password').value;
  const button = event.submitter; button.disabled = true; $('settings-error').textContent = '';
  try {
    checkPassword(password);
    if (password !== $('new-password-confirm').value) throw new Error('Les nouveaux mots de passe ne correspondent pas.');
    await open(current.envelope, oldPassword);
    const work = saveQueue.then(async () => {
      if (session !== current || epoch !== generation) throw new Error('La session a été verrouillée.');
      const result = await create(current.payload, password, current.envelope.revision + 1);
      await storage.write(result.envelope, current.envelope.revision);
      current.key = result.key; current.salt = result.salt; current.envelope = result.envelope; localEnvelope = result.envelope;
      if (session === current) {
        $('change-password-form').reset(); notify('Mot de passe modifié. Exportez une nouvelle sauvegarde.');
      }
    });
    saveQueue = work.catch(() => {}); await work;
  } catch (error) { if (session === current) $('settings-error').textContent = error.message; }
  finally { oldPassword = ''; password = ''; button.disabled = false; }
}
async function copy(value) {
  if (!session || !value) return;
  const epoch = generation;
  try {
    await navigator.clipboard.writeText(value);
    if (epoch !== generation) { await navigator.clipboard.writeText(''); return; }
    notify('Copié. Le presse-papiers ne se vide pas automatiquement : remplacez son contenu après utilisation.');
    // Never read the user's clipboard to implement a potentially destructive timeout.
  } catch { notify('Copie refusée par le navigateur. Sélectionnez et copiez le texte manuellement.'); }
}
function regenerate() {
  if (!session) return;
  const length = Math.max(12, Math.min(128, Math.floor(Number($('password-length').value) || 24)));
  $('password-length').value = String(length); $('generated-password').textContent = generatePassword(length);
}
function transform(kind) {
  const input = $('tool-input').value;
  try {
    let output;
    if (kind === 'json') output = JSON.stringify(JSON.parse(input), null, 2);
    if (kind === 'url') output = encodeURIComponent(input);
    if (kind === 'unurl') output = decodeURIComponent(input);
    if (kind === 'encode') { const bytes = new TextEncoder().encode(input); let raw = ''; for (const byte of bytes) raw += String.fromCharCode(byte); output = btoa(raw); }
    if (kind === 'decode') output = new TextDecoder('utf-8', {fatal: true}).decode(Uint8Array.from(atob(input.trim()), c => c.charCodeAt(0)));
    $('tool-output').textContent = output;
  } catch { $('tool-output').textContent = 'Le texte ne correspond pas au format attendu.'; }
}

$('auth-form').onsubmit = authenticate;
$('lock-button').onclick = () => lock();
$('search').oninput = renderCollection;
$('new-item').onclick = () => showEditor();
$('editor-form').onsubmit = saveItem;
$('new-folder').onclick = () => { if (!session) return; $('folder-form').reset(); $('folder-dialog').showModal(); $('folder-name').focus(); };
$('folder-form').onsubmit = async event => {
  event.preventDefault(); const name = $('folder-name').value.trim(), type = section;
  if (!name || !session) return;
  const button = event.submitter; button.disabled = true;
  try { if (await mutate(data => data.folders.push({id: crypto.randomUUID(), name, section: type}))) { $('folder-dialog').close(); renderCollection(); } }
  catch (error) { notify(error.message); } finally { button.disabled = false; }
};
$('delete-item').onclick = async () => {
  const id = $('item-id').value;
  if (!session || !id || !confirm('Supprimer définitivement cette fiche ?')) return;
  try { if (await mutate(data => { data.items = data.items.filter(i => i.id !== id); })) { $('editor-dialog').close(); renderCollection(); notify('Fiche supprimée.'); } }
  catch (error) { $('editor-error').textContent = error.message; }
};
$('toggle-password').onclick = () => { const input = $('item-password'); input.type = input.type === 'password' ? 'text' : 'password'; $('toggle-password').textContent = input.type === 'password' ? 'Afficher' : 'Masquer'; };
$('fill-password').onclick = () => { $('item-password').value = generatePassword(); };
$('copy-password').onclick = () => copy($('item-password').value);
$('settings-button').onclick = () => { if (session) $('settings-dialog').showModal(); };
$('change-password-form').onsubmit = changePassword;
$('export-backup').onclick = () => exportBackup().catch(error => notify(error.message));
for (const id of ['restore-backup', 'restore-locked']) $(id).onclick = () => $('backup-file').click();
$('backup-file').onchange = importBackup;
$('cancel-restore').onclick = () => { pendingBackup = null; renderGate(); };
$('generate-password').onclick = regenerate;
$('copy-generated').onclick = () => copy($('generated-password').textContent);
$('copy-tool').onclick = () => copy($('tool-output').textContent);
$('hash-file').onchange = async event => {
  const file = event.target.files?.[0], epoch = generation;
  if (!file || !session) return;
  if (file.size > MAX_BYTES) { $('hash-output').textContent = 'Fichier trop volumineux (32 Mo maximum).'; return; }
  try {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
    if (session && epoch === generation) $('hash-output').textContent = Array.from(digest, b => b.toString(16).padStart(2,'0')).join('');
  } catch { if (session && epoch === generation) $('hash-output').textContent = 'Lecture du fichier impossible.'; }
};
document.querySelectorAll('[data-section]').forEach(button => button.onclick = () => selectSection(button.dataset.section));
document.querySelectorAll('[data-transform]').forEach(button => button.onclick = () => transform(button.dataset.transform));
document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => $(button.dataset.close).close());
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', () => {
  dialog.querySelectorAll('input,textarea').forEach(input => { input.value = ''; });
}));
document.querySelector('.topbar .identity').onclick = event => { event.preventDefault(); selectSection('memo'); };
for (const event of ['pointerdown', 'keydown', 'input', 'wheel']) document.addEventListener(event, resetIdle, {passive: true});
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (session) lock(); else generation++; } });
window.addEventListener('pagehide', () => { generation++; session = null; clearSensitiveUI(); release(); });
window.addEventListener('pageshow', event => { if (event.persisted) lock(); });
window.addEventListener('unhandledrejection', event => { event.preventDefault(); notify(event.reason?.message || 'Opération impossible.'); });

try {
  if (!isSecureContext || !crypto.subtle) throw new Error('Ouvre WolfGuard via HTTPS ou localhost pour activer le chiffrement.');
  localEnvelope = await storage.read(); renderGate();
} catch (error) { $('auth-submit').disabled = true; $('auth-error').textContent = error.message; }
