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
