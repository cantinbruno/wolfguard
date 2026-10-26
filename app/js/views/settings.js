'use strict';

async function saveWorkspaceFromSettings() {
  if (db?.native) {
    await db.flush();
    appNotify('Toutes les modifications sont enregistr\u00e9es dans SQLite.');
    return
  }
  if (workspaceCanWrite()) {
    const ok = await writePortableFile();
    if (ok) appNotify('Bases ITW sauvegardées.');
    else if (localServiceAvailable()) appNotify(localWorkspaceError || 'Sauvegarde en cours. Reessaie dans un instant.');
    return;
  }
  appNotify('L’écriture directe dans le fichier n’est pas disponible dans ce navigateur. Utilise « Exporter une copie ITW ».');
}

async function reloadWorkspaceFromSettings() {
  if (workspaceCanWrite() || localServiceAvailable()) {
    await loadPortableFile(true);
    return;
  }
  closeModal();
  openItwFilePicker();
}

function changeWorkspaceFromSettings() {
  if (desktopBridge.available) {
    desktopBridge.call('data.openFolder').catch(error => appNotify(error.message));
    return
  }
  if (localServiceAvailable()) return;
  window.workspaceSearch?.reset();
  closeModal();
  connectedWorkspaceReady = false;
  resetPinUI();
  sessionAccessCode = '';
  state.vaultKey = null;
  portableDirHandle = null;
  portableFileHandle = null;
  portableSectionHandles = new Map();
  clearTimeout(portableSaveTimer);
  portableSavePending = false;
  portableReadOnly = false;
  portableFileName = 'Bases par section';
  updateDataStatus('local');
  $('#app').classList.add('hidden');
  $('#lock').classList.add('hidden');
  $('#connectionGate').classList.remove('hidden');
  $('.connection-actions').classList.remove('hidden');
  $('#connectRequiredBtn').hidden = false;
  $('#connectionHeading').textContent = 'Connecter la base';
  setConnectionStatus('');
}

/* SETTINGS */
const SETTINGS_ICON_PATHS = {
  "shield-check": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /><path d=\"m9 12 2 2 4-4\" />",
  "database": "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\" /><path d=\"M3 5V19A9 3 0 0 0 21 19V5\" /><path d=\"M3 12A9 3 0 0 0 21 12\" />",
  "sliders-horizontal": "<path d=\"M10 5H3\" /><path d=\"M12 19H3\" /><path d=\"M14 3v4\" /><path d=\"M16 17v4\" /><path d=\"M21 12h-9\" /><path d=\"M21 19h-5\" /><path d=\"M21 5h-7\" /><path d=\"M8 10v4\" /><path d=\"M8 12H3\" />",
  "key-round": "<path d=\"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z\" /><circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" />",
  "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\" /><path d=\"M7 11V7a5 5 0 0 1 10 0v4\" />",
  "save": "<path d=\"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z\" /><path d=\"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7\" /><path d=\"M7 3v4a1 1 0 0 0 1 1h7\" />",
  "download": "<path d=\"M12 15V3\" /><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /><path d=\"m7 10 5 5 5-5\" />",
  "upload": "<path d=\"M12 3v12\" /><path d=\"m17 8-5-5-5 5\" /><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" />",
  "refresh-cw": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\" /><path d=\"M21 3v5h-5\" /><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\" /><path d=\"M8 16H3v5\" />",
  "folder-open": "<path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\" />",
  "rotate-ccw": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\" /><path d=\"M3 3v5h5\" />",
  "x": "<path d=\"M18 6 6 18\" /><path d=\"m6 6 12 12\" />",
  "circle-alert": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\" /><line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\" />"
};

function settingsIcon(name) {
  return `<svg class="lucide" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${SETTINGS_ICON_PATHS[name]||''}</svg>`;
}

function setSettingsTab(name, focus = false) {
  const dialog = $('.settings-modal');
  if (!dialog) return;
  const button = dialog.querySelector(`[data-settings-tab="${name}"]`);
  if (!button) return;
  dialog.querySelectorAll('[data-settings-tab]').forEach(tab => {
    const selected = tab === button;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  dialog.querySelectorAll('[data-settings-panel]').forEach(panel => panel.classList.toggle('hidden', panel.dataset.settingsPanel !== name));
  dialog.querySelector('.settings-main').scrollTop = 0;
  if (focus) button.focus();
}
async function openSettings(initialTab = 'security') {
  sectionTransition.cancel();
  const n = (await activeItems()).length;
  const autoLock = Number(await setting('autoLockMinutes', 0));
  const lastBackup = await setting('lastBackup', null);
  const backupDate = lastBackup ? new Date(lastBackup) : null;
  const backupLabel = backupDate && !Number.isNaN(backupDate.getTime()) ? backupDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : 'Aucune';
  const width = getExplorerWidth();
  const connected = workspaceCanWrite();
  const loaded = portableReadOnly && !connected;
  const connectionClass = connected || loaded ? 'connected' : '';
  const connectionLabel = workspaceConnectionLabel();
  const databaseFiles = db?.native ? db.storageFiles() : [];
  const multipleDatabases = databaseFiles.length > 1;
  const filename = multipleDatabases ? 'Bases par section' : portableFileName || 'Bases par section';
  const tabName = ['security', 'data', 'interface', 'modules'].includes(initialTab) ? initialTab : 'security';

  modal('Paramètres', `
    <button type="button" class="settings-btn settings-btn-icon settings-close" id="closeSettingsBtn" title="Fermer les paramètres" aria-label="Fermer les paramètres">${settingsIcon('x')}</button>
    <div class="settings-layout">
      <aside class="settings-sidebar">
        <div class="settings-identity"><img class="wolf-logo" src="images/logo-loup.svg" alt="Logo loup" width="64" height="64"></div>
        <nav class="settings-tabs" role="tablist" aria-label="Catégories des paramètres" aria-orientation="${matchMedia('(max-width:640px)').matches?'horizontal':'vertical'}">
          <button type="button" class="settings-tab" id="settings-tab-security" data-settings-tab="security" role="tab" aria-controls="settings-security" aria-selected="false" tabindex="-1">${settingsIcon('shield-check')}<span>Sécurité</span></button>
          <button type="button" class="settings-tab" id="settings-tab-data" data-settings-tab="data" role="tab" aria-controls="settings-data" aria-selected="false" tabindex="-1">${settingsIcon('database')}<span>Données</span></button>
          <button type="button" class="settings-tab" id="settings-tab-interface" data-settings-tab="interface" role="tab" aria-controls="settings-interface" aria-selected="false" tabindex="-1">${settingsIcon('sliders-horizontal')}<span>Interface</span></button>
          <button type="button" class="settings-tab" id="settings-tab-modules" data-settings-tab="modules" role="tab" aria-controls="settings-modules" aria-selected="false" tabindex="-1">${settingsIcon('folder-open')}<span>Sections</span></button>
        </nav>
        <div class="settings-workspace">
          <strong>${esc(filename)}</strong>
          <span>${n.toLocaleString('fr-FR')} élément${n===1?'':'s'}</span>
          <span class="settings-connection-state ${connectionClass}">${connectionLabel}</span>
        </div>
      </aside>
      <div class="settings-main">
        <section class="settings-panel hidden" id="settings-modules" data-settings-panel="modules" role="tabpanel" aria-labelledby="settings-tab-modules">${moduleManagerHTML()}</section>
        <section class="settings-panel hidden" id="settings-security" data-settings-panel="security" role="tabpanel" aria-labelledby="settings-tab-security">
          <header class="settings-panel-head"><div class="settings-heading">${settingsIcon('shield-check')}<h3>Sécurité</h3></div><span class="settings-status">Session active</span></header>
          <div class="settings-row">
            ${settingsIcon('key-round')}
            <div class="settings-row-copy"><div class="settings-row-title">Code d’accès</div><div class="settings-row-desc">Code à 4 chiffres</div></div>
            <button type="button" class="settings-btn settings-control" id="changeCodeBtn">${settingsIcon('key-round')}Modifier</button>
          </div>
          <div id="changeCodeArea"></div>
          <div class="settings-row">
            ${settingsIcon('lock')}
            <div class="settings-row-copy"><label class="settings-row-title" for="autoLockSelect">Verrouillage automatique</label><div class="settings-row-desc">Délai d’inactivité</div></div>
            <select id="autoLockSelect" class="settings-select settings-control">
              <option value="0" ${autoLock===0?'selected':''}>Désactivé</option>
              <option value="5" ${autoLock===5?'selected':''}>5 minutes</option>
              <option value="15" ${autoLock===15?'selected':''}>15 minutes</option>
              <option value="30" ${autoLock===30?'selected':''}>30 minutes</option>
              <option value="60" ${autoLock===60?'selected':''}>1 heure</option>
            </select>
          </div>
          <div class="settings-row">
            ${settingsIcon('shield-check')}
            <div class="settings-row-copy"><div class="settings-row-title">Session actuelle</div><div class="settings-row-desc">Accès déverrouillé</div></div>
            <button type="button" class="settings-btn settings-control" id="lockNowBtn">${settingsIcon('lock')}Verrouiller</button>
          </div>
          <div class="settings-security-note">${settingsIcon('circle-alert')}<div>Conservez votre code : il est nécessaire pour retrouver l’accès au coffre chiffré.</div></div>
        </section>
        <section class="settings-panel hidden" id="settings-data" data-settings-panel="data" role="tabpanel" aria-labelledby="settings-tab-data">
          <header class="settings-panel-head"><div class="settings-heading">${settingsIcon('database')}<h3>Données</h3></div><span class="settings-status settings-status-data">${n.toLocaleString('fr-FR')} élément${n===1?'':'s'}</span></header>
          <div class="settings-file">
            ${settingsIcon('database')}
            <div><strong>${esc(filename)}</strong><span class="settings-connection-state ${connectionClass}">${connectionLabel}</span></div>
          </div>
          ${multipleDatabases ? '<div class="settings-database-list">' + databaseFiles.map(file => '<div class="settings-database-file"><div><strong>' + esc(file.name) + '</strong><code>' + esc(file.path) + '</code><span>' + (file.id === 'main' ? 'Reglages partages' : file.itemCount.toLocaleString('fr-FR') + ' element(s)') + '</span></div><button type="button" class="settings-btn" data-storage-folder="' + esc(file.id) + '" aria-label="Afficher le dossier ' + esc(file.name) + '">' + settingsIcon('folder-open') + 'Dossier</button></div>').join('') + '</div>' : ''}
          <dl class="settings-data-facts">
            <div><dt>Éléments</dt><dd>${n.toLocaleString('fr-FR')}</dd></div>
            <div><dt>Dernière sauvegarde</dt><dd>${esc(backupLabel)}</dd></div>
          </dl>
          <div class="settings-file-actions">
            <button type="button" class="settings-btn primary" id="saveBaseBtn" ${connected?'':'disabled'} title="${connected?'Sauvegarder dans le fichier connecté':'Écriture directe indisponible pour cette connexion'}">${settingsIcon('save')}Sauvegarder</button>
            <button type="button" class="settings-btn" id="reloadBaseBtn">${settingsIcon('refresh-cw')}Recharger</button>
            <button type="button" class="settings-btn" id="changeBaseBtn">${settingsIcon('folder-open')}${desktopBridge.available?(multipleDatabases?'Afficher les dossiers':'Afficher le dossier'):'Changer de base'}</button>
          </div>
          <h4 class="settings-group-title">Sauvegardes</h4>
          <div class="settings-row">
            ${settingsIcon('download')}
            <div class="settings-row-copy"><div class="settings-row-title">${multipleDatabases?'Copie de toutes les bases':'Copie de la base'}</div><div class="settings-row-desc">${desktopBridge.available?(multipleDatabases?'Sauvegarde complete dans un fichier SQLite':'Base SQLite'):'Fichier ITW'}</div></div>
            <button type="button" class="settings-btn settings-control" id="exp">${settingsIcon('download')}Exporter</button>
          </div>
          <div class="settings-row">
            ${settingsIcon('upload')}
            <div class="settings-row-copy"><div class="settings-row-title">Restaurer une sauvegarde</div><div class="settings-row-desc">${desktopBridge.available?'Base SQLite':'Fichier ITW ou JSON'}</div></div>
            <button type="button" class="settings-btn settings-control" id="imp">${settingsIcon('upload')}Importer</button>
          </div>
          <input id="impFile" class="hidden" type="file" accept=".itw,.json,application/json" multiple>
        </section>
        <section class="settings-panel hidden" id="settings-interface" data-settings-panel="interface" role="tabpanel" aria-labelledby="settings-tab-interface">
          <header class="settings-panel-head"><div class="settings-heading">${settingsIcon('sliders-horizontal')}<h3>Interface</h3></div><span class="settings-status settings-status-interface">Local</span></header>
          <div class="settings-row settings-width-row">
            ${settingsIcon('sliders-horizontal')}
            <div class="settings-row-copy"><label class="settings-row-title" for="navigationWidth">Largeur de navigation</label><div class="settings-row-desc">190 à 520 px</div></div>
            <div class="settings-range-control">
              <input id="navigationWidth" type="range" min="190" max="520" step="1" value="${width}">
              <output id="navigationWidthValue" for="navigationWidth">${width} px</output>
              <button type="button" class="settings-btn settings-btn-icon" id="resetWidthBtn" title="Rétablir la largeur par défaut" aria-label="Rétablir la largeur par défaut">${settingsIcon('rotate-ccw')}</button>
            </div>
          </div>
          <div class="settings-row">
            ${settingsIcon('rotate-ccw')}
            <div class="settings-row-copy"><div class="settings-row-title">Réglages d’interface</div><div class="settings-row-desc">Largeur et dossiers repliés</div></div>
            <button type="button" class="settings-btn settings-control" id="resetInterfaceBtn">${settingsIcon('rotate-ccw')}Réinitialiser</button>
          </div>
        </section>
      </div>
    </div>
    <footer class="settings-footer"><span id="settingsFeedback" class="settings-feedback" role="status" aria-live="polite"></span><span class="settings-version">Version 4.3.2</span></footer>
  `);

  const dialog = $('#modalRoot .modal');
  dialog.classList.add('settings-modal');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'settingsTitle');
  const title = dialog.querySelector('h2');
  title.id = 'settingsTitle';
  title.insertAdjacentHTML('afterbegin', '<img class="settings-title-logo wolf-logo" src="images/logo-loup.svg" alt="" aria-hidden="true" width="40" height="40">');
  const wrap = dialog.parentElement;
  wrap.classList.add('settings-wrap');
  const closeSettings = () => {
    closeModal();
    $('#settingsBtn')?.focus()
  };
  $('#closeSettingsBtn').onclick = closeSettings;
  wrap.onclick = e => {
    if (e.target === wrap) closeSettings()
  };
  const tabs = [...dialog.querySelectorAll('[data-settings-tab]')];
  tabs.forEach(tab => {
    tab.onclick = () => setSettingsTab(tab.dataset.settingsTab);
    tab.onkeydown = e => {
      const index = tabs.indexOf(tab);
      let next;
      if (['ArrowRight', 'ArrowDown'].includes(e.key)) next = (index + 1) % tabs.length;
      else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) next = (index + tabs.length - 1) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      else return;
      e.preventDefault();
      setSettingsTab(tabs[next].dataset.settingsTab, true);
    };
  });
  dialog.onkeydown = e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeSettings();
      return
    }
    if (e.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not([disabled]):not([tabindex="-1"]),input:not([disabled]),select:not([disabled])')].filter(element => element.getClientRects().length);
    const first = controls[0],
      last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus()
    }
  };
  $('#changeCodeBtn').onclick = showChangeCodeForm;
  $('#lockNowBtn').onclick = lockApplication;
  $('#changeBaseBtn').onclick = changeWorkspaceFromSettings;
  dialog.querySelectorAll('[data-storage-folder]').forEach(button => {
    button.onclick = () => desktopBridge.call('data.openFolder', {section: button.dataset.storageFolder}).catch(error => appNotify(error.message, {kind: 'error'}));
  });
  $('#reloadBaseBtn').onclick = reloadWorkspaceFromSettings;
  $('#saveBaseBtn').onclick = saveWorkspaceFromSettings;
  $('#exp').onclick = exportDB;
  $('#imp').onclick = async () => {
    if (!db?.native) {
      $('#impFile').click();
      return
    }
    try {
      await db.flush();
      const snapshot = await desktopBridge.call('backup.restore');
      if (!snapshot) return;
      db.replace(snapshot);
      resetSettingsCache(snapshot.settings);
      window.workspaceSearch?.reset();
      closeModal();
      connectedWorkspaceReady = true;
      lockApplication();
      if (!await ensureSecuritySettings()) {
        $('#lock').classList.add('hidden');
        $('#connectionGate').classList.remove('hidden');
        await createFirstCodeForWorkspace();
        await completeRequiredConnection()
      }
    } catch (error) {
      appNotify('Restauration impossible : ' + error.message)
    }
  };
  $('#impFile').onchange = async e => {
    await importDB(e.target.files);
    e.target.value = ''
  };
  const feedback = (message, error = false) => {
    const element = dialog.querySelector('#settingsFeedback');
    element.textContent = message;
    element.classList.toggle('error', error);
  };
  if (localWorkspaceError) {
    feedback(localWorkspaceError, true);
    updateDataStatus('error')
  }
  let savedAutoLock = autoLock;
  $('#autoLockSelect').onchange = async e => {
    const select = e.target;
    select.disabled = true;
    try {
      await setSetting('autoLockMinutes', Number(select.value));
      savedAutoLock = Number(select.value);
      await scheduleAutoLock();
      feedback('Verrouillage mis à jour.');
    } catch {
      select.value = String(savedAutoLock);
      feedback('Impossible d’enregistrer le réglage.', true);
    } finally {
      select.disabled = false
    }
  };
  const updateWidth = value => {
    const updated = applyExplorerWidth(value);
    $('#navigationWidth').value = String(updated);
    $('#navigationWidthValue').value = updated + ' px';
    feedback('Affichage mis à jour.');
  };
  $('#navigationWidth').oninput = e => updateWidth(Number(e.target.value));
  $('#resetWidthBtn').onclick = () => updateWidth(260);
  $('#resetInterfaceBtn').onclick = resetInterfaceSettings;
  setSettingsTab(tabName, true);
}

function showChangeCodeForm() {
  const area = $('#changeCodeArea');
  if (!area) return;
  area.innerHTML = `
    <div class="pin-fields">
      <label for="oldAccessCode">Code actuel<input id="oldAccessCode" type="password" inputmode="numeric" maxlength="4" autocomplete="current-password"></label>
      <label for="newAccessCode">Nouveau code<input id="newAccessCode" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"></label>
      <label for="confirmAccessCode">Confirmation<input id="confirmAccessCode" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"></label>
      <div class="settings-form-actions">
        <button type="button" class="settings-btn" onclick="$('#changeCodeArea').innerHTML='';$('#changeCodeBtn').focus()">Annuler</button>
        <button type="button" class="settings-btn primary" onclick="changeAccessCode()">Enregistrer</button>
      </div>
    </div>`;
  $('#oldAccessCode').focus();
}
