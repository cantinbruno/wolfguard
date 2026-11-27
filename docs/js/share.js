'use strict';

// Public reading page for a one-time secret link. Everything shown here comes
// from the decrypted payload and is inserted as text only.
(() => {
  const API = 'https://wolfguard-web-cantin.cantin-bruno.chatgpt.site';
  const LABELS = {username: 'Identifiant', password: 'Mot de passe', url: 'URL', notes: 'Notes'};
  const button = document.querySelector('#shareOpen'), status = document.querySelector('#shareStatus');
  const list = document.querySelector('#shareFields'), note = document.querySelector('#shareNote'), intro = document.querySelector('#shareIntro');
  const params = WolfGuardShare.parseHash(location.hash);
  let busy = false;

  function show(message) { status.textContent = message; }
  function gone(message) { button.hidden = true; intro.hidden = true; show(message); }

  if (window.top !== window.self) { gone('Ouvre ce lien dans son propre onglet.'); return; }
  if (!params) { gone('Ce lien de partage est invalide ou incomplet.'); return; }

  function field(name, value) {
    const box = document.createElement('div'), term = document.createElement('dt'), row = document.createElement('dd'), code = document.createElement('code'), actions = document.createElement('div');
    box.className = 'share-field'; actions.className = 'share-actions';
    term.textContent = LABELS[name] || name;
    const secret = name === 'password';
    code.textContent = secret ? '••••••••••••' : value;
    if (secret) {
      const reveal = document.createElement('button');
      reveal.type = 'button'; reveal.textContent = 'Afficher';
      reveal.onclick = () => { const shown = reveal.textContent === 'Masquer'; code.textContent = shown ? '••••••••••••' : value; reveal.textContent = shown ? 'Afficher' : 'Masquer'; };
      actions.append(reveal);
    }
    const copy = document.createElement('button');
    copy.type = 'button'; copy.textContent = 'Copier';
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(value); copy.textContent = 'Copié'; } catch { copy.textContent = 'Échec'; }
      setTimeout(() => { copy.textContent = 'Copier'; }, 1800);
    };
    actions.append(copy);
    row.append(code, actions);
    box.append(term, row);
    return box;
  }

  button.onclick = async () => {
    if (busy) return;
    busy = true; button.disabled = true; show('Ouverture…');
    try {
      const response = await fetch(API + '/api/share/open', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: params.id}), credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error'});
      if (response.status === 404) { gone('Ce lien est expiré ou a déjà été utilisé. Demande-en un nouveau à la personne qui te l’a envoyé.'); return; }
      if (!response.ok) throw new Error('Service indisponible.');
      const payload = await WolfGuardShare.open((await response.json()).cipher, params.key);
      // The link is already destroyed server side; remove the key from the address bar too.
      history.replaceState(null, '', location.pathname);
      const entries = Object.entries(payload.fields || {}).filter(([name, value]) => LABELS[name] && typeof value === 'string' && value);
      if (!entries.length) throw new Error('Le contenu du partage est vide.');
      button.hidden = true; intro.hidden = true; show('');
      if (payload.title) document.querySelector('h1').textContent = String(payload.title).slice(0, 120);
      list.replaceChildren(...entries.map(([name, value]) => field(name, value)));
      list.hidden = false; note.hidden = false;
    } catch (error) {
      show('Impossible d’ouvrir ce secret. Si le problème continue, demande un nouveau lien. Ce lien a peut-être déjà été consommé.');
      button.disabled = false;
    } finally { busy = false; }
  };
})();
