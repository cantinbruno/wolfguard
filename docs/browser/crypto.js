// Native Web Crypto only. No secret, verifier or extractable key is persisted.
const FORMAT = 'wolfguard-web';
export const ITERATIONS = 600000;
export const MAX_BYTES = 32 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
function aad(value) { return encoder.encode(`${value.format}|${value.version}|AES-256-GCM|PBKDF2-SHA256`); }

function base64(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
function unbase64(text, max) {
  if (typeof text !== 'string' || text.length > Math.ceil(max / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw new Error('Format de sauvegarde invalide.');
  const raw = atob(text);
  if (raw.length > max) throw new Error('Sauvegarde trop volumineuse.');
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
export function validateEnvelope(value) {
  if (!value || !((value.format === FORMAT && value.version === 1) || (value.format === 'wolfguard-workspace' && value.version === 2)) || value.kdf !== 'PBKDF2-SHA256' || value.cipher !== 'AES-256-GCM' || value.iterations !== ITERATIONS || !Number.isSafeInteger(value.revision) || value.revision < 1) throw new Error('Cette sauvegarde WolfGuard Web est invalide ou incompatible.');
  if (unbase64(value.salt, 16).length !== 16 || unbase64(value.iv, 12).length !== 12 || unbase64(value.data, MAX_BYTES).length < 16) throw new Error('Sauvegarde incomplète.');
  return {format: value.format, version: value.version, kdf: 'PBKDF2-SHA256', cipher: 'AES-256-GCM', iterations: ITERATIONS, revision: value.revision, salt: value.salt, iv: value.iv, data: value.data};
}
export function checkPassword(password) {
  if (typeof password !== 'string' || password.length !== 8 || !/^[0-9]{8}$/.test(password)) throw new Error('Le code doit contenir exactement 8 chiffres de 0 à 9, sans lettre ni espace.');
}
export async function deriveKey(password, salt) {
  const bytes = encoder.encode(password);
  try {
    const material = await crypto.subtle.importKey('raw', bytes, 'PBKDF2', false, ['deriveKey']);
    return await crypto.subtle.deriveKey({name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS}, material, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
  } finally { bytes.fill(0); }
}
export async function seal(payload, key, salt, revision) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = encoder.encode(JSON.stringify(payload));
  const header = Array.isArray(payload.settings) ? {format:'wolfguard-workspace',version:2} : {format:FORMAT,version:1};
  if (bytes.length > MAX_BYTES - 16) throw new Error('Espace trop volumineux (limite : 32 Mo).');
  try {
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: aad(header), tagLength: 128}, key, bytes));
    return {...header, cipher: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, revision, salt: base64(salt), iv: base64(iv), data: base64(encrypted)};
  } finally { bytes.fill(0); }
}
export async function open(envelope, password) {
  const value = validateEnvelope(envelope);
  const salt = unbase64(value.salt, 16);
  const key = await deriveKey(password, salt);
  let bytes;
  try {
    bytes = new Uint8Array(await crypto.subtle.decrypt({name: 'AES-GCM', iv: unbase64(value.iv, 12), additionalData: aad(value), tagLength: 128}, key, unbase64(value.data, MAX_BYTES)));
  } catch { throw new Error('Code incorrect ou sauvegarde altérée.'); }
  try { return {payload: JSON.parse(decoder.decode(bytes)), key, salt, envelope: value}; }
  finally { bytes.fill(0); }
}
export async function create(payload, password, revision = 1) {
  checkPassword(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  return {payload, key, salt, envelope: await seal(payload, key, salt, revision)};
}
export function generatePassword(length = 24) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*-_+=';
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let result = '';
  while (result.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(128))) {
      if (byte < limit) result += alphabet[byte % alphabet.length];
      if (result.length === length) break;
    }
  }
  return result;
}
