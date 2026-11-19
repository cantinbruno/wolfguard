'use strict';

const sectionTransition = (() => {
  let pending = null,
    current = null,
    draining = false;
  const restore = run => {
    run.content.inert = false;
    run.content.removeAttribute('aria-busy');
  };
  const perform = async request => {
    const content = $('#content'),
      app = $('#app');
    const run = {
      content,
      key: state.vaultKey,
      cancelled: false
    };
    // Superseding a request releases its waits immediately. Its underlying
    // reads may finish later, so renderers also check this run before painting.
    const interrupted = new Promise(resolve => { run.interrupt = () => { run.cancelled = true; resolve(); }; });
    current = run;
    const canRender = () => !run.cancelled && !pending;
    canRender.wait = promise => Promise.race([promise, interrupted]);
    try {
      content.inert = true;
      content.setAttribute('aria-busy', 'true');
      if (!canRender()) return false;
      const rendered = await request.render(canRender) !== false;
      return rendered && canRender();
    } catch (error) {
      if (canRender() && state.vaultKey === run.key && !app.classList.contains('hidden')) {
        if (state.section !== request.section) appNotify(error.message || 'Impossible d’ouvrir cette section.', {kind: 'error'});
        else {
          const notice = document.createElement('section');
          notice.className = 'section-load-error';
          notice.setAttribute('role', 'alert');
          const heading = document.createElement('h2'), message = document.createElement('p'), retry = document.createElement('button');
          heading.textContent = 'Impossible d’ouvrir cette section';
          message.textContent = error.message || 'Le chargement a été interrompu.';
          retry.type = 'button'; retry.className = 'primary'; retry.textContent = 'Réessayer';
          retry.onclick = () => openSection(request.section).catch(console.error);
          notice.append(heading, message, retry);
          content.replaceChildren(notice);
        }
      }
      throw error;
    } finally {
      restore(run);
      if (current === run) current = null;
    }
  };
  const drain = async () => {
    if (draining) return;
    draining = true;
    try {
      // Views share state, so only one renderer can run; newer clicks replace waiting requests.
      while (pending) {
        const request = pending;
        pending = null;
        try {
          request.resolve(await perform(request))
        } catch (error) {
          request.reject(error)
        }
      }
    } finally {
      draining = false
    }
  };
  return {
    get active() {
      return !!pending || !!current && !current.cancelled
    },
    get animations() {
      return []
    },
    navigate(section, render) {
      return new Promise((resolve, reject) => {
        pending?.resolve(false);
        pending = {
          section,
          render,
          resolve,
          reject
        };
        current?.interrupt();
        drain();
      });
    },
    cancel() {
      pending?.resolve(false);
      pending = null;
      if (current) {
        current.interrupt();
        restore(current)
      }
    }
  };
})();
