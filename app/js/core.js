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
  vault: 'Coffre',
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
  return (await all('items')).filter(x => !isDeleted(x))
}
async function activeFolders() {
  return (await all('folders')).filter(x => !isDeleted(x))
}
