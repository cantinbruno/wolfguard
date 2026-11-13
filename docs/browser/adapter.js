'use strict';

// The original UI, editors and tools stay unchanged. Only desktop storage and
// the access-code entry are adapted to an encrypted browser workspace.
const webWorkspace = (() => {
  let cryptography, storage, cloud, tabSessions, shared, tabSession, session = null, envelope = null;
  let queue = Promise.resolve(), epoch = 0, busy = false, locking = false, releaseTab = null;
  let enteredCode = '', creationCode = '', booting = true;
  let sessionClock = null, rotating = false, cloudHeartbeat = null, sessionTimerDue = 0;
  let sharedTimer=null, sharedRefreshing=null, agentChoice=null,accountSetupActive=false,mfaWaiting=false,setupUsername='';
  window.addEventListener('wolfguard-user-changed',()=>{if(session&&cloud?.hasSession()){session.payload=hydrateVaultHomes(session.payload);window.workspaceSearch?.invalidate();}});
  const agentChoiceKey=()=> 'wolfguard-agent-choice-v1'+(cloud?.currentUser()?.id?':'+cloud.currentUser().id:'');
  // Absolute deadline: interaction and reload never grant another four hours.
  const SESSION_MS = 4 * 60 * 60 * 1000;
  function updateMFAIndicator(){
    const button=$('#settingsBtn'),mfa=cloud?.currentUser()?.mfa,pending=!!(session&&cloud?.enabled&&cloud.hasUsers()&&mfa&&!mfa.complete);
    button?.classList.toggle('web-mfa-pending',pending);if(button)button.title=pending?'Paramètres · MFA à configurer':'Paramètres';
  }
  function sessionView() { return {section: state.section, item: state.item, folder: state.folder, tool: networkToolsView.tool}; }
  function updateReloadTicket() { if (session && sessionClock) tabSession?.update(sessionClock, cloud.sessionState(), sessionView()); }
  async function rememberSession() {
    if (!session || !sessionClock) return;
    try { await tabSession.remember({key: session.key, salt: session.salt, clock: sessionClock, cloud: cloud.sessionState(), scope: cloud.enabled ? 'shared' : 'local', view: sessionView()}); }
    catch { await tabSession.forget().catch(() => {}); }
  }
  function activateSession(result, clock = {started: Date.now(), active: Date.now()}) {
    result.payload=hydrateVaultHomes(result.payload);
    session = result; envelope = result.envelope; db = new BrowserDatabase();
    if(cloud.enabled){
      session.cloudVersion=cloud.currentVersion();
      try{agentChoice=sessionStorage.getItem(agentChoiceKey());}catch{}
      if(agentChoice===null){agentChoice=result.payload.settings.find(row=>row.key==='scanAgentId')?.value||'';try{sessionStorage.setItem(agentChoiceKey(),agentChoice);}catch{}}
      clearInterval(sharedTimer);sharedTimer=setInterval(()=>refreshShared(),10000);
    }
    const wall = Date.now(), mono = performance.now();
    sessionClock = {...clock, monotonicStart: mono - (wall - clock.started), monotonicActive: mono - (wall - clock.active)};
    armSessionTimer();
    if (cloud.enabled) { clearInterval(cloudHeartbeat); cloudHeartbeat = setInterval(() => { if (session && !sessionExpired()) cloud.touch().catch(() => lock()); }, 25000); }
    resetSessionSettings(result.payload.settings); connectedWorkspaceReady = true; portableFileName = cloud.enabled ? 'Espace partagé chiffré' : 'Espace local chiffré';
    state.vaultKey = result.key; sessionAccessCode = '';
    topNavigation.refresh?.();
    updateMFAIndicator();
  }
  async function resumeAfterReload() {
    let claimed = false;
    try {
      const saved = await tabSession.restore(cloud.enabled ? 'shared' : 'local');
      if (!saved) return false;
      const generation = epoch;
      await claimTab(); claimed = true;
      let latest = envelope;
      if (cloud.enabled) {
        cloud.restoreSession(saved.cloud);
        const identity=await cloud.me();if(!identity.usersEnabled)throw new Error('Crée le compte administrateur à la connexion.');
        latest = cryptography.validateEnvelope(await cloud.load());
      }
      const result = await cryptography.openWithKey(latest, saved.key, saved.salt);
      result.payload = await upgrade(result);
      if (generation !== epoch || !tabSessions.validClock(saved.clock)) throw new Error('Session expirée.');
      if (cloud.enabled) {
        if (envelope && envelope.iv !== latest.iv) await storage.preserve(envelope);
        await storage.cacheShared(latest,cloud.currentVersion());
      }
      activateSession(result, saved.clock);
      // Scan renderers need an active workspace while their async data loads.
      // Keep it invisible until the restored section has finished rendering.
      $('#app').style.visibility = 'hidden'; $('#app').classList.remove('hidden');
      const section = workspaceModules.allows(saved.view?.section) ? saved.view.section : workspaceModules.landingSection;
      const item = safeId(saved.view?.item) ? await get('items', saved.view.item) : null;
      const folder = safeId(saved.view?.folder) ? await get('folders', saved.view.folder) : null;
      await openSection(section, null, {resume: {section, item: item && !item.deletedAt && workspaceModules.allowsItem(item) ? item.id : null, folder: folder && !folder.deletedAt ? folder.id : null, tool: saved.view?.tool}});
      if (generation !== epoch || sessionExpired()) throw new Error('Session expirée.');
      await rememberSession();
      if (generation !== epoch || !session) return false;
      $('#connectionGate').classList.add('hidden'); $('#lock').classList.add('hidden'); $('#app').classList.remove('hidden');
      saveStatus(savedMessage());
      return true;
    } catch {
      if (session) await lock();
      else { await tabSession.forget({tabOnly: !claimed}).catch(() => {}); cloud.clear(); release(); }
      return false;
    } finally {
      $('#app').style.removeProperty('visibility');
    }
  }
  function sessionExpired() {
    return !session || !sessionClock || Math.max(Date.now()-sessionClock.started,performance.now()-sessionClock.monotonicStart) >= SESSION_MS;
  }
  function assertFreshSession() {
    if (sessionExpired()) { lock(); throw new Error('Session expirée. Saisis à nouveau ton code.'); }
  }
  function armSessionTimer() {
    clearTimeout(autoLockTimer); autoLockTimer=null; sessionTimerDue=0;
    if(!session || !sessionClock)return;
    const remaining=SESSION_MS-Math.max(Date.now()-sessionClock.started,performance.now()-sessionClock.monotonicStart);
    sessionTimerDue=Date.now()+Math.max(0,remaining);
    autoLockTimer=setTimeout(()=>{if(sessionExpired())lock();else armSessionTimer();},Math.max(1,remaining));
  }
  let attemptState = {failures:0,blockedUntil:0}, attemptScope = '', attemptTimer = null, attemptsUnavailable=false;
  const attemptChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('wolfguard-access-attempts') : null;
  const accessScope = () => cloud?.enabled ? 'shared' : envelope?.salt || '';
  const accessBlocked = () => attemptsUnavailable || (attemptScope === accessScope() && attemptState.blockedUntil > Date.now());
  async function loadAttempts() {
    const scope=accessScope(), state=await storage.readAttempts(scope);
    if(scope===accessScope()){attemptScope=scope;attemptState=state;attemptsUnavailable=false;}
  }
  const announceAttempts = scope => attemptChannel?.postMessage({scope});
  const originalSettings = openSettings;
  // Keep saved Checklist records readable after restoring the vault interface.
  const types = new Set(['task','vault','memo','procedure','personal','protocol','command','mail','report','template']);
  const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);

  function validate(snapshot) {
    if (!snapshot || !STORES.every(store => Array.isArray(snapshot[store]))) throw new Error('La sauvegarde ne contient pas un espace WolfGuard complet.');
    for (const store of STORES) {
      if (snapshot[store].length > 50000) throw new Error('Sauvegarde trop volumineuse.');
      const ids = new Set();
      for (const record of snapshot[store]) {
        if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Enregistrement invalide.');
        const id = store === 'settings' ? record?.key : record?.id;
        if ((store === 'settings' ? typeof id !== 'string' || id.length > 200 : !safeId(id)) || ids.has(id)) throw new Error('Identifiant de fiche invalide.');
        ids.add(id);
        for (const field of ['folderId','parentId','itemId','consolidatedInto']) if (record[field] != null && !safeId(record[field])) throw new Error('Lien de fiche invalide.');
        if (store === 'items' && (!types.has(record.type) || typeof record.title !== 'string')) throw new Error('Type de fiche invalide.');
        if (record.tags != null && (!Array.isArray(record.tags) || record.tags.length>256 || record.tags.some(tag=>typeof tag!=='string' || tag.length>200))) throw new Error('Étiquettes invalides.');
        if (record.linkedItemIds != null && (!Array.isArray(record.linkedItemIds) || record.linkedItemIds.some(id=>!safeId(id)))) throw new Error('Liens de fiches invalides.');
        if (store === 'items' && record.type === 'task' && (record.title.length > 300 || typeof record.content !== 'string' || record.content.length > 10000 || typeof record.completed !== 'boolean' || !['low','normal','high'].includes(record.priority) || typeof record.dueDate !== 'string' || (record.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(record.dueDate)))) throw new Error('Tâche invalide.');
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
  const saveStatus = message => { $('#webSaveLabel').textContent = message;$('#webSharedRefresh').hidden=!cloud?.enabled||!session; };
  const savedMessage = () => cloud?.enabled ? 'Enregistré · Synchronisé et chiffré' : 'Enregistré · Chiffré sur cet appareil';
  function resetSessionSettings(records){resetSettingsCache(records);if(cloud?.enabled&&agentChoice!==null)settingsCache.set('scanAgentId',agentChoice);}
  function canRefreshShared(){
    return session&&!busy&&!locking&&!rotating&&!document.hidden&&state.mode!=='edit'&&primaryWorkspaces.memo?.state.mode!=='edit'&&!sectionTransition.active&&!$('#modalRoot')?.children.length&&!document.querySelector('.app-dialog[open]')&&!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')&&!window.getSelection()?.toString();
  }
  async function refreshShared({manual=false}={}){
    if(!cloud?.enabled||!session)return false;
    if(sharedRefreshing)return sharedRefreshing;
    if(!canRefreshShared()){if(manual)saveStatus('Brouillon ou formulaire ouvert · Actualisation après sa fermeture');return false;}
    const current=session,generation=epoch;
    const fresh=()=>session===current&&epoch===generation&&!sessionExpired();
    const work=queue.then(async()=>{
      if(!fresh()||!canRefreshShared())return false;
      const latest=await cloud.refresh(current.cloudVersion);
      if(!latest||!fresh()||!canRefreshShared())return false;
      const version=cloud.currentVersion(),result=await cryptography.openWithKey(latest,current.key,current.salt);
      result.payload=hydrateVaultHomes(result.payload);
      validate(result.payload);
      if(!fresh()||!canRefreshShared())return false;
      const changed=!shared.sameValue(current.payload.items,result.payload.items)||!shared.sameValue(current.payload.folders,result.payload.folders);
      await storage.cacheShared(result.envelope,version);
      if(!fresh())return false;
      Object.assign(current,result,{cloudVersion:version});envelope=result.envelope;
      resetSessionSettings(result.payload.settings);window.workspaceSearch?.invalidate();updateReloadTicket();
      if(primaryWorkspaces.memo?.state.mode!=='edit')primaryWorkspaces.memo=null;
      saveStatus('À jour · Espace partagé chiffré');
      return changed;
    });
    queue=work.catch(()=>{});
    sharedRefreshing=(async()=>{
      try{
        const changed=await work;
        // Scans and remote sessions keep their own live DOM and connections.
        if(changed&&fresh()&&canRefreshShared()&&['library','vault'].includes(state.section)){
          if(state.item&&!current.payload.items.some(row=>row.id===state.item&&!row.deletedAt))state.item=null;
          saveExplorerScroll();const content=$('#content');
          const scrolls=[...content.querySelectorAll('[id]')].filter(node=>node.scrollTop||node.scrollLeft).map(node=>({id:node.id,top:node.scrollTop,left:node.scrollLeft}));
          content.inert=true;
          try{await renderWorkspace();if(fresh())for(const position of scrolls){const node=document.getElementById(position.id);if(node){node.scrollTop=position.top;node.scrollLeft=position.left;}}}
          finally{content.inert=false;}
        }
        if(manual&&fresh()&&!changed)saveStatus('À jour · Espace partagé chiffré');
        return changed;
      }catch(error){
        console.warn('Actualisation de l’espace partagé impossible.',error);
        if(fresh()){
          if(error.code==='CLOUD_ACCESS'||error.code==='INVALID_ACCESS_CODE')await lock();
          else saveStatus('Synchronisation indisponible · Réessaie dans quelques instants');
        }
        return false;
      }finally{sharedRefreshing=null;}
    })();
    return sharedRefreshing;
  }
  const gateExists = () => !!envelope || (cloud?.enabled && (cloud.isInitialized()!==false || !cloud.canActivate()));
  async function claimTab() {
    if(cloud.enabled)return;
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
  async function cacheSnapshot(value,expectedRevision) {
    try{if(cloud.enabled)await storage.cacheShared(value,cloud.currentVersion());else await storage.write(value,expectedRevision);}
    catch(error){
      if(cloud.enabled && session){
        // The server already committed. Continuing with an older payload or
        // key could overwrite the new snapshot, especially after code rotation.
        queueMicrotask(()=>lock());
        throw new Error('La copie partagée est enregistrée. Rouvre WolfGuard pour la récupérer sur cet appareil.');
      }
      throw error;
    }
  }
  async function commit(change,{backupOrganization=false,editBase=null,replace=false}={}) {
    assertFreshSession();
    const current = session, generation = epoch;
    if (!current) throw new Error('Espace verrouillé.');
    saveStatus('Enregistrement…');
    const work = queue.then(async () => {
      if (session !== current || generation !== epoch) throw new Error('Espace verrouillé.');
      assertFreshSession();
      const base=structuredClone(current.payload);
      if(editBase){const index=base.items.findIndex(row=>row.id===editBase.id);if(index<0)base.items.push(structuredClone(editBase));else base.items[index]=structuredClone(editBase);}
      let payload = structuredClone(base);
      const result = change(payload);
      validate(payload);
      window.WolfGuardAccess?.assertChanges(base,payload);
      for(const version of Array.isArray(backupOrganization)?backupOrganization:backupOrganization?[backupOrganization]:[])await storage.preserveOrganization(current.envelope,version);
      let encrypted = await cryptography.seal(payload,current.key,current.salt,current.envelope.revision+1);
      if(cloud.enabled){
        const wanted=payload,recovery=encrypted;
        try{
          for(let attempt=0;attempt<3;attempt++){
            const latest=await cryptography.openWithKey(await cloud.load(),current.key,current.salt);validate(latest.payload);
            latest.payload=hydrateVaultHomes(latest.payload);
            if(session!==current||generation!==epoch)throw new Error('Espace verrouillé.');
            if(replace&&!shared.sameValue(base,latest.payload))throw shared.sharedConflict();
            payload=validate(shared.mergeWorkspace(base,wanted,latest.payload));
            encrypted=await cryptography.seal(payload,current.key,current.salt,latest.envelope.revision+1);
            assertFreshSession();if(session!==current||generation!==epoch)throw new Error('Espace verrouillé.');
            try{await cloud.save(encrypted);break;}catch(error){if(error.code!=='CLOUD_CONFLICT'||attempt===2)throw error;}
          }
        }catch(error){await storage.preserve(recovery,true);if(error.code==='CLOUD_ACCESS'||error.code==='INVALID_ACCESS_CODE')queueMicrotask(()=>lock());throw error;}
        if(session!==current || generation!==epoch)throw new Error('Espace verrouillé. La copie distante est enregistrée.');
      }
      await cacheSnapshot(encrypted,current.envelope.revision);
      current.payload = payload; current.envelope = encrypted; envelope = encrypted;
      if(cloud.enabled)current.cloudVersion=cloud.currentVersion();
      if (session === current) { resetSessionSettings(payload.settings); window.workspaceSearch?.invalidate(); saveStatus(savedMessage()); updateReloadTicket(); }
      return result;
    });
    queue = work.catch(() => {});
    return work.catch(error => { if (session === current) saveStatus('Échec de l’enregistrement'); throw error; });
  }
  class BrowserDatabase {
    constructor() { this.native = true; }
    async get(store,id) { assertFreshSession();await queue;assertFreshSession();if(cloud.enabled&&store==='settings'&&id==='scanAgentId')return {key:id,value:agentChoice};return structuredClone(session?.payload[store]?.find(record => (store === 'settings' ? record.key : record.id) === id)); }
    async all(store) { assertFreshSession();await queue;assertFreshSession();return structuredClone(session?.payload[store] || []); }
    readOnly(store) { return this.all(store); }
    storageFiles() { return [{id:'main',name:cloud?.enabled?'Espace partagé chiffré':'Espace local chiffré',path:location.origin,itemCount:session?.payload.items.length || 0}]; }
    batch(operations) {
      assertFreshSession();
      const records = structuredClone(operations).filter(operation=>{
        if(cloud.enabled&&operation.store==='settings'&&(operation.record?.key==='scanAgentId'||operation.id==='scanAgentId')){
          const choice=operation.action==='delete'?'':String(operation.record?.value||'');
          sessionStorage.setItem(agentChoiceKey(),choice);agentChoice=choice;settingsCache.set('scanAgentId',choice);return false;
        }
        if(cloud.enabled&&!cloud.isAdmin()&&operation.store==='activity')return false;
        if(cloud.enabled&&!cloud.isAdmin()&&operation.store==='settings'){
          const id=operation.record?.key||operation.id;if(id){const value=operation.action==='delete'?null:operation.record?.value;settingsCache.set(id,value);try{sessionStorage.setItem('wolfguard-pref:'+cloud.currentUser().id+':'+id,JSON.stringify(value));}catch{}}return false;
        }
        return true;
      });
      if(!records.length)return Promise.resolve(true);
      const backupVersion=records.some(operation=>operation.store==='settings' && operation.record?.key==='memo-form-cleanup-version')?3:records.some(operation=>operation.store==='settings' && operation.record?.key==='memo-mail-cleanup-version')?2:records.find(operation=>operation.store==='settings' && operation.record?.key==='memo-folder-organization-version')?.record.value||false;
      const backupOrganization=[...(records.some(operation=>operation.store==='settings'&&operation.record?.key==='memo-consolidation-version')?[5]:[]),...(records.some(operation=>operation.store==='settings'&&operation.record?.key==='procedure-technology-organization-version')?[4]:[]),...(backupVersion?[backupVersion]:[])];
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
      },{backupOrganization});
    }
    deleteItem(id) { return commit(payload => {
      payload.items = payload.items.filter(record => record.id !== id);
      for (const record of payload.items) if (record.linkedItemIds) record.linkedItemIds = record.linkedItemIds.filter(target => target !== id);
      payload.activity = payload.activity.filter(record => record.itemId !== id);
    }); }
    updateItem(id,update) { if(window.WolfGuardAccess?.restricted()){const item=session.payload.items.find(row=>row.id===id);if(item&&!WolfGuardAccess.action(item,'edit','items',session.payload.folders)){const changed=structuredClone(item);update(changed);const before=structuredClone(item);for(const field of ['viewCount','lastViewedAt']){delete changed[field];delete before[field];}if(!shared.sameValue(before,changed)){try{WolfGuardAccess.reject();}catch(error){return Promise.reject(error);}}return Promise.resolve(structuredClone(item));}}return commit(payload => { const item = payload.items.find(record => record.id === id && !isDeleted(record)); if (item) update(item); return structuredClone(item); }); }
    saveEditedItem(item,base) { return commit(payload=>{const index=payload.items.findIndex(row=>row.id===item.id);if(index<0)payload.items.push(structuredClone(item));else payload.items[index]=structuredClone(item);return true;},{editBase:base}); }
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
    const source = hydrateVaultHomes(result.payload);
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
  function hydrateVaultHomes(payload){
    if(!cloud?.enabled||!cloud.hasUsers()||!cloud.can('vault.read'))return payload;
    const homes=cloud.currentUser()?.vaultFolders||[],folders=new Map(payload.folders.map(folder=>[folder.id,folder]));
    for(const home of homes){const level=folders.get(home.id)?.accessLevel;folders.set(home.id,{...structuredClone(home),...(level?{accessLevel:level}:{})});}
    return {...payload,folders:[...folders.values()]};
  }
  function renderKeypad() {
    if(!$('#webAccessForm')||accountSetupActive)return;
    $('#webUsernameRow').hidden=true;
    const exists=gateExists();
    $('#lock .access-heading h2').textContent=exists ? '' : creationCode ? 'Confirmer le code' : 'Créer le code de la base';
    $('#lock .access-heading').classList.toggle('web-empty-heading',exists);
    $('#pinDots').classList.remove('hidden');
    $('#keypad').classList.remove('hidden');
    $('#webAccessForm').hidden=true;
    $('#pinDots').setAttribute('aria-label',enteredCode.length+' chiffres saisis sur 8');
    const blocked=accessBlocked();
    $('#pinDots').querySelectorAll('.dot').forEach((dot,index)=>{
      dot.classList.toggle('on',index<enteredCode.length);
      dot.classList.toggle('is-next',index===enteredCode.length && !busy && !blocked);
    });
    $('#lock').classList.toggle('is-checking',busy && !locking);
    $('#lock').classList.toggle('is-blocked',blocked);
    const hint=$('#webKeyHint');
    if(hint)hint.textContent=booting?'Chargement de ton espace…':busy?'Vérification du code…':blocked?'Accès temporairement suspendu':'';
    $('#keypad').querySelectorAll('button').forEach(button=>{button.disabled=busy || locking || booting || blocked;});
    $('#webUnlock').disabled=busy || locking || booting || blocked;
    $('#lock').setAttribute('aria-busy',String(busy || locking || booting));
    clearTimeout(attemptTimer);attemptTimer=null;
    if(attemptsUnavailable){
      $('#lockError').textContent='Le contrôle des tentatives est indisponible. Vérifie le stockage du navigateur puis recharge la page.';
    }else if(blocked){
      $('#lockError').dataset.accessTimeout='true';
      $('#lockError').textContent='Code incorrect. Réessaie dans '+Math.ceil((attemptState.blockedUntil-Date.now())/1000)+' s.';
      if(!$('#lock').classList.contains('hidden'))attemptTimer=setTimeout(renderKeypad,Math.min(1000,attemptState.blockedUntil-Date.now()));
    }else if($('#lockError').dataset.accessTimeout){
      delete $('#lockError').dataset.accessTimeout;$('#lockError').textContent='';
    }
  }
  function showGate() {
    const exists = gateExists();
    $('#webUsername').value='';
    $('#connectionGate').classList.add('hidden'); $('#lock').classList.remove('hidden'); $('#app').classList.add('hidden');
    enteredCode=''; creationCode='';
    $('#webConfirmRow').hidden=true; $('#webConfirm').required=!exists;
    $('#webPassword').autocomplete=exists ? 'current-password' : 'new-password';
    $('#webPassword').minLength=exists ? 1 : 8;
    $('#webPassword').maxLength=exists ? 1024 : 8;
    $('#webPassword').inputMode='numeric';
    if (exists) $('#webPassword').removeAttribute('pattern'); else $('#webPassword').pattern='[0-9]{8}';
    $('.web-access-hint').textContent='Saisis l’ancien mot de passe de cette base.';
    $('#webUnlock').textContent=exists ? 'Déverrouiller' : 'Créer et ouvrir';
    $('#webUnlock').disabled=busy || locking;
    $('#webPassword').value=''; $('#webConfirm').value=''; $('#lockError').textContent='';
    renderKeypad();
    $('#lock').tabIndex=-1;
    $('#lock').focus({preventScroll:true});
  }
  async function keypadKey(key) {
    if (busy || locking || booting || accountSetupActive || accessBlocked() || $('#lock').classList.contains('hidden') || document.querySelector('.app-dialog[open]')) return;
    const pressed=$('#keypad').querySelector('[data-key="'+key+'"]');
    if(pressed){pressed.classList.add('is-pressed');setTimeout(()=>pressed.classList.remove('is-pressed'),130);}
    $('#lockError').textContent='';
    if (key==='C') { enteredCode=''; creationCode=''; }
    else if (key==='Backspace') enteredCode=enteredCode.slice(0,-1);
    else if (/^[0-9]$/.test(key) && enteredCode.length<8) enteredCode+=key;
    else return;
    renderKeypad();
    if (enteredCode.length!==8) return;
    const exists=gateExists();
    if (!exists && !creationCode) { creationCode=enteredCode; enteredCode=''; renderKeypad(); return; }
    if (!exists && enteredCode!==creationCode) {
      enteredCode=''; creationCode=''; renderKeypad(); $('#lockError').textContent='Les codes ne correspondent pas. Choisis à nouveau ton code.'; return;
    }
    $('#webPassword').value=exists ? enteredCode : creationCode;
    $('#webConfirm').value=exists ? '' : enteredCode;
    await authenticate({preventDefault(){}});
  }
  function drawAuthenticatorQR(canvas,uri){
    const qr=qrcodegen.QrCode.encodeText(uri,qrcodegen.QrCode.Ecc.MEDIUM),scale=4,border=4;canvas.width=canvas.height=(qr.size+border*2)*scale;
    const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.fillStyle='#000';for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)if(qr.getModule(x,y))context.fillRect((x+border)*scale,(y+border)*scale,scale,scale);
  }
  function enrollRequiredMFA(info,password){
    return new Promise((resolve,reject)=>{
      const dialog=document.createElement('dialog');dialog.className='app-dialog web-mfa-enrollment';dialog.setAttribute('aria-labelledby','webEnrollTitle');
      dialog.innerHTML='<span class="web-mfa-required-label">OBLIGATOIRE · PROPRE À TON COMPTE</span><h2 id="webEnrollTitle">Configure ta double authentification</h2><p>'+esc(info.username)+' · Aucun accès à l’espace avant la validation des six chiffres.</p><p>Scanne ce QR code avec ton application d’authentification pour obtenir ton code à six chiffres.</p><canvas id="webEnrollQR" role="img" aria-label="QR code personnel Authenticator"></canvas><label>Ou saisis cette clé temporelle (TOTP)<input id="webEnrollSecret" readonly spellcheck="false" value="'+esc(info.secret)+'"></label><button type="button" class="settings-btn" id="webEnrollCopy">Copier la clé</button><form id="webEnrollForm"><label>Code Authenticator de 6 chiffres<input id="webEnrollOTP" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required></label><p role="alert" id="webEnrollError"></p><div class="app-dialog-actions"><button type="button" id="webEnrollCancel">Annuler</button><button type="submit" class="primary">Valider ma MFA</button></div></form>';
      document.body.append(dialog);drawAuthenticatorQR(dialog.querySelector('#webEnrollQR'),info.uri);dialog.showModal();let done=false,working=false;
      const finish=(value,error)=>{if(done)return;done=true;password='';info.secret='';info.uri='';dialog.querySelectorAll('input,textarea').forEach(input=>input.value='');dialog.close();dialog.remove();if(error)reject(error);else resolve(value);};
      const cancel=()=>finish(null,new Error('Configuration MFA annulée. Reconnecte-toi pour la reprendre.'));
      dialog.oncancel=event=>{event.preventDefault();cancel();};dialog.querySelector('#webEnrollCancel').onclick=cancel;
      dialog.querySelector('#webEnrollCopy').onclick=()=>copyText(info.secret);
      dialog.querySelector('form').onsubmit=async event=>{
        event.preventDefault();if(working)return;working=true;const button=dialog.querySelector('[type=submit]');button.disabled=true;
        try{
          const result=await cloud.login(password,info.username,dialog.querySelector('#webEnrollOTP').value);if(done){cloud.clear();return;}
          if(!result.token||!Array.isArray(result.recoveryCodes))throw new Error('La configuration a changé. Recommence la connexion.');
          info.secret='';info.uri='';password='';
          dialog.innerHTML='<h2 id="webEnrollTitle">Ton Authenticator est prêt</h2><p>La double authentification est activée. Utilise les six chiffres de ton application d’authentification.</p><p>Enregistre ces codes de secours dans un endroit sûr. Chaque code ne peut servir qu’une fois si tu perds ton téléphone.</p><textarea id="webEnrollRecovery" readonly rows="8" aria-label="Codes de secours personnels"></textarea><label class="web-mfa-backup-check"><input id="webEnrollSaved" type="checkbox">J’ai enregistré mes codes de secours</label><div class="app-dialog-actions"><button type="button" class="primary" id="webEnrollContinue" disabled>Continuer</button></div>';
          dialog.querySelector('textarea').value=result.recoveryCodes.join('\n');delete result.recoveryCodes;
          dialog.querySelector('#webEnrollSaved').onchange=event=>dialog.querySelector('#webEnrollContinue').disabled=!event.target.checked;
          dialog.querySelector('#webEnrollContinue').onclick=()=>finish(result);
          dialog.oncancel=event=>{event.preventDefault();cloud.clear();cancel();};
        }catch(error){if(!done){dialog.querySelector('#webEnrollError').textContent=error.message;dialog.querySelector('#webEnrollOTP').value='';}}
        finally{working=false;if(button.isConnected)button.disabled=false;}
      };
      dialog.querySelector('#webEnrollOTP').focus();
    });
  }
  async function openShared(password) {
    if(!/^[0-9]{8}$/.test(password))throw new Error('Le partage utilise ton code de 8 chiffres.');
    await cloud.status();
    let result, remote=false;
    const previous=envelope;
    if(!cloud.isInitialized()){
      if(!cloud.canActivate())throw new Error('Active le partage une seule fois avec le lien privé, sur l’appareil qui contient tes données.');
      if(previous)result=await cryptography.open(previous,password);
      else{
        if(password!==$('#webConfirm').value)throw new Error('Les codes ne correspondent pas.');
        result=await cryptography.create(await seed(),password);
      }
      result.payload=await upgrade(result);
      await cloud.initialize(password);
    }else{
      let info=await cloud.login(password,setupUsername||undefined);setupUsername='';
      if(info.accountSelection){
        mfaWaiting=true;
        let username=await appPrompt('Ce code est partagé par plusieurs comptes. Saisis ton adresse e-mail pour identifier ton compte, puis ton code MFA.','', {title:'Choisir ton compte',confirmLabel:'Continuer',placeholder:'prenom.nom@exemple.fr'});
        if(username===null)throw new Error('Connexion annulée.');
        username=username.trim().toLowerCase();
        let otp=await appPrompt('Saisis le code à 6 chiffres de ton application d’authentification, ou un code de secours.','', {title:'Vérification MFA',confirmLabel:'Se connecter',autocomplete:'one-time-code'});
        if(otp===null)throw new Error('Connexion annulée.');
        try{info=await cloud.login(password,username,otp.trim());}finally{otp='';}
      }
      if(info.otpSetupRequired){mfaWaiting=true;info=await enrollRequiredMFA(info,password);}
      if(info.otpRequired){
        mfaWaiting=true;
        let otp=await appPrompt('Saisis le code à 6 chiffres de ton application d’authentification, ou un code de secours.','',{title:'Vérification MFA',confirmLabel:'Vérifier',autocomplete:'one-time-code'});
        if(otp===null)throw new Error('Connexion annulée.');
        try{info=await cloud.login(password,undefined,otp.trim());}finally{otp='';}
      }
      if(document.hidden&&mfaWaiting)await new Promise(resolve=>{const visible=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',visible);resolve();}};document.addEventListener('visibilitychange',visible);});
      mfaWaiting=false;
      if(info.exists){
        const latest=cryptography.validateEnvelope(await cloud.load());
        if(info.workspace){try{const material=await cryptography.importWorkspaceMaterial(info.workspace);result=await cryptography.openWithKey(latest,material.key,material.salt);}finally{info.workspace.key='';}}
        else result=await cryptography.open(latest,password);
        remote=true;
      }
      else if(previous)result=await cryptography.open(previous,password);
      else throw new Error('Ouvre d’abord WolfGuard sur ton appareil principal pour transférer tes données.');
      result.payload=await upgrade(result);
    }
    if(result.envelope.version!==cryptography.WORKSPACE_VERSION){result.envelope=await cryptography.seal(result.payload,result.key,result.salt,result.envelope.revision+1);remote=false;}
    if(!remote)await cloud.save(result.envelope);
    let identity=await cloud.me(true);
    if(!identity.usersEnabled){await configureUsers(password,result);identity=await cloud.me(true);}
    // Binding accounts replaces the original common key with this account's
    // scoped delivery key before any UI or reload ticket can retain the result.
    if(identity.workspace){try{if(identity.workspace.salt!==result.envelope.salt){const material=await cryptography.importWorkspaceMaterial(identity.workspace);result=await cryptography.openWithKey(await cloud.load(),material.key,material.salt);result.payload=await upgrade(result);}}finally{identity.workspace.key='';}}
    if(previous && (previous.iv!==result.envelope.iv || previous.salt!==result.envelope.salt))await storage.preserve(previous);
    await storage.cacheShared(result.envelope,cloud.currentVersion());
    return result;
  }
  async function showAccountSetup(){
    accountSetupActive=true;
    const form=document.createElement('form');form.id='webAccountSetupForm';form.className='user-setup-form';
    form.innerHTML='<span class="user-setup-badge">Invitation à usage unique</span><h2>Bienvenue dans WolfGuard</h2><p>Ton e-mail, ton code à 8 chiffres, puis ton Authenticator.</p><label>Adresse e-mail<input id="webAccountUsername" type="email" inputmode="email" autocomplete="email" maxlength="254" required></label><label>Code personnel de 8 chiffres<input id="webAccountCode" type="password" inputmode="numeric" autocomplete="new-password" pattern="[0-9]{8}" minlength="8" maxlength="8" required></label><label>Confirmer le code<input id="webAccountConfirm" type="password" inputmode="numeric" autocomplete="new-password" pattern="[0-9]{8}" minlength="8" maxlength="8" required></label><p class="user-setup-error" role="alert">Vérification du lien…</p><div class="actions"><button type="submit" class="primary" disabled>Continuer vers ma MFA</button><button type="button" class="secondary" id="webAccountCancel">Retour à la connexion</button></div>';
    $('#lockError').before(form);
    const submit=form.querySelector('[type=submit]'),error=form.querySelector('[role=alert]');
    $('#webAccountCancel').onclick=()=>{cloud.clearAccountInvitation();form.reset();form.remove();accountSetupActive=false;showGate();};
    form.onsubmit=async event=>{
      event.preventDefault();if(submit.disabled)return;
      let code=$('#webAccountCode').value;const username=$('#webAccountUsername').value.trim();
      if(code!==$('#webAccountConfirm').value){error.textContent='Les codes ne correspondent pas.';return;}
      submit.disabled=true;error.textContent='';
      try{
        if(!/^[0-9]{8}$/.test(code))throw new Error('Saisis exactement 8 chiffres.');
        await cloud.completeAccountInvitation(username,code);setupUsername=username;
        form.reset();form.remove();accountSetupActive=false;
        $('#webUsername').value=username;$('#webPassword').value=code;$('#webConfirm').value='';
        await authenticate({preventDefault(){}});
      }catch(failure){if(form.isConnected)error.textContent=failure.message;}
      finally{code='';if(form.isConnected)submit.disabled=false;}
    };
    try{await cloud.inspectAccountInvitation();if(form.isConnected){error.textContent='';submit.disabled=false;$('#webAccountUsername').focus();}}
    catch(failure){if(form.isConnected)error.textContent=failure.message;}
  }
  async function configureUsers(password,result){
    await cloud.status();
    let workspace;
    try{
      workspace=await cryptography.workspaceMaterial(password,result.salt);
      const material=await cryptography.importWorkspaceMaterial(workspace);
      await cryptography.openWithKey(result.envelope,material.key,material.salt);
      await cloud.initializeUsers({username:cloud.currentUser()?.id?cloud.currentUser().username:'cantin.bruno@gmx.fr',code:password,oldCode:password,workspace});
    }finally{if(workspace)workspace.key='';}
  }
  async function authenticate(event) {
    event.preventDefault(); if (busy || locking || booting || accessBlocked()) {renderKeypad();return;}
    busy=true; $('#webUnlock').disabled=true; $('#lockError').textContent='';
    renderKeypad();
    const generation=epoch; let password=$('#webPassword').value, retained=false, attemptedScope='';
    try {
      await claimTab(); await queue; envelope=await storage.read();
      await loadAttempts();
      if(accessBlocked())return;
      attemptedScope=accessScope();
      let result;
      if(cloud.enabled)result=await openShared(password);
      else if (envelope) result=await cryptography.open(envelope,password);
      else {
        if (password !== $('#webConfirm').value) throw new Error('Les codes ne correspondent pas.');
        cryptography.checkPassword(password); result=await cryptography.create(await seed(),password);
      }
      if(!cloud.enabled)result.payload=await upgrade(result);
      if (generation !== epoch || document.hidden) return;
      await storage.resetAttempts(attemptedScope);
      attemptState={failures:0,blockedUntil:0};attemptScope=attemptedScope;
      announceAttempts(attemptedScope);
      if (!cloud.enabled && (!envelope || result.envelope.version !== cryptography.WORKSPACE_VERSION)) {
        result.envelope=await cryptography.seal(result.payload,result.key,result.salt,(envelope?.revision || 0)+1);
        await storage.write(result.envelope,envelope?.revision || 0);
        envelope=result.envelope;
      }
      if (generation !== epoch || document.hidden) return;
      activateSession(result); retained=true;
      $('#webPassword').value=''; $('#webConfirm').value='';
      await openSection(workspaceModules.landingSection);
      if (generation !== epoch) return;
      await rememberSession();
      if (generation !== epoch) return;
      await unlockTransition.play();
      await scheduleAutoLock(); saveStatus(savedMessage());
      navigator.storage?.persist?.().catch(() => {});
    } catch (error) {
      if (retained) { await lock();retained=false; }
      if(cloud.enabled)cloud.clear();
      if(error.retryAfter && attemptedScope){
        try{attemptState=await storage.blockAttempts(attemptedScope,error.retryAfter);attemptScope=attemptedScope;announceAttempts(attemptedScope);}catch{attemptsUnavailable=true;}
      }else if(error.code==='INVALID_ACCESS_CODE' && attemptedScope){
        try {
          attemptState=await storage.registerFailure(attemptedScope);attemptScope=attemptedScope;
          announceAttempts(attemptedScope);
        } catch { attemptsUnavailable=true; }
      }
      $('#lockError').textContent=error.message;
    }
    finally {
      password=''; busy=false;mfaWaiting=false; $('#webUnlock').disabled=false;
      enteredCode=''; creationCode=''; $('#webPassword').value=''; $('#webConfirm').value='';
      if (!retained) release();
      if(!retained && cloud?.enabled)cloud.clear();
      renderKeypad();
    }
  }
  async function lock() {
    if (locking) return;
    window.remoteDesktopWorkspace?.reset();
    if(typeof edrWorkspace!=='undefined')edrWorkspace.reset();if(typeof agentsWorkspace!=='undefined')agentsWorkspace.reset();
    locking=true; epoch++; session=null; sessionClock=null; connectedWorkspaceReady=false;
    const forgotten = tabSession?.forget().catch(() => {});
    clearInterval(cloudHeartbeat);cloudHeartbeat=null;cloud?.clear();
    clearInterval(sharedTimer);sharedTimer=null;agentChoice=null;
    clearTimeout(autoLockTimer); autoLockTimer=null;
    unlockTransition.cancel(); sectionTransition.cancel(); appMessages.dismiss();
    resetPrimaryWorkspaces(); window.workspaceSearch?.reset(); resetCollectionSearch(); resetNetworkTools(); resetScanTool();
    state.vaultKey=null; state.item=null; state.folder=null; state.mode='view'; sessionAccessCode='';selectedEditorImage=null;
    $('#content').replaceChildren(); closeModal(); closeContextMenu(); resetSettingsCache();
    document.querySelectorAll('input:not([type=file]),textarea').forEach(element => { element.value=''; });
    document.querySelectorAll('.reader-image-overlay,.folder-menu,.context-menu').forEach(element => element.remove());
    updateMFAIndicator();saveStatus('Espace verrouillé'); showGate();
    secretClipboard.clear();
    try { await queue; await forgotten; envelope=await storage.read(); await loadAttempts(); }
    finally { db=null; release(); locking=false; $('#webUnlock').disabled=busy; renderKeypad(); }
  }
  async function rotatePassword() {
    if(rotating)return;
    assertFreshSession();rotating=true;
    let oldPassword=$('#oldAccessCode').value, password=$('#newAccessCode').value;
    const current=session, generation=epoch;
    try {
      if (!current) throw new Error('Espace verrouillé.');
      cryptography.checkPassword(password);
      if (password !== $('#confirmAccessCode').value) throw new Error('Les codes ne correspondent pas.');
      if(cloud.enabled&&cloud.hasUsers()){
        await queue;await cloud.changePersonalCode(oldPassword,password);if(session!==current||epoch!==generation)return;
        await rememberSession();closeModal();appNotify('Ton code personnel a été modifié. Tes autres sessions ont été déconnectées.');return;
      }
      await cryptography.open(current.envelope,oldPassword);
      const work=queue.then(async () => {
        if (session!==current || epoch!==generation) throw new Error('Espace verrouillé.');
        if(cloud.enabled){
          const latest=await cryptography.openWithKey(await cloud.load(),current.key,current.salt);validate(latest.payload);
          if(session!==current||epoch!==generation)throw new Error('Espace verrouillé.');
          Object.assign(current,latest,{cloudVersion:cloud.currentVersion()});envelope=latest.envelope;
        }
        const payload=structuredClone(current.payload);
        const result=await cryptography.create(payload,password,current.envelope.revision+1);
        for (const item of payload.items.filter(item => item.type==='vault')) {
          for (const field of ['vaultBlobEnc','passwordEnc']) if (item[field]) item[field]=await encryptBlobWithKey(await decryptBlobWithKey(item[field],current.key),result.key);
        }
        result.envelope=await cryptography.seal(payload,result.key,result.salt,current.envelope.revision+1);
        if(cloud.enabled){
          const rotation=await cloud.prepareRotation(oldPassword,password);
          await storage.preserve(current.envelope,true);
          await cloud.save(result.envelope,rotation);
        }
        await cacheSnapshot(result.envelope,current.envelope.revision);
        Object.assign(current,result); envelope=result.envelope;
        if(cloud.enabled)current.cloudVersion=cloud.currentVersion();
        if (session===current) { state.vaultKey=result.key; await rememberSession(); closeModal(); appNotify(cloud.enabled?'Code modifié sur tous tes appareils.':'Code modifié.'); }
      });
      queue=work.catch(() => {}); await work;
    } catch (error) { appNotify(error.message,{kind:'error'}); }
    finally { oldPassword='';password='';rotating=false;document.querySelectorAll('#changeCodeArea input').forEach(input=>{input.value='';}); }
  }

  // Replace host-dependent entry points while retaining the original UI code.
  openDB=async () => db;
  workspaceCanWrite=() => !!session;
  workspaceConnectionLabel=() => cloud?.enabled ? 'Espace partagé · Enregistrement chiffré' : 'Navigateur · Enregistrement chiffré';
  ensureSecuritySettings=async () => !!session;
  scheduleAutoLock=async () => armSessionTimer();
  registerActivityForAutoLock=() => {
    // Activity refreshes the ticket without changing its absolute deadline.
    for(const name of ['mousedown','keydown','touchstart','wheel','pointermove'])document.addEventListener(name,event=>{
  if(!session||!event.isTrusted)return;
  sessionClock.active=Date.now();sessionClock.monotonicActive=performance.now();updateReloadTicket();
    },{capture:true,passive:true});
  };
  // Older desktop listeners must not re-enable the keypad during a web timeout.
  refreshPinLockout=renderKeypad;
  lockApplication=lock;
  exportDB=importDB=async () => { throw new Error('Les sauvegardes sont désactivées.'); };
  writePortableFile=async () => { await queue; return !!session; };
  reloadWorkspaceFromSettings=async () => { if (await appConfirm('Verrouiller et recharger cet espace ?')) await lock(); };
  saveWorkspaceFromSettings=async () => { await queue; appNotify(cloud.enabled?'Les modifications sont enregistrées dans ton espace partagé chiffré.':'Les modifications sont enregistrées et chiffrées dans ce navigateur.'); };
  changeWorkspaceFromSettings=() => {};
  changeAccessCode=rotatePassword;
  showChangeCodeForm=() => {
    $('#changeCodeArea').innerHTML='<div class="pin-fields"><label>Code actuel ou ancien mot de passe<input id="oldAccessCode" type="password" maxlength="1024" autocomplete="current-password"></label><label>Nouveau code de 8 chiffres<input id="newAccessCode" type="password" inputmode="numeric" minlength="8" maxlength="8" pattern="[0-9]{8}" autocomplete="new-password"></label><label>Confirmer le code<input id="confirmAccessCode" type="password" inputmode="numeric" minlength="8" maxlength="8" pattern="[0-9]{8}" autocomplete="new-password"></label><div class="settings-form-actions"><button type="button" class="settings-btn primary" id="webChangePassword">Enregistrer</button></div></div>';
    $('#webChangePassword').onclick=rotatePassword;
  };
  async function refreshMFASettings(){
    const current=session;await cloud.me();if(session!==current)return;updateMFAIndicator();
    const root=$('#webMFASettings');if(!root)return;const mfa=cloud.currentUser()?.mfa;
    root.dataset.state=mfa?.complete?'complete':'missing';
    root.querySelector('#webMFAState').textContent=mfa?.complete?'MFA activée':'MFA à terminer';
    root.querySelector('#webMFADescription').textContent='Après ton code personnel à huit chiffres, saisis les six chiffres de ton application d’authentification. Ton QR code existant reste valable.';
    const step=root.querySelector('#webMFAStepOTP');step.dataset.done=String(!!mfa?.authenticator);step.querySelector('span').textContent=mfa?.authenticator?'Activé':'À configurer';
  }
  async function mountOTPSettings(){
    const current=session,root=document.createElement('section');root.id='webOTPSettings';root.className='web-otp-settings';
    ($('#webMFASteps')||$('#settings-security')).append(root);
    const live=()=>session===current&&root.isConnected;
    const request=(path,value)=>cloud.agentRequest('users/otp'+path,value);
    let enabled=false,pending=false,required=false;
    function render(){
      if(!live())return;
      if(enabled&&required){root.innerHTML='<h4>Authenticator · Code à 6 chiffres</h4><p>Ton code à six chiffres est déjà activé. Après ton code personnel à huit chiffres, utilise celui de ton application d’authentification.</p><p class="access-help">La désactivation est bloquée par la politique de sécurité. Conserve tes codes de secours pour récupérer ton accès.</p>';return;}
      root.innerHTML='<h4>Authenticator · Code à 6 chiffres</h4><p>'+(enabled?'Ton application Authenticator est activée. Ses six chiffres permettent de te connecter sans enregistrer le téléphone dans le navigateur.':'Ajoute un code de 6 chiffres renouvelé toutes les 30 secondes avec Google, Microsoft Authenticator ou une application compatible.')+'</p><form id="webOTPForm"><label>Code personnel actuel<input id="webOTPPassword" type="password" inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" autocomplete="current-password" required></label>'+(enabled?'<label>Code OTP ou code de secours<input id="webOTPCode" type="text" autocomplete="one-time-code" maxlength="16" required></label>':'')+'<button type="submit" class="settings-btn '+(enabled?'':'primary')+'">'+(enabled?'Désactiver Authenticator':'Configurer Authenticator')+'</button></form><p id="webOTPFeedback" role="status"></p>';
      root.querySelector('form').onsubmit=async event=>{
        event.preventDefault();if(pending)return;pending=true;
        const button=root.querySelector('[type=submit]');button.disabled=true;
        let code=root.querySelector('#webOTPPassword').value;
        try{
          if(enabled){await request('/disable',{code,otp:root.querySelector('#webOTPCode').value.trim()});if(!live())return;enabled=false;render();root.querySelector('[role=status]').textContent='Authenticator est désactivé.';await refreshMFASettings();}
          else{
            const setup=await request('/setup',{code});if(!live())return;
            root.innerHTML='<h4>Configurer Authenticator · 6 chiffres</h4><p>Dans ton application Authenticator, ajoute un compte et scanne ce QR code. Le compte sera nommé <strong>WolfGuard · '+esc(cloud.currentUser()?.username||'')+'</strong>.</p><canvas id="webOTPQR" role="img" aria-label="QR code à scanner dans Authenticator"></canvas><p class="access-help">Ce QR code est généré sur cet appareil. Si tu utilises le même téléphone, ajoute manuellement la clé ci-dessous comme clé temporelle (TOTP).</p><label>Clé à saisir dans Authenticator<input id="webOTPSecret" readonly value="'+esc(setup.secret)+'" spellcheck="false"></label><button type="button" class="settings-btn" id="webOTPCopy">Copier la clé</button><p>Saisis ensuite les six chiffres affichés. Rien n’est activé avant cette confirmation.</p><form><label>Code OTP de 6 chiffres<input id="webOTPCode" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required></label><button type="submit" class="settings-btn primary">Activer Authenticator</button><button type="button" class="settings-btn" id="webOTPCancel">Annuler</button></form><p role="status"></p>';
            drawAuthenticatorQR(root.querySelector('#webOTPQR'),setup.uri);
            root.querySelector('#webOTPCopy').onclick=async()=>{await copyText(setup.secret);};
            root.querySelector('#webOTPCancel').onclick=()=>{code='';setup.secret='';render();};
            root.querySelector('form').onsubmit=async submitEvent=>{
              submitEvent.preventDefault();if(pending)return;pending=true;const submit=root.querySelector('[type=submit]');submit.disabled=true;
              try{
                const result=await request('/enable',{code,otp:root.querySelector('#webOTPCode').value});if(!live())return;
                code='';setup.secret='';enabled=true;render();
                const message=document.createElement('div');message.className='web-otp-recovery';message.innerHTML='<p><strong>Authenticator est activé.</strong> Conserve ces codes de secours dans un endroit sûr. Chacun peut remplacer un OTP une seule fois si tu perds ton téléphone.</p><textarea readonly rows="8" aria-label="Codes de secours">'+result.recoveryCodes.join('\n')+'</textarea><p>Pour te connecter, utilise les six chiffres de ton application Authenticator.</p>';root.append(message);
                await refreshMFASettings();
              }catch(error){if(live())root.querySelector('[role=status]').textContent=error.message;}
              finally{pending=false;if(submit.isConnected)submit.disabled=false;}
            };
            root.querySelector('#webOTPCode').focus();
          }
        }catch(error){if(live())root.querySelector('[role=status]').textContent=error.message;}
        finally{pending=false;if(button.isConnected)button.disabled=false;if(enabled)code='';}
      };
    }
    try{const info=await request('');enabled=info.enabled;required=info.required;render();}catch(error){if(live())root.textContent=error.message;}
  }
  openSettings=async initialTab => {
    assertFreshSession();
    if (!session) return;
    await originalSettings(initialTab === 'modules' ? 'security' : initialTab);
    if (!session) { closeModal(); return; }
    const security=$('#changeCodeBtn').closest('.settings-row');
    security.querySelector('.settings-row-title').textContent=cloud.enabled?'Mon code personnel':'Code d’accès';
    security.querySelector('.settings-row-desc').textContent=cloud.enabled?'8 chiffres · Compte '+(cloud.currentUser()?.username||''):'8 chiffres · Chiffrement de la base complète';
    const note=$('.settings-security-note div'); if (note) note.textContent=cloud.enabled?'Ton adresse e-mail identifie ton compte. La connexion utilise ton code personnel, puis les facteurs MFA activés sur ton compte.':'Conserve ton code : il ne peut pas être récupéré.';
    if(cloud.enabled&&cloud.hasUsers()){
      const mfa=document.createElement('section');mfa.id='webMFASettings';mfa.className='web-mfa-settings';
      mfa.innerHTML='<header><div><span>MON COMPTE · '+esc(cloud.currentUser()?.username||'')+'</span><h3>Authentification multi-facteur</h3></div><strong id="webMFAState" role="status">Vérification de la MFA…</strong></header><p id="webMFADescription"></p><ol class="web-mfa-progress"><li id="webMFAStepOTP"><strong>Authenticator · Code à 6 chiffres</strong><span>Vérification…</span></li></ol><div id="webMFASteps"></div>';
      security.before(mfa);await Promise.all([mountOTPSettings(),refreshMFASettings()]);
    }
    $('#changeBaseBtn').remove();
    const idle=$('#autoLockSelect');
    idle.replaceChildren(new Option('4 heures','240',true,true));idle.disabled=true;
    idle.closest('.settings-row').querySelector('.settings-row-desc').textContent='Verrouillage automatique après 4 heures · Le rechargement et l’activité ne prolongent pas la session';
  };
  window.openAccountMFA=async()=>{
    if(!session||!cloud?.hasUsers())return;
    if(!$('#webMFASettings'))await openSettings('security');else setSettingsTab('security');
    const root=$('#webMFASettings');root?.scrollIntoView({block:'start'});root?.querySelector('input')?.focus({preventScroll:true});
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
    if(window.top!==window.self)throw new Error('Ouvre WolfGuard directement dans son propre onglet.');
    [cryptography,storage,cloud,tabSessions,shared]=[WolfGuardCrypto,WolfGuardStorage,WolfGuardCloud,WolfGuardTabSession,WolfGuardSharedWorkspace];
    $('#webUsername').value='';
    try{localStorage.removeItem('wolfguard-username-v1');}catch{}
    $('#webUsername').oninput=()=>{enteredCode='';creationCode='';renderKeypad();};
    window.addEventListener('focus',()=>refreshShared());
    window.addEventListener('wolfguard-access-revoked',event=>{if(session&&!locking){const message=String(event.detail||'Session déconnectée.');lock().then(()=>{$('#lockError').textContent=message;});}});
    tabSession = tabSessions.createTabSession(storage);
    window.addEventListener('hashchange',()=>{if(cloud.enabled && cloud.canActivate() && !session && !busy && !locking && !booting)showGate();});
    $('#pinDots').replaceChildren(...Array.from({length:8},()=>{const dot=document.createElement('span');dot.className='dot';return dot;}));
    $('#pinDots').setAttribute('role','status');
    $('#keypad').setAttribute('aria-label','Clavier du code à huit chiffres');
    const brandName=document.createElement('span');brandName.className='web-access-brandname';brandName.textContent='WolfGuard';$('#lock .access-brand').append(brandName);
    const keyHint=document.createElement('p');keyHint.id='webKeyHint';keyHint.className='web-key-hint';$('#keypad').after(keyHint);
    $('#keypad').setAttribute('aria-describedby','webKeyHint');
    $('#keypad').innerHTML=['1','2','3','4','5','6','7','8','9','Backspace','0','C'].map(key=>'<button type="button" class="key" data-key="'+key+'"'+(key==='Backspace'?' aria-label="Effacer le dernier chiffre"':key==='C'?' aria-label="Effacer le code"':'')+'>'+(key==='Backspace'?'⌫':key==='C'?settingsIcon('rotate-ccw'):key)+'</button>').join('');
    $('#keypad').onclick=event=>{const button=event.target.closest('[data-key]');if(button)keypadKey(button.dataset.key);};
    window.addEventListener('keydown',event=>{
      if (accountSetupActive || $('#lock').classList.contains('hidden') || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || document.querySelector('.app-dialog[open]')) return;
      if(event.target.closest?.('#webAccountSetupForm,#webUsernameRow')){if(event.key==='Enter'&&event.target.id==='webUsername'){event.preventDefault();$('#lock').focus();}return;}
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
      if (accountSetupActive || $('#lock').classList.contains('hidden') || busy || locking || booting || accessBlocked() || document.querySelector('.app-dialog[open]')) return;
      if(event.target.closest?.('#webAccountSetupForm,#webUsernameRow'))return;
      const code=event.clipboardData?.getData('text');
      if (!/^[0-9]{8}$/.test(code || '')) {
        // Keep old encrypted spaces accessible by pasting their original secret,
        // without displaying another field or button on the keypad screen.
        if (envelope && code && code.length<=1024) {
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
    const status=document.createElement('div'); status.id='webSaveState'; status.className='web-save-state'; status.setAttribute('role','status');status.innerHTML='<span id="webSaveLabel"></span><button type="button" id="webSharedRefresh" aria-label="Actualiser l’espace partagé" hidden>Actualiser</button>';document.body.append(status);
    $('#webSharedRefresh').onclick=()=>refreshShared({manual:true});
    topNavigation.init(); $('#brand').onclick=() => switchPrimaryWorkspace(workspaceModules.landingSection); $('#settingsBtn').onclick=() => openSettings();
    document.addEventListener('click',event => { if (!event.target.closest('.search')) hideSearch(); });
    applyExplorerWidth(getExplorerWidth()); registerActivityForAutoLock();
    // Rich clipboard HTML must be sanitized before it enters the live editor.
    document.addEventListener('paste',event => {
      if (!event.target.closest?.('#richEditor')) return;
      const html=event.clipboardData?.getData('text/html');
      if (html) { event.preventDefault(); event.stopImmediatePropagation(); document.execCommand('insertHTML',false,documentHTML(html)); }
    },true);
    document.addEventListener('visibilitychange',() => {
      if(session){if(sessionExpired())lock();else updateReloadTicket();if(document.hidden)secretClipboard.clear();}
      else if(document.hidden&&!mfaWaiting)epoch++;
      else if(storage && !session)loadAttempts().then(renderKeypad);
    });
    if(attemptChannel)attemptChannel.onmessage=event=>{
      if(storage && !session && event.data?.scope===accessScope())loadAttempts().then(renderKeypad);
    };
    window.addEventListener('pagehide',() => { window.remoteDesktopWorkspace?.reset();
    if(typeof edrWorkspace!=='undefined')edrWorkspace.reset();if(typeof agentsWorkspace!=='undefined')agentsWorkspace.reset();if(sessionExpired()){tabSession.forget().catch(()=>{});cloud.clear();}else{updateReloadTicket();cloud?.detach();}epoch++;session=null;sessionClock=null;clearTimeout(autoLockTimer);clearInterval(cloudHeartbeat);state.vaultKey=null;selectedEditorImage=null;resetPrimaryWorkspaces();$('#content').replaceChildren();closeModal();release(); });
    window.addEventListener('pageshow',event => { if (event.persisted) lock(); });
    window.addEventListener('unhandledrejection',event => { event.preventDefault(); appNotify(event.reason?.message || 'Opération impossible.',{kind:'error'}); });
    if (!isSecureContext || !crypto.subtle) throw new Error('Ouvre le site via HTTPS ou localhost.');
    envelope=await storage.read();await loadAttempts();
    const invited=cloud.enabled&&cloud.hasAccountInvitation();
    if(invited)await tabSession.forget({tabOnly:true}).catch(()=>{});
    const resumed = invited?false:await resumeAfterReload();
    if (!resumed) showGate();
    if(cloud.enabled && !resumed){
      try{await cloud.status();showGate();if(!cloud.isInitialized()&&!cloud.canActivate())$('#lockError').textContent='Active le partage avec le lien privé sur ton appareil principal.';}
      catch(error){$('#lockError').textContent=error.message;}
    }
    booting=false;renderKeypad();if(!resumed)$('#lock').focus({preventScroll:true});
    if(invited)await showAccountSetup();
  }
  return {start,refreshShared,storageBytes:()=>session?new TextEncoder().encode(JSON.stringify(session.envelope||envelope||{})).length:0};
})();
webWorkspace.start().catch(error => { $('#startupSplash')?.remove();$('#lock').classList.remove('hidden');$('#lockError').textContent=error.message; });
