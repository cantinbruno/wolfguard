'use strict';

const WORKSPACE_DIRECTORY = 'donnees';
const WORKSPACE_CONFIG_FILE = 'parametres.itw';
const WORKSPACE_SECTION_FILES = Object.freeze([{
  section: 'vault',
  file: 'coffre.itw',
  label: 'Coffre'
}, {
  section: 'memo',
  file: 'memos.itw',
  label: 'Memos'
}, {
  section: 'personal',
  file: 'notes.itw',
  label: 'Notes'
}, {
  section: 'protocol',
  file: 'protocoles.itw',
  label: 'Protocoles'
}, {
  section: 'command',
  file: 'commandes.itw',
  label: 'Commandes'
}, {
  section: 'template',
  file: 'templates.itw',
  label: 'Templates'
}]);

function emptyWorkspaceSection(config, section) {
  return {
    version: config.version || 3,
    app: config.app || 'IT Workspace',
    updatedAt: config.updatedAt,
    layout: 'section',
    section,
    items: [],
    folders: [],
    settings: [],
    activity: []
  };
}

async function writeItwPayload(handle, payload) {
  const writable = await handle.createWritable();
  try {
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => {});
    throw error;
  }
}

function splitWorkspacePayload(payload) {
  validateItwPayload(payload);
  const revision = payload.updatedAt || now();
  const sections = new Set(WORKSPACE_SECTION_FILES.map(entry => entry.section));
  const itemSections = new Map((payload.items || []).map(item => [item.id, storageSectionForItem(item)]));
  const activitySection = entry => itemSections.get(entry.itemId) || (entry.type ? storageSectionForItem(entry) : null);
  const files = new Map();
  for (const {
      section,
      file
    }
    of WORKSPACE_SECTION_FILES) {
    files.set(file, {
      version: payload.version || 3,
      app: payload.app || 'IT Workspace',
      updatedAt: revision,
      layout: 'section',
      section,
      items: (payload.items || []).filter(item => storageSectionForItem(item) === section),
      folders: (payload.folders || []).filter(folder => folder.section === section),
      settings: [],
      activity: (payload.activity || []).filter(entry => activitySection(entry) === section)
    });
  }
  files.set(WORKSPACE_CONFIG_FILE, {
    ...payload,
    updatedAt: revision,
    layout: 'sections',
    sectionFiles: WORKSPACE_SECTION_FILES.map(({
      section,
      file
    }) => ({
      section,
      file
    })),
    items: [],
    folders: (payload.folders || []).filter(folder => !sections.has(folder.section)),
    settings: (payload.settings || []).filter(entry => !['portableDirHandle', 'portableFileHandle'].includes(entry.key)),
    activity: (payload.activity || []).filter(entry => !activitySection(entry))
  });
  return files;
}

function combineWorkspacePayloads(files) {
  const config = validateItwPayload(files.get(WORKSPACE_CONFIG_FILE));
  if (config.layout !== 'sections') throw new Error('Parametres ITW invalides');
  if (!Array.isArray(config.sectionFiles) || config.sectionFiles.length !== WORKSPACE_SECTION_FILES.length || WORKSPACE_SECTION_FILES.some(({
      section,
      file
    }, index) => config.sectionFiles[index]?.section !== section || config.sectionFiles[index]?.file !== file)) {
    throw new Error('Liste des sections ITW invalide');
  }
  const payload = {
    ...config,
    items: [...(config.items || [])],
    folders: [...(config.folders || [])],
    settings: [...(config.settings || [])],
    activity: [...(config.activity || [])]
  };
  delete payload.layout;
  delete payload.sectionFiles;
  for (const {
      section,
      file
    }
    of WORKSPACE_SECTION_FILES) {
    if (!files.has(file)) throw new Error('Fichier manquant : ' + file);
    const part = validateItwPayload(files.get(file));
    if (part.layout !== 'section' || part.section !== section || part.updatedAt !== config.updatedAt) {
      throw new Error('Section ITW incompatible : ' + file);
    }
    if ((part.settings || []).length || (part.items || []).some(item => storageSectionForItem(item) !== section) || (part.folders || []).some(folder => folder.section !== section)) {
      throw new Error('Contenu de section invalide : ' + file);
    }
    payload.items.push(...(part.items || []));
    payload.folders.push(...(part.folders || []));
    payload.activity.push(...(part.activity || []));
  }
  for (const store of ['items', 'folders', 'settings', 'activity']) {
    const key = store === 'settings' ? 'key' : 'id';
    const identities = new Set();
    for (const record of payload[store]) {
      if (!record[key] || identities.has(record[key])) throw new Error('Identifiant ITW invalide ou duplique : ' + store);
      identities.add(record[key]);
    }
  }
  return payload;
}

async function readSelectedWorkspaceFiles(selection) {
  const files = selection instanceof File ? [selection] : Array.from(selection || []);
  if (!files.length) throw new Error('Aucun fichier selectionne');
  if (files.length === 1) {
    const payload = await parseItwFile(files[0]);
    if (!payload.layout) return {
      payload,
      name: files[0].name
    };
  }
  const payloads = new Map();
  for (const file of files) {
    if (payloads.has(file.name)) throw new Error('Fichier selectionne deux fois : ' + file.name);
    payloads.set(file.name, await parseItwFile(file));
  }
  if (!payloads.has(WORKSPACE_CONFIG_FILE)) throw new Error('Selectionne les sept fichiers ITW du dossier donnees');
  return {
    payload: combineWorkspacePayloads(payloads),
    name: 'Bases par section'
  };
}

async function readWorkspaceDirectory(directory) {
  let configHandle;
  try {
    configHandle = await directory.getFileHandle(WORKSPACE_CONFIG_FILE, {
      create: false
    });
  } catch (error) {
    if (error.name !== 'NotFoundError') throw error;
    let nested;
    try {
      nested = await directory.getDirectoryHandle(WORKSPACE_DIRECTORY, {
        create: false
      })
    } catch (nestedError) {
      if (nestedError.name !== 'NotFoundError') throw nestedError
    }
    if (nested) return readWorkspaceDirectory(nested);
    const fileHandle = await directory.getFileHandle('workspace.itw', {
      create: false
    });
    const payload = await parseItwFile(await fileHandle.getFile());
    if (payload.layout) throw new Error('Le dossier donnees est incomplet');
    return {
      directory,
      fileHandle,
      sectionHandles: new Map(),
      payload,
      name: 'workspace.itw'
    };
  }
  const config = await parseItwFile(await configHandle.getFile());
  const payloads = new Map([
    [WORKSPACE_CONFIG_FILE, config]
  ]);
  const sectionHandles = new Map();
  const missingFiles = [];
  await Promise.all(WORKSPACE_SECTION_FILES.map(async ({
    section,
    file
  }) => {
    try {
      const handle = await directory.getFileHandle(file, {
        create: false
      });
      const parsed = await parseItwFile(await handle.getFile());
      payloads.set(file, parsed);
      sectionHandles.set(file, handle);
    } catch (error) {
      if (error.name !== 'NotFoundError') throw error;
      missingFiles.push(file);
      payloads.set(file, emptyWorkspaceSection(config, section));
    }
  }));
  let payload = combineWorkspacePayloads(payloads);
  if (missingFiles.length) {
    if (!await requestDirPermission(directory)) throw new Error('Autorisation requise pour creer les sections manquantes');
    const emptyFiles = [];
    // Validate existing sections before creating files; preserve files added during loading.
    for (const file of missingFiles) {
      const handle = await directory.getFileHandle(file, {
        create: true
      });
      const existing = await handle.getFile();
      if (existing.size) payloads.set(file, await parseItwFile(existing));
      else emptyFiles.push(file);
      sectionHandles.set(file, handle);
    }
    payload = combineWorkspacePayloads(payloads);
    for (const file of emptyFiles) await writeItwPayload(sectionHandles.get(file), payloads.get(file));
  }
  return {
    directory,
    fileHandle: configHandle,
    sectionHandles,
    payload,
    name: 'Bases par section'
  };
}

function useWorkspaceDirectory(connection) {
  portableDirHandle = connection.directory;
  portableFileHandle = connection.fileHandle;
  portableSectionHandles = connection.sectionHandles;
  portableFileName = connection.name;
  portableReadOnly = false;
}
