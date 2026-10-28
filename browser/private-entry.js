'use strict';

// The URL fragment stays in the browser; only the verifier receives the key,
// in an Authorization header. Never save it in storage, logs or public source.
(async () => {
  window.addEventListener('hashchange', () => location.reload());
  const keyHex = /^#access=([a-f0-9]{64})$/.exec(location.hash)?.[1];
  if (!keyHex) return;
  const message = document.getElementById('entry-message');
  message.textContent = 'Ouverture…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const options = {credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal};
    const verification = await fetch('https://wolfguard-web-cantin.paledove36.chatgpt.site/api/entry', {
      ...options, method: 'POST', headers: {Authorization: 'Bearer '+keyHex}
    });
    if (!verification.ok) {
      message.textContent = verification.status === 404 ? 'Page introuvable.' : 'Ouverture indisponible. Réessaie dans un instant.';
      return;
    }
    const response = await fetch('browser/site-entry.json', options);
    if (!response.ok) throw new Error('Entry unavailable');
    const envelope = await response.json();
    const decode = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
    const material = Uint8Array.from(keyHex.match(/../g), byte => parseInt(byte, 16));
    const key = await crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: decode(envelope.iv), additionalData: new TextEncoder().encode('WolfGuard private entry v1')}, key, decode(envelope.data));
    const html = new TextDecoder('utf-8', {fatal: true}).decode(plain);
    // Let the HTML parser load the original integrity-checked scripts in order.
    document.open();
    document.write(html);
    document.close();
  } catch {
    message.textContent = 'Ouverture indisponible. Réessaie dans un instant.';
  } finally {
    clearTimeout(timeout);
  }
})();
