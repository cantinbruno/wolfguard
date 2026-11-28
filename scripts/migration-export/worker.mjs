// Temporary, read-only export capability. Copy into the existing Site only for
// a transfer, pin its public recipient key, and remove it after verification.
const encoder = new TextEncoder();
export const EXPORT_PATH = '/__migration-export-v1';
export const SECRET_NAMES = ['AUTH_PEPPER', 'STORAGE_KEY', 'WORKSPACE_KEY_ENCRYPTION_KEY', 'ENTRY_LINK_HASH', 'BOOTSTRAP_HASH', 'PUSH_VAPID_PRIVATE_KEY'];
const b64 = data => {
  const bytes = new Uint8Array(data);
  let result = '';
  for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(result);
};
const unb64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const sha = async value => b64(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const providerTable = name => name.startsWith('_cf_');
export const identifier = value => '"' + value.replaceAll('"', '""') + '"';
export function literalExpression(name) {
  const col = identifier(name);
  // Produce SQL literals inside SQLite: never round int64 through JavaScript,
  // and keep TEXT/BLOB bytes (including NULs) and REAL round trips intact.
  return `CASE typeof(${col}) WHEN 'null' THEN 'NULL' WHEN 'text' THEN 'CAST(X''' || hex(CAST(${col} AS BLOB)) || ''' AS TEXT)' WHEN 'blob' THEN 'X''' || hex(${col}) || '''' WHEN 'integer' THEN CAST(${col} AS TEXT) WHEN 'real' THEN CASE WHEN ${col}>1.7976931348623157e308 THEN '9e999' WHEN ${col} < -1.7976931348623157e308 THEN '-9e999' ELSE printf('%!.26g',${col}) END END`;
}
async function plan(db) {
  const result = await db.prepare('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name').all();
  const providerSchema = result.results.filter(e => providerTable(e.tbl_name));
  const schema = result.results.filter(e => !providerTable(e.tbl_name));
  const tables = [];
  for (const entry of schema.filter(e => e.type === 'table' && e.name !== 'sqlite_sequence' && !e.name.startsWith('sqlite_'))) {
    if (/CREATE\s+VIRTUAL\s+TABLE/i.test(entry.sql || '')) throw new Error('Virtual table requires native export');
    const columns = (await db.prepare(`PRAGMA table_xinfo(${identifier(entry.name)})`).all()).results;
    if (!columns.length) throw new Error('Missing columns');
    const visible = columns.filter(c => c.hidden === 0).map(c => c.name);
    const rowid = /\bWITHOUT\s+ROWID\b/i.test(entry.sql || '') ? null : ['rowid', '_rowid_', 'oid'].find(n => !columns.some(c => c.name.toLowerCase() === n));
    tables.push({name: entry.name, columns: visible, rowid: rowid || null, definition: columns});
  }
  if (schema.some(e => e.name === 'sqlite_sequence')) tables.push({name: 'sqlite_sequence', columns: ['name', 'seq'], rowid: null});
  return {schema, tables, providerSchema};
}
function tableQuery(table) {
  const columns = [...(table.rowid ? [table.rowid] : []), ...table.columns];
  const order = table.rowid ? identifier(table.rowid) : table.columns.map(identifier).join(',');
  return `SELECT ${columns.map((c, i) => literalExpression(c) + ' AS ' + identifier('c' + i)).join(',')} FROM ${identifier(table.name)} ORDER BY ${order}`;
}
function objectMetadata(object) {
  const checksums = {};
  for (const name of ['md5', 'sha1', 'sha256', 'sha384', 'sha512']) if (object.checksums?.[name]) checksums[name] = b64(object.checksums[name]);
  return {key: object.key, size: object.size, version: object.version, etag: object.etag, uploaded: object.uploaded,
    customMetadata: object.customMetadata || {}, httpMetadata: object.httpMetadata || {}, storageClass: object.storageClass, checksums};
}
async function dispatch(params, env) {
  const db = env.DB.withSession ? env.DB.withSession('first-primary') : env.DB;
  if (params.op === 'diagnostics') {
    const queries = {
      schema: 'SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name',
      master: 'SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name',
      tables: 'PRAGMA table_list', columns: 'PRAGMA table_xinfo("vault")',
      vault: 'SELECT version FROM vault WHERE id=1'
    };
    const checks = {};
    for (const [name, sql] of Object.entries(queries)) {
      try {const r = await db.prepare(sql).all(); checks[name] = {ok: true, resultRows: r.results.length};}
      catch {checks[name] = {ok: false};}
    }
    return {op: params.op, checks};
  }
  if (params.op === 'inventory') {
    const schema = (await db.prepare('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name').all()).results;
    const names = schema.filter(e => e.type === 'table' && !e.name.startsWith('sqlite_') && !providerTable(e.name)).map(e => e.name);
    const results = await db.batch(names.map(n => db.prepare(`SELECT COUNT(*) AS count FROM ${identifier(n)}`)));
    const vault = schema.some(e => e.name === 'vault') ? await db.prepare('SELECT version,generation,object_key FROM vault WHERE id=1').first() : null;
    return {op: params.op, observedAt: new Date().toISOString(), databaseBytes: Math.max(0, ...results.map(r => r.meta?.size_after || 0)),
      tables: names.map((name, i) => ({name, rows: results[i].results[0].count})), vault, rowsWrittenByInventory: results.reduce((n, r) => n + (r.meta?.rows_written || 0), 0)};
  }
  if (params.op === 'objects') {
    const listed = await env.BUCKET.list({limit: 200, include: ['customMetadata', 'httpMetadata'], ...(params.cursor ? {cursor: params.cursor} : {})});
    if (listed.truncated && !listed.cursor) throw new Error('Missing cursor');
    return {op: params.op, objects: listed.objects.map(objectMetadata), cursor: listed.truncated ? listed.cursor : null};
  }
  if (params.op === 'database') {
    const description = await plan(db);
    // D1 batch is one transaction: all tables and schema come from one snapshot.
    const results = await db.batch([db.prepare('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name'),
      ...description.tables.map(t => db.prepare(tableQuery(t)))]);
    if (JSON.stringify(description.schema) !== JSON.stringify(results[0].results.filter(e => !providerTable(e.tbl_name)))) throw new Error('Schema changed');
    if (results.some(r => r.meta?.rows_written > 0)) throw new Error('Unexpected write');
    return {op: params.op, observedAt: new Date().toISOString(), schema: description.schema, providerSchema: description.providerSchema,
      tables: description.tables.map((t, i) => ({...t, rows: results[i + 1].results.map(row => Object.values(row))})),
      databaseBytes: Math.max(0, ...results.map(r => r.meta?.size_after || 0)), atomic: true};
  }
  if (params.op === 'secrets') {
    const required = SECRET_NAMES.slice(0, 5);
    if (required.some(name => typeof env[name] !== 'string' || !env[name])) throw new Error('Missing required secret');
    // Include historical runtime settings for a faithful rollback as well.
    const names = [...SECRET_NAMES, 'MFA_BROWSER_PUSH_ENABLED', 'MFA_PHONE_REQUIRED', 'MFA_PUSH_PRIMARY', 'MFA_REQUIRED', 'PUSH_VAPID_PUBLIC_KEY'];
    return {op: params.op, values: Object.fromEntries(names.filter(n => typeof env[n] === 'string').map(n => [n, env[n]]))};
  }
  if (params.op === 'object') {
    if (typeof params.key !== 'string' || typeof params.etag !== 'string' || !Number.isSafeInteger(params.offset) || params.offset < 0) throw new Error('Invalid range');
    const object = await env.BUCKET.get(params.key, {onlyIf: {etagMatches: params.etag}, ...(params.size === 0 ? {} : {range: {offset: params.offset, length: 1024 * 1024}})});
    if (!object?.body) throw new Error('Object changed or missing');
    const data = await object.arrayBuffer();
    if (data.byteLength > 1024 * 1024) throw new Error('Unbounded object');
    return {op: params.op, metadata: objectMetadata(object), offset: params.offset, data: b64(data)};
  }
  throw new Error('Unknown operation');
}
export function createMigrationExport(config, clock = Date.now) {
  let verifyKey, recipientKey;
  const headers = {'Cache-Control': 'no-store, private', 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'};
  const deny = () => new Response('{}', {status: 404, headers});
  return async function exportRequest(request, env) {
    if (new URL(request.url).pathname !== EXPORT_PATH) return null;
    if (request.method !== 'POST' || request.headers.has('Origin') || clock() >= config.expiresAt) return deny();
    const timestamp = request.headers.get('X-Migration-Time') || '';
    if (!/^\d{13}$/.test(timestamp) || Math.abs(clock() - Number(timestamp)) > 60000) return deny();
    let body = '', total = 0;
    const decoder = new TextDecoder('utf-8', {fatal: true});
    const reader = request.body?.getReader();
    if (!reader) return deny();
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        total += value.length;
        if (total > 4096) {await reader.cancel(); return deny();}
        body += decoder.decode(value, {stream: true});
      }
      body += decoder.decode();
      verifyKey ||= await crypto.subtle.importKey('spki', unb64(config.publicKey), {name: 'RSA-PSS', hash: 'SHA-256'}, false, ['verify']);
      const canonical = `WolfGuard migration v1\n${config.id}\n${EXPORT_PATH}\n${timestamp}\n${body}`;
      const signature = unb64(request.headers.get('X-Migration-Signature') || '');
      if (!await crypto.subtle.verify({name: 'RSA-PSS', saltLength: 32}, verifyKey, signature, encoder.encode(canonical))) return deny();
      const requestHash = await sha(canonical);
      let payload;
      try { payload = {ok: true, result: await dispatch(JSON.parse(body), env)}; }
      catch (error) { payload = {ok: false, error: 'EXPORT_FAILED', diagnostic: String(error.message).slice(0, 500)}; }
      // Errors are also encrypted; no records, object keys or secrets in logs.
      const plaintext = encoder.encode(JSON.stringify(payload));
      recipientKey ||= await crypto.subtle.importKey('spki', unb64(config.publicKey), {name: 'RSA-OAEP', hash: 'SHA-256'}, false, ['encrypt']);
      const rawKey = crypto.getRandomValues(new Uint8Array(32));
      const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const aad = encoder.encode(`WolfGuard migration v1:${config.id}:${requestHash}`);
      const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: aad}, key, plaintext);
      const wrappedKey = await crypto.subtle.encrypt({name: 'RSA-OAEP'}, recipientKey, rawKey);
      rawKey.fill(0);
      return Response.json({version: 1, id: config.id, requestHash, iv: b64(iv), wrappedKey: b64(wrappedKey), ciphertext: b64(ciphertext)}, {headers});
    } catch { return deny(); }
    finally {reader.releaseLock();}
  };
}
