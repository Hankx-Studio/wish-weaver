import { describe, expect, it } from 'vitest';
import { IntentResult, matchLocalPreset } from '../../src/lib/meta/intent';

describe('matchLocalPreset', () => {
  it('hits bless for meal blessing', () => {
    expect(matchLocalPreset('Bless this meal')).toBe('bless');
  });
  it('hits gratitude for thanks', () => {
    expect(matchLocalPreset('Thank you for today')).toBe('gratitude');
  });
  it('hits sleep for bedtime', () => {
    expect(matchLocalPreset('good night')).toBe('sleep');
  });
  it('returns null for unknown text', () => {
    expect(matchLocalPreset('the moon is a mirror')).toBeNull();
  });
  it('returns null for blank text', () => {
    expect(matchLocalPreset('   ')).toBeNull();
  });
});

describe('IntentResult', () => {
  it('accepts a valid model payload', () => {
    const r = IntentResult.safeParse({
      intent: 'calm',
      confidence: 0.9,
      effect: {
        palette: ['#AABBCC'],
        motion: 'drift',
        spirit_action: 'curl',
        duration_ms: 5000,
        brightness: 0.3,
      },
      reply_line: '…',
    });
    expect(r.success).toBe(true);
  });
  it('rejects bad intent and palette', () => {
    const r = IntentResult.safeParse({
      intent: 'pray',
      confidence: 2,
      effect: {
        palette: ['red'],
        motion: 'halo',
        spirit_action: 'nod',
        duration_ms: 500,
        brightness: 9,
      },
      reply_line: 'x',
    });
    expect(r.success).toBe(false);
  });
});
