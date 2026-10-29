'use strict';

// The URL fragment stays in the browser; only the verifier receives the key,
// in an Authorization header. Never save it in storage, logs or public source.
(async () => {
  if (window.top !== window.self) return;
  window.addEventListener('hashchange', () => location.reload());
  // The production address is exact: aliases, other paths and query strings
  // must not become alternate working links, even with the correct fragment.
  const local = ['localhost','127.0.0.1'].includes(location.hostname);
  if ((!local && location.origin !== 'https://wolfguard.wavetools.fr') || location.pathname !== '/' || location.search) return;
  const keyHex = /^#access=([a-f0-9]{64})$/.exec(location.hash)?.[1];
  if (!keyHex) return;
  const message = document.getElementById('entry-message');
  message.textContent = 'Ouverture…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    if (!isSecureContext || !crypto.subtle) throw new Error('HTTPS required');
    const options = {credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal};
    const verification = await fetch('https://wolfguard-web-cantin.cantin-bruno.chatgpt.site/api/entry', {
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
    // document.open clears the original window event listeners.
    window.addEventListener('hashchange', () => location.reload());
  } catch {
    message.textContent = 'Ouverture indisponible. Réessaie dans un instant.';
  } finally {
    clearTimeout(timeout);
  }
})();
