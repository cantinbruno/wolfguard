'use strict';

/* PORTABLE DATA FILE */
function portableSupported() {
  return 'showDirectoryPicker' in window;
}

function updateDataStatus(stateName = 'local', name = '') {
  if (localServiceAvailable()) {
    for (const element of document.querySelectorAll('.dashboard-storage-mode,.settings-connection-state')) {
      element.textContent = workspaceConnectionLabel();
      element.classList.toggle('workspace-connection-error', stateName === 'error');
      element.title = stateName === 'error' ? localWorkspaceError : '';
    }
  }
  const dot = $('#dataDot'),
    txt = $('#dataStatusText');
  if (!dot || !txt) return;
  dot.classList.remove('ok', 'err');
  if (stateName === 'file') {
    dot.classList.add('ok');
    txt.textContent = 'OK';
  } else if (stateName === 'loaded') {
    dot.classList.add('ok');
    txt.textContent = 'Chargée';
  } else if (stateName === 'error') {
    dot.classList.add('err');
    txt.textContent = 'Erreur';
  } else {
    txt.textContent = 'Local';
  }
}

function currentDataStatusState() {
  if (workspaceCanWrite()) return 'file';
  if (portableReadOnly) return 'loaded';
  return 'local';
}
async function saveDirectoryReference() {
  if (!portableDirHandle) return;
  try {
    portableBusy = true;
    const r = tx('settings', 'readwrite').put({
      key: 'portableDirHandle',
      value: portableDirHandle
    });
    await new Promise((res, rej) => {
      r.onsuccess = () => {
        settingsCache.set('portableDirHandle', portableDirHandle);
        res()
      };
      r.onerror = () => rej(r.error)
    });
  } finally {
    portableBusy = false
  }
}
async function loadSavedPortableHandle() {
  try {
    const rec = await get('settings', 'portableDirHandle');
    if (!rec?.value) {
      portableDirHandle = null;
      portableFileHandle = null;
      portableSectionHandles = new Map();
      portableReadOnly = false;
      updateDataStatus('local');
      return false;
    }

    portableDirHandle = rec.value;

    let perm = await portableDirHandle.queryPermission({
      mode: 'readwrite'
    });
    if (perm !== 'granted') {
      portableDirHandle = null;
      portableFileHandle = null;
      portableSectionHandles = new Map();
      portableReadOnly = false;
      updateDataStatus('local');
      return false;
    }

    const connection = await readWorkspaceDirectory(portableDirHandle);
    useWorkspaceDirectory(connection);
    await importPayloadToLocal(connection.payload);

    // Keep the directory handle only in the browser cache, not in the ITW payload.
    await rawPut('settings', {
      key: 'portableDirHandle',
      value: portableDirHandle
    });

    updateDataStatus('file', portableFileName);

    let hasCode = await ensureSecuritySettings();
    if (!hasCode) {
      // Existing authorized database but no code yet: require first code creation.
      return 'needs-code';
    }

    connectedWorkspaceReady = true;
    return true;
  } catch (e) {
    console.error('Auto-reconnexion ITW impossible', e);
    portableDirHandle = null;
    portableFileHandle = null;
    portableSectionHandles = new Map();
    portableReadOnly = false;
    connectedWorkspaceReady = false;
    updateDataStatus('local');
    return false;
  }
}
async function loadBundledWorkspaceFile() {
  if (location.protocol === 'file:') return false;
  try {
    const response = await fetch('../' + WORKSPACE_DIRECTORY + '/' + WORKSPACE_CONFIG_FILE, {
      cache: 'no-store'
    });
    let data;
    if (response.ok) {
      const files = new Map([
        [WORKSPACE_CONFIG_FILE, parseItwText(await response.text())]
      ]);
      await Promise.all(WORKSPACE_SECTION_FILES.map(async ({
        file
      }) => {
        const part = await fetch('../' + WORKSPACE_DIRECTORY + '/' + file, {
          cache: 'no-store'
        });
        if (!part.ok) throw new Error('Fichier manquant : ' + file);
        files.set(file, parseItwText(await part.text()));
      }));
      data = combineWorkspacePayloads(files);
    } else if (response.status === 404) {
      const legacy = await fetch('../workspace.itw', {
        cache: 'no-store'
      });
      if (!legacy.ok) return false;
      data = parseItwText(await legacy.text());
    } else {
      return false
    }
    portableDirHandle = null;
    portableFileHandle = null;
    portableSectionHandles = new Map();
    portableReadOnly = true;
    portableFileName = response.ok ? 'Bases par section' : 'workspace.itw';

    await importPayloadToLocal(data);
    updateDataStatus('loaded', portableFileName);

    const hasCode = await ensureSecuritySettings();
    if (!hasCode) return 'needs-code';

    connectedWorkspaceReady = true;
    return true;
  } catch (e) {
    console.info('Chargement automatique des bases ITW indisponible.', e);
    portableReadOnly = false;
    updateDataStatus('local');
    return false;
  }
}
async function requestDirPermission(directory = portableDirHandle) {
  if (!directory) return false;
  try {
    let p = await directory.queryPermission({
      mode: 'readwrite'
    });
    if (p !== 'granted') p = await directory.requestPermission({
      mode: 'readwrite'
    });
    return p === 'granted';
  } catch {
    return false
  }
}

function setConnectionStatus(msg, type = '') {
  const el = $('#connectionStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'connection-status' + (type ? ' ' + type : '');
  el.hidden = !msg;
}
async function createFirstCodeForWorkspace() {
  return new Promise(resolve => {
    const card = document.querySelector('.connection-card');
    const old = card.querySelector('.first-pin-box');
    if (old) old.remove();

    $('#connectionHeading').textContent = 'Cr\u00e9er le code d\u2019acc\u00e8s';
    card.querySelector('.connection-actions').classList.add('hidden');
    const box = document.createElement('form');
    box.className = 'first-pin-box';
    box.noValidate = true;
    box.setAttribute('aria-labelledby', 'connectionHeading');
    box.innerHTML = `
      <div class="access-code-field">
        <label for="firstWorkspaceCode" class="access-code-label">Code d'acc\u00e8s<span>4 chiffres</span></label>
        <input id="firstWorkspaceCode" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="4 chiffres" autocomplete="new-password" aria-describedby="connectionStatus" required>
      </div>
      <div class="access-code-field">
        <label for="firstWorkspaceCode2" class="access-code-label">Confirmer le code</label>
        <input id="firstWorkspaceCode2" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="Saisir \u00e0 nouveau" autocomplete="new-password" aria-describedby="connectionStatus" required>
      </div>
      <button type="submit" class="primary access-submit" id="saveFirstWorkspaceCode"><span>Cr\u00e9er le code</span>${workspaceNavigationIcon('chevron-right')}</button>`;
    card.insertBefore(box, card.querySelector('.access-status-slot'));
    const inputs = [...box.querySelectorAll('input')],
      button = box.querySelector('button');
    inputs.forEach(input => input.oninput = () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 4);
      inputs.forEach(field => field.removeAttribute('aria-invalid'));
      setConnectionStatus('');
    });
    inputs[0].focus({
      preventScroll: true
    });

    box.onsubmit = async event => {
      event.preventDefault();
      if (button.disabled) return;
      const a = inputs[0].value,
        b = inputs[1].value;
      if (!/^\d{4}$/.test(a)) {
        inputs[0].setAttribute('aria-invalid', 'true');
        inputs[0].focus();
        setConnectionStatus('Le code doit contenir exactement 4 chiffres.', 'error');
        return
      }
      if (a !== b) {
        inputs[1].setAttribute('aria-invalid', 'true');
        inputs[1].focus();
        setConnectionStatus('Les deux codes ne correspondent pas.', 'error');
        return
      }
      button.disabled = true;
      box.setAttribute('aria-busy', 'true');
      button.querySelector('span').textContent = 'Enregistrement...';
      try {
        await rawPut('settings', {
          key: 'accessCodeHash',
          value: await hashAccessCode(a)
        });
        if (await setting('autoLockMinutes', null) === null) await rawPut('settings', {
          key: 'autoLockMinutes',
          value: 0
        });
        const saved = await writePortableFile();
        if (localServiceAvailable() && !saved) throw new Error(localWorkspaceError || 'Sauvegarde impossible. R\u00e9essaie.');
        box.remove();
        setConnectionStatus('Code cr\u00e9\u00e9 pour cette base.', 'ok');
        resolve(a);
      } catch (error) {
        setConnectionStatus(error.message || 'Enregistrement impossible.', 'error')
      } finally {
        if (box.isConnected) {
          button.disabled = false;
          box.removeAttribute('aria-busy');
          button.querySelector('span').textContent = 'Cr\u00e9er le code'
        }
      }
    };
  });
}
async function completeRequiredConnection() {
  await ensureSecuritySettings();
  connectedWorkspaceReady = true;
  $('#connectionGate').classList.add('hidden');
  resetPinUI();
  $('#lock').classList.remove('hidden');
  setTimeout(() => $('#lock').focus?.(), 0);
}
async function connectRequiredWorkspace() {
  setConnectionStatus('');

  if (localServiceAvailable()) {
    const result = await loadLocalWorkspace();
    if (!result) return;
    if (result === 'needs-code') await createFirstCodeForWorkspace();
    await completeRequiredConnection();
    return;
  }

  if (!('showDirectoryPicker' in window)) {
    openItwFilePicker();
    return;
  }

  try {
    setConnectionStatus('Autorisation de la base…');
    const directory = await window.showDirectoryPicker({
      mode: 'readwrite'
    });
    let perm = await directory.queryPermission({
      mode: 'readwrite'
    });
    if (perm !== 'granted') {
      perm = await directory.requestPermission({
        mode: 'readwrite'
      });
    }
    if (perm !== 'granted') {
      setConnectionStatus('Autorisation refusée.', 'error');
      return;
    }

    setConnectionStatus('Chargement de la base…');
    const connection = await readWorkspaceDirectory(directory);
    useWorkspaceDirectory(connection);
    await importPayloadToLocal(connection.payload);
    await rawPut('settings', {
      key: 'portableDirHandle',
      value: portableDirHandle
    });
    updateDataStatus('file', portableFileName);

    const hasCode = await ensureSecuritySettings();
    if (!hasCode) {
      setConnectionStatus('Cette base nécessite la création de son premier code.', 'ok');
      await createFirstCodeForWorkspace();
    }

    await saveDirectoryReference();
    setConnectionStatus('Base autorisée.', 'ok');
    await completeRequiredConnection();

  } catch (e) {
    console.error(e);

    if (e?.name === 'AbortError') {
      setConnectionStatus('Autorisation annulée.');
      return;
    }

    setConnectionStatus('Impossible de charger les bases : ' + (e?.message || 'erreur inconnue') + '.', 'error');
  }
}

async function connectWorkspaceFolder() {
  if (!portableSupported()) {
    appNotify('Cette fonction nécessite Microsoft Edge ou Google Chrome récent.');
    return;
  }
  try {
    const directory = await window.showDirectoryPicker({
      mode: 'readwrite'
    });
    const connection = await readWorkspaceDirectory(directory);
    if (!await appConfirm('Charger ces bases et remplacer la base locale actuelle ?')) return;
    useWorkspaceDirectory(connection);
    await loadPortableFile(false);
    updateDataStatus('file', portableFileName);
    closeModal();
  } catch (e) {
    if (e?.name !== 'AbortError') appNotify('Impossible d’autoriser le dossier : ' + e.message);
  }
}
async function reconnectSavedWorkspace() {
  if (localServiceAvailable()) return reloadLocalWorkspace();
  if (!portableDirHandle) return false;
  if (!await requestDirPermission()) return false;
  try {
    useWorkspaceDirectory(await readWorkspaceDirectory(portableDirHandle));
    await loadPortableFile(false);
    updateDataStatus('file', portableFileName);
    return true;
  } catch {
    updateDataStatus('error');
    return false;
  }
}
async function buildPortablePayload(options = {}) {
  if (options.regroup) await regroupLocalLibrary();
  const [items, folders, settings, activity] = await Promise.all([
    all('items'),
    all('folders'),
    all('settings'),
    all('activity')
  ]);
  return {
    version: 3,
    app: 'IT Workspace',
    updatedAt: now(),
    items,
    folders,
    settings: settings.filter(x => x.key !== 'portableDirHandle' && x.key !== 'portableFileHandle'),
    activity
  };
}

function schedulePortableSave() {
  if (db?.native) return;
  if (!workspaceCanWrite() || localWorkspaceConnection?.conflict) return;
  if (portableBusy) {
    portableSavePending = true;
    return
  }
  clearTimeout(portableSaveTimer);
  portableSaveTimer = setTimeout(() => {
    portableSaveTimer = null;
    writePortableFile()
  }, 500);
}
async function writePortableFile() {
  if (db?.native) return db.flush();
  if (localWorkspaceConnection) return writeLocalWorkspace();
  if (!portableFileHandle || portableBusy) return false;
  const fileHandle = portableFileHandle,
    directory = portableDirHandle,
    sectionHandles = new Map(portableSectionHandles),
    filename = portableFileName;
  clearTimeout(portableSaveTimer);
  portableBusy = true;
  portableSavePending = false;
  try {
    if (directory && !await requestDirPermission(directory)) {
      updateDataStatus('error');
      return false
    }
    if (fileHandle !== portableFileHandle) return false;
    const payload = await buildPortablePayload();
    if (fileHandle !== portableFileHandle) return false;
    const files = sectionHandles.size ? splitWorkspacePayload(payload) : new Map([
      [filename, payload]
    ]);
    for (const [name, part] of files) {
      let handle = fileHandle;
      if (sectionHandles.size && name !== WORKSPACE_CONFIG_FILE) {
        handle = await directory.getFileHandle(name, {
          create: true
        });
        if (fileHandle !== portableFileHandle) return false;
        portableSectionHandles.set(name, handle);
      }
      await writeItwPayload(handle, part);
    }
    updateDataStatus('file', portableFileName);
    return true;
  } catch (e) {
    updateDataStatus('error');
    return false;
  } finally {
    portableBusy = false;
    if (portableSavePending) {
      portableSavePending = false;
      schedulePortableSave()
    }
  }
}
async function clearStore(name) {
  if (db?.native) return db.batch([{
    action: 'clear',
    store: name
  }]);
  return new Promise((res, rej) => {
    const r = tx(name, 'readwrite').clear();
    r.onsuccess = () => {
      if (name === 'items' || name === 'folders') window.workspaceSearch?.invalidate();
      res()
    };
    r.onerror = () => rej(r.error);
  });
}

function normalizeItwText(text) {
  return String(text ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/^[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/, '')
    .trim();
}

function parseItwText(text) {
  const raw = normalizeItwText(text);
  if (!raw) throw new Error('Fichier vide');
  return validateItwPayload(JSON.parse(raw));
}

function validateItwPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Format ITW invalide');
  }
  for (const key of ['items', 'folders', 'settings', 'activity']) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      throw new Error(`Champ ${key} invalide`);
    }
  }
  return data;
}

async function parseItwFile(file) {
  return parseItwText(await file.text());
}

async function importPayloadToLocal(data) {
  data = structuredClone(validateItwPayload(data));
  if (typeof resetPrimaryWorkspaces === 'function') resetPrimaryWorkspaces();
  clearTimeout(portableSaveTimer);
  portableBusy = true;
  try {
    if (db?.native) {
      const operations = STORES.flatMap(store => [{
        action: 'clear',
        store
      }, ...(data[store] || []).map(record => ({
        action: 'put',
        store,
        record
      }))]);
      await db.batch(operations);
    } else await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES, 'readwrite');
      let failure;
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(failure || transaction.error);
      try {
        for (const store of STORES) {
          const records = transaction.objectStore(store);
          records.clear();
          for (const record of data[store] || []) records.put(record)
        }
      } catch (error) {
        failure = error;
        transaction.abort()
      }
    });
    window.workspaceSearch?.invalidate();
    resetSettingsCache(data.settings || []);
  } finally {
    portableBusy = false
  }
}

async function loadPortableFile(confirmReplace = false) {
  if (localServiceAvailable()) return reloadLocalWorkspace(confirmReplace);
  if (!portableFileHandle) return false;
  try {
    const connection = portableSectionHandles.size ? await readWorkspaceDirectory(portableDirHandle) : null;
    const data = connection ? connection.payload : await parseItwFile(await portableFileHandle.getFile());
    if (confirmReplace && !await appConfirm('Recharger les bases et remplacer la base locale actuelle ?')) return false;
    if (connection) useWorkspaceDirectory(connection);

    await importPayloadToLocal(data);
    if (portableDirHandle) await rawPut('settings', {
      key: 'portableDirHandle',
      value: portableDirHandle
    });

    await ensureSecuritySettings();
    if (sessionAccessCode && await verifyAccessCode(sessionAccessCode)) {
      state.vaultKey = await deriveVaultKey(sessionAccessCode);
      updateDataStatus(currentDataStatusState(), portableFileName);
      if (!$('#app').classList.contains('hidden')) openSection('library');
      return true;
    }
    updateDataStatus(currentDataStatusState(), portableFileName);
    if (!$('#app').classList.contains('hidden')) lockApplication();
    return true;
  } catch (e) {
    portableBusy = false;
    updateDataStatus('error');
    appNotify('Les bases ITW sont invalides ou inaccessibles : ' + e.message);
    return false;
  }
}

function rawPut(store, obj) {
  if (db?.native) return db.batch([{
    action: 'put',
    store,
    record: obj
  }]);
  return new Promise((res, rej) => {
    const r = tx(store, 'readwrite').put(obj);
    r.onsuccess = () => {
      if (store === 'settings') settingsCache.set(obj.key, obj.value);
      if (store === 'items' || store === 'folders') window.workspaceSearch?.invalidate(store, obj);
      res(obj)
    };
    r.onerror = () => rej(r.error);
  });
}

function showPortableDataDialog() {
  document.querySelector('#folderMenu')?.remove();
  const menu = document.createElement('div');
  menu.id = 'folderMenu';
  menu.className = 'folder-menu';
  const connected = workspaceCanWrite();
  const loaded = portableReadOnly && !connected;
  menu.innerHTML = `
    <h4>Base portable</h4>
    <div class="folder-access-state ${connected||loaded?'connected':''}">
      <span class="dot"></span>
      <span>${connected?'Bases connectées':loaded?'Bases chargées':'Aucun dossier autorisé'}</span>
    </div>
    <div class="folder-menu-note" style="margin-top:8px">
      Dossier des bases : <b>donnees</b>.
      Une fois autorisé, l’application réutilise ce dossier automatiquement tant que le navigateur conserve la permission.
    </div>
    <div class="actions">
      ${localServiceAvailable()?'':`<button class="primary" data-wg-click="connectWorkspaceFolder()">Choisir le dossier</button>`}
      ${connected?`<button class="secondary" data-wg-click="reconnectSavedWorkspace()">Recharger la base</button>
      <button class="secondary" data-wg-click="writePortableFile()">Sauvegarder</button>`:''}
    </div>`;
  document.body.appendChild(menu);
  setTimeout(() => {
    const close = e => {
      if (!menu.contains(e.target) && e.target.id !== 'dataStatus') {
        menu.remove();
        document.removeEventListener('click', close)
      }
    };
    document.addEventListener('click', close);
  }, 0);
}

async function exportDB() {
  if (db?.native) {
    await db.flush();
    const path = await desktopBridge.call('backup.save');
    if (path) {
      await setSetting('lastBackup', now());
      appNotify('Sauvegarde SQLite cr\u00e9\u00e9e.')
    }
    return;
  }
  await regroupLocalLibrary();
  const exportedAt = now();
  await setSetting('lastBackup', exportedAt);
  const payload = {
    ...await buildPortablePayload(),
    exportedAt
  };
  const b = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'IT-Workspace-Backup.itw';
  a.click();
  URL.revokeObjectURL(a.href);
  if (state.section === 'library' && !state.item) setTimeout(() => openSection('library'), 50);
}
async function importDB(selection) {
  if (!selection || selection.length === 0) return;
  try {
    const {
      payload: data
    } = await readSelectedWorkspaceFiles(selection);
    if (!await appConfirm('Remplacer la base locale actuelle ?')) return;
    await importPayloadToLocal(data);
    await setSetting('lastBackup', data.exportedAt || now());
    await ensureSecuritySettings();
    closeModal();
    appNotify('Base importée. Saisis maintenant le code correspondant à cette base.');
    lockApplication();
  } catch (error) {
    appNotify('Import impossible : ' + error.message)
  }
}

async function connectRequiredWorkspaceFromFile(selection) {
  try {
    const {
      payload: data,
      name
    } = await readSelectedWorkspaceFiles(selection);
    portableDirHandle = null;
    portableFileHandle = null;
    portableSectionHandles = new Map();
    portableReadOnly = true;
    portableFileName = name;

    setConnectionStatus('Chargement de la base…');
    await importPayloadToLocal(data);
    updateDataStatus('loaded', portableFileName);

    let hasCode = await ensureSecuritySettings();
    if (!hasCode) {
      setConnectionStatus('Cette base nécessite la création de son premier code.', 'ok');
      await createFirstCodeForWorkspace();
    }

    setConnectionStatus('Base chargée.', 'ok');
    await completeRequiredConnection();
  } catch (e) {
    console.error(e);
    setConnectionStatus('Impossible de charger cette base ITW : ' + (e?.message || 'erreur inconnue') + '.', 'error');
  }
}

function openItwFilePicker() {
  setConnectionStatus('Sélectionne les sept fichiers ITW du dossier donnees, ou une sauvegarde complète.');

  const old = document.getElementById('itwNativePicker');
  if (old) old.remove();

  const input = document.createElement('input');
  input.id = 'itwNativePicker';
  input.type = 'file';
  input.accept = '.itw,.json,application/json';
  input.multiple = true;
  input.style.position = 'fixed';
  input.style.left = '0';
  input.style.bottom = '0';
  input.style.width = '1px';
  input.style.height = '1px';
  input.style.opacity = '0.001';
  input.style.zIndex = '-1';
  document.body.appendChild(input);

  input.onchange = async () => {
    const files = Array.from(input.files || []);
    input.remove();
    if (!files.length) {
      setConnectionStatus('Aucun fichier sélectionné.');
      return;
    }
    await connectRequiredWorkspaceFromFile(files);
  };

  // Important: Firefox exposes showPicker() differently depending on version.
  // Never chain .catch() on it because it may return undefined.
  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.click();
    }
  } catch (e) {
    try {
      input.click();
    } catch (e2) {
      console.error(e2);
      input.remove();
      setConnectionStatus('Impossible d’ouvrir le sélecteur de base.', 'error');
    }
  }
}
