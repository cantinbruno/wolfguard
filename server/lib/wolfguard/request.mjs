// Bound untrusted API objects before dispatch or recursive serialization.
export async function objectJSON(request, limit, fail) {
  const reject = async (status, message) => {
    await request.body?.cancel().catch(() => {});
    fail(status, message);
  };
  const type = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
  if (type && type !== 'application/json') return reject(415, 'Utilise le format JSON pour cette requête.');
  const declared = request.headers.get('Content-Length');
  if (declared !== null && (!/^\d+$/.test(declared) || !Number.isSafeInteger(Number(declared)))) return reject(400, 'Taille de requête invalide.');
  if (declared !== null && Number(declared) > limit) return reject(413, 'Requête trop volumineuse.');
  if (!request.body) fail(400, 'Requête vide.');
  const reader = request.body.getReader(), parts = [];
  let size = 0, complete = false;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) { complete = true; break; }
      size += value.byteLength;
      if (size > limit) fail(413, 'Requête trop volumineuse.');
      parts.push(value);
    }
  } finally {
    if (!complete) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  let text;
  try { text = new TextDecoder('utf-8', {fatal:true}).decode(bytes); }
  catch { fail(400, 'Requête JSON invalide.'); }
  let depth = 0, quoted = false, escaped = false;
  for (const char of text) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{' || char === '[') {
      if (++depth > 64) fail(400, 'Requête JSON trop imbriquée.');
    } else if (char === '}' || char === ']') depth--;
  }
  let value;
  try { value = JSON.parse(text); } catch { fail(400, 'Requête JSON invalide.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'Un objet JSON est attendu.');
  return value;
}
