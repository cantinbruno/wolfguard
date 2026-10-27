const WolfGuardStorage = (() => {
// Persist the encrypted envelope and non-secret access-attempt metadata.
let connection;
function connect() {
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
async function read() {
  const database = await connect();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('encrypted', 'readonly');
    const request = transaction.objectStore('encrypted').get('workspace');
    transaction.oncomplete = () => resolve(request.result ?? null);
    transaction.onabort = () => reject(new Error('Lecture locale impossible.'));
  });
}
async function write(envelope, expectedRevision) {
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
async function readAttempts(scope) {
  if (!scope) return normalizeAttempts(null);
  const database = await connect();
  return new Promise((resolve,reject) => {
    const transaction = database.transaction('encrypted','readonly');
    const request = transaction.objectStore('encrypted').get(attemptKey(scope));
    transaction.oncomplete = () => resolve(normalizeAttempts(request.result));
    transaction.onabort = () => reject(new Error('Lecture des tentatives impossible.'));
  });
}
async function registerFailure(scope) {
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
async function resetAttempts(scope) {
  if (!scope) return;
  const database = await connect();
  return new Promise((resolve,reject) => {
    const transaction = database.transaction('encrypted','readwrite');
    transaction.objectStore('encrypted').delete(attemptKey(scope));
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(new Error('Réinitialisation des tentatives impossible.'));
  });
}

return Object.freeze({connect,read,write,readAttempts,registerFailure,resetAttempts});
})();
