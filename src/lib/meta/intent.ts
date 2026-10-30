import { z } from 'zod';

// Intent whitelist per PRD F-11. NOTE: TECH_STACK §6.2 spells one value
// 'shared'; PRD wins ('share'). Flagged for spec alignment.
export const IntentResult = z.object({
  intent: z.enum(['bless', 'gratitude', 'calm', 'sleep', 'greet', 'encourage', 'share', 'unknown']),
  confidence: z.number().min(0).max(1),
  effect: z.object({
    palette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).min(1).max(4),
    motion: z.enum(['halo', 'swirl', 'pulse', 'drift']),
    spirit_action: z.enum(['nod', 'curl', 'bounce', 'wave', 'idle']),
    duration_ms: z.number().int().min(1000).max(15000),
    brightness: z.number().min(0).max(0.7),
  }),
  reply_line: z.string().max(80),
});

export type IntentResultT = z.infer<typeof IntentResult>;
export type IntentName = IntentResultT['intent'];

const PRESETS: Array<{ match: RegExp; intent: IntentName }> = [
  { match: /bless.*meal|meal.*bless/i, intent: 'bless' },
  { match: /thank/i, intent: 'gratitude' },
  { match: /breathe|breath|calm/i, intent: 'calm' },
  { match: /sleep|good.?night|bedtime/i, intent: 'sleep' },
  { match: /hello|hi\b|hey|greet/i, intent: 'greet' },
  { match: /you can|encourage|cheer/i, intent: 'encourage' },
  { match: /share/i, intent: 'share' },
];

// T09: confidence below this (or unparseable output) => basic response with
// the default effect; the client treats low confidence as "did you mean?".
export const CONFIDENCE_FALLBACK_THRESHOLD = 0.6;

export const FALLBACK_EFFECT = {
  palette: ['#FFD97A'],
  motion: 'halo',
  spirit_action: 'nod',
  duration_ms: 3000,
  brightness: 0.4,
} as const;

export const INTENT_SYSTEM_PROMPT =
  'Classify a short ritual utterance into one intent. ' +
  'Intents: bless, gratitude, calm, sleep, greet, encourage, share, unknown. ' +
  'Reply with JSON only: intent, confidence (0..1), effect ' +
  '(palette: 1-4 hex colors, motion: halo|swirl|pulse|drift, ' +
  'spirit_action: nod|curl|bounce|wave|idle, duration_ms: 1000..15000, ' +
  'brightness: 0..0.7), reply_line (<=80 chars, same locale as the user text). ' +
  'Never make religious judgments; when unsure use intent unknown.';

// JSON Schema mirror of IntentResult for Responses API structured output.
// additionalProperties:false everywhere: strict mode requires it.
export const INTENT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['intent', 'confidence', 'effect', 'reply_line'],
  properties: {
    intent: {
      type: 'string',
      enum: ['bless', 'gratitude', 'calm', 'sleep', 'greet', 'encourage', 'share', 'unknown'],
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    effect: {
      type: 'object',
      additionalProperties: false,
      required: ['palette', 'motion', 'spirit_action', 'duration_ms', 'brightness'],
      properties: {
        palette: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string' } },
        motion: { type: 'string', enum: ['halo', 'swirl', 'pulse', 'drift'] },
        spirit_action: { type: 'string', enum: ['nod', 'curl', 'bounce', 'wave', 'idle'] },
        duration_ms: { type: 'integer', minimum: 1000, maximum: 15000 },
        brightness: { type: 'number', minimum: 0, maximum: 0.7 },
      },
    },
    reply_line: { type: 'string', maxLength: 80 },
  },
};

// Parse raw model text into a validated IntentResult. Returns null on any
// JSON or schema failure (caller applies the T09 fallback).
export function parseIntentPayload(raw: string): IntentResultT | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const r = IntentResult.safeParse(json);
  return r.success ? r.data : null;
}

// Local preset match. Hit => source local_rule, zero Meta spend.
export function matchLocalPreset(text: string): IntentName | null {
  const t = text.trim();
  if (!t) return null;
  for (const p of PRESETS) {
    if (p.match.test(t)) return p.intent;
  }
  return null;
}
