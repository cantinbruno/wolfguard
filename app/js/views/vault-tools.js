'use strict';

// Vault helpers without any page dependency: TOTP codes, password strength,
// breach check by k-anonymity and import of CSV exports from other managers.
const WolfGuardVaultTools = (() => {
  const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const HASHES = {SHA1: 'SHA-1', SHA256: 'SHA-256', SHA512: 'SHA-512'};

  function base32Decode(text) {
    const clean = String(text || '').toUpperCase().replace(/[\s=-]/g, '');
    if (!clean || /[^A-Z2-7]/.test(clean)) return null;
    let bits = 0, value = 0;
    const out = [];
    for (const char of clean) {
      value = (value << 5) | BASE32.indexOf(char);
      bits += 5;
      if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
    }
    return out.length >= 10 ? Uint8Array.from(out) : null;
  }

  // Accepts a bare Base32 secret or an otpauth://totp/... link.
  function parseTotp(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;
    let secretText = raw, digits = 6, period = 30, algorithm = 'SHA1', issuer = '', label = '';
    if (/^otpauth:\/\//i.test(raw)) {
      let url;
      try { url = new URL(raw); } catch { return null; }
      if (url.hostname.toLowerCase() !== 'totp') return null;
      secretText = url.searchParams.get('secret') || '';
      digits = Number(url.searchParams.get('digits') || 6);
      period = Number(url.searchParams.get('period') || 30);
      algorithm = String(url.searchParams.get('algorithm') || 'SHA1').toUpperCase();
      issuer = url.searchParams.get('issuer') || '';
      label = decodeURIComponent(url.pathname.replace(/^\//, ''));
    }
    const secret = base32Decode(secretText);
    if (!secret || ![6, 7, 8].includes(digits) || !Number.isInteger(period) || period < 10 || period > 120 || !HASHES[algorithm]) return null;
    return {secret, digits, period, algorithm, issuer, label};
  }

  async function totpCode(config, now = Date.now()) {
    const seconds = Math.floor(now / 1000), counter = Math.floor(seconds / config.period);
    const message = new ArrayBuffer(8);
    new DataView(message).setBigUint64(0, BigInt(counter));
    const key = await crypto.subtle.importKey('raw', config.secret, {name: 'HMAC', hash: HASHES[config.algorithm]}, false, ['sign']);
    const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, message));
    const offset = hash[hash.length - 1] & 15;
    const binary = ((hash[offset] & 0x7f) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3];
    return {
      code: String(binary % 10 ** config.digits).padStart(config.digits, '0'),
      remaining: config.period - (seconds % config.period),
      period: config.period
    };
  }

  const COMMON = new Set(['password', 'motdepasse', 'passw0rd', 'azerty', 'qwerty', 'qwertz', 'admin', 'administrateur', 'welcome', 'bienvenue', 'letmein', 'iloveyou', 'monkey', 'dragon', 'soleil', 'football', 'wolfguard', 'changeme', 'secret', 'root', 'login', 'abc', 'test']);
  const LABELS = ['Très faible', 'Faible', 'Correct', 'Fort', 'Très fort'];

  // A readable estimate, not a guarantee: pool size x length, reduced for
  // repeated characters, keyboard/number runs and well-known words.
  function passwordStrength(password) {
    const text = String(password || '');
    if (!text) return {score: 0, label: 'Aucun mot de passe', bits: 0, empty: true};
    let pool = 0;
    if (/[a-z]/.test(text)) pool += 26;
    if (/[A-Z]/.test(text)) pool += 26;
    if (/[0-9]/.test(text)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(text)) pool += 33;
    const unique = new Set(text).size;
    let effective = unique + (text.length - unique) * 0.25;
    let runs = 0;
    for (let i = 2; i < text.length; i++) {
      const a = text.charCodeAt(i - 2), b = text.charCodeAt(i - 1), c = text.charCodeAt(i);
      if (b - a === c - b && Math.abs(b - a) === 1) runs++;
    }
    effective = Math.max(1, effective - runs);
    let bits = effective * Math.log2(pool || 1);
    const letters = text.toLowerCase().replace(/[^a-z]/g, '');
    if (COMMON.has(text.toLowerCase()) || (letters.length >= 3 && COMMON.has(letters) && text.length <= letters.length + 4)) bits = Math.min(bits, 20);
    bits = Math.round(bits);
    const score = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
    return {score, label: LABELS[score], bits};
  }

  async function sha1Hex(text) {
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  // Only the first five characters of the SHA-1 hash leave the browser.
  async function pwnedCount(password, {fetcher = globalThis.fetch, signal} = {}) {
    const hash = await sha1Hex(password), prefix = hash.slice(0, 5), suffix = hash.slice(5);
    const response = await fetcher('https://api.pwnedpasswords.com/range/' + prefix, {
      method: 'GET', headers: {'Add-Padding': 'true'}, credentials: 'omit', cache: 'no-store',
      referrerPolicy: 'no-referrer', redirect: 'error', signal
    });
    if (!response.ok) throw new Error('Service de vérification indisponible.');
    for (const line of (await response.text()).split(/\r?\n/)) {
      const [candidate, count] = line.split(':');
      if (candidate && candidate.trim().toUpperCase() === suffix) return Number(count) || 0;
    }
    return 0;
  }

  const MAX_CSV_BYTES = 5 * 1024 * 1024, MAX_ROWS = 5000;
  function parseCSV(input) {
    const text = String(input || '').replace(/^﻿/, '');
    if (text.length > MAX_CSV_BYTES) throw new Error('Fichier trop volumineux (5 Mo maximum).');
    const head = text.split(/\r?\n/, 1)[0] || '';
    const count = char => head.split(char).length - 1;
    const delimiter = [',', ';', '\t'].map(char => [char, count(char)]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (char === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
        else field += char;
      } else if (char === '"' && field === '') quoted = true;
      else if (char === delimiter) { row.push(field); field = ''; }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some(value => value !== '')) rows.push(row);
        row = [];
        if (rows.length > MAX_ROWS + 1) throw new Error('Trop de lignes (5 000 maximum).');
      } else field += char;
    }
    row.push(field);
    if (row.some(value => value !== '')) rows.push(row);
    return rows;
  }

  const ALIASES = {
    title: ['name', 'title', 'account', 'account name', 'nom', 'titre', 'site', 'entry'],
    username: ['login_username', 'username', 'login name', 'login', 'user', 'user name', 'utilisateur', 'identifiant', 'email'],
    password: ['login_password', 'password', 'mot de passe', 'pass'],
    url: ['login_uri', 'url', 'web site', 'website', 'site web', 'login url', 'uri', 'web address'],
    notes: ['notes', 'note', 'comments', 'comment', 'extra', 'commentaire', 'commentaires'],
    totp: ['login_totp', 'otpauth', 'totp', 'otp', 'one-time password', 'totp secret'],
    folder: ['folder', 'group', 'grouping', 'dossier', 'groupe']
  };

  function hostOf(url) {
    try { return new URL(/^[a-z]+:\/\//i.test(url) ? url : 'https://' + url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }

  // Maps the rows of a Bitwarden, KeePass, browser or 1Password export.
  function mapCredentialRows(table) {
    if (!Array.isArray(table) || table.length < 2) return {entries: [], skipped: 0, columns: []};
    const header = table[0].map(name => String(name).trim().toLowerCase());
    const find = key => ALIASES[key].map(alias => header.indexOf(alias)).find(index => index >= 0) ?? -1;
    const columns = Object.fromEntries(Object.keys(ALIASES).map(key => [key, find(key)]));
    const typeColumn = header.indexOf('type');
    if (columns.password < 0 && columns.username < 0 && columns.totp < 0) return {entries: [], skipped: 0, columns: []};
    const pick = (row, key) => columns[key] >= 0 ? String(row[columns[key]] ?? '').trim() : '';
    const entries = [];
    let skipped = 0;
    for (const row of table.slice(1)) {
      if (typeColumn >= 0 && row[typeColumn] && !/^(login|identifiant|mot de passe)?$/i.test(String(row[typeColumn]).trim())) { skipped++; continue; }
      const url = pick(row, 'url').split(/\s+/)[0] || '';
      const entry = {username: pick(row, 'username'), password: String(row[columns.password] ?? ''), url, notes: pick(row, 'notes'), totp: pick(row, 'totp'), folder: pick(row, 'folder')};
      if (!entry.password && !entry.username && !entry.totp) { skipped++; continue; }
      entry.title = pick(row, 'title') || hostOf(url) || entry.username || 'Sans titre';
      entries.push(entry);
    }
    return {entries, skipped, columns: Object.keys(columns).filter(key => columns[key] >= 0)};
  }

  const entryKey = entry => [entry.title, entry.username, entry.url].map(value => String(value || '').trim().toLowerCase()).join('\u0001');

  return Object.freeze({base32Decode, parseTotp, totpCode, passwordStrength, sha1Hex, pwnedCount, parseCSV, mapCredentialRows, entryKey});
})();
