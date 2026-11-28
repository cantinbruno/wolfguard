import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, sign, constants, createHash} from 'node:crypto';
import {mkdtempSync, writeFileSync, rmSync, rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createMigrationExport, EXPORT_PATH, SECRET_NAMES} from '../scripts/migration-export/worker.mjs';
import {decodeEnvelope, restoreDatabase, verifyArchive, protect, sealLocal} from '../scripts/migration-export/backup.mjs';

const pair = generateKeyPairSync('rsa', {modulusLength: 2048});
function fixture() {
  const now = Date.now(), config = {id: 'synthetic-test', publicKey: pair.publicKey.export({type: 'spki', format: 'der'}).toString('base64'), expiresAt: now + 60000};
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE parent(id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT UNIQUE);
    CREATE TABLE _cf_KV(key TEXT PRIMARY KEY,value BLOB) WITHOUT ROWID;
    CREATE TABLE payload(id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES parent(id), a, b, c, d, generated TEXT GENERATED ALWAYS AS (id||'!') VIRTUAL);
    CREATE TABLE composite(a TEXT,b INTEGER,PRIMARY KEY(a,b)) WITHOUT ROWID;
    CREATE INDEX payload_parent ON payload(parent_id);
    CREATE VIEW payload_view AS SELECT * FROM payload;
    INSERT INTO parent(value) VALUES ('synthetic');
    INSERT INTO payload VALUES (9223372036854775807,1,CAST(X'610062F09F90BA' AS TEXT),X'00FF8000',-9223372036854775808,1.2345678901234567);
    INSERT INTO payload VALUES (4,1,NULL,X'',9e999,-9e999);
    INSERT INTO composite VALUES ('clé',3);
    CREATE TRIGGER payload_audit AFTER DELETE ON payload BEGIN DELETE FROM composite; END;`);
  const db = {
    prepare(sql) {
      assert.match(sql, /^(SELECT|PRAGMA)/, 'export must remain read-only');
      assert.ok(!/FROM "_cf_KV"|table_xinfo\("_cf_KV"\)/.test(sql), 'provider storage must not be queried');
      return {async all() {return {results: sqlite.prepare(sql).all(), meta: {size_after: 65536, rows_written: 0}};}, async first() {return sqlite.prepare(sql).get() || null;}};
    },
    async batch(statements) {sqlite.exec('BEGIN'); try {const rows = []; for (const s of statements) rows.push(await s.all()); sqlite.exec('COMMIT'); return rows;} catch(e) {sqlite.exec('ROLLBACK'); throw e;}}
  };
  const bytes = Buffer.from('synthetic encrypted bytes'), metadata = {key: 'snapshots/clé', etag: 'synthetic-etag', size: bytes.length, version: 'v1',
    uploaded: new Date(0), customMetadata: {format: '1', nonce: '0011223344556677', size: '25'}, httpMetadata: {contentType: 'application/octet-stream'}};
  const env = {DB: db, ...Object.fromEntries(SECRET_NAMES.map(name => [name, 'synthetic-' + name])), BUCKET: {
    async list() {return {objects: [metadata], truncated: false};},
    async get(key, opts) {
      if (key !== metadata.key || opts.onlyIf.etagMatches !== metadata.etag) return null;
      const data = opts.range ? bytes.subarray(opts.range.offset, opts.range.offset + opts.range.length) : bytes;
      return {...metadata, body: new Response(data).body, arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)};
    }
  }};
  const handler = createMigrationExport(config, () => now);
  const request = (params, extra = {}) => {
    const body = JSON.stringify(params), timestamp = String(now);
    const canonical = `WolfGuard migration v1\n${config.id}\n${EXPORT_PATH}\n${timestamp}\n${body}`;
    const signature = sign('sha256', Buffer.from(canonical), {key: pair.privateKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32}).toString('base64');
    return new Request('https://synthetic.invalid' + EXPORT_PATH, {method: 'POST', body, headers: {'X-Migration-Time': timestamp, 'X-Migration-Signature': signature, ...extra}});
  };
  const call = async params => {
    const response = await handler(request(params), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store, private');
    const envelope = await response.json();
    return {envelope, ...decodeEnvelope(envelope, pair.privateKey, config)};
  };
  return {env, config, sqlite, request, handler, call, now};
}
test('unsigned, modified, cross-origin and expired requests do not touch storage', async () => {
  const s = fixture(), untouched = {get DB() {assert.fail('unauthorized DB access');}};
  try {
    assert.equal((await s.handler(new Request('https://synthetic.invalid' + EXPORT_PATH), untouched)).status, 404);
    assert.equal((await s.handler(s.request({op: 'secrets'}, {Origin: 'https://evil.invalid'}), untouched)).status, 404);
    assert.equal((await s.handler(s.request({op: 'secrets'}, {'X-Migration-Signature': 'AA=='}), untouched)).status, 404);
    assert.equal((await createMigrationExport(s.config, () => s.config.expiresAt)(s.request({op: 'secrets'}), untouched)).status, 404);
    assert.equal((await s.handler(s.request({op: 'secrets'}, {'X-Migration-Time': String(s.now - 61000)}), untouched)).status, 404);
    const original = s.request({op: 'secrets'});
    assert.equal((await s.handler(new Request(original.url, {method: 'POST', headers: original.headers, body: '{"op":"database"}'}), untouched)).status, 404);
    assert.equal(await s.handler(new Request('https://synthetic.invalid/api/status'), untouched), null);
  } finally {s.sqlite.close();}
});
test('atomic database export restores schema, int64, NUL text, blobs, floats, generated columns and sequences', async () => {
  const s = fixture(); let restored;
  try {
    const {result} = await s.call({op: 'database'});
    assert.equal(result.atomic, true);
    restored = restoreDatabase(result);
    for (const db of [s.sqlite, restored]) db.prepare('SELECT id FROM payload').setReadBigInts(true);
    const compare = db => db.prepare("SELECT CAST(id AS TEXT) AS id,typeof(a) AS at,hex(a) AS ah,typeof(b) AS bt,hex(b) AS bh,CAST(c AS TEXT) AS c,printf('%!.26g',d) AS d,generated FROM payload ORDER BY id").all();
    assert.deepEqual(compare(restored), compare(s.sqlite));
    assert.deepEqual(restored.prepare('SELECT * FROM sqlite_sequence').all(), s.sqlite.prepare('SELECT * FROM sqlite_sequence').all());
    assert.deepEqual(restored.prepare('SELECT * FROM composite').all(), s.sqlite.prepare('SELECT * FROM composite').all());
    assert.equal(restored.prepare("SELECT COUNT(*) AS n FROM sqlite_schema WHERE type='trigger'").get().n, 1);
  } finally {restored?.close(); s.sqlite.close();}
});
test('secrets only leave as authenticated recipient ciphertext; tampering fails', async () => {
  const s = fixture();
  try {
    const {result, envelope} = await s.call({op: 'secrets'});
    for (const name of SECRET_NAMES) {assert.equal(result.values[name], s.env[name]); assert.ok(!JSON.stringify(envelope).includes(s.env[name]));}
    envelope.requestHash = 'tampered';
    assert.throws(() => decodeEnvelope(envelope, pair.privateKey, s.config));
  } finally {s.sqlite.close();}
});
test('R2 export preserves exact Unicode keys, range bytes and all metadata and rejects changed etags', async () => {
  const s = fixture();
  try {
    const listed = (await s.call({op: 'objects'})).result.objects[0];
    const object = (await s.call({op: 'object', key: listed.key, etag: listed.etag, offset: 2})).result;
    assert.deepEqual(object.metadata, listed);
    assert.equal(Buffer.from(object.data, 'base64').toString(), 'nthetic encrypted bytes');
    await assert.rejects(s.call({op: 'object', key: listed.key, etag: 'changed', offset: 0}), /Server export operation failed/);
  } finally {s.sqlite.close();}
});
test('Windows-protected archive restores and verifies without plaintext files; truncation is rejected', {skip: process.platform !== 'win32'}, async () => {
  const s = fixture(), directory = mkdtempSync(path.join(tmpdir(), 'wolfguard-export-test-'));
  const filename = path.join(directory, 'synthetic.enc');
  try {
    const records = [await s.call({op: 'database'}), await s.call({op: 'secrets'})];
    const metadata = {key: 'security/synthetic', size: 3, etag: 'synthetic', customMetadata: {}, httpMetadata: {}};
    for (const result of [{op: 'objects', objects: [metadata], cursor: null}, {op: 'object', metadata, offset: 0, data: Buffer.from('abc').toString('base64')}]) {
      const envelope = sealLocal(result, pair.privateKey, s.config);
      records.push({envelope, ...decodeEnvelope(envelope, pair.privateKey, s.config)});
    }
    const digest = createHash('sha256');
    for (const record of records) digest.update(record.bytes).update('\n');
    const manifest = sealLocal({op: 'manifest', plaintextSha256: digest.digest('hex'), objectSha256: {'security/synthetic': createHash('sha256').update('abc').digest('hex')}, vaultVersionStable: true}, pair.privateKey, s.config);
    const privateBytes = pair.privateKey.export({type: 'pkcs8', format: 'der'});
    const header = {format: 'wolfguard-migration-v1', recipient: s.config, protectedKey: protect('protect', privateBytes).toString('base64')};
    privateBytes.fill(0);
    const prefix = JSON.stringify(header) + '\n' + records.map(r => JSON.stringify(r.envelope)).join('\n') + '\n';
    writeFileSync(filename, prefix + JSON.stringify(manifest) + '\n');
    const report = await verifyArchive(filename);
    assert.equal(report.restoredIntegrity, 'ok'); assert.equal(report.r2.objects, 1);
    assert.equal(report.requiredOriginalSecrets.length, 5);
    assert.deepEqual(report.excludedProviderTables, ['_cf_KV']);
    writeFileSync(filename, prefix);
    await assert.rejects(verifyArchive(filename), /Incomplete backup/);
  } finally {s.sqlite.close(); rmSync(filename, {force: true}); rmdirSync(directory);}
});
