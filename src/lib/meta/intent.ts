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

// Local preset match. Hit => source local_rule, zero Meta spend.
export function matchLocalPreset(text: string): IntentName | null {
  const t = text.trim();
  if (!t) return null;
  for (const p of PRESETS) {
    if (p.match.test(t)) return p.intent;
  }
  return null;
}
