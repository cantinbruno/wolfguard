'use strict';

// The original UI, editors and tools stay unchanged. Only desktop storage and
// the access-code entry are adapted to an encrypted browser workspace.
const webWorkspace = (() => {
  let cryptography, storage, session = null, envelope = null, pendingBackup = null;
  let queue = Promise.resolve(), epoch = 0, busy = false, locking = false, releaseTab = null;
  let enteredCode = '', creationCode = '';
  const originalSettings = openSettings;
  const types = new Set(['vault','memo','procedure','personal','protocol','command','mail','report','template']);
  const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);

  function validate(snapshot) {
    if (!snapshot || !STORES.every(store => Array.isArray(snapshot[store]))) throw new Error('La sauvegarde ne contient pas un espace WolfGuard complet.');
    for (const store of STORES) {
      if (snapshot[store].length > 50000) throw new Error('Sauvegarde trop volumineuse.');
      const ids = new Set();
      for (const record of snapshot[store]) {
        const id = store === 'settings' ? record?.key : record?.id;
        if ((store === 'settings' ? typeof id !== 'string' || id.length > 200 : !safeId(id)) || ids.has(id)) throw new Error('Identifiant de fiche invalide.');
        ids.add(id);
        for (const field of ['folderId','parentId','itemId']) if (record[field] != null && !safeId(record[field])) throw new Error('Lien de fiche invalide.');
        if (store === 'items' && (!types.has(record.type) || typeof record.title !== 'string')) throw new Error('Type de fiche invalide.');
        if (store === 'folders' && (typeof record.name !== 'string' || typeof record.section !== 'string')) throw new Error('Dossier invalide.');
        if (record.attachments && (!Array.isArray(record.attachments) || record.attachments.some(file => typeof file?.name !== 'string' || (file.dataUrl && !/^data:[\w.+-]+\/[\w.+-]+(?:;charset=[^;,]+)?;base64,/i.test(file.dataUrl))))) throw new Error('Pièce jointe invalide.');
      }
    }
    const folders = new Map(snapshot.folders.map(folder => [folder.id, folder]));
    for (const folder of folders.values()) {
      const seen = new Set([folder.id]); let parent = folder.parentId;
      while (parent && folders.has(parent)) { if (seen.has(parent)) throw new Error('Cycle dans les dossiers.'); seen.add(parent); parent = folders.get(parent).parentId; }
    }
    return snapshot;
  }
  const saveStatus = message => { $('#webSaveState').textContent = message; };
  async function claimTab() {
    if (releaseTab) return;
    if (!navigator.locks) throw new Error('Un navigateur récent avec Web Locks est nécessaire.');
    await new Promise((resolve,reject) => {
      navigator.locks.request('wolfguard-web-editor', {ifAvailable:true}, async lock => {
        if (!lock) { reject(new Error('Cet espace est déjà ouvert dans un autre onglet. Verrouille-le avant de continuer ici.')); return; }
        await new Promise(release => { releaseTab = release; resolve(); });
      }).catch(reject);
    });
  }
  function release() { releaseTab?.(); releaseTab = null; }
  async function commit(change) {
    const current = session, generation = epoch;
    if (!current) throw new Error('Espace verrouillé.');
    saveStatus('Enregistrement…');
    const work = queue.then(async () => {
      if (session !== current || generation !== epoch) throw new Error('Espace verrouillé.');
      const payload = structuredClone(current.payload);
      const result = change(payload);
      validate(payload);
      const encrypted = await cryptography.seal(payload,current.key,current.salt,current.envelope.revision+1);
      await storage.write(encrypted,current.envelope.revision);
      current.payload = payload; current.envelope = encrypted; envelope = encrypted;
      if (session === current) { resetSettingsCache(payload.settings); window.workspaceSearch?.invalidate(); saveStatus('Enregistré · Chiffré sur cet appareil'); }
      return result;
    });
    queue = work.catch(() => {});
    return work.catch(error => { if (session === current) saveStatus('Échec de l’enregistrement'); throw error; });
  }
  class BrowserDatabase {
    constructor() { this.native = true; }
    async get(store,id) { await queue; return structuredClone(session?.payload[store]?.find(record => (store === 'settings' ? record.key : record.id) === id)); }
    async all(store) { await queue; return structuredClone(session?.payload[store] || []); }
    readOnly(store) { return this.all(store); }
    storageFiles() { return [{id:'main',name:'Espace local chiffré',path:location.origin,itemCount:session?.payload.items.length || 0}]; }
    batch(operations) {
      const records = structuredClone(operations);
      return commit(payload => {
        for (const operation of records) {
          if (!STORES.includes(operation.store)) throw new Error('Collection invalide.');
          const store = operation.store, field = store === 'settings' ? 'key' : 'id';
          if (operation.action === 'clear') payload[store] = [];
          else if (operation.action === 'delete') payload[store] = payload[store].filter(record => record[field] !== operation.id);
          else if (operation.action === 'put') {
            const index = payload[store].findIndex(record => record[field] === operation.record[field]);
            if (index < 0) payload[store].push(operation.record); else payload[store][index] = operation.record;
          } else throw new Error('Opération de stockage invalide.');
        }
        return true;
      });
    }
    deleteItem(id) { return commit(payload => {
      payload.items = payload.items.filter(record => record.id !== id);
      for (const record of payload.items) if (record.linkedItemIds) record.linkedItemIds = record.linkedItemIds.filter(target => target !== id);
      payload.activity = payload.activity.filter(record => record.itemId !== id);
    }); }
    updateItem(id,update) { return commit(payload => { const item = payload.items.find(record => record.id === id && !isDeleted(record)); if (item) update(item); return structuredClone(item); }); }
    async flush() { await queue; return true; }
  }
  async function seed() {
    const snapshot = {version:2,items:[],folders:[],settings:[{key:'autoLockMinutes',value:5}],activity:[]};
    const files = ['technical-library.json','technical-library-extra.json','technical-library-network-cyber.json'];
    const items = new Map(), folders = new Map();
    for (const file of files) {
      const response = await fetch('data/'+file);
      if (!response.ok) throw new Error('Bibliothèque fournie inaccessible. Réessaie après le chargement du site.');
      const data = await response.json();
      for (const record of data.items || []) items.set(record.id,record);
      for (const record of data.folders || []) folders.set(record.id,record);
    }
    snapshot.items = [...items.values()]; snapshot.folders = [...folders.values()];
    return validate(snapshot);
  }
  async function upgrade(result) {
    const source = result.payload;
    if (Array.isArray(source.settings)) return validate(source);
    // Preserve spaces created with the previous, simplified web release.
    if (source.version !== 1 || !Array.isArray(source.items) || !Array.isArray(source.folders)) throw new Error('Ancienne sauvegarde incompatible.');
    const payload = {version:2,items:[],folders:source.folders.map(folder => ({id:folder.id,name:folder.name,parentId:null,section:folder.section === 'vault' ? 'vault' : 'library'})),settings:[{key:'autoLockMinutes',value:5}],activity:[]};
    for (const item of source.items) {
      const record = {id:item.id,type:item.type,title:item.title,folderId:item.folder || null,updatedAt:item.updatedAt,createdAt:item.updatedAt,tags:[]};
      if (item.type === 'vault') { record.vaultBlobEnc = await encryptBlobWithKey(JSON.stringify({username:item.username,password:item.password,url:item.url,host:'',notes:item.content,custom:[]}),result.key); record.encryptionVersion=2; }
      else { record.type='memo'; record.content='<p>'+esc(item.content).replace(/\n/g,'<br>')+'</p>'; record.unifiedDocument=true; record.commandBlocks=[]; record.attachments=[]; }
      payload.items.push(record);
    }
    return validate(payload);
  }
  function renderKeypad() {
    const exists=!!(pendingBackup || envelope);
    $('#lock .access-heading h2').textContent=pendingBackup ? 'Ouvrir une sauvegarde' : exists ? 'Déverrouiller la base' : creationCode ? 'Confirmer le code' : 'Créer le code de la base';
    $('#pinDots').classList.remove('hidden');
    $('#keypad').classList.remove('hidden');
    $('#webAccessForm').hidden=true;
    $('.web-access-actions').hidden=!pendingBackup;
    $('#pinDots').setAttribute('aria-label',enteredCode.length+' chiffres saisis sur 8');
    $('#pinDots').querySelectorAll('.dot').forEach((dot,index)=>dot.classList.toggle('on',index<enteredCode.length));
    $('#keypad').querySelectorAll('button').forEach(button=>{button.disabled=busy || locking;});
    $('#lock').setAttribute('aria-busy',String(busy || locking));
  }
  function showGate() {
    const exists = !!(pendingBackup || envelope);
    $('#connectionGate').classList.add('hidden'); $('#lock').classList.remove('hidden'); $('#app').classList.add('hidden');
    enteredCode=''; creationCode='';
    $('#webConfirmRow').hidden=true; $('#webConfirm').required=!exists;
    $('#webPassword').autocomplete=exists ? 'current-password' : 'new-password';
    $('#webPassword').minLength=exists ? 1 : 8;
    $('#webPassword').maxLength=exists ? 1024 : 8;
    $('#webPassword').inputMode='numeric';
    if (exists) $('#webPassword').removeAttribute('pattern'); else $('#webPassword').pattern='[0-9]{8}';
    $('.web-access-hint').textContent='Saisis l’ancien mot de passe de cette base ou de cette sauvegarde.';
    $('#webUnlock').textContent=exists ? 'Déverrouiller' : 'Créer et ouvrir';
    $('#webUnlock').disabled=busy || locking;
    $('#webCancelRestore').hidden=!pendingBackup;
    $('#webPassword').value=''; $('#webConfirm').value=''; $('#lockError').textContent='';
    renderKeypad();
    $('#lock').tabIndex=-1;
    $('#lock').focus({preventScroll:true});
  }
  async function keypadKey(key) {
    if (busy || locking || $('#lock').classList.contains('hidden') || document.querySelector('.app-dialog[open]')) return;
    $('#lockError').textContent='';
    if (key==='C') { enteredCode=''; creationCode=''; }
    else if (key==='Backspace') enteredCode=enteredCode.slice(0,-1);
    else if (/^[0-9]$/.test(key) && enteredCode.length<8) enteredCode+=key;
    else return;
    renderKeypad();
    if (enteredCode.length!==8) return;
    const exists=!!(pendingBackup || envelope);
    if (!exists && !creationCode) { creationCode=enteredCode; enteredCode=''; renderKeypad(); return; }
    if (!exists && enteredCode!==creationCode) {
      enteredCode=''; creationCode=''; renderKeypad(); $('#lockError').textContent='Les codes ne correspondent pas. Choisis à nouveau ton code.'; return;
    }
    $('#webPassword').value=exists ? enteredCode : creationCode;
    $('#webConfirm').value=exists ? '' : enteredCode;
    await authenticate({preventDefault(){}});
  }
  async function authenticate(event) {
    event.preventDefault(); if (busy || locking) return;
    busy=true; $('#webUnlock').disabled=true; $('#lockError').textContent='';
    renderKeypad();
    const generation=epoch; let password=$('#webPassword').value, retained=false;
    try {
      await claimTab(); await queue; envelope=await storage.read();
      let result;
      if (pendingBackup || envelope) result=await cryptography.open(pendingBackup || envelope,password);
      else {
        if (password !== $('#webConfirm').value) throw new Error('Les codes ne correspondent pas.');
        cryptography.checkPassword(password); result=await cryptography.create(await seed(),password);
      }
      result.payload=await upgrade(result);
      if (generation !== epoch || document.hidden) return;
      if (pendingBackup && envelope && !await appConfirm('Remplacer l’espace de ce navigateur par cette sauvegarde ? Exporte d’abord les modifications à conserver.')) return;
      if (pendingBackup || !envelope || result.envelope.version !== 2) {
        result.envelope=await cryptography.seal(result.payload,result.key,result.salt,(envelope?.revision || 0)+1);
        await storage.write(result.envelope,envelope?.revision || 0);
        envelope=result.envelope;
      }
      if (generation !== epoch || document.hidden) return;
      session=result; envelope=result.envelope; pendingBackup=null; db=new BrowserDatabase();
      resetSettingsCache(result.payload.settings); connectedWorkspaceReady=true; portableFileName='Espace local chiffré';
      state.vaultKey=result.key; sessionAccessCode=''; retained=true;
      $('#webPassword').value=''; $('#webConfirm').value='';
      await openSection(workspaceModules.landingSection);
      if (generation !== epoch) return;
      await unlockTransition.play();
      await scheduleAutoLock(); saveStatus('Enregistré · Chiffré sur cet appareil');
      navigator.storage?.persist?.().catch(() => {});
    } catch (error) { $('#lockError').textContent=error.message; }
    finally {
      password=''; busy=false; $('#webUnlock').disabled=false;
      enteredCode=''; creationCode=''; $('#webPassword').value=''; $('#webConfirm').value='';
      if (!retained) release();
      renderKeypad();
    }
  }
  async function lock() {
    if (locking) return;
    locking=true; epoch++; session=null; connectedWorkspaceReady=false;
    clearTimeout(autoLockTimer); autoLockTimer=null;
    unlockTransition.cancel(); sectionTransition.cancel(); appMessages.dismiss();
    resetPrimaryWorkspaces(); window.workspaceSearch?.reset(); resetCollectionSearch(); resetNetworkTools(); resetScanTool();
    state.vaultKey=null; state.item=null; state.folder=null; state.mode='view'; sessionAccessCode='';
    $('#content').replaceChildren(); closeModal(); closeContextMenu(); resetSettingsCache();
    document.querySelectorAll('input:not([type=file]),textarea').forEach(element => { element.value=''; });
    document.querySelectorAll('.reader-image-overlay,.folder-menu,.context-menu').forEach(element => element.remove());
    pendingBackup=null; saveStatus('Espace verrouillé'); showGate();
    try { await queue; envelope=await storage.read(); }
    finally { db=null; release(); locking=false; $('#webUnlock').disabled=busy; renderKeypad(); }
  }
  function download(value) {
    const url=URL.createObjectURL(new Blob([JSON.stringify(value)],{type:'application/json'}));
    const anchor=document.createElement('a'); anchor.href=url; anchor.download='WolfGuard-'+new Date().toISOString().slice(0,10)+'.wgweb'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  async function exportWorkspace() {
    const current=session; if (!current) return;
    await queue; if (session===current) { download(current.envelope); appNotify('Sauvegarde chiffrée exportée.'); }
  }
  async function importWorkspace(files) {
    const file=files?.[0]; if (!file || busy || locking) return;
    if (file.size > cryptography.MAX_BYTES*1.4) throw new Error('Sauvegarde trop volumineuse.');
    const backup=cryptography.validateEnvelope(JSON.parse(await file.text()));
    if (session && !await appConfirm('Ouvrir une sauvegarde verrouille la base actuelle. As-tu exporté les modifications à conserver ?')) return;
    await lock(); pendingBackup=backup; showGate();
  }
  async function rotatePassword() {
    let oldPassword=$('#oldAccessCode').value, password=$('#newAccessCode').value;
    const current=session, generation=epoch;
    try {
      if (!current) throw new Error('Espace verrouillé.');
      cryptography.checkPassword(password);
      if (password !== $('#confirmAccessCode').value) throw new Error('Les codes ne correspondent pas.');
      await cryptography.open(current.envelope,oldPassword);
      const work=queue.then(async () => {
        if (session!==current || epoch!==generation) throw new Error('Espace verrouillé.');
        const payload=structuredClone(current.payload);
        const result=await cryptography.create(payload,password,current.envelope.revision+1);
        for (const item of payload.items.filter(item => item.type==='vault')) {
          for (const field of ['vaultBlobEnc','passwordEnc']) if (item[field]) item[field]=await encryptBlobWithKey(await decryptBlobWithKey(item[field],current.key),result.key);
        }
        result.envelope=await cryptography.seal(payload,result.key,result.salt,current.envelope.revision+1);
        await storage.write(result.envelope,current.envelope.revision);
        Object.assign(current,result); envelope=result.envelope;
        if (session===current) { state.vaultKey=result.key; closeModal(); appNotify('Code modifié. Exporte une nouvelle sauvegarde.'); }
      });
      queue=work.catch(() => {}); await work;
    } catch (error) { appNotify(error.message,{kind:'error'}); }
    finally { oldPassword=''; password=''; }
  }

  // Replace host-dependent entry points while retaining the original UI code.
  openDB=async () => db;
  workspaceCanWrite=() => !!session;
  workspaceConnectionLabel=() => 'Navigateur · Enregistrement chiffré';
  ensureSecuritySettings=async () => !!session;
  lockApplication=lock;
  exportDB=exportWorkspace;
  importDB=importWorkspace;
  writePortableFile=async () => { await queue; return !!session; };
  reloadWorkspaceFromSettings=async () => { if (await appConfirm('Verrouiller et recharger cet espace ?')) await lock(); };
  saveWorkspaceFromSettings=async () => { await queue; appNotify('Les modifications sont enregistrées et chiffrées dans ce navigateur.'); };
  changeWorkspaceFromSettings=() => $('#webBackupFile').click();
  changeAccessCode=rotatePassword;
  showChangeCodeForm=() => {
    $('#changeCodeArea').innerHTML='<div class="pin-fields"><label>Code actuel ou ancien mot de passe<input id="oldAccessCode" type="password" maxlength="1024" autocomplete="current-password"></label><label>Nouveau code de 8 chiffres<input id="newAccessCode" type="password" inputmode="numeric" minlength="8" maxlength="8" pattern="[0-9]{8}" autocomplete="new-password"></label><label>Confirmer le code<input id="confirmAccessCode" type="password" inputmode="numeric" minlength="8" maxlength="8" pattern="[0-9]{8}" autocomplete="new-password"></label><div class="settings-form-actions"><button type="button" class="settings-btn primary" id="webChangePassword">Enregistrer</button></div></div>';
    $('#webChangePassword').onclick=rotatePassword;
  };
  openSettings=async initialTab => {
    if (!session) return;
    await originalSettings(initialTab === 'modules' ? 'security' : initialTab);
    if (!session) { closeModal(); return; }
    $('#imp').onclick=() => $('#webBackupFile').click(); $('#exp').onclick=exportWorkspace;
    const security=$('#changeCodeBtn').closest('.settings-row');
    security.querySelector('.settings-row-title').textContent='Code d’accès';
    security.querySelector('.settings-row-desc').textContent='8 chiffres · Chiffrement de la base complète';
    const note=$('.settings-security-note div'); if (note) note.textContent='Conserve ton code : il ne peut pas être récupéré. Exporte régulièrement une sauvegarde chiffrée.';
    for (const row of document.querySelectorAll('#settings-data .settings-row-desc')) row.textContent='Sauvegarde chiffrée .wgweb';
    $('#changeBaseBtn').textContent='Ouvrir une sauvegarde';
  };
  generatePassword=cryptographicPassword;
  function cryptographicPassword(options={}) {
    const length=Math.max(8,Math.min(128,Number(options.length)||24));
    let alphabet='';
    if (options.lower!==false) alphabet+='abcdefghijkmnopqrstuvwxyz';
    if (options.upper!==false) alphabet+='ABCDEFGHJKLMNPQRSTUVWXYZ';
    if (options.numbers!==false) alphabet+='23456789';
    if (options.symbols!==false) alphabet+='!@#$%&*+-_=?.';
    if (!alphabet) alphabet='abcdefghijkmnopqrstuvwxyz';
    const limit=Math.floor(256/alphabet.length)*alphabet.length; let value='';
    while (value.length<length) for (const byte of crypto.getRandomValues(new Uint8Array(128))) { if (byte<limit) value+=alphabet[byte%alphabet.length]; if (value.length===length) break; }
    return value;
  }
  async function start() {
    [cryptography,storage]=await Promise.all([import('./crypto.js?wg=09692c0ca0dd1e33'),import('./storage.js?wg=09692c0ca0dd1e33')]);
    $('#pinDots').replaceChildren(...Array.from({length:8},()=>{const dot=document.createElement('span');dot.className='dot';return dot;}));
    $('#pinDots').setAttribute('role','status');
    $('#keypad').setAttribute('aria-label','Clavier du code à huit chiffres');
    $('#keypad').innerHTML=['1','2','3','4','5','6','7','8','9','Backspace','0','C'].map(key=>'<button type="button" class="key" data-key="'+key+'"'+(key==='Backspace'?' aria-label="Effacer le dernier chiffre"':key==='C'?' aria-label="Effacer le code"':'')+'>'+(key==='Backspace'?'⌫':key==='C'?settingsIcon('rotate-ccw'):key)+'</button>').join('');
    $('#keypad').onclick=event=>{const button=event.target.closest('[data-key]');if(button)keypadKey(button.dataset.key);};
    window.addEventListener('keydown',event=>{
      if ($('#lock').classList.contains('hidden') || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || document.querySelector('.app-dialog[open]')) return;
      // AZERTY reports &, é, etc. on Digit1, Digit2... without Shift. Numpad
      // codes identify the digits even when NumLock reports navigation keys.
      const physical=/^(?:Digit|Numpad)([0-9])$/.exec(event.code || '');
      const digit=/^[0-9]$/.test(event.key) ? event.key : physical?.[1];
      const action=digit ?? (event.key==='Backspace' ? 'Backspace' : ['Delete','Escape'].includes(event.key) ? 'C' : null);
      if (action!==null || event.key==='Enter') {
        event.preventDefault();event.stopPropagation();
        if(action!==null)keypadKey(action);
      }
    },true);
    document.addEventListener('paste',event=>{
      if ($('#lock').classList.contains('hidden') || busy || locking || document.querySelector('.app-dialog[open]')) return;
      const code=event.clipboardData?.getData('text');
      if (!/^[0-9]{8}$/.test(code || '')) {
        // Keep old encrypted spaces accessible by pasting their original secret,
        // without displaying another field or button on the keypad screen.
        if ((pendingBackup || envelope) && code && code.length<=1024) {
          event.preventDefault(); enteredCode=''; creationCode='';
          $('#webPassword').value=code; $('#webConfirm').value='';
          authenticate({preventDefault(){}});
        }
        return;
      }
      event.preventDefault();enteredCode='';for(const digit of code)keypadKey(digit);
    });
    const form=document.createElement('form'); form.id='webAccessForm';
    form.hidden=true;
    form.innerHTML='<label>Ancien mot de passe<input id="webPassword" type="password" maxlength="1024" autocomplete="current-password" required></label><label id="webConfirmRow" hidden>Confirmer le code<input id="webConfirm" type="password" inputmode="numeric" minlength="8" maxlength="8" pattern="[0-9]{8}" autocomplete="new-password"></label><p class="web-access-hint"></p><button type="submit" class="primary" id="webUnlock">Déverrouiller</button>';
    $('#lockError').before(form); form.onsubmit=authenticate;
    const actions=document.createElement('div'); actions.className='web-access-actions';
    actions.hidden=true;
    actions.innerHTML='<button type="button" class="secondary" id="webCancelRestore" hidden>Annuler</button><input id="webBackupFile" type="file" accept=".wgweb,application/json" hidden>';
    $('#lock .lock-card').append(actions);
    $('#webCancelRestore').onclick=() => { pendingBackup=null; showGate(); };
    $('#webBackupFile').onchange=event => { importWorkspace(event.target.files).catch(error => appNotify(error.message,{kind:'error'})); event.target.value=''; };
    const status=document.createElement('div'); status.id='webSaveState'; status.className='web-save-state'; status.setAttribute('role','status'); document.body.append(status);
    topNavigation.init(); $('#brand').onclick=() => switchPrimaryWorkspace(workspaceModules.landingSection); $('#settingsBtn').onclick=() => openSettings();
    document.addEventListener('click',event => { if (!event.target.closest('.search')) hideSearch(); });
    applyExplorerWidth(getExplorerWidth()); registerActivityForAutoLock();
    // Rich clipboard HTML must be sanitized before it enters the live editor.
    document.addEventListener('paste',event => {
      if (!event.target.closest?.('#richEditor')) return;
      const html=event.clipboardData?.getData('text/html');
      if (html) { event.preventDefault(); event.stopImmediatePropagation(); document.execCommand('insertHTML',false,documentHTML(html)); }
    },true);
    document.addEventListener('visibilitychange',() => { if (document.hidden) { if (session) lock(); else epoch++; } });
    window.addEventListener('pagehide',() => { epoch++; session=null; state.vaultKey=null; resetPrimaryWorkspaces(); $('#content').replaceChildren(); closeModal(); release(); });
    window.addEventListener('pageshow',event => { if (event.persisted) lock(); });
    window.addEventListener('unhandledrejection',event => { event.preventDefault(); appNotify(event.reason?.message || 'Opération impossible.',{kind:'error'}); });
    if (!isSecureContext || !crypto.subtle) throw new Error('Ouvre le site via HTTPS ou localhost.');
    envelope=await storage.read(); showGate();
  }
  return {start};
})();
webWorkspace.start().catch(error => { $('#lock').classList.remove('hidden'); $('#lockError').textContent=error.message; });
