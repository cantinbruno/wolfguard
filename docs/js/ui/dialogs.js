'use strict';

/* MODAL */
function modal(title, body) {
  $('#modalRoot').innerHTML = `<div class="modal-wrap"><div class="modal"><h2>${esc(title)}</h2>${body}</div></div>`;
  $('#modalRoot').querySelector('.modal-wrap').onclick = e => {
    if (e.target.classList.contains('modal-wrap')) closeModal()
  };
}

function closeModal() {
  $('#modalRoot').innerHTML = ''
}

/* Independent dialogs preserve any settings panel or editor underneath. */
const appMessages = (() => {
  const queue = [];
  let active = null;

  function next() {
    if (active || !queue.length) return;
    const request = queue.shift();
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    const pending = {dialog, cancelled: false};
    dialog.className = 'app-dialog';
    dialog.setAttribute('aria-labelledby', 'appDialogTitle');
    dialog.setAttribute('aria-describedby', 'appDialogMessage');
    dialog.innerHTML = `<form method="dialog">
      <h2 id="appDialogTitle"></h2><p id="appDialogMessage"></p>
      ${request.kind === 'prompt' ? '<input class="app-dialog-input" aria-labelledby="appDialogMessage" autocomplete="off" spellcheck="false">' : ''}
      <div class="app-dialog-actions"><button type="button" class="app-dialog-cancel">Annuler</button><button type="submit" class="app-dialog-submit">Continuer</button></div>
    </form>`;
    dialog.querySelector('h2').textContent = request.options.title || (request.kind === 'prompt' ? 'Saisir une valeur' : 'Confirmer l’action');
    dialog.querySelector('p').textContent = request.message;
    const input = dialog.querySelector('input');
    if (input) {
      input.value = request.value;
      input.placeholder = request.options.placeholder || '';
    }
    const cancel = dialog.querySelector('.app-dialog-cancel');
    const accept = dialog.querySelector('.app-dialog-submit');
    accept.textContent = request.options.confirmLabel || (input ? 'Valider' : 'Continuer');
    accept.classList.toggle('is-danger', !!request.options.danger);
    cancel.onclick = () => dialog.close('cancel');
    dialog.querySelector('form').onsubmit = event => {
      event.preventDefault();
      dialog.close('accept');
    };
    dialog.onclick = event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close('cancel');
    };
    dialog.addEventListener('close', () => {
      const accepted = dialog.returnValue === 'accept' && !pending.cancelled;
      const result = input ? (accepted ? input.value : null) : accepted;
      dialog.remove();
      active = null;
      if (previousFocus?.isConnected) previousFocus.focus({preventScroll: true});
      request.resolve(result);
      queueMicrotask(next);
    }, {once: true});
    active = pending;
    document.body.appendChild(dialog);
    dialog.showModal();
    (input || cancel).focus({preventScroll: true});
    input?.select();
  }

  function request(kind, message, value, options) {
    return new Promise(resolve => {
      queue.push({kind, message: String(message), value, options, resolve});
      next();
    });
  }

  function dismiss() {
    for (const pending of queue.splice(0)) pending.resolve(pending.kind === 'prompt' ? null : false);
    if (active) active.cancelled = true;
    active?.dialog.close('cancel');
    document.querySelector('.app-notices')?.remove();
  }

  // Keep shortcuts and the PIN keypad underneath the modal inactive.
  document.addEventListener('keydown', event => {
    if (active) event.stopImmediatePropagation();
  }, true);

  return {request, dismiss};
})();

function appConfirm(message, options = {}) {
  return appMessages.request('confirm', message, '', options);
}

function appPrompt(message, value = '', options = {}) {
  return appMessages.request('prompt', message, String(value), options);
}

function appNotify(message, {kind = 'info'} = {}) {
  let region = document.querySelector('.app-notices');
  if (!region) {
    region = document.createElement('div');
    region.className = 'app-notices';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  const notice = document.createElement('div');
  notice.className = 'app-notice';
  notice.classList.toggle('is-error', kind === 'error');
  notice.innerHTML = '<svg class="app-notice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3h.01"/></svg><p></p><button type="button" aria-label="Fermer le message"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>';
  notice.querySelector('p').textContent = String(message);
  let timer;
  const pause = () => clearTimeout(timer);
  const dismiss = () => { pause(); notice.remove(); };
  const resume = () => { pause(); timer = setTimeout(dismiss, kind === 'error' ? 10000 : 6000); };
  notice.querySelector('button').onclick = dismiss;
  notice.onmouseenter = notice.onfocusin = pause;
  notice.onmouseleave = notice.onfocusout = resume;
  region.appendChild(notice);
  while (region.childElementCount > 3) region.firstElementChild.remove();
  resume();
}
