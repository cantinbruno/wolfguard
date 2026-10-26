'use strict';

function itemLinkIds(item) {
  return [...new Set((Array.isArray(item?.linkedItemIds) ? item.linkedItemIds : []).filter(id => typeof id === 'string' && id !== item.id))]
}

function relatedItemRecords(item, items) {
  const links = new Set(itemLinkIds(item));
  return items.filter(record => record.id !== item.id && !isDeleted(record) && (links.has(record.id) || itemLinkIds(record).includes(item.id)));
}

function saveItemRelations(id, selection, key = state.vaultKey) {
  if (!itemActionSessionValid(key)) return Promise.reject(new Error('Session verrouill\u00e9e.'));
  if (db?.native) return (async () => {
    const items = (await all('items')).filter(item => !isDeleted(item)),
      source = items.find(item => item.id === id);
    if (!source || !itemActionSessionValid(key)) throw new Error('Cette fiche n\u2019est plus disponible.');
    const available = new Set(items.map(item => item.id)),
      selected = new Set(selection.filter(target => target !== id && available.has(target))),
      operations = [],
      stamp = now();
    for (const item of items) {
      const previous = itemLinkIds(item),
        next = item.id === id ? [...selected] : selected.has(item.id) ? [...new Set([...previous, id])] : previous.filter(target => target !== id);
      if (JSON.stringify([...previous].sort()) === JSON.stringify([...next].sort())) continue;
      item.linkedItemIds = next;
      item.updatedAt = stamp;
      operations.push({
        action: 'put',
        store: 'items',
        record: item
      });
    }
    if (operations.length) await db.batch(operations);
    return get('items', id);
  })();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('items', 'readwrite'),
      store = transaction.objectStore('items'),
      request = store.getAll();
    let saved = null,
      failure = null,
      changed = false;
    request.onsuccess = () => {
      try {
        if (!itemActionSessionValid(key)) throw new Error('Session verrouill\u00e9e.');
        const items = request.result.filter(item => !isDeleted(item)),
          source = items.find(item => item.id === id);
        if (!source) throw new Error('Cette fiche n\u2019existe plus.');
        const available = new Set(items.map(item => item.id)),
          selected = new Set(selection.filter(target => typeof target === 'string' && target !== id && available.has(target))),
          stamp = now();
        // Both ends are updated in one transaction; encrypted payloads stay untouched.
        for (const item of items) {
          const previous = itemLinkIds(item);
          let next;
          if (item.id === id) next = [...selected];
          else if (selected.has(item.id)) next = [...new Set([...previous, id])];
          else if (previous.includes(id)) next = previous.filter(target => target !== id);
          else continue;
          next.sort();
          if (JSON.stringify([...previous].sort()) !== JSON.stringify(next)) {
            item.linkedItemIds = next;
            item.updatedAt = stamp;
            store.put(item);
            changed = true;
          }
          if (item.id === id) saved = item;
        }
      } catch (error) {
        failure = error;
        transaction.abort()
      }
    };
    transaction.oncomplete = () => {
      if (changed) {
        window.workspaceSearch?.invalidate();
        if (!portableBusy) schedulePortableSave()
      }
      resolve(saved);
    };
    transaction.onabort = () => reject(failure || transaction.error || new Error('Enregistrement interrompu.'));
    transaction.onerror = () => {
      failure ??= transaction.error
    };
  });
}
