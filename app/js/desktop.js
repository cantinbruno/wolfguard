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
