import {
  STORAGE_KEY, STORAGE_VERSION, XP_PER_WISH, DAILY_WISH_CAP,
  THRESHOLDS, ELEMENTS, DEMO_MULTIPLIER, HISTORY_LIMIT,
} from './config.js';

// Pure, DOM-free: node:test imports these directly.

export function createInitialState() {
  return {
    version: STORAGE_VERSION, xp: 0, crystals: {}, wishes: [],
    dayCounts: {}, createdAt: new Date().toISOString(),
  };
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Corrupt data resets safely to a fresh state.
export function sanitize(raw) {
  try {
    if (!raw || typeof raw !== 'object') return createInitialState();
    if (raw.version !== STORAGE_VERSION) return createInitialState();
    const s = createInitialState();
    if (Number.isFinite(raw.xp) && raw.xp >= 0) s.xp = Math.floor(raw.xp);
    if (raw.crystals && typeof raw.crystals === 'object') {
      for (const e of ELEMENTS) {
        const n = raw.crystals[e];
        if (Number.isFinite(n) && n >= 0) s.crystals[e] = Math.floor(n);
      }
    }
    if (Array.isArray(raw.wishes)) s.wishes = raw.wishes.slice(-HISTORY_LIMIT);
    if (raw.dayCounts && typeof raw.dayCounts === 'object') {
      for (const [k, v] of Object.entries(raw.dayCounts)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(v) && v >= 0) {
          s.dayCounts[k] = Math.floor(v);
        }
      }
    }
    return s;
  } catch {
    return createInitialState();
  }
}

export function loadState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return sanitize(JSON.parse(raw));
  } catch {
    return createInitialState();
  }
}

export function saveState(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function stageFor(xp) {
  if (xp >= THRESHOLDS.stage3) return 3;
  if (xp >= THRESHOLDS.stage2) return 2;
  if (xp >= THRESHOLDS.stage1) return 1;
  return 0;
}

export function nextThreshold(xp) {
  for (const t of [THRESHOLDS.stage1, THRESHOLDS.stage2, THRESHOLDS.stage3]) {
    if (xp < t) return t;
  }
  return null;
}

// Award XP for one wish. Returns { gained, counted, capped }.
// Over the daily cap: still allowed, but gained = 0.
// safety=block: gained = 0 (refusal, no XP).
export function awardWish(state, { day, demo = false, blocked = false } = {}) {
  const d = day || todayKey();
  const used = state.dayCounts[d] || 0;
  const capped = used >= DAILY_WISH_CAP;
  let gained = 0;
  const before = stageFor(state.xp);
  if (!blocked && !capped) {
    gained = XP_PER_WISH * (demo ? DEMO_MULTIPLIER : 1);
    state.xp += gained;
    state.dayCounts[d] = used + 1;
  }
  const after = stageFor(state.xp);
  return { gained, counted: gained > 0, capped, thresholdCrossed: after > before };
}

export function addCrystal(state, element) {
  if (!ELEMENTS.includes(element)) return;
  state.crystals[element] = (state.crystals[element] || 0) + 1;
}

export function addWish(state, entry) {
  state.wishes.push(entry);
  if (state.wishes.length > HISTORY_LIMIT) {
    state.wishes = state.wishes.slice(-HISTORY_LIMIT);
  }
}

export function crystalTotal(state) {
  return Object.values(state.crystals).reduce((a, b) => a + b, 0);
}
