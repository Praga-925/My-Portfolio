export function initCursorEffects() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const cursorEnabled = !prefersReducedMotion && !coarsePointer && window.innerWidth > 768;

  const cur = document.getElementById('cursor');
  const trail = document.getElementById('cursor-trail');
  const particleLayer = document.getElementById('cursor-particles');

  if (!cur || !trail || !particleLayer) {
    return { cursorEnabled: false };
  }

  if (!cursorEnabled) {
    document.body.style.cursor = 'auto';
    cur.style.display = 'none';
    trail.style.display = 'none';
    particleLayer.style.display = 'none';
    return { cursorEnabled: false };
  }

  let pointerX = window.innerWidth * 0.5;
  let pointerY = window.innerHeight * 0.5;
  let cursorX = pointerX;
  let cursorY = pointerY;
  let trailX = pointerX;
  let trailY = pointerY;
  let lastSpawn = 0;

  const particles = [];
  const maxParticles = 16;

  document.addEventListener('mousemove', (e) => {
    pointerX = e.clientX;
    pointerY = e.clientY;
  });

  function spawnParticle(ts) {
    if (particles.length >= maxParticles) return;

    const node = document.createElement('span');
    node.className = 'cursor-particle';
    particleLayer.appendChild(node);

    particles.push({
      el: node,
      x: pointerX,
      y: pointerY,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      life: 1,
      scale: Math.random() * 0.45 + 0.55
    });

    lastSpawn = ts;
  }

  function animateCursor(ts) {
    cursorX += (pointerX - cursorX) * 0.35;
    cursorY += (pointerY - cursorY) * 0.35;
    trailX += (pointerX - trailX) * 0.16;
    trailY += (pointerY - trailY) * 0.16;

    cur.style.left = cursorX + 'px';
    cur.style.top = cursorY + 'px';
    trail.style.left = trailX + 'px';
    trail.style.top = trailY + 'px';

    const moving = Math.abs(pointerX - trailX) + Math.abs(pointerY - trailY) > 1.2;
    if (moving && ts - lastSpawn > 34) {
      spawnParticle(ts);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.07;

      if (p.life <= 0) {
        p.el.remove();
        particles.splice(i, 1);
        continue;
      }

      p.el.style.left = p.x + 'px';
      p.el.style.top = p.y + 'px';
      p.el.style.opacity = String(p.life * 0.7);
      p.el.style.transform = 'translate(-50%, -50%) scale(' + (p.scale + (1 - p.life) * 0.35) + ')';
    }

    requestAnimationFrame(animateCursor);
  }

  requestAnimationFrame(animateCursor);

  return { cursorEnabled, cursorElement: cur };
}

export function bindCursorHover(cursorElement, selector) {
  if (!cursorElement) return;

  document.querySelectorAll(selector).forEach((el) => {
    el.addEventListener('mouseenter', () => cursorElement.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => cursorElement.classList.remove('cursor-hover'));
  });
}
