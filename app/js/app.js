'use strict';

/* EVENTS */
topNavigation.init();
$('#brand').onclick = () => switchPrimaryWorkspace(workspaceModules.landingSection);
$('#settingsBtn').onclick = openSettings;
document.addEventListener('click', e => {
  if (!e.target.closest('.search')) hideSearch()
});

(async () => {
  applyExplorerWidth(getExplorerWidth());
  initPin();
  if (localServiceAvailable() && !await acquireLocalWorkspaceTab()) {
    $('#app').classList.add('hidden');
    $('#lock').classList.add('hidden');
    $('#connectionGate').classList.remove('hidden');
    const retry = $('#connectRequiredBtn');
    retry.textContent = 'R\u00e9essayer';
    retry.onclick = () => location.reload();
    setConnectionStatus(localWorkspaceError, 'error');
    return;
  }
  await openDB();
  registerActivityForAutoLock();

  connectedWorkspaceReady = false;
  $('#app').classList.add('hidden');
  $('#lock').classList.add('hidden');
  $('#connectionGate').classList.add('hidden');

  const connectBtn = $('#connectRequiredBtn');
  if (connectBtn) connectBtn.addEventListener('click', connectRequiredWorkspace);

  if (desktopBridge.available) {
    portableFileName = 'bibliotheque.sqlite3';
    connectedWorkspaceReady = true;
    let createdCode;
    if (!await ensureSecuritySettings()) {
      $('#connectionGate').classList.remove('hidden');
      connectBtn.hidden = true;
      createdCode = await createFirstCodeForWorkspace();
    }
    await completeRequiredConnection();
    if (createdCode)
      for (const digit of createdCode) await pinKey(digit);
    return;
  }

  if (localServiceAvailable()) {
    connectBtn.textContent = 'R\u00e9essayer';
    const local = await loadLocalWorkspace();
    if (local === true) {
      resetPinUI();
      $('#lock').classList.remove('hidden');
    } else {
      $('#connectionGate').classList.remove('hidden');
      if (local === 'needs-code') {
        await createFirstCodeForWorkspace();
        await completeRequiredConnection();
      }
    }
    return;
  }

  const auto = await loadSavedPortableHandle();

  if (auto === true) {
    // Base already authorized: skip authorization page and go straight to this base's PIN.
    $('#connectionGate').classList.add('hidden');
    resetPinUI();
    $('#lock').classList.remove('hidden');
    return;
  }

  if (auto === 'needs-code') {
    // Authorized base with no code yet: show gate only to create its first code.
    $('#connectionGate').classList.remove('hidden');
    setConnectionStatus('Cette base est déjà autorisée. Crée son premier code d’accès.', 'ok');
    await createFirstCodeForWorkspace();
    await completeRequiredConnection();
    return;
  }

  const bundled = await loadBundledWorkspaceFile();

  if (bundled === true) {
    // workspace.itw was loaded from the app folder by the browser.
    $('#connectionGate').classList.add('hidden');
    resetPinUI();
    $('#lock').classList.remove('hidden');
    return;
  }

  if (bundled === 'needs-code') {
    // Bundled base with no code yet: show gate only to create its first code.
    $('#connectionGate').classList.remove('hidden');
    setConnectionStatus('Base locale chargée. Crée son premier code d’accès.', 'ok');
    await createFirstCodeForWorkspace();
    await completeRequiredConnection();
    return;
  }

  // No valid authorization available.
  $('#connectionGate').classList.remove('hidden');
})();
