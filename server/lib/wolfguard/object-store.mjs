// Object storage kept in D1, with the small subset of the R2 API the server uses
// (get / put / delete, customMetadata, httpMetadata). It is selected only when no R2 bucket is bound.
//
// An object is a row in `objects` plus base64 chunks in `object_chunks`, written under a fresh
// revision and published by one atomic batch, so a replacement is never visible half-written.
// Only ciphertext and public cache files are stored here.
const RAW_CHUNK = 384 * 1024; // base64 makes ~512 KB per row, far below D1's 2 MB row limit
const READ_AHEAD = 4;
const KEEP_SNAPSHOTS = 1; // one previous immutable snapshot kept as encrypted recovery history, plus the current one

const encoder = new TextEncoder();

function toBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192)
    binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}
function fromBase64(text) {
  const binary = atob(text),
    bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
const randomRevision = () =>
  [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, '0')).join('');

function readable(db, key, rev, size) {
  const total = Math.ceil(size / RAW_CHUNK);
  let next = 0;
  return new ReadableStream({
    async pull(controller) {
      if (next >= total) {
        controller.close();
        return;
      }
      const rows = (
        await db
          .prepare('SELECT idx,data FROM object_chunks WHERE key=? AND rev=? AND idx>=? ORDER BY idx LIMIT ?')
          .bind(key, rev, next, READ_AHEAD)
          .all()
      ).results;
      if (!rows.length || rows[0].idx !== next) {
        controller.error(new Error('Objet incomplet.'));
        return;
      }
      for (const row of rows) {
        if (row.idx !== next) {
          controller.error(new Error('Objet incomplet.'));
          return;
        }
        controller.enqueue(fromBase64(row.data));
        next++;
      }
    }
  });
}

class D1Object {
  constructor(db, row) {
    const meta = JSON.parse(row.meta_json);
    this.key = row.key;
    this.size = row.size;
    this.customMetadata = meta.customMetadata || {};
    this.httpMetadata = meta.httpMetadata || {};
    this.body = readable(db, row.key, row.rev, row.size);
  }
  arrayBuffer() {
    return new Response(this.body).arrayBuffer();
  }
  text() {
    return new Response(this.body).text();
  }
  json() {
    return new Response(this.body).json();
  }
}

export class D1ObjectStore {
  constructor(db, clock = Date.now) {
    this.db = db;
    this.clock = clock;
  }
  async put(key, body, options = {}) {
    const db = this.db,
      rev = randomRevision(),
      source = typeof body === 'string' ? encoder.encode(body) : body,
      stream = new Response(source).body;
    let index = 0,
      size = 0,
      pending = [];
    const insert = (position, bytes) =>
      db
        .prepare('INSERT INTO object_chunks(key,rev,idx,data) VALUES(?,?,?,?)')
        .bind(key, rev, position, toBase64(bytes));
    const flush = async () => {
      if (!pending.length) return;
      const statements = pending;
      pending = [];
      await db.batch(statements);
    };
    try {
      let buffer = new Uint8Array(RAW_CHUNK),
        used = 0;
      const emit = bytes => {
        pending.push(insert(index++, bytes));
        size += bytes.length;
      };
      if (stream)
        for await (const part of stream) {
          let offset = 0;
          while (offset < part.length) {
            const take = Math.min(RAW_CHUNK - used, part.length - offset);
            buffer.set(part.subarray(offset, offset + take), used);
            used += take;
            offset += take;
            if (used === RAW_CHUNK) {
              emit(buffer);
              buffer = new Uint8Array(RAW_CHUNK);
              used = 0;
              if (pending.length >= READ_AHEAD) await flush();
            }
          }
        }
      if (used) emit(buffer.slice(0, used));
      await flush();
      const now = this.clock();
      await db.batch([
        db
          .prepare('INSERT OR REPLACE INTO objects(key,rev,size,meta_json,created_at) VALUES(?,?,?,?,?)')
          .bind(
            key,
            rev,
            size,
            JSON.stringify({ customMetadata: options.customMetadata, httpMetadata: options.httpMetadata }),
            now
          ),
        db.prepare('DELETE FROM object_chunks WHERE key=? AND rev<>?').bind(key, rev)
      ]);
    } catch (error) {
      await db
        .prepare('DELETE FROM object_chunks WHERE key=? AND rev=?')
        .bind(key, rev)
        .run()
        .catch(() => {});
      throw error;
    }
    await this.prune(key).catch(() => {});
    return { key, size };
  }
  async get(key) {
    const row = await this.db.prepare('SELECT key,rev,size,meta_json FROM objects WHERE key=?').bind(key).first();
    return row ? new D1Object(this.db, row) : null;
  }
  async delete(key) {
    await this.db.batch([
      this.db.prepare('DELETE FROM object_chunks WHERE key=?').bind(key),
      this.db.prepare('DELETE FROM objects WHERE key=?').bind(key)
    ]);
  }
  // Keeps one previous snapshot (and always the current vault object); drops remote frames of ended sessions.
  async prune(key) {
    const db = this.db;
    if (key.startsWith('snapshots/')) {
      const old =
        "SELECT key FROM objects WHERE key LIKE 'snapshots/%' AND key NOT IN (SELECT object_key FROM vault WHERE object_key IS NOT NULL) ORDER BY created_at DESC LIMIT -1 OFFSET " +
        KEEP_SNAPSHOTS;
      await db.batch([
        db.prepare('DELETE FROM object_chunks WHERE key IN (' + old + ')'),
        db.prepare('DELETE FROM objects WHERE key IN (' + old + ')')
      ]);
    } else if (key.startsWith('remote/')) {
      // A desktop frame only lives while its session is live; anything else is deleted at once.
      const old =
        "SELECT key FROM objects WHERE key LIKE 'remote/%' AND key NOT IN (SELECT 'remote/'||id||'/frame' FROM remote_sessions WHERE status IN ('requested','preparing','active'))";
      await db.batch([
        db.prepare('DELETE FROM object_chunks WHERE key IN (' + old + ')'),
        db.prepare('DELETE FROM objects WHERE key IN (' + old + ')')
      ]);
    }
  }
}

const stores = new WeakMap();
// One store per database binding, so caches keyed on the store survive between requests.
export function d1ObjectStore(db, clock = Date.now) {
  let store = stores.get(db);
  if (!store) stores.set(db, (store = new D1ObjectStore(db, clock)));
  store.clock = clock;
  return store;
}
