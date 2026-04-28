export function initMatrixBackground() {
  const canvas = document.getElementById('matrix');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let cols = 0;
  let drops = [];
  let animationId;
  let lastFrame = 0;
  const frameStep = 16;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / 22);
    drops = Array(cols).fill(1);
  }

  function drawFrame() {
    ctx.fillStyle = 'rgba(5,5,5,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ff9f';
    ctx.font = '13px JetBrains Mono';

    for (let i = 0; i < drops.length; i++) {
      const c = Math.random() > 0.5 ? '1' : '0';
      ctx.globalAlpha = Math.random() * 0.4 + 0.1;
      ctx.fillText(c, i * 22, drops[i] * 22);
      ctx.globalAlpha = 1;

      if (drops[i] * 22 > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i] += 1;
    }
  }

  function loop(ts) {
    if (ts - lastFrame >= frameStep) {
      drawFrame();
      lastFrame = ts;
    }
    animationId = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);
  animationId = requestAnimationFrame(loop);

  return () => {
    window.removeEventListener('resize', resize);
    if (animationId) cancelAnimationFrame(animationId);
  };
}
