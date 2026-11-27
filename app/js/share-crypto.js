'use strict';

// Encryption of one-time secret links, shared by the application (creation)
// and the public page share.html (reading). The key never leaves the link
// fragment, so the server only ever sees ciphertext.
const WolfGuardShare = (() => {
  const AAD = new TextEncoder().encode('WolfGuard share v1');
  const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const decode = text => Uint8Array.from(atob(String(text).replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));

  async function seal(payload) {
    const raw = crypto.getRandomValues(new Uint8Array(32)), iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
    const data = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: AAD}, key, new TextEncoder().encode(JSON.stringify(payload))));
    const packed = new Uint8Array(iv.length + data.length);
    packed.set(iv);
    packed.set(data, iv.length);
    return {cipher: encode(packed), key: encode(raw)};
  }

  async function open(cipher, keyText) {
    const packed = decode(cipher), raw = decode(keyText);
    if (raw.length !== 32 || packed.length < 29) throw new Error('Lien de partage invalide.');
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: packed.slice(0, 12), additionalData: AAD}, key, packed.slice(12));
    return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(plain));
  }

  const link = (origin, id, key) => origin + '/share.html#' + id + '.' + key;
  function parseHash(hash) {
    const match = /^#([a-f0-9]{32})\.([A-Za-z0-9_-]{43})$/.exec(hash || '');
    return match ? {id: match[1], key: match[2]} : null;
  }

  return Object.freeze({seal, open, link, parseHash});
})();
