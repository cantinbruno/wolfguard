// Offline preparation of a restore from the encrypted Sites backup (Windows, same user).
// Reads the archive as a stream, decrypts it in memory and writes SQL files for an empty D1 database:
//   data.sql    real production schema (without Sites' migration registry) and every row
//   objects.sql the current snapshot and the small public caches, in the D1 object-store tables
// Secrets are never written to disk: the `secrets` command pipes them straight into `wrangler secret bulk`.
import { createPrivateKey } from 'node:crypto';
import { createReadStream, mkdirSync, writeFileSync, openSync, writeSync, closeSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodeEnvelope, restoreDatabase, protect } from '../migration-export/backup.mjs';
import { identifier } from '../migration-export/worker.mjs';

// D1 refuses SQL statements over 100 KB: import rows stay well below (the store reads any chunk size).
const RAW_CHUNK = 48 * 1024;
const SKIP_TABLES = new Set(['__appgarden_migrations', 'sqlite_sequence']);
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
// The Sites export writes TEXT as CAST(X'..' AS TEXT) (lossless but twice as long). Plain quoted text is
// used whenever it is valid UTF-8 without NUL bytes, to stay under D1's 100 KB statement limit.
export function compactLiteral(literal) {
  const match = /^CAST\(X'([0-9A-Fa-f]*)' AS TEXT\)$/.exec(literal);
  if (!match) return literal;
  const bytes = Buffer.from(match[1], 'hex');
  if (bytes.includes(0)) return literal;
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return quote(text);
  } catch {
    return literal;
  }
}

function privateKey(header) {
  const bytes = protect('unprotect', Buffer.from(header.protectedKey, 'base64'));
  try {
    return createPrivateKey({ key: bytes, type: 'pkcs8', format: 'der' });
  } finally {
    bytes.fill(0);
  }
}

// Reads the archive once. `wantObject(key)` decides which objects are kept in memory.
export async function readArchive(filename, { wantObject = () => false, wantSecrets = false } = {}) {
  const lines = createInterface({ input: createReadStream(filename), crlfDelay: Infinity });
  let header, key, database, secrets;
  const listed = new Map(),
    ranges = new Map();
  for await (const line of lines) {
    if (!header) {
      header = JSON.parse(line);
      if (header.format !== 'wolfguard-migration-v1') throw new Error('Unknown backup format');
      key = privateKey(header);
      continue;
    }
    const { result } = decodeEnvelope(JSON.parse(line), key, header.recipient);
    if (result.op === 'database') database = result;
    else if (result.op === 'secrets' && wantSecrets) secrets = result.values;
    else if (result.op === 'objects') for (const object of result.objects) listed.set(object.key, object);
    else if (result.op === 'object' && wantObject(result.metadata.key, database)) {
      const entry = ranges.get(result.metadata.key) || { metadata: result.metadata, chunks: [], length: 0 };
      const chunk = Buffer.from(result.data, 'base64');
      if (result.offset !== entry.length) throw new Error('Object ranges incomplete');
      entry.chunks.push(chunk);
      entry.length += chunk.length;
      ranges.set(result.metadata.key, entry);
    }
  }
  if (!database) throw new Error('No database in archive');
  const objects = new Map();
  for (const [name, entry] of ranges) {
    const expected = listed.get(name);
    if (!expected || entry.length !== expected.size) throw new Error('Incomplete object: ' + name);
    objects.set(name, { metadata: entry.metadata, bytes: Buffer.concat(entry.chunks) });
  }
  return { database, secrets, objects, listed };
}

// Parent tables first, so foreign keys hold at every step even without deferred checks.
export function orderedTables(database) {
  const tables = database.schema.filter(e => e.type === 'table' && e.sql && !e.name.startsWith('sqlite_') && !SKIP_TABLES.has(e.name));
  const names = new Set(tables.map(t => t.name)),
    done = new Set(),
    out = [];
  const visit = (table, trail = []) => {
    if (done.has(table.name) || trail.includes(table.name)) return;
    for (const match of table.sql.matchAll(/REFERENCES\s+[`"']?(\w+)[`"']?/gi))
      if (names.has(match[1]) && match[1] !== table.name) visit(tables.find(t => t.name === match[1]), [...trail, table.name]);
    done.add(table.name);
    out.push(table);
  };
  tables.forEach(table => visit(table));
  return out;
}

export function dataSQL(database) {
  const out = [];
  const tables = orderedTables(database);
  for (const table of tables) out.push(table.sql.trim().replace(/;$/, '') + ';');
  const byName = new Map(database.tables.map(t => [t.name, t]));
  let rows = 0;
  for (const table of tables) {
    const data = byName.get(table.name);
    if (!data) continue;
    const columns = [...(data.rowid ? [data.rowid] : []), ...data.columns];
    for (const row of data.rows) {
      if (row.length !== columns.length || row.some(v => typeof v !== 'string')) throw new Error('Invalid SQL literal record');
      out.push(`INSERT INTO ${identifier(table.name)} (${columns.map(identifier).join(',')}) VALUES (${row.map(compactLiteral).join(',')});`);
      rows++;
    }
  }
  for (const entry of database.schema.filter(e => ['index', 'view', 'trigger'].includes(e.type) && e.sql && !SKIP_TABLES.has(e.tbl_name)))
    out.push(entry.sql.trim().replace(/;$/, '') + ';');
  return { sql: out.join('\n') + '\n', tables: tables.length, rows };
}

export function objectSQL(objects, now = Date.now()) {
  const out = [];
  for (const [name, { metadata, bytes }] of objects) {
    const rev = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
    let index = 0;
    for (let offset = 0; offset < bytes.length; offset += RAW_CHUNK)
      out.push(
        `INSERT INTO object_chunks(key,rev,idx,data) VALUES (${quote(name)},${quote(rev)},${index++},${quote(bytes.subarray(offset, offset + RAW_CHUNK).toString('base64'))});`
      );
    const meta = JSON.stringify({ customMetadata: metadata.customMetadata, httpMetadata: metadata.httpMetadata });
    out.push(
      `INSERT INTO objects(key,rev,size,meta_json,created_at) VALUES (${quote(name)},${quote(rev)},${bytes.length},${quote(meta)},${now});`
    );
  }
  return out.join('\n') + '\n';
}

async function prepare(archive, outDir) {
  mkdirSync(outDir, { recursive: true });
  // The current snapshot is whatever vault.object_key points to; public caches (security/) are small.
  let current = null;
  const read = await readArchive(archive, {
    wantObject: (name, database) => {
      if (name.startsWith('security/')) return true;
      if (current === null && database) {
        const db = restoreDatabase(database);
        try {
          current = db.prepare('SELECT object_key FROM vault WHERE id=1').get()?.object_key || '';
        } finally {
          db.close();
        }
      }
      return name === current;
    }
  });
  if (!current || !read.objects.has(current)) throw new Error('Current snapshot not found in the archive');
  const data = dataSQL(read.database);
  writeFileSync(path.join(outDir, 'data.sql'), data.sql, { mode: 0o600 });
  writeFileSync(path.join(outDir, 'objects.sql'), objectSQL(read.objects), { mode: 0o600 });
  const report = {
    tables: data.tables,
    rows: data.rows,
    objects: [...read.objects.keys()].map(name => ({ prefix: name.split('/')[0], bytes: read.objects.get(name).bytes.length })),
    currentSnapshotBytes: read.objects.get(current).bytes.length,
    skippedObjects: read.listed.size - read.objects.size
  };
  writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
}

// Streams the secrets straight into `wrangler secret bulk` (stdin); nothing is printed or written.
async function secrets(archive, workerName, cwd) {
  const { secrets: values } = await readArchive(archive, { wantSecrets: true });
  const names = ['AUTH_PEPPER', 'STORAGE_KEY', 'WORKSPACE_KEY_ENCRYPTION_KEY', 'ENTRY_LINK_HASH', 'BOOTSTRAP_HASH'];
  if (names.some(name => !values?.[name])) throw new Error('Missing required secret in archive');
  const payload = Object.fromEntries(Object.entries(values).filter(([name]) => names.includes(name) || name.startsWith('MFA_')));
  const result = spawnSync('npx', ['--yes', 'wrangler@latest', 'secret', 'bulk', '--name', workerName], {
    cwd,
    input: JSON.stringify(payload),
    encoding: 'utf8',
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  for (const name of Object.keys(payload)) payload[name] = '';
  console.log(result.status === 0 ? `Secrets installed: ${names.join(', ')} (values never displayed).` : 'wrangler secret bulk failed (status ' + result.status + ').');
  if (result.status !== 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [command, archive, extra, cwd] = process.argv.slice(2);
  if (command === 'prepare' && archive && extra) await prepare(path.resolve(archive), path.resolve(extra));
  else if (command === 'secrets' && archive && extra) await secrets(path.resolve(archive), extra, cwd ? path.resolve(cwd) : process.cwd());
  else throw new Error('Usage: restore.mjs prepare ARCHIVE OUTDIR | secrets ARCHIVE WORKER_NAME [WRANGLER_DIR]');
}
