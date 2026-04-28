export function initTypingEffect() {
  const topHeroLines = [
    { id: 'hero-name-typed', text: 'Pragatishvar A', charDelay: 34, lineDelay: 120 },
    { id: 'hero-tagline-typed', text: 'Aspiring Cybersecurity Engineer | Ethical Hacking & Network Security', charDelay: 20, lineDelay: 130 }
  ];

  const terminalLines = [
    { id: 'line1', text: 'Initializing Profile...', charDelay: 28, lineDelay: 140 },
    { id: 'line2', text: 'Loading Cybersecurity Modules...', charDelay: 28, lineDelay: 140 },
    { id: 'line3', text: 'Access Granted', charDelay: 28, lineDelay: 160 }
  ];

  const typingSequence = [...terminalLines, ...topHeroLines];
  let quickRender = false;
  let activeTypingEl = null;

  function setActiveTypingBar(id) {
    if (activeTypingEl) activeTypingEl.classList.remove('typing-active');
    if (!id) {
      activeTypingEl = null;
      return;
    }
    const el = document.getElementById(id);
    if (!el) {
      activeTypingEl = null;
      return;
    }
    el.classList.add('typing-active');
    activeTypingEl = el;
  }

  function fillLineGroup(lines) {
    lines.forEach((line) => {
      const el = document.getElementById(line.id);
      if (el) el.textContent = line.text;
    });
  }

  function typeLineGroup(lines) {
    let lineIndex = 0;
    let charIndex = 0;

    function step() {
      if (quickRender || lineIndex >= lines.length) {
        setActiveTypingBar(null);
        return;
      }

      const line = lines[lineIndex];
      setActiveTypingBar(line.id);
      const el = document.getElementById(line.id);

      if (!el) {
        lineIndex += 1;
        charIndex = 0;
        step();
        return;
      }

      if (charIndex < line.text.length) {
        el.textContent += line.text[charIndex];
        charIndex += 1;
        setTimeout(step, line.charDelay);
      } else {
        lineIndex += 1;
        charIndex = 0;
        setTimeout(step, line.lineDelay);
      }
    }

    step();
  }

  function skipTyping() {
    quickRender = true;
    fillLineGroup(typingSequence);
    setActiveTypingBar(null);
  }

  const terminalBox = document.querySelector('.terminal-box');
  if (terminalBox) {
    terminalBox.addEventListener('click', skipTyping, { once: true });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      skipTyping();
    }
  });

  setTimeout(() => {
    typeLineGroup(typingSequence);
  }, 220);
}
