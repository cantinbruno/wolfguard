// Persist the encrypted envelope and non-secret access-attempt metadata.
let connection;
export function connect() {
  if (connection) return Promise.resolve(connection);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('wolfguard-web-encrypted-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('encrypted');
    request.onerror = () => reject(new Error('Le stockage local est indisponible.'));
    request.onblocked = () => reject(new Error('Ferme les autres onglets WolfGuard puis réessaie.'));
    request.onsuccess = () => {
      connection = request.result;
      connection.onversionchange = () => { connection.close(); connection = null; };
      resolve(connection);
    };
  });
}
export async function read() {
  const database = await connect();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('encrypted', 'readonly');
    const request = transaction.objectStore('encrypted').get('workspace');
    transaction.oncomplete = () => resolve(request.result ?? null);
    transaction.onabort = () => reject(new Error('Lecture locale impossible.'));
  });
}
export async function write(envelope, expectedRevision) {
  const database = await connect();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('encrypted', 'readwrite');
    const store = transaction.objectStore('encrypted');
    const request = store.get('workspace');
    let conflict = false;
    request.onsuccess = () => {
      if ((request.result?.revision ?? 0) !== expectedRevision) { conflict = true; transaction.abort(); }
      else store.put(envelope, 'workspace');
    };
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(new Error(conflict ? 'Cet espace a changé dans un autre onglet. Verrouille puis rouvre-le avant de modifier.' : 'Enregistrement impossible. Vérifie l’espace disque et les permissions du navigateur.'));
  });
}

function attemptKey(scope) {
  if (typeof scope !== 'string' || scope.length > 100) throw new Error('Espace de verrouillage invalide.');
  return 'attempts:' + scope;
}
function normalizeAttempts(value) {
  return {
    failures: Number.isSafeInteger(value?.failures) && value.failures >= 0 ? value.failures : 0,
    blockedUntil: Number.isSafeInteger(value?.blockedUntil) && value.blockedUntil >= 0 ? value.blockedUntil : 0
  };
}
export async function readAttempts(scope) {
  if (!scope) return normalizeAttempts(null);
  const database = await connect();
  return new Promise((resolve,reject) => {
    const transaction = database.transaction('encrypted','readonly');
    const request = transaction.objectStore('encrypted').get(attemptKey(scope));
    transaction.oncomplete = () => resolve(normalizeAttempts(request.result));
    transaction.onabort = () => reject(new Error('Lecture des tentatives impossible.'));
  });
}
export async function registerFailure(scope) {
  const database = await connect();
  return new Promise((resolve,reject) => {
    const transaction = database.transaction('encrypted','readwrite');
    const store = transaction.objectStore('encrypted');
    const key = attemptKey(scope), request = store.get(key);
    let result;
    request.onsuccess = () => {
      result = normalizeAttempts(request.result);
      if (result.blockedUntil > Date.now()) return;
      const failures = result.failures + 1, blockedUntil = Date.now() + failures * 5000;
      if (!Number.isSafeInteger(blockedUntil)) { transaction.abort(); return; }
      result = {failures, blockedUntil}; store.put(result,key);
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(new Error('Enregistrement des tentatives impossible.'));
  });
}
export async function resetAttempts(scope) {
  if (!scope) return;
  const database = await connect();
  return new Promise((resolve,reject) => {
    const transaction = database.transaction('encrypted','readwrite');
    transaction.objectStore('encrypted').delete(attemptKey(scope));
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(new Error('Réinitialisation des tentatives impossible.'));
  });
}

export async function blockAttempts(scope,seconds) {
  const database=await connect();
  if(!Number.isFinite(seconds)||seconds<=0||!Number.isSafeInteger(Date.now()+Math.ceil(seconds*1000)))throw new Error('Délai invalide.');
  return new Promise((resolve,reject)=>{
    const transaction=database.transaction('encrypted','readwrite'),store=transaction.objectStore('encrypted'),key=attemptKey(scope),request=store.get(key);
    let value;
    request.onsuccess=()=>{const previous=normalizeAttempts(request.result);value={failures:previous.failures+1,blockedUntil:Math.max(previous.blockedUntil,Date.now()+Math.ceil(seconds*1000))};store.put(value,key);};
    transaction.oncomplete=()=>resolve(value);transaction.onabort=()=>reject(new Error('Conservation du délai impossible.'));
  });
}

// Read the encrypted safety copy left by the previous synchronization release.
// Keeping this key does not make a network request or change the current vault.
export async function readRecovery() {
  const database=await connect();
  return new Promise((resolve,reject)=>{
    const transaction=database.transaction('encrypted','readonly');
    const request=transaction.objectStore('encrypted').get('github-recovery');
    transaction.oncomplete=()=>resolve(request.result??null);
    transaction.onabort=()=>reject(new Error('Lecture de la copie de secours impossible.'));
  });
}

async function preserveAtKey(envelope,key,replace) {
  if(!envelope)return;
  const database=await connect();
  return new Promise((resolve,reject)=>{
    const transaction=database.transaction('encrypted','readwrite'),store=transaction.objectStore('encrypted');
    const request=store.get(key);
    request.onsuccess=()=>{if(replace || !request.result)store.put(envelope,key);};
    transaction.oncomplete=resolve;transaction.onabort=()=>reject(new Error('Conservation de la copie locale impossible.'));
  });
}
export async function preserve(envelope,pending=false) {return preserveAtKey(envelope,pending?'cloud-pending':'cloud-original',pending);}
export async function preserveOrganization(envelope,version=1) {return preserveAtKey(envelope,version>=3?'memo-form-cleanup-before-v3':version>=2?'memo-cleanup-before-v2':'memo-organization-before',false);}
export async function recoveries() {
  const database=await connect();
  return new Promise((resolve,reject)=>{
    const transaction=database.transaction('encrypted','readonly'),store=transaction.objectStore('encrypted');
    const requests=['cloud-original','cloud-pending','memo-organization-before','memo-cleanup-before-v2','memo-form-cleanup-before-v3'].map(key=>({key,request:store.get(key)}));
    transaction.oncomplete=()=>resolve(requests.filter(row=>row.request.result).map(row=>({key:row.key,envelope:row.request.result})));
    transaction.onabort=()=>reject(new Error('Lecture des copies locales impossible.'));
  });
}
