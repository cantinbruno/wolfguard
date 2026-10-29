'use strict';

const unlockTransition = (() => {
  let current = null;
  const GROW_DURATION = 720;
  const BURST_DURATION = 1720;
  const BURST_DELAY_STEP = 34;
  const CURTAIN_DELAY = 780;
  const CURTAIN_DURATION = 980;
  const reveal = (destination = 'app') => {
    $('#connectionGate').classList.add('hidden');
    $('#lock').classList.toggle('hidden', destination !== 'lock');
    $('#app').classList.toggle('hidden', destination === 'lock');
    if (destination === 'lock') $('#startupSplash')?.remove();
  };
  const clean = run => {
    run.animations.forEach(animation => animation.cancel());
    run.overlay.remove();
    if (current === run) {
      current = null;
      run.target.inert = false;
      run.target.removeAttribute('aria-hidden');
    }
  };
  const animate = (run, element, frames, options) => {
    const animation = element.animate(frames, {
      fill: 'both',
      ...options
    });
    run.animations.push(animation);
    // Cancellation is expected when the application locks during a transition.
    animation.finished.catch(() => {});
    return animation;
  };
  const fragments = (run, stage, source, scale) => {
    const grid = 6,
      points = [];
    for (let y = 0; y <= grid; y++) {
      points[y] = [];
      for (let x = 0; x <= grid; x++) points[y][x] = [
        x / grid * 100 + (x > 0 && x < grid ? Math.sin(x * 17 + y * 29) * 3 : 0),
        y / grid * 100 + (y > 0 && y < grid ? Math.cos(x * 23 + y * 13) * 3 : 0)
      ];
    }
    const animations = [];
    for (let y = 0; y < grid; y++)
      for (let x = 0; x < grid; x++) {
        const a = points[y][x],
          b = points[y][x + 1],
          c = points[y + 1][x],
          d = points[y + 1][x + 1];
        for (const triangle of (x + y) % 2 ? [
            [a, b, c],
            [b, d, c]
          ] : [
            [a, b, d],
            [a, d, c]
          ]) {
          const fragment = document.createElement('span');
          fragment.className = 'unlock-fragment';
          fragment.style.backgroundImage = 'url(' + JSON.stringify(source) + ')';
          fragment.style.clipPath = 'polygon(' + triangle.map(point => point.join('% ') + '%').join(',') + ')';
          const cx = triangle.reduce((sum, point) => sum + point[0], 0) / 3,
            cy = triangle.reduce((sum, point) => sum + point[1], 0) / 3;
          fragment.style.transformOrigin = cx + '% ' + cy + '%';
          stage.appendChild(fragment);
          const index = animations.length,
            angle = Math.atan2(cy - 50, cx - 50) + (Math.sin(index * 7) * .22);
          const distance = (Math.min(innerWidth, innerHeight) * (.25 + index % 5 * .025) + 30) / scale;
          const dx = Math.cos(angle) * distance,
            dy = Math.sin(angle) * distance + 30 / scale;
          const rotation = (index % 2 ? 1 : -1) * (45 + index % 7 * 19);
          animations.push(animate(run, fragment, [{
            transform: 'translate(0,0) rotate(0deg) scale(1)',
            opacity: 1
          }, {
            transform: `translate(${dx*.35}px,${dy*.3}px) rotate(${rotation*.3}deg) scale(.94)`,
            opacity: 1,
            offset: .32
          }, {
            transform: `translate(${dx}px,${dy}px) rotate(${rotation}deg) scale(.45)`,
            opacity: 0
          }], {
            duration: BURST_DURATION + index % 5 * 72,
            delay: index % 4 * BURST_DELAY_STEP,
            easing: 'cubic-bezier(.14,.65,.3,1)'
          }));
        }
      }
    return animations;
  };
  return {
    get active() {
      return current !== null
    },
    cancel() {
      if (!current) return;
      const run = current;
      run.cancelled = true;
      clean(run);
    },
    async play(options = {}) {
      this.cancel();
      const destination = options.destination === 'lock' ? 'lock' : 'app';
      if (!Element.prototype.animate) {
        reveal(destination);
        return true
      }
      const logo = (destination === 'lock' ? $('#startupSplash .wolf-logo') : null) || $('#lock .wolf-logo');
      const overlay = document.createElement('div');
      overlay.id = 'unlockTransition';
      overlay.className = 'unlock-transition';
      overlay.dataset.phase = 'prepare';
      overlay.setAttribute('aria-hidden', 'true');
      const curtain = document.createElement('div');
      curtain.className = 'unlock-curtain';
      const stage = document.createElement('div');
      stage.className = 'unlock-logo-stage';
      const image = document.createElement('img');
      image.src = logo?.currentSrc || logo?.src || 'images/logo-loup.svg';
      image.alt = '';
      image.className = 'unlock-logo-image';
      stage.appendChild(image);
      overlay.append(curtain, stage);
      const run = {
        overlay,
        target: $(destination === 'lock' ? '#lock' : '#app'),
        animations: [],
        cancelled: false
      };
      current = run;
      try {
        // Decode the overlay's own image before hiding the access screen.
        await image.decode();
        if (run.cancelled) return false;
        const bounds = logo?.getBoundingClientRect();
        const size = bounds?.width || 112,
          height = bounds?.height || size;
        const dx = bounds?.width ? bounds.left + size / 2 - innerWidth / 2 : 0;
        const dy = bounds?.height ? bounds.top + height / 2 - innerHeight / 2 : 0;
        // A viewport-relative anchor keeps the animation alive through native resizes.
        Object.assign(stage.style, {
          left: `calc(50% - ${size/2}px)`,
          top: `calc(50% - ${height/2}px)`,
          width: size + 'px',
          height: height + 'px',
          transform: `translate(${dx}px,${dy}px)`
        });
        document.body.appendChild(overlay);
        run.target.inert = true;
        run.target.setAttribute('aria-hidden', 'true');
        reveal(destination);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (run.cancelled) return false;
        // Preserve WolfGuard's original intro on the web as well as on Windows.
        overlay.dataset.phase = 'grow';
        const scale = Math.min(330, innerWidth * .66, innerHeight * .48) / size;
        await animate(run, stage, [{
          transform: `translate(${dx}px,${dy}px) scale(1)`
        }, {
          transform: `translate(0,0) scale(${scale})`
        }], {
          duration: GROW_DURATION,
          easing: 'cubic-bezier(.2,.75,.25,1)'
        }).finished;
        if (run.cancelled) return false;
        overlay.dataset.phase = 'burst';
        const pieces = fragments(run, stage, image.src, scale);
        image.remove();
        pieces.push(animate(run, curtain, [{
          opacity: 1
        }, {
          opacity: 0
        }], {
          delay: CURTAIN_DELAY,
          duration: CURTAIN_DURATION,
          easing: 'ease-out'
        }));
        await Promise.all(pieces.map(animation => animation.finished));
        return !run.cancelled;
      } catch (error) {
        if (!run.cancelled) {
          console.warn('Unlock animation failed:', error);
          reveal(destination)
        }
        return !run.cancelled;
      } finally {
        clean(run);
      }
    }
  };
})();
