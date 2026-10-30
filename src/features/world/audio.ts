/**
 * Zero-asset WebAudio ambience for the world scene.
 *
 * - Warm pad chord: 2 detuned triangles per note -> shared lowpass, slow LFO
 *   on filter cutoff for a breathing feel.
 * - Sparse wind chimes: pentatonic plucks on a randomized timer.
 * - Ritual SFX: `playCastChime()` plays a soft bell + pop.
 *
 * Autoplay policy: no AudioContext is created (and nothing plays) before the
 * first user gesture. `mountAmbient()` only attaches a mute button + gesture
 * listeners; the context starts on pointerdown/keydown/touchend.
 */

const PAD_FREQS = [130.81, 196.0, 293.66, 329.63]; // C3 G3 D4 E4 (Cmaj add9)
const PENTA_FREQS = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C5..C6 pentatonic
const DETUNE_CENTS = 6;
const PAD_GAIN = 0.05;
const CHIME_GAIN = 0.12;
const CAST_GAIN = 0.22;
const POP_GAIN = 0.18;

let sharedCtx: AudioContext | null = null;
let sharedMaster: GainNode | null = null;
let muted = false;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getCtx(): AudioContext | null {
  if (!isBrowser()) return null;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) {
    sharedCtx = new AC();
    sharedMaster = sharedCtx.createGain();
    sharedMaster.gain.value = muted ? 0 : 1;
    sharedMaster.connect(sharedCtx.destination);
  }
  return sharedCtx;
}

function master(): GainNode | null {
  if (!sharedCtx || !sharedMaster) return null;
  return sharedMaster;
}

function setMuted(m: boolean): void {
  muted = m;
  if (sharedCtx && sharedMaster) {
    sharedMaster.gain.setTargetAtTime(m ? 0 : 1, sharedCtx.currentTime, 0.05);
  }
}

function isMuted(): boolean {
  return muted;
}

/** Short plucked sine with harmonic shimmer and exponential decay. */
function pluck(ctx: AudioContext, out: AudioNode, freq: number, gain: number, dur = 2.2): void {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2;
  const g = ctx.createGain();
  const g2 = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g2.gain.setValueAtTime(0, t);
  g2.gain.linearRampToValueAtTime(gain * 0.25, t + 0.01);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.5);
  osc.connect(g).connect(out);
  osc2.connect(g2).connect(out);
  osc.start(t);
  osc2.start(t);
  osc.stop(t + dur + 0.1);
  osc2.stop(t + dur + 0.1);
}

interface PadHandle {
  dispose(): void;
}

/** Warm pad: 2 detuned triangles per chord tone -> lowpass w/ slow LFO. */
function startPad(ctx: AudioContext, out: AudioNode): PadHandle {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 720;
  filter.Q.value = 0.4;
  const padBus = ctx.createGain();
  padBus.gain.value = 1;
  padBus.connect(filter).connect(out);

  const oscs: OscillatorNode[] = [];
  for (const freq of PAD_FREQS) {
    for (const det of [-DETUNE_CENTS, DETUNE_CENTS]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      o.detune.value = det;
      const g = ctx.createGain();
      g.gain.value = PAD_GAIN / 2;
      o.connect(g).connect(padBus);
      o.start();
      oscs.push(o);
    }
  }

  // Slow breathing LFO on filter cutoff.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 260;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  // Gentle fade-in so the pad swells instead of clicking on.
  padBus.gain.setValueAtTime(0, ctx.currentTime);
  padBus.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);

  return {
    dispose() {
      try {
        padBus.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        const stopAt = ctx.currentTime + 0.6;
        for (const o of oscs) o.stop(stopAt);
        lfo.stop(stopAt);
      } catch {
        // Already closed; nothing to do.
      }
    },
  };
}

export interface AmbientHandle {
  dispose(): void;
  isMuted(): boolean;
  setMuted(m: boolean): void;
}

/**
 * Mount zero-asset ambience. Self-attaching: adds a floating mute toggle
 * button to `document.body` and starts audio on the first user gesture.
 * No other files need changes; call `dispose()` to remove everything.
 */
export function mountAmbient(): AmbientHandle {
  if (!isBrowser()) {
    return { dispose() {}, isMuted, setMuted };
  }

  let pad: PadHandle | null = null;
  let chimeTimer: ReturnType<typeof setTimeout> | null = null;
  let started = false;
  let disposed = false;

  const scheduleChime = (): void => {
    if (disposed) return;
    const nextMs = 4000 + Math.random() * 8000; // sparse: every 4-12s
    chimeTimer = setTimeout(() => {
      if (disposed || !started || !sharedCtx) return;
      const out = master();
      if (out && !muted) {
        const freq = PENTA_FREQS[Math.floor(Math.random() * PENTA_FREQS.length)];
        pluck(sharedCtx, out, freq, CHIME_GAIN, 2.5 + Math.random() * 1.5);
      }
      scheduleChime();
    }, nextMs);
  };

  const start = (): void => {
    if (started || disposed) return;
    const ctx = getCtx();
    const out = master();
    if (!ctx || !out) return;
    started = true;
    if (ctx.state === 'suspended') void ctx.resume();
    pad = startPad(ctx, out);
    scheduleChime();
  };

  const onGesture = (): void => {
    start();
    // Keep listener for suspended-context resume (tab switches), but the
    // start-once guard makes repeats cheap.
    if (sharedCtx && sharedCtx.state === 'suspended') void sharedCtx.resume();
  };

  window.addEventListener('pointerdown', onGesture);
  window.addEventListener('keydown', onGesture);
  window.addEventListener('touchend', onGesture);

  // Self-attaching mute toggle; inline styles so no CSS file is touched.
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Toggle ambient sound');
  btn.textContent = '🔊';
  btn.style.cssText =
    'position:fixed;right:12px;bottom:12px;z-index:50;width:40px;height:40px;' +
    'border-radius:9999px;border:1px solid rgba(255,255,255,.25);' +
    'background:rgba(20,16,32,.55);color:#fff;font-size:18px;cursor:pointer;' +
    'backdrop-filter:blur(6px);line-height:1;';
  const syncLabel = (): void => {
    btn.textContent = muted ? '🔇' : '🔊';
  };
  btn.addEventListener('click', () => {
    setMuted(!muted);
    syncLabel();
  });
  document.body.appendChild(btn);

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('pointerdown', onGesture);
    window.removeEventListener('keydown', onGesture);
    window.removeEventListener('touchend', onGesture);
    if (chimeTimer) clearTimeout(chimeTimer);
    chimeTimer = null;
    pad?.dispose();
    pad = null;
    btn.remove();
  };

  return { dispose, isMuted, setMuted: (m: boolean) => { setMuted(m); syncLabel(); } };
}

/**
 * Soft ritual-cast SFX: bell chime + short pop. Safe to call without
 * `mountAmbient()`; creates/resumes the shared context on the caller's
 * gesture. Silent (no-op) when muted, server-side, or on audio failure.
 */
export function playCastChime(): void {
  if (!isBrowser() || muted) return;
  try {
    const ctx = getCtx();
    const out = master();
    if (!ctx || !out) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;

    // Soft bell: fundamental + fifth partial, quick attack, long tail.
    const bellFreqs: Array<[number, number]> = [
      [659.25, CAST_GAIN], // E5
      [987.77, CAST_GAIN * 0.35], // B5
    ];
    for (const [freq, peak] of bellFreqs) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 1.6);
    }

    // Short pop: pitch-dropping triangle through a lowpass.
    const pop = ctx.createOscillator();
    pop.type = 'triangle';
    pop.frequency.setValueAtTime(520, t);
    pop.frequency.exponentialRampToValueAtTime(180, t + 0.12);
    const popFilter = ctx.createBiquadFilter();
    popFilter.type = 'lowpass';
    popFilter.frequency.value = 1200;
    const popGain = ctx.createGain();
    popGain.gain.setValueAtTime(0, t);
    popGain.gain.linearRampToValueAtTime(POP_GAIN, t + 0.012);
    popGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    pop.connect(popFilter).connect(popGain).connect(out);
    pop.start(t);
    pop.stop(t + 0.3);
  } catch {
    // Audio unavailable; ritual visuals still play.
  }
}
