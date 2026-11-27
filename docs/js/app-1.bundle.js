/* js/data/modules.js */
'use strict';

// Shared record types describe the database even when a feature module is absent.
const LIBRARY_TYPES = ['memo', 'procedure', 'personal', 'command', 'mail', 'report', 'template'];
const LIBRARY_SECTIONS = ['library', 'memo', 'personal', 'command', 'template'];
const LIBRARY_FACETS = {
  memo: 'Mémo',
  command: 'Commandes',
  template: 'Modèle',
  reference: 'Fiche'
};

function libraryFacets() {
  return Object.keys(LIBRARY_FACETS);
}

const SCAN_WORKSPACE_KINDS={'scan-passive':'passive','scan-active':'active','scan-map':'map','scan-vulnerability':'vulnerability'};
function isScanSection(section) { return Object.hasOwn(SCAN_WORKSPACE_KINDS,section); }

const SECURITY_WORKSPACE_ACTIONS = ['agents', ...Object.keys(SCAN_WORKSPACE_KINDS), 'edr', 'remote'];
function isSecurityWorkspace(section) { return section === 'security' || SECURITY_WORKSPACE_ACTIONS.includes(section); }
const PRIMARY_WORKSPACE_SECTIONS = ['library', 'vault', 'tools', 'security'];

const workspaceModules = (() => {
  const installed = new Set(window.__BIBLIOTHEQUE_DESKTOP__?.modules ?? ['memo', 'tools', 'vault']);
  const has = id => installed.has(id);
  const allows = section => section === 'security' ? SECURITY_WORKSPACE_ACTIONS.some(allows) : section !== 'chatbot' && (!window.WolfGuardAccess||WolfGuardAccess.allows(section))&&(section === 'modules' || (section === 'vault' ? has('vault') : section === 'home' || LIBRARY_SECTIONS.includes(section) ? has('memo') : has('tools')));
  return {
    has,
    allows,
    get canSwitch() {
      return PRIMARY_WORKSPACE_SECTIONS.filter(allows).length > 1;
    },
    get landingSection() {
      return has('memo')&&allows('library')?'library':has('tools')&&allows('tools')?'tools':PRIMARY_WORKSPACE_SECTIONS.find(allows)||'modules';
    },
    allowsItem: item => !item.consolidatedInto && item.type !== 'task' && allows(['vault', 'protocol'].includes(item.type) ? item.type : 'library')
  };
})();

const pendingWorkspaceModules = new Set();
let moduleImportBusy = false;

function syncModuleImportButtons() {
  document.querySelectorAll('[data-import-section]').forEach(button => {
    button.disabled = !desktopBridge.available || moduleImportBusy || pendingWorkspaceModules.has(button.dataset.importSection);
  });
}

async function importWorkspaceModule(button, id = null) {
  if (!desktopBridge.available) return;
  if (moduleImportBusy || id && pendingWorkspaceModules.has(id)) return;
  moduleImportBusy = true;
  syncModuleImportButtons();
  const setStatus = message => document.querySelectorAll('[data-module-status]').forEach(status => status.textContent = message);
  try {
    const result = await desktopBridge.call('modules.import', id ? {
      id
    } : {});
    if (result) {
      pendingWorkspaceModules.add(result.id);
      document.querySelectorAll('[data-module-id="' + result.id + '"] [data-module-state]').forEach(status => status.textContent = 'Prêt après relance');
      setStatus(result.name + ' importé. Fermez puis relancez WolfGuard pour utiliser cette section.');
    }
  } catch (error) {
    setStatus(error.message);
  } finally {
    moduleImportBusy = false;
    syncModuleImportButtons();
  }
}

function moduleManagerHTML() {
  return '<div class="workspace-modules"><h2>Importer une section</h2><p>Choisissez Mémo ou Outils. Les outils comprennent les deux espaces de scan.</p><div class="workspace-module-options">' + [
    ['memo', 'Mémo', 'Fiches, dossiers et éditeur.', 'library'],
    ['tools', 'Outils', 'Analyse IP, ports, scans et vérification de fichiers.', 'tools']
  ].filter(([id]) => !window.__BIBLIOTHEQUE_DESKTOP__?.availableSections || window.__BIBLIOTHEQUE_DESKTOP__.availableSections.includes(id)).map(([id, name, description, palette]) => '<div class="workspace-module-option" data-module-id="' + id + '" style="--module-accent:var(--workspace-' + palette + ')"><strong>' + name + '</strong><p>' + description + '</p><span data-module-state>' + (pendingWorkspaceModules.has(id) ? 'Prêt après relance' : workspaceModules.has(id) ? 'Installé' : 'Non installé') + '</span><button type="button" class="secondary" data-import-section="' + id + '" data-wg-click="importWorkspaceModule(this,\'' + id + '\')" ' + (!desktopBridge.available || moduleImportBusy || pendingWorkspaceModules.has(id) ? 'disabled' : '') + '>Importer ' + name + '</button></div>').join('') + '</div><button type="button" class="secondary" data-import-section="" data-wg-click="importWorkspaceModule(this)" ' + (!desktopBridge.available || moduleImportBusy ? 'disabled' : '') + '>Importer depuis un fichier…</button><p data-module-status role="status" aria-live="polite">' + (pendingWorkspaceModules.size ? 'Les sections importées seront disponibles après la relance de WolfGuard.' : 'Les changements prennent effet à la prochaine ouverture de WolfGuard.') + '</p></div>';
}

function renderModulesWorkspace() {
  if(window.WolfGuardAccess?.restricted()&&!PRIMARY_WORKSPACE_SECTIONS.some(section=>workspaceModules.allows(section))){$('#content').innerHTML='<section class="permission-empty"><h2>Votre compte est prêt</h2><p>Aucun espace ne vous a encore été attribué. Demandez au propriétaire de vous accorder les droits nécessaires.</p><button type="button" class="secondary" data-wg-click="openSettings()">Paramètres et sécurité</button></section>';return;}
  $('#content').innerHTML = moduleManagerHTML();
  $('#app').classList.add('modules-only');
}

;
/* js/core.js */
'use strict';

const DEFAULT_ACCESS_CODE = '2006';
const DB_NAME = 'it_workspace_db_v2';
const DB_VERSION = 1;
const STORES = ['items', 'folders', 'settings', 'activity'];
let db;
let pin = '';
let sessionAccessCode = '';
let autoLockTimer = null;
let connectedWorkspaceReady = false;
let state = {
  section: workspaceModules.landingSection,
  folder: null,
  item: null,
  mode: 'view',
  vaultKey: null
};
let dragState = {
  kind: null,
  id: null
};
let selectedEditorImage = null;
const expandedFolders = new Set();
let explorerScrollTop = 0;
let portableFileHandle = null;
let portableDirHandle = null;
let portableSectionHandles = new Map();
let portableReadOnly = false;
let portableSaveTimer = null;
let portableBusy = false;
let portableSavePending = false;
let portableFileName = 'Bases par section';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
} [m]));
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const timestamp = value => {
  const result = Date.parse(value || '');
  return Number.isFinite(result) ? result : 0
};
const typeLabel = t => ({
  vault: 'Coffre-fort',
  setting: 'Paramètre',
  memo: 'Fiche',
  personal: 'Note',
  procedure: 'Procédure',
  protocol: 'Protocole',
  command: 'Commande',
  mail: 'Mail',
  report: 'Rapport / Procédure',
  template: 'Template'
})[t] || t;
const storageSectionForItem = item => item.type === 'vault' ? 'vault' : item.type === 'command' ? 'command' : item.type === 'protocol' ? 'protocol' : item.type === 'personal' ? 'personal' : ['memo', 'procedure'].includes(item.type) ? 'memo' : 'template';

const sectionForItem = item => ['vault', 'protocol'].includes(item.type) ? item.type : 'library';

const isDeleted = x => !!x?.deletedAt;
async function activeItems() {
  return (await all('items')).filter(x => !isDeleted(x) && !x.consolidatedInto)
}
async function activeFolders() {
  return (await all('folders')).filter(x => !isDeleted(x) && !x.consolidatedFolder)
}

;
/* js/desktop.js */
'use strict';

const desktopBridge = (() => {
  const available = !!(window.__BIBLIOTHEQUE_DESKTOP__ && window.chrome?.webview),
    pending = new Map(),
    listeners = new Map();
  let sequence = 0;
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    if (!available) {
      reject(new Error('Application Windows requise.'));
      return
    }
    const id = String(++sequence);
    pending.set(id, {
      resolve,
      reject
    });
    window.chrome.webview.postMessage({
      id,
      method,
      params
    });
  });
  if (available) document.documentElement.classList.add('desktop-client');
  if (available) window.chrome.webview.addEventListener('message', async event => {
    const message = event.data;
    if (message.event === 'scan.progress') {
      for (const listener of listeners.get(message.event) || []) listener(message.result);
      return;
    }
    if (message.event === 'closing') {
      appMessages.dismiss();
      if (appHasUnsavedChanges() && !await appConfirm('Fermer sans enregistrer les modifications en cours ?')) {
        call('app.cancelClose').catch(() => {});
        return
      }
      if (typeof resetScanTool === 'function') resetScanTool();
      document.body.inert = true;
      try {
        if (db?.native) await db.flush();
        call('app.readyToClose').catch(() => {})
      } catch (error) {
        document.body.inert = false;
        call('app.cancelClose').catch(() => {});
        appNotify('Enregistrement impossible : ' + error.message)
      }
      return;
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.ok) request.resolve(message.result);
    else request.reject(new Error(message.error));
  });
  const on = (event, listener) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(listener);
    return () => listeners.get(event)?.delete(listener)
  };
  return {
    available,
    call,
    on
  };
})();

function activeEditorHasUnsavedChanges() {
  return state.mode === 'edit' && $('#detailHost')?.dataset.editorDirty === 'true'
}

function appHasUnsavedChanges() {
  return activeEditorHasUnsavedChanges() || hasParkedMemoDraft()
}

async function confirmDiscardChanges() {
  if ($('#detailHost')?.dataset.saving === 'true') { appNotify('Enregistrement en cours. Patientez un instant.'); return false; }
  return !activeEditorHasUnsavedChanges() || await appConfirm('Quitter cette fiche sans enregistrer les modifications ?')
}
document.addEventListener('input', event => {
  if (state.mode === 'edit' && event.target.closest('#detailHost')) $('#detailHost').dataset.editorDirty = 'true'
});
if (desktopBridge.available) window.addEventListener('unhandledrejection', event => {
  event.preventDefault();
  appNotify('Op\u00e9ration impossible : ' + (event.reason?.message || 'Erreur de stockage.'), {kind: 'error'});
});

class DesktopDatabase {
  constructor(snapshot) {
    this.native = true;
    this.queue = Promise.resolve();
    this.replace(snapshot)
  }
  replace(snapshot) {
    if (typeof resetPrimaryWorkspaces === 'function') resetPrimaryWorkspaces();
    this.databaseFiles = structuredClone(snapshot.databaseFiles || []);
    this.stores = new Map(STORES.map(store => [store, new Map((snapshot[store] || []).map(record => [store === 'settings' ? record.key : record.id, record]))]))
  }
  storageFiles() {
    const items = [...this.stores.get('items').values()];
    return this.databaseFiles.map(file => ({...file, itemCount: this.databaseFiles.length === 1 ? items.length : items.filter(item => (item.type === 'vault' ? 'vault' : item.type === 'protocol' ? 'tools' : 'memo') === file.id).length}));
  }
  async get(store, id) {
    await this.queue;
    const record = this.stores.get(store)?.get(id);
    return record ? structuredClone(record) : undefined
  }
  async all(store) {
    await this.queue;
    return structuredClone([...this.stores.get(store).values()])
  }
  async readOnly(store) {
    await this.queue;
    return [...this.stores.get(store).values()]
  }
  batch(operations) {
    const records = structuredClone(operations),
      run = this.queue.then(async () => {
        const changed = await desktopBridge.call('db.batch', {
          operations: records
        });
        for (const operation of records) {
          const store = this.stores.get(operation.store);
          if (operation.action === 'put') store.set(operation.store === 'settings' ? operation.record.key : operation.record.id, operation.record);
          else if (operation.action === 'delete') store.delete(operation.id);
          else if (operation.action === 'clear') store.clear();
        }
        for (const [name, list] of Object.entries(changed)) this.stores.set(name, new Map(list.map(record => [name === 'settings' ? record.key : record.id, record])));
        resetSettingsCache([...this.stores.get('settings').values()]);
        for (const operation of records)
          if (['items', 'folders'].includes(operation.store)) window.workspaceSearch?.invalidate(operation.store, operation.record);
        return true;
      });
    this.queue = run.catch(() => {});
    return run;
  }
  deleteItem(id) {
    const run = this.queue.then(async () => {
      const changed = await desktopBridge.call('db.deleteItem', {
        id
      });
      this.stores.get('items').delete(id);
      for (const record of changed.items) this.stores.get('items').set(record.id, record);
      this.stores.set('activity', new Map(changed.activity.map(record => [record.id, record])));
      window.workspaceSearch?.invalidate();
    });
    this.queue = run.catch(() => {});
    return run;
  }
  updateItem(id, update) {
    const run = this.queue.then(async () => {
      const source = this.stores.get('items').get(id);
      if (!source || isDeleted(source)) return null;
      const record = structuredClone(source);
      update(record);
      await desktopBridge.call('db.batch', {
        operations: [{
          action: 'put',
          store: 'items',
          record
        }]
      });
      this.stores.get('items').set(id, record);
      window.workspaceSearch?.invalidate('items', record);
      return record;
    });
    this.queue = run.catch(() => {});
    return run;
  }
  async flush() {
    await this.queue;
    return desktopBridge.call('db.flush')
  }
}

;
/* js/data/database.js */
'use strict';

/* DB */
const SETTINGS_CACHE_MISS = Symbol('settings-cache-miss');
const settingsCache = new Map();

function resetSettingsCache(records = null) {
  settingsCache.clear();
  if (records)
    for (const record of records)
      if (record?.key) settingsCache.set(record.key, record.value);
}

function openDB() {
  if (desktopBridge.available) return desktopBridge.call('db.snapshot').then(snapshot => {
    db = new DesktopDatabase(snapshot);
    resetSettingsCache(snapshot.settings);
    return db
  });
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('items')) d.createObjectStore('items', {
        keyPath: 'id'
      });
      if (!d.objectStoreNames.contains('folders')) d.createObjectStore('folders', {
        keyPath: 'id'
      });
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', {
        keyPath: 'key'
      });
      if (!d.objectStoreNames.contains('activity')) d.createObjectStore('activity', {
        keyPath: 'id'
      });
    };
    r.onsuccess = () => {
      db = r.result;
      resolve(db)
    };
    r.onerror = () => reject(r.error);
  });
}

function tx(s, m = 'readonly') {
  return db.transaction(s, m).objectStore(s)
}

function put(s, o) {
  if (db?.native) return db.batch([{
    action: 'put',
    store: s,
    record: o
  }]).then(() => o);
  return new Promise((res, rej) => {
    const r = tx(s, 'readwrite').put(o);
    r.onsuccess = () => {
      if (s === 'settings') settingsCache.set(o.key, o.value);
      if (s === 'items' || s === 'folders') window.workspaceSearch?.invalidate(s, o);
      schedulePortableSave();
      res(o)
    };
    r.onerror = () => rej(r.error);
  })
}

function readForDisplay(store, id) {
  if (db?.readForDisplay) return db.readForDisplay(store, id);
  return id === undefined ? all(store) : get(store, id);
}

function get(s, k) {
  if (db?.native) return db.get(s, k);
  return new Promise((res, rej) => {
    const r = tx(s).get(k);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error)
  })
}

function updateItemRecord(id, update) {
  if (db?.native) return db.updateItem(id, update);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('items', 'readwrite'),
      store = transaction.objectStore('items'),
      request = store.get(id);
    let record = null,
      failure = null;
    request.onsuccess = () => {
      try {
        if (request.result && !isDeleted(request.result)) {
          record = request.result;
          update(record);
          store.put(record)
        }
      } catch (error) {
        failure = error;
        transaction.abort()
      }
    };
    transaction.oncomplete = () => {
      if (record) {
        window.workspaceSearch?.invalidate('items', record);
        schedulePortableSave()
      }
      resolve(record)
    };
    transaction.onabort = () => reject(failure || transaction.error || new Error('Item update aborted.'));
    transaction.onerror = () => {
      failure ??= transaction.error
    };
  });
}

function all(s) {
  if (db?.native) return db.all(s);
  return new Promise((res, rej) => {
    const r = tx(s).getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error)
  })
}

function deleteItemRecord(id) {
  if (db?.native) return db.deleteItem(id);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('items', 'readwrite'),
      store = transaction.objectStore('items'),
      request = store.getAll();
    let failure = null;
    request.onsuccess = () => {
      try {
        for (const record of request.result) {
          if (record.id === id) continue;
          const previous = itemLinkIds(record),
            next = previous.filter(target => target !== id);
          if (next.length !== previous.length) {
            record.linkedItemIds = next;
            record.updatedAt = now();
            store.put(record)
          }
        }
        store.delete(id);
      } catch (error) {
        failure = error;
        transaction.abort()
      }
    };
    transaction.oncomplete = () => {
      window.workspaceSearch?.invalidate();
      schedulePortableSave();
      resolve()
    };
    transaction.onabort = () => reject(failure || transaction.error || new Error('Item deletion aborted.'));
    transaction.onerror = () => {
      failure ??= transaction.error
    };
  });
}

function del(s, k) {
  if (s === 'items') return deleteItemRecord(k);
  if (db?.native) return db.batch([{
    action: 'delete',
    store: s,
    id: k
  }]);
  return new Promise((res, rej) => {
    const r = tx(s, 'readwrite').delete(k);
    r.onsuccess = () => {
      if (s === 'settings') settingsCache.delete(k);
      if (s === 'items' || s === 'folders') window.workspaceSearch?.invalidate();
      schedulePortableSave();
      res()
    };
    r.onerror = () => rej(r.error);
  })
}
async function setting(k, d = null) {
  if (settingsCache.has(k)) {
    const value = settingsCache.get(k);
    return value === SETTINGS_CACHE_MISS ? d : value;
  }
  const x = await get('settings', k);
  settingsCache.set(k, x ? x.value : SETTINGS_CACHE_MISS);
  return x ? x.value : d;
}
async function setSetting(k, v) {
  await put('settings', {
    key: k,
    value: v
  })
}
async function logActivity(item) {
  if (!item) return;
  if (db?.native) {
    const activity = (await all('activity')).sort((a, b) => b.at.localeCompare(a.at));
    await db.batch([{
      action: 'put',
      store: 'activity',
      record: {
        id: uid(),
        itemId: item.id,
        title: item.title || '',
        type: item.type,
        at: now()
      }
    }, ...activity.slice(79).map(record => ({
      action: 'delete',
      store: 'activity',
      id: record.id
    }))]);
    return;
  }
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('activity', 'readwrite'),
      store = transaction.objectStore('activity'),
      request = store.getAll();
    let failure = null;
    transaction.oncomplete = () => {
      schedulePortableSave();
      resolve()
    };
    transaction.onabort = () => reject(failure || transaction.error || new Error('Activity log aborted.'));
    transaction.onerror = () => {
      failure ??= transaction.error
    };
    request.onsuccess = () => {
      try {
        const record = {
          id: uid(),
          itemId: item.id,
          title: item.title || '',
          type: item.type,
          at: now()
        };
        const records = [record, ...(request.result || [])].sort((a, b) => b.at.localeCompare(a.at));
        store.put(record);
        for (const entry of records.slice(80)) store.delete(entry.id);
      } catch (error) {
        failure = error;
        transaction.abort()
      }
    };
  });
}

;
/* js/security.js */
'use strict';

const PIN_FAILURE_LIMIT = 3;
const PIN_LOCKOUT_MS = 60000;
let pinBusy = false;
let pinAttempt = 0;
let pinResetTimer = null;
let pinFailures = 0;
let pinBlockedUntil = 0;
let pinStateKey = '';
let pinLockoutTimer = null;
let accessSessionKey = null, accessSessionDeadline = 0;

function pinIsBlocked() {
  return pinBlockedUntil > Date.now()
}

function savePinAttemptState() {
  if (!pinStateKey) return;
  try {
    if (!pinFailures && !pinBlockedUntil) localStorage.removeItem(pinStateKey);
    else localStorage.setItem(pinStateKey, JSON.stringify({
      failures: pinFailures,
      blockedUntil: pinBlockedUntil
    }));
  } catch {}
}

function loadPinAttemptState() {
  if (!pinStateKey) return;
  try {
    const saved = JSON.parse(localStorage.getItem(pinStateKey) || '{}');
    pinFailures = Number.isInteger(saved?.failures) ? Math.max(0, Math.min(PIN_FAILURE_LIMIT, saved.failures)) : 0;
    pinBlockedUntil = Number.isFinite(saved?.blockedUntil) ? Math.max(0, saved.blockedUntil) : 0;
    if (pinBlockedUntil > Date.now() + PIN_LOCKOUT_MS) {
      pinBlockedUntil = Date.now() + PIN_LOCKOUT_MS;
      savePinAttemptState()
    }
    if (pinFailures === PIN_FAILURE_LIMIT && !pinBlockedUntil) pinFailures = 0;
  } catch {}
}

function refreshPinLockout() {
  clearTimeout(pinLockoutTimer);
  pinLockoutTimer = null;
  const error = $('#lockError');
  if (pinBlockedUntil && pinBlockedUntil <= Date.now()) {
    pinFailures = 0;
    pinBlockedUntil = 0;
    savePinAttemptState();
  }
  if (pinIsBlocked()) {
    error.dataset.pinLockout = 'true';
    error.textContent = 'Trop d\u2019essais. R\u00e9essaie dans ' + Math.ceil((pinBlockedUntil - Date.now()) / 1000) + ' s.';
    pinLockoutTimer = setTimeout(refreshPinLockout, Math.min(1000, pinBlockedUntil - Date.now()));
  } else if (error.dataset.pinLockout) {
    delete error.dataset.pinLockout;
    error.textContent = '';
  }
  setPinBusy(pinBusy);
}

function usePinAttemptState(hash) {
  const key = hash ? 'itw-pin-attempts:' + hash : '';
  if (key !== pinStateKey) {
    pinStateKey = key;
    pinFailures = 0;
    pinBlockedUntil = 0
  }
  loadPinAttemptState();
  refreshPinLockout();
}

function recordPinFailure() {
  loadPinAttemptState();
  refreshPinLockout();
  if (!pinIsBlocked()) {
    pinFailures++;
    if (pinFailures >= PIN_FAILURE_LIMIT) {
      pinBlockedUntil = Date.now() + PIN_LOCKOUT_MS;
      pin = '';
      document.querySelectorAll('#pinDots .dot').forEach(dot => dot.classList.remove('on'));
    }
    savePinAttemptState();
    refreshPinLockout();
  }
}

function clearPinAttemptState() {
  pinFailures = 0;
  pinBlockedUntil = 0;
  savePinAttemptState();
  refreshPinLockout();
}
window.addEventListener('storage', event => {
  if (!pinStateKey || (event.key !== pinStateKey && event.key !== null)) return;
  loadPinAttemptState();
  if (pinIsBlocked() && !$('#lock').classList.contains('hidden')) lockApplication();
  else refreshPinLockout();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    loadPinAttemptState();
    refreshPinLockout()
  }
});

function setPinBusy(busy) {
  pinBusy = busy;
  $('#lock').setAttribute('aria-busy', String(busy));
  document.querySelectorAll('#keypad button').forEach(button => {
    button.disabled = busy || pinIsBlocked()
  });
}
async function hashAccessCode(code) {
  const out = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ITW_ACCESS|' + String(code)));
  return [...new Uint8Array(out)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function ensureSecuritySettings() {
  const [h, autoLock] = await Promise.all([setting('accessCodeHash', null), setting('autoLockMinutes', null)]);
  if (autoLock === null) await setSetting('autoLockMinutes', 0);
  usePinAttemptState(h);
  return !!h;
}
async function verifyAccessCode(code) {
  const saved = await setting('accessCodeHash', null);
  if (!saved) return false;
  return (await hashAccessCode(code)) === saved;
}

function resetPinUI() {
  pinAttempt++;
  clearTimeout(pinResetTimer);
  pinResetTimer = null;
  unlockTransition.cancel();
  sectionTransition.cancel();
  setPinBusy(false);
  pin = '';
  document.querySelectorAll('#pinDots .dot').forEach(d => d.classList.remove('on'));
  const err = $('#lockError');
  if (err) err.textContent = '';
  refreshPinLockout();
}

function lockApplication() {
  accessSessionKey = null; accessSessionDeadline = 0;
  window.remoteDesktopWorkspace?.reset();
    if(typeof agentsWorkspace!=='undefined')agentsWorkspace.reset();
  appMessages.dismiss();
  resetPrimaryWorkspaces();
  window.workspaceSearch?.reset();
  resetCollectionSearch();
  if (typeof resetNetworkTools === 'function') resetNetworkTools();
  if (typeof resetScanTool === 'function') resetScanTool();
  clearTimeout(autoLockTimer);
  autoLockTimer = null;
  sessionAccessCode = '';
  state.vaultKey = null;
  state.section = workspaceModules.landingSection;
  state.item = null;
  state.folder = null;
  state.mode = 'view';
  $('#content').replaceChildren();
  resetPinUI();
  closeModal();
  closeContextMenu();
  $('#app').classList.add('hidden');
  if (connectedWorkspaceReady) {
    $('#connectionGate').classList.add('hidden');
    $('#lock').classList.remove('hidden');
  } else {
    $('#lock').classList.add('hidden');
    $('#connectionGate').classList.remove('hidden');
  }
}
async function scheduleAutoLock() {
  clearTimeout(autoLockTimer);
  autoLockTimer = null;
  if ($('#app').classList.contains('hidden') || !state.vaultKey) return;
  accessSessionKey = state.vaultKey;
  accessSessionDeadline = performance.now() + 4 * 60 * 60 * 1000;
  autoLockTimer = setTimeout(lockApplication, Math.max(1,accessSessionDeadline-performance.now()));
}

function registerActivityForAutoLock() {
  ['mousedown', 'keydown', 'touchstart', 'wheel', 'pointermove'].forEach(ev => {
    document.addEventListener(ev, event => {
      if (event.isTrusted && !$('#app').classList.contains('hidden')) {
        if(accessSessionKey===state.vaultKey&&accessSessionDeadline&&performance.now()>=accessSessionDeadline)lockApplication();
        else scheduleAutoLock();
      }
    }, {
      passive: true
    });
  });
}
async function encryptBlobWithKey(text, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(text || '');
  try {
    const out = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,data));
    return {iv:[...iv],data:[...out]};
  } finally { data.fill(0); }
}
async function decryptBlobWithKey(blob, key) {
  if (!blob) return '';
  const out = await crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: new Uint8Array(blob.iv)
    },
    key,
    new Uint8Array(blob.data)
  );
  const bytes=new Uint8Array(out);
  try { return new TextDecoder('utf-8',{fatal:true}).decode(bytes); }
  finally { bytes.fill(0); }
}
async function changeAccessCode() {
  const oldCode = $('#oldAccessCode')?.value || '';
  const newCode = $('#newAccessCode')?.value || '';
  const confirmCode = $('#confirmAccessCode')?.value || '';

  if (!/^\d{4}$/.test(oldCode) || !/^\d{4}$/.test(newCode)) {
    appNotify('Le code doit contenir exactement 4 chiffres.', {kind: 'error'});
    return;
  }
  if (newCode !== confirmCode) {
    appNotify('Les deux nouveaux codes ne correspondent pas.', {kind: 'error'});
    return;
  }
  if (!await verifyAccessCode(oldCode)) {
    appNotify('Ancien code incorrect.', {kind: 'error'});
    return;
  }
  if (oldCode === newCode) {
    appNotify('Le nouveau code est identique à l’ancien.', {kind: 'error'});
    return;
  }

  const oldKey = await deriveVaultKey(oldCode);
  const newKey = await deriveVaultKey(newCode);
  const vaultItems = (await all('items')).filter(x => x.type === 'vault');

  if (!await appConfirm(`Changer le code et rechiffrer ${vaultItems.length} fiche(s) du coffre ?`)) return;

  try {
    portableBusy = true;
    const changes = [];
    for (const x of vaultItems) {
      if (x.vaultBlobEnc) {
        const clear = await decryptBlobWithKey(x.vaultBlobEnc, oldKey);
        x.vaultBlobEnc = await encryptBlobWithKey(clear, newKey);
      }
      if (x.passwordEnc) {
        const clear = await decryptBlobWithKey(x.passwordEnc, oldKey);
        x.passwordEnc = await encryptBlobWithKey(clear, newKey);
      }
      if (db?.native) changes.push({
        action: 'put',
        store: 'items',
        record: x
      });
      else await rawPut('items', x);
    }
    const accessRecord = {
      key: 'accessCodeHash',
      value: await hashAccessCode(newCode)
    };
    if (db?.native) await db.batch([...changes, {
      action: 'put',
      store: 'settings',
      record: accessRecord
    }]);
    else await rawPut('settings', accessRecord);
    await ensureSecuritySettings();
    portableBusy = false;

    sessionAccessCode = newCode;
    state.vaultKey = newKey;
    const saved = await writePortableFile();
    if (localServiceAvailable() && !saved) {
      appNotify('Le nouveau code et le coffre rechiffre restent dans ce navigateur. Sauvegarde ou exporte cette base avant de fermer.');
      return;
    }
    closeModal();
    appNotify('Code d’accès modifié. Le coffre a été rechiffré.');
    await scheduleAutoLock();
  } catch (e) {
    portableBusy = false;
    console.error(e);
    appNotify('Le changement de code a échoué. Aucune modification complète n’a été validée.', {kind: 'error'});
  }
}

async function resetInterfaceSettings() {
  if (!await appConfirm('Réinitialiser uniquement les réglages d’interface ? Les données ne seront pas supprimées.')) return;
  localStorage.removeItem('itw-explorer-width');
  localStorage.removeItem(interfacePreferenceKey());applyInterfacePreferences({});
  expandedFolders.clear();
  document.documentElement.style.setProperty('--explorer-width', '260px');
  closeModal();
  renderWorkspace();
}

function initPin() {
  $('#pinDots').innerHTML = Array.from({
    length: 4
  }, () => '<span class="dot"></span>').join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'C'];
  $('#keypad').innerHTML = keys.map(k => `<button type="button" class="key" data-key="${k}" ${/^\d$/.test(k)?'':`title="${k==='C'?'Effacer le code':'Effacer le dernier chiffre'}" aria-label="${k==='C'?'Effacer le code':'Effacer le dernier chiffre'}"`}>${k==='C'?settingsIcon('rotate-ccw'):k}</button>`).join('');
  $('#keypad').onclick = e => {
    const b = e.target.closest('[data-key]');
    if (b) pinKey(b.dataset.key)
  };
  document.addEventListener('keydown', e => {
    if (!$('#lock').classList.contains('hidden')) {
      if (/^\d$/.test(e.key)) pinKey(e.key);
      else if (e.key === 'Backspace') pinKey('⌫');
      else if (e.key === 'Escape') pinKey('C');
    }
  });
  refreshPinLockout();
}
async function pinKey(k) {
  if ($('#lock').classList.contains('hidden') || !connectedWorkspaceReady) return;
  loadPinAttemptState();
  refreshPinLockout();
  if (pinBusy || pinIsBlocked()) return;
  $('#lockError').textContent = '';
  if (k === 'C') pin = '';
  else if (k === '⌫') pin = pin.slice(0, -1);
  else if (/^\d$/.test(k) && pin.length < 4) pin += k;
  else return;
  [...document.querySelectorAll('#pinDots .dot')].forEach((d, i) => d.classList.toggle('on', i < pin.length));
  if (pin.length === 4) {
    const entered = pin,
      attempt = ++pinAttempt;
    setPinBusy(true);
    try {
      const valid = await verifyAccessCode(entered);
      if (attempt !== pinAttempt) return;
      loadPinAttemptState();
      refreshPinLockout();
      if (pinIsBlocked()) return;
      if (valid && connectedWorkspaceReady) {
        const key = await deriveVaultKey(entered);
        if (attempt !== pinAttempt || !connectedWorkspaceReady || pinIsBlocked()) return;
        sessionAccessCode = entered;
        state.vaultKey = key;
        await openSection(workspaceModules.landingSection);
        if (attempt !== pinAttempt || !connectedWorkspaceReady || pinIsBlocked()) return;
        const completed = await unlockTransition.play();
        if (!completed || attempt !== pinAttempt) return;
        clearPinAttemptState();
        pin = '';
        document.querySelectorAll('#pinDots .dot').forEach(dot => dot.classList.remove('on'));
        updateDataStatus(currentDataStatusState(), portableFileName);
        await scheduleAutoLock();
        $('#brand').focus({
          preventScroll: true
        });
      } else {
        recordPinFailure();
        if (!pinIsBlocked()) {
          $('#lockError').textContent = 'Code incorrect (' + pinFailures + '/' + PIN_FAILURE_LIMIT + ').';
          pinResetTimer = setTimeout(() => {
            if (attempt !== pinAttempt) return;
            pinResetTimer = null;
            pin = '';
            setPinBusy(false);
            document.querySelectorAll('#pinDots .dot').forEach(dot => dot.classList.remove('on'));
          }, 350);
        }
      }
    } catch (error) {
      if (attempt !== pinAttempt) return;
      lockApplication();
      $('#lockError').textContent = 'Impossible de d\u00e9verrouiller la base. R\u00e9essaie.';
      console.warn('Unlock failed:', error);
    } finally {
      if (attempt === pinAttempt && !pinResetTimer) setPinBusy(false);
    }
  }
}

/* Legacy desktop key derivation; the web adapter supplies its workspace key. */
async function deriveVaultKey(code) {
  let meta = await setting('vaultCrypto', null);
  if (!meta) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    meta = {
      salt: [...salt]
    };
    await setSetting('vaultCrypto', meta);
  }
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({
      name: 'PBKDF2',
      salt: new Uint8Array(meta.salt),
      iterations: 250000,
      hash: 'SHA-256'
    },
    base, {
      name: 'AES-GCM',
      length: 256
    }, false, ['encrypt', 'decrypt']
  );
}
async function encSecret(text) {
  return encryptBlobWithKey(text,state.vaultKey);
}
async function decSecret(blob) {
  return decryptBlobWithKey(blob,state.vaultKey);
}

;
/* js/network/ip-tools.js */
'use strict';

const networkMath = (() => {
  const maxRanges = 256;
  const parseAddress = value => {
    const text = String(value || '').trim();
    if (!text || text.includes('%') || !ipaddr.isValid(text)) throw new Error('Adresse IP invalide.');
    const address = ipaddr.parse(text);
    if (address.kind() === 'ipv4' && !ipaddr.IPv4.isValidFourPartDecimal(text)) throw new Error('Une IPv4 doit contenir quatre nombres d\u00e9cimaux, sans z\u00e9ro initial.');
    return address;
  };
  const type = family => family === 'ipv4' ? ipaddr.IPv4 : ipaddr.IPv6;
  const integer = address => address.toByteArray().reduce((value, byte) => (value << 8n) + BigInt(byte), 0n);
  const fromInteger = (value, bits) => {
    const bytes = Array(bits / 8);
    let rest = value;
    for (let index = bytes.length - 1; index >= 0; index--) {
      bytes[index] = Number(rest & 255n);
      rest >>= 8n
    }
    return ipaddr.fromByteArray(bytes);
  };
  const parsePrefix = (value, bits) => {
    const text = String(value).trim().replace(/^\//, '');
    if (!/^\d+$/.test(text) || Number(text) > bits) throw new Error('Pr\u00e9fixe invalide : 0 \u00e0 ' + bits + '.');
    return Number(text);
  };
  const parseCIDR = value => {
    const text = String(value || '').trim(),
      parts = text.split('/');
    if (parts.length !== 2) throw new Error('Adresse et pr\u00e9fixe CIDR requis.');
    const address = parseAddress(parts[0]),
      family = address.kind(),
      bits = family === 'ipv4' ? 32 : 128,
      prefix = parsePrefix(parts[1], bits);
    const parsed = ipaddr.parseCIDR(address.toString() + '/' + prefix),
      api = type(family);
    const network = api.networkAddressFromCIDR(parsed[0].toString() + '/' + prefix),
      last = api.broadcastAddressFromCIDR(parsed[0].toString() + '/' + prefix);
    return {
      address,
      network,
      last,
      family,
      bits,
      prefix,
      cidr: network.toString() + '/' + prefix,
      size: 1n << BigInt(bits - prefix)
    };
  };
  const subnet = value => {
    const result = parseCIDR(value),
      api = type(result.family),
      ipv4 = result.family === 'ipv4';
    const mask = api.subnetMaskFromPrefixLength(result.prefix),
      reserved = ipv4 && result.prefix < 31;
    return {
      ...result,
      mask: mask.toString(),
      wildcard: ipv4 ? ipaddr.fromByteArray(mask.toByteArray().map(byte => 255 - byte)).toString() : null,
      broadcast: reserved ? result.last.toString() : null,
      hosts: ipv4 ? result.size - (reserved ? 2n : 0n) : null,
      firstHost: ipv4 ? fromInteger(integer(result.network) + (reserved ? 1n : 0n), result.bits).toString() : null,
      lastHost: ipv4 ? fromInteger(integer(result.last) - (reserved ? 1n : 0n), result.bits).toString() : null
    };
  };
  const mask = (value, family = 'ipv4') => {
    if (!['ipv4', 'ipv6'].includes(family)) throw new Error('Famille IP invalide.');
    const text = String(value || '').trim(),
      bits = family === 'ipv4' ? 32 : 128;
    let prefix;
    if (/^\/?\d+$/.test(text)) prefix = parsePrefix(text, bits);
    else {
      const address = parseAddress(text);
      if (address.kind() !== family) throw new Error('Le masque ne correspond pas \u00e0 la famille IP.');
      prefix = address.prefixLengthFromSubnetMask();
      if (prefix === null) throw new Error('Masque non contigu.');
    }
    const address = type(family).subnetMaskFromPrefixLength(prefix);
    return {
      family,
      bits,
      prefix,
      mask: address.toString(),
      wildcard: family === 'ipv4' ? ipaddr.fromByteArray(address.toByteArray().map(byte => 255 - byte)).toString() : null,
      size: 1n << BigInt(bits - prefix)
    };
  };
  const membership = (ip, cidr) => {
    const address = parseAddress(ip),
      range = parseCIDR(cidr),
      sameFamily = address.kind() === range.family;
    const belongs = sameFamily && address.match([range.network, range.prefix]);
    let role = '';
    if (belongs && range.family === 'ipv4') {
      role = range.prefix === 32 ? 'Adresse unique' : range.prefix === 31 ? 'Extr\u00e9mit\u00e9 point \u00e0 point' : address.toString() === range.network.toString() ? 'Adresse r\u00e9seau' : address.toString() === range.last.toString() ? 'Adresse broadcast' : 'Adresse h\u00f4te';
    }
    return {
      address: address.toString(),
      range,
      belongs,
      sameFamily,
      role
    };
  };
  const overlaps = value => {
    const lines = String(value || '').split(/\r?\n/).map((text, index) => ({
      text: text.trim(),
      line: index + 1
    })).filter(row => row.text);
    if (!lines.length) throw new Error('Aucune plage CIDR.');
    if (lines.length > maxRanges) throw new Error('Maximum ' + maxRanges + ' plages par analyse.');
    const ranges = lines.map(row => {
        try {
          return {
            ...parseCIDR(row.text),
            source: row.text,
            line: row.line
          }
        } catch (error) {
          throw new Error('Ligne ' + row.line + ' : ' + error.message)
        }
      }),
      pairs = [];
    for (let a = 0; a < ranges.length; a++)
      for (let b = a + 1; b < ranges.length; b++) {
        const first = ranges[a],
          second = ranges[b];
        if (first.family !== second.family) continue;
        const smaller = first.prefix >= second.prefix ? first : second,
          larger = smaller === first ? second : first;
        if (!smaller.network.match([larger.network, larger.prefix])) continue;
        pairs.push({
          first,
          second,
          intersection: smaller.cidr,
          relation: first.prefix === second.prefix ? 'Identiques' : first.prefix < second.prefix ? 'A contient B' : 'B contient A'
        });
      }
    return {
      ranges,
      pairs
    };
  };
  return {
    parseAddress,
    parseCIDR,
    subnet,
    mask,
    membership,
    overlaps,
    maxRanges
  };
})();
