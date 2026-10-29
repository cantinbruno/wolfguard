'use strict';

const LOCAL_SERVICE_TOKEN = '';
let localWorkspaceConnection = null;
let localWorkspaceError = '';

function localServiceAvailable() {
  return desktopBridge.available
}

function workspaceCanWrite() {
  return desktopBridge.available || !!(localWorkspaceConnection || portableFileHandle)
}

function workspaceConnectionLabel() {
  if (desktopBridge.available) return 'SQLite \u00b7 Enregistrement automatique';
  return workspaceCanWrite() ? 'Bases connect\u00e9es' : portableReadOnly ? 'Bases charg\u00e9es' : 'Base locale';
}

async function acquireLocalWorkspaceTab() {
  return true
}
async function loadLocalWorkspace() {
  if (!desktopBridge.available) return false;
  portableFileName = db.storageFiles().length > 1 ? 'Bases par section' : 'bibliotheque.sqlite3';
  return await ensureSecuritySettings() ? true : 'needs-code'
}
async function writeLocalWorkspace() {
  return db?.native ? db.flush() : false
}
async function reloadLocalWorkspace() {
  if (!db?.native) return false;
  await db.flush();
  db.replace(await desktopBridge.call('db.snapshot'));
  resetSettingsCache(await all('settings'));
  window.workspaceSearch?.reset();
  lockApplication();
  return true;
}
