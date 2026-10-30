// A reload ticket is scoped to this tab. PINs and clear workspace data are never
// stored here; IndexedDB holds only a temporary, non-extractable CryptoKey.
export const IDLE_MS = 15 * 60000;
export const SESSION_MS = 8 * 60 * 60000;
const HANDLE = 'wolfguard-tab-session-v1';
const PREFIX = 'tab-session:';
const validId = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function validClock(clock, now = Date.now()) {
  return Number.isSafeInteger(clock?.started) && Number.isSafeInteger(clock?.active) && clock.started > 0 &&
    clock.started <= clock.active && clock.active <= now && now - clock.active < IDLE_MS && now - clock.started < SESSION_MS;
}
export function createTabSession(storage) {
  let ticket = null, record = null, generation = 0, pending = Promise.resolve(), syncedAt = 0;
  function metadata() { try { return JSON.parse(sessionStorage.getItem(HANDLE)); } catch { return null; } }
  async function transaction(action, mode = 'readwrite') {
    const database = await storage.connect();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('encrypted', mode), result = action(tx.objectStore('encrypted'));
      tx.oncomplete = () => resolve(result?.result);
      tx.onabort = tx.onerror = () => reject(new Error('Reprise de session indisponible.'));
    });
  }
  async function prune() {
    const database = await storage.connect(), now = Date.now();
    await new Promise((resolve, reject) => {
      const tx = database.transaction('encrypted', 'readwrite');
      const cursor = tx.objectStore('encrypted').openCursor(IDBKeyRange.bound(PREFIX, PREFIX + '\uffff'));
      cursor.onsuccess = () => { const row = cursor.result; if (!row) return; if (!Number.isFinite(row.value?.expiresAt) || row.value.expiresAt <= now) row.delete(); row.continue(); };
      tx.oncomplete = resolve; tx.onabort = tx.onerror = reject;
    });
  }
  function forget({tabOnly = false} = {}) {
    const id = ticket?.id || metadata()?.id;
    generation++; ticket = null; record = null;
    try { sessionStorage.removeItem(HANDLE); } catch {}
    if (!tabOnly && validId(id)) pending = pending.catch(() => {}).then(() => transaction(store => store.delete(PREFIX + id)));
    return pending;
  }
  async function remember({key, salt, clock, cloud, scope, view}) {
    await forget(); const token = ++generation;
    if (!validClock(clock) || key.extractable !== false || key.algorithm?.name !== 'AES-GCM') throw new Error('Session invalide.');
    const id = [...crypto.getRandomValues(new Uint8Array(32))].map(value => value.toString(16).padStart(2, '0')).join('');
    const saved = {id, clock: {started: clock.started, active: clock.active}, cloud, scope, view};
    const value = {key, salt, started: clock.started, expiresAt: Math.min(clock.active + IDLE_MS, clock.started + SESSION_MS)};
    await transaction(store => store.put(value, PREFIX + id));
    if (token !== generation) { await transaction(store => store.delete(PREFIX + id)); return false; }
    try { sessionStorage.setItem(HANDLE, JSON.stringify(saved)); }
    catch (error) { await transaction(store => store.delete(PREFIX + id)); throw error; }
    ticket = saved; record = value; syncedAt = Date.now(); return true;
  }
  function update(clock, cloud, view) {
    if (!ticket || !record || !validClock(clock)) return;
    ticket = {...ticket, clock: {started: clock.started, active: clock.active}, cloud, view};
    try { sessionStorage.setItem(HANDLE, JSON.stringify(ticket)); } catch { forget().catch(() => {}); return; }
    if (Date.now() - syncedAt < 1000) return;
    syncedAt = Date.now();
    record = {...record, expiresAt: Math.min(clock.active + IDLE_MS, clock.started + SESSION_MS)};
    const id = ticket.id, value = record, token = generation;
    pending = pending.catch(() => {}).then(() => token === generation ? transaction(store => store.put(value, PREFIX + id)) : undefined).catch(() => {
      if (token === generation) { generation++; ticket = null; record = null; try { sessionStorage.removeItem(HANDLE); } catch {} }
    });
  }
  async function restore(scope) {
    // A new tab or a new navigation still asks for the code, even if the browser
    // copied sessionStorage from an opener. Only a genuine reload can resume.
    if (performance.getEntriesByType('navigation')[0]?.type !== 'reload') { await forget({tabOnly: true}); await prune(); return null; }
    const saved = metadata();
    if (!validId(saved?.id) || saved.scope !== scope || !validClock(saved.clock)) { await forget(); await prune(); return null; }
    const token = generation, value = await transaction(store => store.get(PREFIX + saved.id), 'readonly');
    if (token !== generation) return null;
    if (!value || value.expiresAt <= Date.now() || value.started !== saved.clock.started ||
        !(value.key instanceof CryptoKey) || value.key.extractable !== false || value.key.algorithm.name !== 'AES-GCM' ||
        !(value.salt instanceof Uint8Array) || value.salt.length !== 16 || !validClock(saved.clock)) {
      await forget(); await prune(); return null;
    }
    ticket = saved; record = value; syncedAt = Date.now();
    return {...saved, key: value.key, salt: value.salt};
  }
  return {remember, restore, update, forget};
}
