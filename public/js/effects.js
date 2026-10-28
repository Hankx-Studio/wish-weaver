// 6 element effects. Honors prefers-reduced-motion (static glow only).
const PALETTE = {
  sparkle: ['#ffefb4', '#fff9dc', '#f5dd8b'],
  petals: ['#f6c9d4', '#f9e3ea', '#e8a7b8'],
  ripple: ['#bcd9f5', '#dff0ff', '#8fb8dd'],
  breeze: ['#cfe8d8', '#eef7f0', '#9cc3ab'],
  glow: ['#f5c98f', '#ffe8c4', '#dd9a55'],
  constellation: ['#cfd4f5', '#eceeff', '#9aa2dd'],
};

export function reducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function summonBurst(root, effect) {
  if (!root) return;
  if (reducedMotion()) return;
  root.replaceChildren();
  const colors = PALETTE[effect] || PALETTE.sparkle;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('i');
    p.className = 'cast-spark';
    p.style.background = colors[i % colors.length];
    const a = (i * Math.PI * 2) / 20;
    p.style.setProperty('--dx', `${Math.cos(a) * (110 + (i % 4) * 45)}px`);
    p.style.setProperty('--dy', `${Math.sin(a) * (90 + (i % 4) * 35)}px`);
    root.append(p);
  }
  root.classList.remove('active');
  void root.offsetWidth;
  root.classList.add('active');
}

// Typewriter for spirit_line. Returns a cancel function.
export function typewriter(el, text, { cps = 12 } = {}) {
  if (!el) return () => {};
  if (reducedMotion()) {
    el.textContent = text;
    return () => {};
  }
  el.textContent = '';
  let i = 0;
  const step = Math.max(1, Math.round(60 / cps));
  let cancelled = false;
  const id = setInterval(() => {
    if (cancelled) return;
    i += 1;
    el.textContent = text.slice(0, i);
    if (i >= text.length) clearInterval(id);
  }, step);
  return () => { cancelled = true; clearInterval(id); };
}

// M3 joint hook: for now, show a "brewing change" note.
export function onThresholdReached(stage) {
  return `精靈正在醞釀變化…（stage ${stage}，演化將在 M3 到來）`;
}
