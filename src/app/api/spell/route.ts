import { NextResponse } from 'next/server';
import { z } from 'zod';
import { metaClient, metaModel } from '@/lib/meta/client';
import {
  CONFIDENCE_FALLBACK_THRESHOLD,
  INTENT_JSON_SCHEMA,
  INTENT_SYSTEM_PROMPT,
  parseIntentPayload,
} from '@/lib/meta/intent';

// POST /api/spell {text} -> {effect, color:[r,g,b], text, source}
// Guest-friendly endpoint for the Godot demo (no login). Keyword hits resolve
// locally at zero Meta spend (mirrors the client's local_rule keywords in
// godot/scripts/net.gd); anything else goes to Muse Spark when configured.
// Provider failures fall back to a local_rule sparkle instead of an error, so
// the game never hard-fails; `source` always tells the truth.

const Body = z.object({
  text: z.string().min(1).max(120),
});

const LOCAL: Array<{ keys: string[]; effect: string; color: [number, number, number] }> = [
  { keys: ['bloom', 'flower'], effect: 'bloom', color: [1.0, 0.6, 0.8] },
  { keys: ['rain', 'water'], effect: 'rain', color: [0.5, 0.8, 1.0] },
  { keys: ['light', 'sun'], effect: 'light', color: [1.0, 0.95, 0.6] },
  { keys: ['star'], effect: 'star', color: [0.8, 0.9, 1.0] },
  { keys: ['wind', 'leaf'], effect: 'wind', color: [0.7, 1.0, 0.9] },
  { keys: ['fire'], effect: 'fire', color: [1.0, 0.55, 0.3] },
];

const SPARKLE = { effect: 'sparkle', color: [1.0, 0.85, 0.4] as [number, number, number] };

// Best-effort per-IP rate limit (serverless memory is per-instance; this is a
// demo guardrail, not a billing boundary).
const buckets = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 20;
const WINDOW_MS = 60_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > LIMIT;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return SPARKLE.color;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function localAnswer(text: string) {
  const t = text.toLowerCase();
  for (const row of LOCAL) {
    if (row.keys.some((k) => t.includes(k))) {
      return { effect: row.effect, color: [...row.color], text, source: 'local_rule' as const };
    }
  }
  return null;
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'SCHEMA_INVALID', message: 'bad request body' } }, { status: 400 });
  }
  const { text } = parsed.data;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'too many spells; slow down' } }, { status: 429 });
  }

  const local = localAnswer(text);
  if (local) return NextResponse.json(local);

  const configured = Boolean(process.env.META_API_KEY && process.env.META_API_BASE_URL && process.env.META_MODEL_INTENT);
  if (configured) {
    try {
      const resp = await metaClient().responses.create({
        model: metaModel('INTENT'),
        input: [
          { role: 'system', content: INTENT_SYSTEM_PROMPT },
          { role: 'user', content: `locale=en\ntext=${text}` },
        ],
        text: {
          format: { type: 'json_schema', name: 'intent_result', schema: INTENT_JSON_SCHEMA, strict: true },
        },
        max_output_tokens: 400,
      });
      const data = parseIntentPayload(resp.output_text ?? '');
      if (data && data.confidence >= CONFIDENCE_FALLBACK_THRESHOLD) {
        return NextResponse.json({
          effect: data.intent,
          color: hexToRgb(data.effect.palette[0] ?? '#FFD97A'),
          text,
          source: 'meta_live',
        });
      }
    } catch {
      // fall through to local sparkle
    }
  }

  return NextResponse.json({ effect: SPARKLE.effect, color: [...SPARKLE.color], text, source: 'local_rule' });
}
