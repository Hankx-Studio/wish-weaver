import { NextResponse } from 'next/server';
import { z } from 'zod';
import { matchLocalPreset, type IntentName } from '@/lib/meta/intent';

const Body = z.object({
  event_id: z.string().uuid(),
  locale: z.string().default('en'),
  text: z.string().min(1).max(500),
  ritual_id: z.string().optional(),
});

const DEFAULT_EFFECT = {
  palette: ['#FFD97A'],
  motion: 'halo',
  spirit_action: 'nod',
  duration_ms: 3000,
  brightness: 0.4,
} as const;

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// TODO(M1): Supabase auth (AUTH_REQUIRED), per-user quota (QUOTA_EXHAUSTED),
// Meta Spark call with RESERVED ai_usage + zod validation, confidence<0.6
// fallback (T09). Local path below is final behavior, not a stub.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err('SCHEMA_INVALID', 'bad request body', 400);
  const { text } = parsed.data;

  const hit: IntentName | null = matchLocalPreset(text);
  if (hit) {
    return NextResponse.json({
      intent: hit,
      confidence: 1,
      effect_event: { ...DEFAULT_EFFECT },
      source: 'local_rule',
    });
  }
  return err('PROVIDER_UNAVAILABLE', 'meta intent path wires up in M1.2', 503);
}
