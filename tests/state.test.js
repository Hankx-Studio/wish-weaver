import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState, sanitize, loadState, saveState, stageFor,
  nextThreshold, awardWish, addCrystal, addWish, todayKey,
} from '../public/js/state.js';
import { STORAGE_KEY } from '../public/js/config.js';

function mem(initial) {
  const store = { ...initial };
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}

describe('state: initial + storage round-trip', () => {
  it('new player starts at 0 XP', () => {
    assert.equal(createInitialState().xp, 0);
  });
  it('save then load preserves xp and crystals', () => {
    const s = mem();
    const st = createInitialState();
    st.xp = 20;
    st.crystals = { light: 2 };
    saveState(s, st);
    const back = loadState(s);
    assert.equal(back.xp, 20);
    assert.equal(back.crystals.light, 2);
  });
  it('storage key is wishweaver.v1', () => {
    assert.equal(STORAGE_KEY, 'wishweaver.v1');
  });
});

describe('state: corrupt reset', () => {
  it('null / garbage string resets safely', () => {
    assert.equal(loadState(mem()).xp, 0);
    assert.equal(loadState(mem({ [STORAGE_KEY]: 'not-json{{{' })).xp, 0);
  });
  it('wrong version resets', () => {
    const s = mem({ [STORAGE_KEY]: JSON.stringify({ version: 99, xp: 500 }) });
    assert.equal(loadState(s).xp, 0);
  });
  it('negative xp and bad crystals are dropped', () => {
    const got = sanitize({ version: 1, xp: -5, crystals: { light: -2, bogus: 3 }, wishes: [], dayCounts: {} });
    assert.equal(got.xp, 0);
    assert.equal(got.crystals.light ?? 0, 0);
    assert.equal(got.crystals.bogus ?? 0, 0);
  });
});

describe('state: XP award + daily cap', () => {
  it('+10 per wish', () => {
    const st = createInitialState();
    const r = awardWish(st, { day: '2026-10-29' });
    assert.equal(r.gained, 10);
    assert.equal(st.xp, 10);
  });
  it('daily cap 10: 11th wish gains 0 but is allowed', () => {
    const st = createInitialState();
    for (let i = 0; i < 10; i++) awardWish(st, { day: '2026-10-29' });
    assert.equal(st.xp, 100);
    const r = awardWish(st, { day: '2026-10-29' });
    assert.equal(r.gained, 0);
    assert.equal(r.capped, true);
  });
  it('cap resets on a new local date', () => {
    const st = createInitialState();
    for (let i = 0; i < 10; i++) awardWish(st, { day: '2026-10-29' });
    const r = awardWish(st, { day: '2026-10-30' });
    assert.equal(r.gained, 10);
  });
  it('blocked safety gains 0 XP', () => {
    const st = createInitialState();
    const r = awardWish(st, { day: '2026-10-29', blocked: true });
    assert.equal(r.gained, 0);
    assert.equal(st.xp, 0);
  });
  it('demo mode triples XP', () => {
    const st = createInitialState();
    const r = awardWish(st, { day: '2026-10-29', demo: true });
    assert.equal(r.gained, 30);
  });
});

describe('state: thresholds', () => {
  it('stage boundaries 30/90/180', () => {
    assert.equal(stageFor(0), 0);
    assert.equal(stageFor(29), 0);
    assert.equal(stageFor(30), 1);
    assert.equal(stageFor(89), 1);
    assert.equal(stageFor(90), 2);
    assert.equal(stageFor(179), 2);
    assert.equal(stageFor(180), 3);
  });
  it('nextThreshold points at the coming gate', () => {
    assert.equal(nextThreshold(0), 30);
    assert.equal(nextThreshold(30), 90);
    assert.equal(nextThreshold(200), null);
  });
  it('demo round crosses stage1 and fires the hook flag', () => {
    const st = createInitialState();
    const r = awardWish(st, { day: '2026-10-29', demo: true });
    assert.equal(r.thresholdCrossed, true);
    assert.equal(stageFor(st.xp), 1);
  });
});

describe('state: crystals + history', () => {
  it('one crystal per counted wish element', () => {
    const st = createInitialState();
    addCrystal(st, 'bloom');
    addCrystal(st, 'bogus');
    assert.equal(st.crystals.bloom, 1);
    assert.equal(st.crystals.bogus, undefined);
  });
  it('keeps only the last 20 wishes', () => {
    const st = createInitialState();
    for (let i = 0; i < 25; i++) addWish(st, { text: `w${i}` });
    assert.equal(st.wishes.length, 20);
    assert.equal(st.wishes[0].text, 'w5');
  });
  it('todayKey is a local YYYY-MM-DD date', () => {
    assert.match(todayKey(), /^\d{4}-\d{2}-\d{2}$/);
  });
});
