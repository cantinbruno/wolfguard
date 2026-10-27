'use strict';

const PIN_FAILURE_LIMIT = 3;
const PIN_LOCKOUT_MS = 60000;
let pinBusy = false;
let pinAttempt = 0;
let pinResetTimer = null;
let pinFailures = 0;
let pinBlockedUntil = 0;
let pinStateKey = '';
let pinLockoutTimer = null;

function pinIsBlocked() {
  return pinBlockedUntil > Date.now()
}

function savePinAttemptState() {
  if (!pinStateKey) return;
  try {
    if (!pinFailures && !pinBlockedUntil) localStorage.removeItem(pinStateKey);
    else localStorage.setItem(pinStateKey, JSON.stringify({
      failures: pinFailures,
      blockedUntil: pinBlockedUntil
    }));
  } catch {}
}

function loadPinAttemptState() {
  if (!pinStateKey) return;
  try {
    const saved = JSON.parse(localStorage.getItem(pinStateKey) || '{}');
    pinFailures = Number.isInteger(saved?.failures) ? Math.max(0, Math.min(PIN_FAILURE_LIMIT, saved.failures)) : 0;
    pinBlockedUntil = Number.isFinite(saved?.blockedUntil) ? Math.max(0, saved.blockedUntil) : 0;
    if (pinBlockedUntil > Date.now() + PIN_LOCKOUT_MS) {
      pinBlockedUntil = Date.now() + PIN_LOCKOUT_MS;
      savePinAttemptState()
    }
    if (pinFailures === PIN_FAILURE_LIMIT && !pinBlockedUntil) pinFailures = 0;
  } catch {}
}

function refreshPinLockout() {
  clearTimeout(pinLockoutTimer);
  pinLockoutTimer = null;
  const error = $('#lockError');
  if (pinBlockedUntil && pinBlockedUntil <= Date.now()) {
    pinFailures = 0;
    pinBlockedUntil = 0;
    savePinAttemptState();
  }
  if (pinIsBlocked()) {
    error.dataset.pinLockout = 'true';
    error.textContent = 'Trop d\u2019essais. R\u00e9essaie dans ' + Math.ceil((pinBlockedUntil - Date.now()) / 1000) + ' s.';
    pinLockoutTimer = setTimeout(refreshPinLockout, Math.min(1000, pinBlockedUntil - Date.now()));
  } else if (error.dataset.pinLockout) {
    delete error.dataset.pinLockout;
    error.textContent = '';
  }
  setPinBusy(pinBusy);
}

function usePinAttemptState(hash) {
  const key = hash ? 'itw-pin-attempts:' + hash : '';
  if (key !== pinStateKey) {
    pinStateKey = key;
    pinFailures = 0;
    pinBlockedUntil = 0
  }
  loadPinAttemptState();
  refreshPinLockout();
}

function recordPinFailure() {
  loadPinAttemptState();
  refreshPinLockout();
  if (!pinIsBlocked()) {
    pinFailures++;
    if (pinFailures >= PIN_FAILURE_LIMIT) {
      pinBlockedUntil = Date.now() + PIN_LOCKOUT_MS;
      pin = '';
      document.querySelectorAll('#pinDots .dot').forEach(dot => dot.classList.remove('on'));
    }
    savePinAttemptState();
    refreshPinLockout();
  }
}

function clearPinAttemptState() {
  pinFailures = 0;
  pinBlockedUntil = 0;
  savePinAttemptState();
  refreshPinLockout();
}
window.addEventListener('storage', event => {
  if (!pinStateKey || (event.key !== pinStateKey && event.key !== null)) return;
  loadPinAttemptState();
  if (pinIsBlocked() && !$('#lock').classList.contains('hidden')) lockApplication();
  else refreshPinLockout();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    loadPinAttemptState();
    refreshPinLockout()
  }
});

function setPinBusy(busy) {
  pinBusy = busy;
  $('#lock').setAttribute('aria-busy', String(busy));
  document.querySelectorAll('#keypad button').forEach(button => {
    button.disabled = busy || pinIsBlocked()
  });
}
async function hashAccessCode(code) {
  const out = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ITW_ACCESS|' + String(code)));
  return [...new Uint8Array(out)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function ensureSecuritySettings() {
  const [h, autoLock] = await Promise.all([setting('accessCodeHash', null), setting('autoLockMinutes', null)]);
  if (autoLock === null) await setSetting('autoLockMinutes', 0);
  usePinAttemptState(h);
  return !!h;
}
async function verifyAccessCode(code) {
  const saved = await setting('accessCodeHash', null);
  if (!saved) return false;
  return (await hashAccessCode(code)) === saved;
}

function resetPinUI() {
  pinAttempt++;
  clearTimeout(pinResetTimer);
  pinResetTimer = null;
  unlockTransition.cancel();
  sectionTransition.cancel();
  setPinBusy(false);
  pin = '';
  document.querySelectorAll('#pinDots .dot').forEach(d => d.classList.remove('on'));
  const err = $('#lockError');
  if (err) err.textContent = '';
  refreshPinLockout();
}

function lockApplication() {
  appMessages.dismiss();
  resetPrimaryWorkspaces();
  window.workspaceSearch?.reset();
  resetCollectionSearch();
  if (typeof resetNetworkTools === 'function') resetNetworkTools();
  if (typeof resetScanTool === 'function') resetScanTool();
  clearTimeout(autoLockTimer);
  autoLockTimer = null;
  sessionAccessCode = '';
  state.vaultKey = null;
  state.section = workspaceModules.landingSection;
  state.item = null;
  state.folder = null;
  state.mode = 'view';
  $('#content').replaceChildren();
  resetPinUI();
  closeModal();
  closeContextMenu();
  $('#app').classList.add('hidden');
  if (connectedWorkspaceReady) {
    $('#connectionGate').classList.add('hidden');
    $('#lock').classList.remove('hidden');
  } else {
    $('#lock').classList.add('hidden');
    $('#connectionGate').classList.remove('hidden');
  }
}
async function scheduleAutoLock() {
  clearTimeout(autoLockTimer);
  autoLockTimer = null;
  if ($('#app').classList.contains('hidden')) return;
  const mins = Number(await setting('autoLockMinutes', 0));
  if (!mins || mins <= 0) return;
  autoLockTimer = setTimeout(lockApplication, mins * 60 * 1000);
}

function registerActivityForAutoLock() {
  ['mousedown', 'keydown', 'touchstart', 'wheel'].forEach(ev => {
    document.addEventListener(ev, () => {
      if (!$('#app').classList.contains('hidden')) scheduleAutoLock();
    }, {
      passive: true
    });
  });
}
async function encryptBlobWithKey(text, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(text || '');
  try {
    const out = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,data));
    return {iv:[...iv],data:[...out]};
  } finally { data.fill(0); }
}
async function decryptBlobWithKey(blob, key) {
  if (!blob) return '';
  const out = await crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: new Uint8Array(blob.iv)
    },
    key,
    new Uint8Array(blob.data)
  );
  const bytes=new Uint8Array(out);
  try { return new TextDecoder('utf-8',{fatal:true}).decode(bytes); }
  finally { bytes.fill(0); }
}
async function changeAccessCode() {
  const oldCode = $('#oldAccessCode')?.value || '';
  const newCode = $('#newAccessCode')?.value || '';
  const confirmCode = $('#confirmAccessCode')?.value || '';

  if (!/^\d{4}$/.test(oldCode) || !/^\d{4}$/.test(newCode)) {
    appNotify('Le code doit contenir exactement 4 chiffres.', {kind: 'error'});
    return;
  }
  if (newCode !== confirmCode) {
    appNotify('Les deux nouveaux codes ne correspondent pas.', {kind: 'error'});
    return;
  }
  if (!await verifyAccessCode(oldCode)) {
    appNotify('Ancien code incorrect.', {kind: 'error'});
    return;
  }
  if (oldCode === newCode) {
    appNotify('Le nouveau code est identique à l’ancien.', {kind: 'error'});
    return;
  }

  const oldKey = await deriveVaultKey(oldCode);
  const newKey = await deriveVaultKey(newCode);
  const vaultItems = (await all('items')).filter(x => x.type === 'vault');

  if (!await appConfirm(`Changer le code et rechiffrer ${vaultItems.length} fiche(s) du coffre ?`)) return;

  try {
    portableBusy = true;
    const changes = [];
    for (const x of vaultItems) {
      if (x.vaultBlobEnc) {
        const clear = await decryptBlobWithKey(x.vaultBlobEnc, oldKey);
        x.vaultBlobEnc = await encryptBlobWithKey(clear, newKey);
      }
      if (x.passwordEnc) {
        const clear = await decryptBlobWithKey(x.passwordEnc, oldKey);
        x.passwordEnc = await encryptBlobWithKey(clear, newKey);
      }
      if (db?.native) changes.push({
        action: 'put',
        store: 'items',
        record: x
      });
      else await rawPut('items', x);
    }
    const accessRecord = {
      key: 'accessCodeHash',
      value: await hashAccessCode(newCode)
    };
    if (db?.native) await db.batch([...changes, {
      action: 'put',
      store: 'settings',
      record: accessRecord
    }]);
    else await rawPut('settings', accessRecord);
    await ensureSecuritySettings();
    portableBusy = false;

    sessionAccessCode = newCode;
    state.vaultKey = newKey;
    const saved = await writePortableFile();
    if (localServiceAvailable() && !saved) {
      appNotify('Le nouveau code et le coffre rechiffre restent dans ce navigateur. Sauvegarde ou exporte cette base avant de fermer.');
      return;
    }
    closeModal();
    appNotify('Code d’accès modifié. Le coffre a été rechiffré.');
    await scheduleAutoLock();
  } catch (e) {
    portableBusy = false;
    console.error(e);
    appNotify('Le changement de code a échoué. Aucune modification complète n’a été validée.', {kind: 'error'});
  }
}

async function resetInterfaceSettings() {
  if (!await appConfirm('Réinitialiser uniquement les réglages d’interface ? Les données ne seront pas supprimées.')) return;
  localStorage.removeItem('itw-explorer-width');
  expandedFolders.clear();
  document.documentElement.style.setProperty('--explorer-width', '260px');
  closeModal();
  renderWorkspace();
}

function initPin() {
  $('#pinDots').innerHTML = Array.from({
    length: 4
  }, () => '<span class="dot"></span>').join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'C'];
  $('#keypad').innerHTML = keys.map(k => `<button type="button" class="key" data-key="${k}" ${/^\d$/.test(k)?'':`title="${k==='C'?'Effacer le code':'Effacer le dernier chiffre'}" aria-label="${k==='C'?'Effacer le code':'Effacer le dernier chiffre'}"`}>${k==='C'?settingsIcon('rotate-ccw'):k}</button>`).join('');
  $('#keypad').onclick = e => {
    const b = e.target.closest('[data-key]');
    if (b) pinKey(b.dataset.key)
  };
  document.addEventListener('keydown', e => {
    if (!$('#lock').classList.contains('hidden')) {
      if (/^\d$/.test(e.key)) pinKey(e.key);
      else if (e.key === 'Backspace') pinKey('⌫');
      else if (e.key === 'Escape') pinKey('C');
    }
  });
  refreshPinLockout();
}
async function pinKey(k) {
  if ($('#lock').classList.contains('hidden') || !connectedWorkspaceReady) return;
  loadPinAttemptState();
  refreshPinLockout();
  if (pinBusy || pinIsBlocked()) return;
  $('#lockError').textContent = '';
  if (k === 'C') pin = '';
  else if (k === '⌫') pin = pin.slice(0, -1);
  else if (/^\d$/.test(k) && pin.length < 4) pin += k;
  else return;
  [...document.querySelectorAll('#pinDots .dot')].forEach((d, i) => d.classList.toggle('on', i < pin.length));
  if (pin.length === 4) {
    const entered = pin,
      attempt = ++pinAttempt;
    setPinBusy(true);
    try {
      const valid = await verifyAccessCode(entered);
      if (attempt !== pinAttempt) return;
      loadPinAttemptState();
      refreshPinLockout();
      if (pinIsBlocked()) return;
      if (valid && connectedWorkspaceReady) {
        const key = await deriveVaultKey(entered);
        if (attempt !== pinAttempt || !connectedWorkspaceReady || pinIsBlocked()) return;
        sessionAccessCode = entered;
        state.vaultKey = key;
        await openSection(workspaceModules.landingSection);
        if (attempt !== pinAttempt || !connectedWorkspaceReady || pinIsBlocked()) return;
        const completed = await unlockTransition.play();
        if (!completed || attempt !== pinAttempt) return;
        clearPinAttemptState();
        pin = '';
        document.querySelectorAll('#pinDots .dot').forEach(dot => dot.classList.remove('on'));
        updateDataStatus(currentDataStatusState(), portableFileName);
        await scheduleAutoLock();
        $('#brand').focus({
          preventScroll: true
        });
      } else {
        recordPinFailure();
        if (!pinIsBlocked()) {
          $('#lockError').textContent = 'Code incorrect (' + pinFailures + '/' + PIN_FAILURE_LIMIT + ').';
          pinResetTimer = setTimeout(() => {
            if (attempt !== pinAttempt) return;
            pinResetTimer = null;
            pin = '';
            setPinBusy(false);
            document.querySelectorAll('#pinDots .dot').forEach(dot => dot.classList.remove('on'));
          }, 350);
        }
      }
    } catch (error) {
      if (attempt !== pinAttempt) return;
      lockApplication();
      $('#lockError').textContent = 'Impossible de d\u00e9verrouiller la base. R\u00e9essaie.';
      console.warn('Unlock failed:', error);
    } finally {
      if (attempt === pinAttempt && !pinResetTimer) setPinBusy(false);
    }
  }
}

/* Legacy desktop key derivation; the web adapter supplies its workspace key. */
async function deriveVaultKey(code) {
  let meta = await setting('vaultCrypto', null);
  if (!meta) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    meta = {
      salt: [...salt]
    };
    await setSetting('vaultCrypto', meta);
  }
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({
      name: 'PBKDF2',
      salt: new Uint8Array(meta.salt),
      iterations: 250000,
      hash: 'SHA-256'
    },
    base, {
      name: 'AES-GCM',
      length: 256
    }, false, ['encrypt', 'decrypt']
  );
}
async function encSecret(text) {
  return encryptBlobWithKey(text,state.vaultKey);
}
async function decSecret(blob) {
  return decryptBlobWithKey(blob,state.vaultKey);
}
