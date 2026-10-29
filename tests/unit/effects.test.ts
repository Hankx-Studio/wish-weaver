import { describe, expect, it } from 'vitest';
import { INTENT_EFFECTS, INTENT_REPLY, mulberry32 } from '../../src/lib/effects/types';

describe('mulberry32', () => {
  it('replays the same sequence from the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('differs across seeds and stays in [0, 1)', () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
    for (const v of [a, b, mulberry32(999)()]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('INTENT_EFFECTS', () => {
  const hex = /^#[0-9A-Fa-f]{6}$/;
  it('covers every known intent with valid ranges', () => {
    const intents = ['bless', 'gratitude', 'calm', 'sleep', 'greet', 'encourage', 'share'] as const;
    expect(Object.keys(INTENT_EFFECTS).sort()).toEqual([...intents].sort());
    for (const fx of Object.values(INTENT_EFFECTS)) {
      expect(fx.palette.length).toBeGreaterThanOrEqual(1);
      expect(fx.palette.length).toBeLessThanOrEqual(4);
      for (const c of fx.palette) expect(c).toMatch(hex);
      expect(fx.duration_ms).toBeGreaterThanOrEqual(1000);
      expect(fx.duration_ms).toBeLessThanOrEqual(15000);
      expect(fx.brightness).toBeGreaterThanOrEqual(0);
      expect(fx.brightness).toBeLessThanOrEqual(0.7);
    }
  });

  it('has a short reply line per intent', () => {
    for (const line of Object.values(INTENT_REPLY)) {
      expect(line.length).toBeGreaterThan(0);
      expect(line.length).toBeLessThanOrEqual(80);
    }
  });
});
