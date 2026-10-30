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

const PRIMARY_WORKSPACE_SECTIONS = ['library', 'scan-passive', 'scan-active', 'scan-map', 'scan-vulnerability', 'tools'];

const workspaceModules = (() => {
  const installed = new Set((window.__BIBLIOTHEQUE_DESKTOP__?.modules ?? ['memo', 'tools']).filter(id => id !== 'vault'));
  const has = id => installed.has(id);
  const allows = section => section === 'modules' || (section === 'vault' ? has('vault') : section === 'home' || LIBRARY_SECTIONS.includes(section) ? has('memo') : has('tools'));
  return {
    has,
    allows,
    get canSwitch() {
      return PRIMARY_WORKSPACE_SECTIONS.filter(allows).length > 1;
    },
    get landingSection() {
      return has('memo') ? 'library' : has('tools') ? 'tools' : 'modules';
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
  $('#content').innerHTML = moduleManagerHTML();
  $('#app').classList.add('modules-only');
}
