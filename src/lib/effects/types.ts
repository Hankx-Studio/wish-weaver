import type { IntentName } from '@/lib/meta/intent';

// effect_event local contract (subset of effect_event schema 1.0 for the
// client renderer). Anything the server sends must satisfy this shape;
// anything the client plays without a server round-trip is source=local_rule.
export interface EffectParams {
  palette: string[];
  motion: 'halo' | 'swirl' | 'pulse' | 'drift';
  spirit_action: 'nod' | 'curl' | 'bounce' | 'wave' | 'idle';
  duration_ms: number;
  brightness: number;
}

export interface EffectEvent extends EffectParams {
  seed: number;
}

// Deterministic PRNG so a burst can be replayed from its seed.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type KnownIntent = Exclude<IntentName, 'unknown'>;

// Local look per intent (no API involved). Distinct hue per intent so the
// player can read the result at a glance.
export const INTENT_EFFECTS: Record<KnownIntent, EffectParams> = {
  bless: {
    palette: ['#FFD97A', '#FFF3C4'],
    motion: 'halo',
    spirit_action: 'nod',
    duration_ms: 4000,
    brightness: 0.5,
  },
  gratitude: {
    palette: ['#FFB3C7', '#FFE5EC'],
    motion: 'pulse',
    spirit_action: 'bounce',
    duration_ms: 3500,
    brightness: 0.45,
  },
  calm: {
    palette: ['#9AD9C6', '#E0F2EC'],
    motion: 'drift',
    spirit_action: 'idle',
    duration_ms: 5000,
    brightness: 0.35,
  },
  sleep: {
    palette: ['#8FB8DE', '#DCE9F7'],
    motion: 'drift',
    spirit_action: 'curl',
    duration_ms: 6000,
    brightness: 0.3,
  },
  greet: {
    palette: ['#A8D8FF', '#FFFFFF'],
    motion: 'halo',
    spirit_action: 'wave',
    duration_ms: 2500,
    brightness: 0.4,
  },
  encourage: {
    palette: ['#FFC46B', '#FFE8B3'],
    motion: 'pulse',
    spirit_action: 'bounce',
    duration_ms: 3000,
    brightness: 0.5,
  },
  share: {
    palette: ['#B7E4A8', '#F1FBEA'],
    motion: 'swirl',
    spirit_action: 'nod',
    duration_ms: 3500,
    brightness: 0.45,
  },
};

// One short text line per intent. The spirit never speaks; the UI may show
// a single line next to it (PRD: reply_line <= 80 chars).
export const INTENT_REPLY: Record<IntentName, string> = {
  bless: 'Warmth gathers around you.',
  gratitude: 'The spirit glows a little brighter.',
  calm: 'Stillness settles like soft snow.',
  sleep: 'The spirit curls up and breathes slowly.',
  greet: 'The spirit waves back.',
  encourage: 'You can do it — the spirit cheers silently.',
  share: 'Kindness ripples outward.',
  unknown: 'The spirit tilts its head, listening.',
};
