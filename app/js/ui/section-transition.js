'use strict';

const sectionTransition = (() => {
  let pending = null,
    current = null,
    draining = false;
  const visibleAnimations = () => current ? [
    ...current.animations,
    ...document.getAnimations().filter(animation => ['section-old-view', 'section-new-view'].includes(animation.animationName))
  ] : [];
  const restore = run => {
    run.transition?.skipTransition();
    run.animations.forEach(animation => animation.cancel());
    run.content.inert = false;
    run.content.removeAttribute('aria-busy');
    delete run.content.dataset.transitionPhase;
    delete run.content.dataset.transitionMode;
    delete document.documentElement.dataset.sectionTransition;
    delete document.documentElement.dataset.sectionDirection;
    delete document.documentElement.dataset.sectionEffect;
  };
  const animate = async (run, frames, duration) => {
    try {
      const animation = run.content.animate(frames, {
        duration,
        easing: 'cubic-bezier(.4,0,.2,1)',
        fill: 'both'
      });
      run.animations.push(animation);
      await animation.finished;
    } catch {}
  };
  const perform = async request => {
    const content = $('#content'),
      app = $('#app');
    const run = {
      content,
      animations: [],
      cancelled: false,
      transition: null,
      rendered: false,
      error: null
    };
    current = run;
    const canRender = () => !run.cancelled && !pending;
    const crossing = primarySectionFor(request.section) !== primarySectionFor(state.section);
    // Keep the original workspace slide on both the web and the desktop.
    const motion = request.section !== state.section && !app.classList.contains('hidden') && app.style.visibility !== 'hidden' && !unlockTransition.active && !!Element.prototype.animate;
    const sections = availablePrimarySections();
    const from = sections.indexOf(primarySectionFor(state.section));
    const to = sections.indexOf(primarySectionFor(request.section));
    const direction = to > from ? 1 : -1;
    const shift = crossing ? '100%' : '14px';
    const update = async () => {
      if (!canRender()) return;
      content.dataset.transitionPhase = 'render';
      try {
        run.rendered = await request.render(canRender) !== false
      } catch (error) {
        run.error = error;
        throw error
      }
    };
    try {
      if (motion) {
        content.inert = true;
        content.setAttribute('aria-busy', 'true');
        document.documentElement.dataset.sectionTransition = 'active';
        document.documentElement.dataset.sectionDirection = direction === 1 ? 'forward' : 'backward';
        document.documentElement.dataset.sectionEffect = crossing ? 'workspace' : 'slide';
      }
      // Animate the actual content in every browser. Native View Transitions
      // can finish without displaying any frames under some system settings.
      content.dataset.transitionMode = 'direct';
      if (motion && !run.rendered) {
        content.dataset.transitionPhase = 'out';
        await animate(run, [{
          opacity: 1,
          transform: 'translateX(0)'
        }, {
          opacity: crossing ? 1 : 0,
          transform: 'translateX(' + (direction === 1 ? '-' : '') + shift + ')'
        }], crossing ? 240 : 60);
      }
      if (!canRender()) return false;
      if (!run.rendered) await update();
      if (!run.rendered || !canRender()) return false;
      if (motion) {
        run.animations.forEach(animation => animation.cancel());
        content.dataset.transitionPhase = 'in';
        await animate(run, [{
          opacity: crossing ? 1 : 0,
          transform: 'translateX(' + (direction === 1 ? '' : '-') + shift + ')'
        }, {
          opacity: 1,
          transform: 'translateX(0)'
        }], crossing ? 300 : 120);
      }
      return canRender();
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
      return visibleAnimations()
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
        current?.transition?.skipTransition();
        current?.animations.forEach(animation => animation.cancel());
        drain();
      });
    },
    cancel() {
      pending?.resolve(false);
      pending = null;
      if (current) {
        current.cancelled = true;
        restore(current)
      }
    }
  };
})();
