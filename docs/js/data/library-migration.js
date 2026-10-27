'use strict';

// Shared by the application and the SQLite maintenance command. Planning never writes.
function buildUnifiedLibraryMigration(snapshot, stamp = now()) {
  const {
    items = [], folders = [], settings = []
  } = snapshot;
  const candidates = folders.filter(folder => !isDeleted(folder) && LIBRARY_SECTIONS.includes(folder.section));
  const byId = new Map(candidates.map(folder => [folder.id, folder]));
  const paths = new Map();
  const aliases = new Map();
  const canonical = new Map();
  const operations = [];
  const summary = {
    normalizedItems: 0,
    updatedFolders: 0,
    mergedFolders: 0,
    movedItems: 0
  };

  function folderPath(folder, seen = new Set()) {
    if (paths.has(folder.id)) return paths.get(folder.id);
    if (seen.has(folder.id)) throw new Error('Cycle dans les dossiers : migration annulée.');
    seen.add(folder.id);
    const parent = byId.get(folder.parentId);
    const name = String(folder.name).normalize('NFKC').trim().toLocaleLowerCase('fr');
    const path = (parent ? folderPath(parent, seen) : '') + '/' + JSON.stringify(name);
    paths.set(folder.id, path);
    return path;
  }

  // Preserve existing library IDs when several legacy sections contain the same path.
  candidates.sort((a, b) => Number(b.section === 'library') - Number(a.section === 'library') || a.id.localeCompare(b.id));
  for (const folder of candidates) {
    const path = folderPath(folder);
    if (!canonical.has(path)) canonical.set(path, folder.id);
    aliases.set(folder.id, canonical.get(path));
  }

  for (const folder of candidates) {
    const target = aliases.get(folder.id);
    const parent = aliases.get(folder.parentId) || folder.parentId || null;
    const normalized = {
      ...folder,
      section: 'library',
      parentId: parent === target ? null : parent,
      ...(target !== folder.id ? {
        deletedAt: stamp,
        mergedInto: target
      } : {})
    };
    if (JSON.stringify(folder) === JSON.stringify(normalized)) continue;
    operations.push({
      action: 'put',
      store: 'folders',
      record: normalized
    });
    summary.updatedFolders++;
    if (target !== folder.id) summary.mergedFolders++;
  }

  if (summary.updatedFolders && !settings.some(record => record.key === 'unified-library-original-folders-v1')) {
    operations.unshift({
      action: 'put',
      store: 'settings',
      record: {
        key: 'unified-library-original-folders-v1',
        value: {
          at: stamp,
          folders: candidates,
          itemFolders: items.map(item => ({
            id: item.id,
            folderId: item.folderId || null
          }))
        }
      }
    });
  }

  for (const item of items) {
    let normalized = normalizeLibraryItem(item);
    if (normalized !== item) summary.normalizedItems++;
    const target = aliases.get(item.folderId);
    if (target && target !== item.folderId) {
      normalized = {
        ...normalized,
        folderId: target
      };
      summary.movedItems++;
    }
    if (normalized !== item) operations.push({
      action: 'put',
      store: 'items',
      record: normalized
    });
  }

  return {
    operations,
    summary
  };
}

let libraryMigration = null;
async function ensureUnifiedLibrary() {
  if (libraryMigration) return libraryMigration;

  libraryMigration = (async () => {
    const [items, folders, settings] = await Promise.all([all('items'), all('folders'), all('settings')]);
    const source = {
      items,
      folders,
      settings
    };
    const unified=buildUnifiedLibraryMigration(source);
    const normalized={};
    for(const store of ['items','folders','settings']){
      const field=store==='settings'?'key':'id',records=new Map(source[store].map(record=>[record[field],record]));
      for(const operation of unified.operations)if(operation.store===store)records.set(operation.record[field],operation.record);
      normalized[store]=[...records.values()];
    }
    const organization=buildMemoFolderOrganization(normalized);
    const operations=[...unified.operations,...organization.operations];
    if (!operations.length) return;
    if (db?.native) {
      await db.batch(operations);
      return;
    }

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['items', 'folders', 'settings'], 'readwrite');
      for (const operation of operations) transaction.objectStore(operation.store).put(operation.record);
      transaction.oncomplete = () => {
        resetSettingsCache();
        window.workspaceSearch?.invalidate();
        schedulePortableSave();
        resolve();
      };
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  })();

  try {
    await libraryMigration;
  } finally {
    libraryMigration = null;
  }
}
