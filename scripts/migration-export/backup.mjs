// Windows-only encrypted transfer and offline verification. No plaintext backup
// or original runtime key is written to disk or printed.
import {generateKeyPairSync, createPrivateKey, createPublicKey, sign, constants, privateDecrypt, publicEncrypt, createDecipheriv, createCipheriv, randomBytes, createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, openSync, writeSync, closeSync, existsSync, createReadStream, statSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {EXPORT_PATH, SECRET_NAMES, identifier} from './worker.mjs';

const ROOT = path.resolve(process.env.LOCALAPPDATA || '', 'WolfGuardWeb/migration/export-20261128');
const ORIGIN = 'https://wolfguard-web-cantin.cantin-bruno.chatgpt.site';
const sha = value => createHash('sha256').update(value).digest('hex');
export function protect(operation, value) {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', fileURLToPath(new URL('./windows-protect.ps1', import.meta.url)), operation],
    {input: Buffer.from(value).toString('base64'), encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024});
  if (result.status !== 0) throw new Error('Windows DPAPI failed; no private material was logged.');
  return Buffer.from(result.stdout.trim(), 'base64');
}
const keyFile = () => path.join(ROOT, 'transfer-key.dpapi');
const configFile = () => path.join(ROOT, 'recipient.json');
export function setup(checkout) {
  if (process.platform !== 'win32') throw new Error('Windows CurrentUser protection required');
  mkdirSync(ROOT, {recursive: true});
  // Drop inherited access: only this Windows user and SYSTEM may read the transfer.
  const acl = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    '$p=[Console]::In.ReadToEnd().Trim();$s=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;& icacls $p /inheritance:r /grant:r "*${s}:(OI)(CI)F" "*S-1-5-18:(OI)(CI)F" | Out-Null;exit $LASTEXITCODE'], {input: ROOT, windowsHide: true, encoding: 'utf8'});
  if (acl.status !== 0) throw new Error('Cannot protect backup directory ACL');
  let config;
  if (existsSync(configFile()) && existsSync(keyFile())) config = JSON.parse(readFileSync(configFile(), 'utf8'));
  else {
    const pair = generateKeyPairSync('rsa', {modulusLength: 3072});
    const privateBytes = pair.privateKey.export({type: 'pkcs8', format: 'der'});
    writeFileSync(keyFile(), protect('protect', privateBytes), {flag: 'wx', mode: 0o600});
    privateBytes.fill(0);
    config = {id: randomBytes(16).toString('hex'), expiresAt: Date.now() + 2 * 60 * 60 * 1000,
      publicKey: pair.publicKey.export({type: 'spki', format: 'der'}).toString('base64')};
    writeFileSync(configFile(), JSON.stringify(config, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  }
  if (Date.now() >= config.expiresAt) throw new Error('Existing transfer expired; do not overwrite its recovery material');
  writeFileSync(path.join(checkout, 'lib/migration-recipient.json'), JSON.stringify(config) + '\n');
  console.log(JSON.stringify({directory: ROOT, recipientConfigured: true, expiresAt: new Date(config.expiresAt).toISOString()}));
}
function loadPrivate(blob = readFileSync(keyFile())) {
  const bytes = protect('unprotect', blob);
  try {return createPrivateKey({key: bytes, type: 'pkcs8', format: 'der'});} finally {bytes.fill(0);}
}
export function decodeEnvelope(envelope, key, config) {
  if (envelope.version !== 1 || envelope.id !== config.id) throw new Error('Invalid encrypted record');
  const raw = privateDecrypt({key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256'}, Buffer.from(envelope.wrappedKey, 'base64'));
  try {
    const cipher = Buffer.from(envelope.ciphertext, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', raw, Buffer.from(envelope.iv, 'base64'));
    decipher.setAAD(Buffer.from(`WolfGuard migration v1:${config.id}:${envelope.requestHash}`));
    decipher.setAuthTag(cipher.subarray(-16));
    const bytes = Buffer.concat([decipher.update(cipher.subarray(0, -16)), decipher.final()]);
    const payload = JSON.parse(bytes.toString('utf8'));
    if (!payload.ok) {
      // The server encrypts diagnostics too. Keep raw SQL/object messages private.
      const diagnostic = payload.diagnostic || '';
      const codes = ['no such column', 'no such table', 'not authorized', 'not supported', 'is not a function', 'SQLITE_AUTH', 'D1_SESSION_ERROR', 'internal error'];
      const category = codes.find(code => diagnostic.includes(code)) || 'unclassified';
      const failure = new Error('Server export operation failed (no private details logged). Category: ' + category + '; diagnostic SHA256: ' + sha(diagnostic));
      failure.diagnostic = diagnostic;
      throw failure;
    }
    return {bytes, result: payload.result};
  } finally {raw.fill(0);}
}
export function sealLocal(result, key, config) {
  // Local manifest uses the same envelope format and recipient.
  const raw = randomBytes(32), iv = randomBytes(12), requestHash = randomBytes(32).toString('base64');
  const cipher = createCipheriv('aes-256-gcm', raw, iv);
  cipher.setAAD(Buffer.from(`WolfGuard migration v1:${config.id}:${requestHash}`));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ok: true, result})), cipher.final(), cipher.getAuthTag()]);
  const wrappedKey = publicEncrypt({key: createPublicKey(key), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256'}, raw);
  raw.fill(0);
  return {version: 1, id: config.id, requestHash, iv: iv.toString('base64'), wrappedKey: wrappedKey.toString('base64'), ciphertext: ciphertext.toString('base64')};
}
async function requestExport(params, key, config) {
  const body = JSON.stringify(params), timestamp = String(Date.now());
  const canonical = `WolfGuard migration v1\n${config.id}\n${EXPORT_PATH}\n${timestamp}\n${body}`;
  const signature = sign('sha256', Buffer.from(canonical), {key, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32}).toString('base64');
  const response = await fetch(ORIGIN + EXPORT_PATH, {method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120000),
    headers: {'Content-Type': 'application/json', 'X-Migration-Time': timestamp, 'X-Migration-Signature': signature}, body});
  if (!response.ok) throw new Error(`Export HTTP ${response.status}, operation ${params.op}`);
  const envelope = await response.json();
  const expectedHash = createHash('sha256').update(canonical).digest('base64');
  if (envelope.requestHash !== expectedHash) throw new Error('Response is not bound to signed request');
  return {envelope, ...decodeEnvelope(envelope, key, config)};
}
async function listObjects(key, config, receive) {
  const objects = [], seen = new Set();
  let cursor;
  do {
    const record = await requestExport({op: 'objects', ...(cursor ? {cursor} : {})}, key, config);
    receive?.(record);
    for (const object of record.result.objects) {
      if (seen.has(object.key)) throw new Error('Duplicate object key in listing');
      seen.add(object.key); objects.push(object);
    }
    const next = record.result.cursor;
    if (next && next === cursor) throw new Error('Cursor did not advance');
    cursor = next;
  } while (cursor);
  return objects;
}
function storageSummary(objects) {
  const prefixes = Object.fromEntries(['snapshots/', 'remote/', 'security/'].map(name => [name, {objects: 0, bytes: 0, largestBytes: 0}]));
  for (const object of objects) {
    const prefix = object.key.includes('/') ? object.key.split('/')[0] + '/' : '(root)';
    const group = prefixes[prefix] ||= {objects: 0, bytes: 0, largestBytes: 0};
    group.objects++; group.bytes += object.size; group.largestBytes = Math.max(group.largestBytes, object.size);
  }
  return {objects: objects.length, bytes: objects.reduce((n, o) => n + o.size, 0), prefixes};
}
export async function inventory() {
  const config = JSON.parse(readFileSync(configFile(), 'utf8')), key = loadPrivate();
  const {result} = await requestExport({op: 'inventory'}, key, config);
  const objects = await listObjects(key, config);
  const summary = {observedAt: result.observedAt, databaseBytes: result.databaseBytes, tables: result.tables,
    rowsWrittenByInventory: result.rowsWrittenByInventory, r2: storageSummary(objects), vaultVersion: result.vault?.version,
    currentSnapshotFound: objects.some(o => o.key === result.vault?.object_key),
    currentSnapshotBytes: objects.find(o => o.key === result.vault?.object_key)?.size,
    r2BytesAsD1Base64LowerBound: objects.reduce((n, o) => n + Math.ceil(o.size / 3) * 4, 0), dailyWritesMeasured: false};
  writeFileSync(path.join(ROOT, 'inventory.json'), JSON.stringify(summary, null, 2) + '\n', {mode: 0o600});
  console.log(JSON.stringify(summary, null, 2));
}
export async function diagnostics() {
  const config = JSON.parse(readFileSync(configFile(), 'utf8')), key = loadPrivate();
  console.log(JSON.stringify((await requestExport({op: 'diagnostics'}, key, config)).result));
}
export async function databaseMetadata(filename) {
  const lines = createInterface({input: createReadStream(filename), crlfDelay: Infinity});
  let header, key;
  for await (const line of lines) {
    if (!header) {header = JSON.parse(line); key = loadPrivate(Buffer.from(header.protectedKey, 'base64')); continue;}
    const {result} = decodeEnvelope(JSON.parse(line), key, header.recipient);
    if (result.op !== 'database') continue;
    const db = restoreDatabase(result);
    try {
      const migrations = result.tables.find(t => t.name === '__appgarden_migrations');
      const report = {databaseRestores: true, migrationColumns: migrations?.columns,
        appliedMigrations: migrations ? db.prepare('SELECT * FROM __appgarden_migrations').all() : null,
        providerMetadataTablesExcluded: (result.providerSchema || []).filter(e => e.type === 'table').map(e => e.name)};
      writeFileSync(path.join(ROOT, 'database-metadata.json'), JSON.stringify(report, null, 2) + '\n', {mode: 0o600});
      console.log(JSON.stringify(report, null, 2));
      return;
    } finally {db.close();}
  }
  throw new Error('No completed database record');
}
export function restoreDatabase(data) {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=OFF'); db.exec('BEGIN');
    for (const entry of data.schema.filter(e => e.type === 'table' && e.sql && !e.name.startsWith('sqlite_'))) db.exec(entry.sql);
    for (const table of data.tables) {
      const columns = [...(table.rowid ? [table.rowid] : []), ...table.columns];
      if (table.name === 'sqlite_sequence') db.exec('DELETE FROM sqlite_sequence');
      for (const row of table.rows) {
        if (row.length !== columns.length || row.some(v => typeof v !== 'string')) throw new Error('Invalid SQL literal record');
        db.exec(`INSERT INTO ${identifier(table.name)} (${columns.map(identifier).join(',')}) VALUES (${row.join(',')})`);
      }
    }
    for (const entry of data.schema.filter(e => ['index', 'view', 'trigger'].includes(e.type) && e.sql)) db.exec(entry.sql);
    db.exec('COMMIT');
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Restored SQLite integrity failed');
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Restored foreign keys failed');
    for (const table of data.tables) if (db.prepare(`SELECT COUNT(*) AS n FROM ${identifier(table.name)}`).get().n !== table.rows.length) throw new Error('Restored row count differs');
    return db;
  } catch {db.close(); throw new Error('Offline database restoration failed; no private details logged');}
}
function openRecord(value, context, storageKey) {
  const [iv, body] = value.split(':'), cipher = Buffer.from(body, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(storageKey, 'hex'), Buffer.from(iv, 'hex'));
  decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(cipher.subarray(-16));
  return Buffer.concat([decipher.update(cipher.subarray(0, -16)), decipher.final()]);
}
function verifySnapshot(object, values) {
  const {format, nonce, size} = object.metadata.customMetadata;
  if (format !== '1' || !/^[0-9a-f]{16}$/.test(nonce || '') || !/^\d+$/.test(size || '')) throw new Error('Snapshot metadata missing');
  const bytes = Buffer.concat(object.chunks), plain = [];
  for (let offset = 0, index = 0; offset < bytes.length; offset += 65552, index++) {
    const block = bytes.subarray(offset, offset + 65552), iv = Buffer.alloc(12);
    Buffer.from(nonce, 'hex').copy(iv); iv.writeUInt32BE(index, 8);
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(values.STORAGE_KEY, 'hex'), iv);
    decipher.setAAD(Buffer.from(`WolfGuard storage v1:${Number(size)}:${index}`)); decipher.setAuthTag(block.subarray(-16));
    plain.push(decipher.update(block.subarray(0, -16)), decipher.final());
  }
  const content = Buffer.concat(plain);
  if (content.length !== Number(size)) throw new Error('Snapshot clear length mismatch');
  JSON.parse(content.toString('utf8'));
  content.fill(0);
}
export async function verifyArchive(filename) {
  const stream = createReadStream(filename), encryptedHash = createHash('sha256');
  stream.on('data', chunk => encryptedHash.update(chunk));
  const lines = createInterface({input: stream, crlfDelay: Infinity});
  const hash = createHash('sha256');
  let data, values, manifest, header, key, active;
  let testedSnapshots = 0;
  const objects = new Map(), expectedObjects = new Map();
  for await (const line of lines) {
    if (!header) {
      header = JSON.parse(line);
      if (header.format !== 'wolfguard-migration-v1') throw new Error('Unknown backup format');
      key = loadPrivate(Buffer.from(header.protectedKey, 'base64'));
      continue;
    }
    const {bytes, result} = decodeEnvelope(JSON.parse(line), key, header.recipient);
    if (result.op === 'manifest') {if (manifest) throw new Error('Duplicate manifest'); manifest = result; continue;}
    if (manifest) throw new Error('Trailing data after manifest');
    hash.update(bytes); hash.update('\n');
    if (result.op === 'database') {if (data) throw new Error('Duplicate database'); data = result;}
    if (result.op === 'secrets') values = result.values;
    if (result.op === 'objects') for (const object of result.objects) expectedObjects.set(object.key, object);
    if (result.op === 'object') {
      const expected = expectedObjects.get(result.metadata.key);
      if (!expected || objects.has(result.metadata.key)) throw new Error('Unexpected or repeated object');
      const object = active || {metadata: result.metadata, chunks: [], length: 0};
      if (object.metadata.key !== result.metadata.key) throw new Error('Interleaved object records');
      const chunk = Buffer.from(result.data, 'base64');
      if (result.offset !== object.length || chunk.length > 1024 * 1024) throw new Error('Object ranges incomplete');
      if (object.metadata.etag !== result.metadata.etag) throw new Error('Object changed');
      object.chunks.push(chunk); object.length += chunk.length;
      if (object.length > expected.size) throw new Error('Object size exceeds source');
      active = object;
      if (object.length === expected.size) {
        const objectBytes = Buffer.concat(object.chunks);
        if (expected.checksums?.md5 && createHash('md5').update(objectBytes).digest('base64') !== expected.checksums.md5) throw new Error('Source R2 MD5 differs');
        if (result.metadata.key.startsWith('snapshots/')) {verifySnapshot(object, values); testedSnapshots++;}
        objects.set(result.metadata.key, {metadata: object.metadata, length: object.length, digest: sha(objectBytes)});
        active = undefined;
        if (objects.size % 100 === 0) console.log(`Encrypted objects verified: ${objects.size}/${expectedObjects.size}`);
      }
    }
  }
  if (!manifest || manifest.plaintextSha256 !== hash.digest('hex') || !data || !data.atomic || !values || active) throw new Error('Incomplete backup');
  if (SECRET_NAMES.slice(0, 5).some(n => !values[n])) throw new Error('Missing original runtime secrets');
  if (expectedObjects.size !== objects.size) throw new Error('Missing objects');
  for (const [name, expected] of expectedObjects) {
    const object = objects.get(name);
    if (!object || object.length !== expected.size || object.metadata.etag !== expected.etag || JSON.stringify(object.metadata.customMetadata) !== JSON.stringify(expected.customMetadata) || JSON.stringify(object.metadata.httpMetadata) !== JSON.stringify(expected.httpMetadata)) throw new Error('Object metadata or bytes incomplete');
    if (manifest.objectSha256[name] !== object.digest) throw new Error('Object SHA256 mismatch');
  }
  const db = restoreDatabase(data);
  let testedRecords = 0;
  try {
    if (data.tables.some(t => t.name === 'users')) for (const row of db.prepare('SELECT id,name_cipher FROM users WHERE name_cipher IS NOT NULL').all()) {
      const clear = openRecord(row.name_cipher, 'WolfGuard users v1:name:' + row.id, values.STORAGE_KEY); JSON.parse(clear.toString()); clear.fill(0); testedRecords++;
    }
    const vault = data.tables.some(t => t.name === 'vault') ? db.prepare('SELECT version,object_key FROM vault WHERE id=1').get() : null;
    if (vault?.object_key && !objects.has(vault.object_key)) throw new Error('Current snapshot missing');
    return {verifiedAt: new Date().toISOString(), backup: filename, encryptedBytes: statSync(filename).size,
      encryptedSha256: encryptedHash.digest('hex'), plaintextSha256: manifest.plaintextSha256,
      databaseBytes: data.databaseBytes, tables: data.tables.length, rows: data.tables.reduce((n, t) => n + t.rows.length, 0),
      r2: storageSummary([...expectedObjects.values()]), requiredOriginalSecrets: SECRET_NAMES.slice(0, 5).map(name => ({name, present: !!values[name]})),
      historicalPushKeyPreserved: !!values.PUSH_VAPID_PRIVATE_KEY, restoredIntegrity: 'ok', testedRecords, testedSnapshots,
      atomicDatabaseSnapshot: true, vaultVersionStableDuringCopy: manifest.vaultVersionStable, vaultVersion: vault?.version,
      excludedProviderTables: (data.providerSchema || []).filter(e => e.type === 'table').map(e => e.name),
      dailyWritesMeasured: false};
  } finally {db.close();}
}
export async function backup() {
  const config = JSON.parse(readFileSync(configFile(), 'utf8')), key = loadPrivate();
  const filename = path.join(ROOT, 'sauvegarde-' + new Date().toISOString().replaceAll(/[:.]/g, '-') + '.enc');
  const fd = openSync(filename, 'wx', 0o600), digest = createHash('sha256');
  const append = record => {writeSync(fd, JSON.stringify(record.envelope) + '\n'); digest.update(record.bytes); digest.update('\n');};
  const before = (await requestExport({op: 'inventory'}, key, config)).result;
  try {
    writeSync(fd, JSON.stringify({format: 'wolfguard-migration-v1', protection: 'Windows-DPAPI-CurrentUser', recipient: config, protectedKey: readFileSync(keyFile()).toString('base64')}) + '\n');
    const database = await requestExport({op: 'database'}, key, config); append(database);
    append(await requestExport({op: 'secrets'}, key, config));
    const objects = await listObjects(key, config, append), objectSha256 = {};
    let completed = 0;
    const download = async object => {
      const hash = createHash('sha256');
      const records = [];
      // A zero-byte object still needs an authenticated GET and metadata record.
      for (let offset = 0; offset < object.size || offset === 0; offset += 1024 * 1024) {
        const record = await requestExport({op: 'object', key: object.key, etag: object.etag, size: object.size, offset}, key, config);
        if (record.result.metadata.size !== object.size || record.result.metadata.etag !== object.etag) throw new Error('Object changed during copy');
        const chunk = Buffer.from(record.result.data, 'base64');
        if (chunk.length !== Math.min(1024 * 1024, object.size - offset)) throw new Error('Incomplete object range');
        hash.update(chunk); records.push(record);
      }
      return {object, records, sha256: hash.digest('hex')};
    };
    // Four independent objects in flight, written in listing order so offline
    // verification only needs to retain one object's bytes in memory.
    const pending = new Map();
    const start = index => {
      if (index < objects.length) pending.set(index, download(objects[index]).then(result => ({result}), error => ({error})));
    };
    for (let i = 0; i < 4; i++) start(i);
    for (let index = 0; index < objects.length; index++) {
      const {result, error} = await pending.get(index); pending.delete(index);
      if (error) throw error;
      for (const record of result.records) append(record);
      objectSha256[result.object.key] = result.sha256;
      start(index + 4);
      if (++completed % 25 === 0) console.log(`Encrypted objects copied: ${completed}/${objects.length}`);
    }
    const afterObjects = await listObjects(key, config), after = (await requestExport({op: 'inventory'}, key, config)).result;
    const stableObjects = objects.length === afterObjects.length && objects.every((o, i) => JSON.stringify(o) === JSON.stringify(afterObjects[i]));
    const stableVault = JSON.stringify(before.vault) === JSON.stringify(after.vault);
    if (!stableObjects || !stableVault) throw new Error('Source changed during copy; retry before treating this backup as complete');
    const manifest = {op: 'manifest', completedAt: new Date().toISOString(), plaintextSha256: digest.digest('hex'), objectSha256, vaultVersionStable: stableVault};
    writeSync(fd, JSON.stringify(sealLocal(manifest, key, config)) + '\n');
  } finally {closeSync(fd);}
  const report = await verifyArchive(filename);
  writeFileSync(path.join(ROOT, 'verification.json'), JSON.stringify(report, null, 2) + '\n', {mode: 0o600});
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [command, arg] = process.argv.slice(2);
    if (command === 'setup' && arg) setup(path.resolve(arg));
    else if (command === 'inventory') await inventory();
    else if (command === 'diagnostics') await diagnostics();
    else if (command === 'inspect' && arg) await databaseMetadata(path.resolve(arg));
    else if (command === 'backup') await backup();
    else if (command === 'verify' && arg) console.log(JSON.stringify(await verifyArchive(path.resolve(arg)), null, 2));
    else throw new Error('Usage: backup.mjs setup CHECKOUT | inventory | backup | verify FILE');
  } catch (error) {console.error(error.message); process.exitCode = 1;}
}
