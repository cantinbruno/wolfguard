// The only persisted application record is the encrypted envelope.
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
