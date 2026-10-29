import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { metaClient, metaModel } from '@/lib/meta/client';
import {
  CONFIDENCE_FALLBACK_THRESHOLD,
  FALLBACK_EFFECT,
  INTENT_JSON_SCHEMA,
  INTENT_SYSTEM_PROMPT,
  matchLocalPreset,
  parseIntentPayload,
  type IntentName,
} from '@/lib/meta/intent';
import {
  countTodayIntentUsage,
  dailyIntentLimit,
  estimateCostUsd,
  estimateInputTokens,
  releaseIntentUsage,
  reserveIntentUsage,
  serviceClient,
  settleIntentUsage,
} from '@/lib/meta/usage';

const Body = z.object({
  event_id: z.string().uuid(),
  locale: z.string().default('en'),
  text: z.string().min(1).max(500),
  ritual_id: z.string().optional(),
});

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// POST /v1/rituals/evaluate {event_id,locale,text,ritual_id}
//   -> {intent,confidence,effect_event,source}
// Pipeline (PRD F-11): auth -> local presets (zero spend) -> quota ->
// RESERVED -> Muse Spark (Responses API) -> SETTLED/RELEASED -> Zod ->
// T09 fallback on confidence<0.6 or bad payload.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err('SCHEMA_INVALID', 'bad request body', 400);
  const { locale, text } = parsed.data;

  let userId: string;
  try {
    const sb = await createClient();
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) return err('AUTH_REQUIRED', 'sign in required', 401);
    userId = data.user.id;
  } catch {
    return err('AUTH_REQUIRED', 'sign in required', 401);
  }

  const hit: IntentName | null = matchLocalPreset(text);
  if (hit) {
    return NextResponse.json({
      intent: hit,
      confidence: 1,
      effect_event: { ...FALLBACK_EFFECT },
      source: 'local_rule',
    });
  }

  let svc: ReturnType<typeof serviceClient>;
  try {
    svc = serviceClient();
  } catch {
    return err('PROVIDER_UNAVAILABLE', 'usage ledger unavailable', 503);
  }

  let used: number;
  try {
    used = await countTodayIntentUsage(svc, userId);
  } catch {
    return err('PROVIDER_UNAVAILABLE', 'quota check failed', 503);
  }
  if (used >= dailyIntentLimit()) {
    return err('QUOTA_EXHAUSTED', 'daily intent quota exhausted', 429);
  }

  let model: string;
  try {
    model = metaModel('INTENT');
  } catch {
    return err('PROVIDER_UNAVAILABLE', 'intent model not configured', 503);
  }

  const estUsd = estimateCostUsd(estimateInputTokens(INTENT_SYSTEM_PROMPT + text), 150);
  let usageId: number;
  try {
    usageId = await reserveIntentUsage(svc, { userId, modelId: model, estUsd });
  } catch {
    return err('PROVIDER_UNAVAILABLE', 'usage reservation failed', 503);
  }

  let raw = '';
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const resp = await metaClient().responses.create({
      model,
      input: [
        { role: 'system', content: INTENT_SYSTEM_PROMPT },
        { role: 'user', content: `locale=${locale}\ntext=${text}` },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'intent_result',
          schema: INTENT_JSON_SCHEMA,
          strict: true,
        },
      },
      max_output_tokens: 400,
    });
    raw = resp.output_text ?? '';
    inputTokens = resp.usage?.input_tokens ?? 0;
    outputTokens = resp.usage?.output_tokens ?? 0;
  } catch {
    await releaseIntentUsage(svc, usageId).catch(() => {});
    return err('PROVIDER_UNAVAILABLE', 'meta intent call failed', 503);
  }

  const actualUsd = estimateCostUsd(inputTokens, outputTokens);
  await settleIntentUsage(svc, usageId, { inputTokens, outputTokens, actualUsd }).catch(() => {});

  const data = parseIntentPayload(raw);
  if (!data) {
    return NextResponse.json({
      intent: 'unknown',
      confidence: 0,
      effect_event: { ...FALLBACK_EFFECT },
      source: 'meta_live',
    });
  }
  if (data.confidence < CONFIDENCE_FALLBACK_THRESHOLD) {
    return NextResponse.json({
      intent: data.intent,
      confidence: data.confidence,
      effect_event: { ...FALLBACK_EFFECT },
      source: 'meta_live',
    });
  }
  return NextResponse.json({
    intent: data.intent,
    confidence: data.confidence,
    effect_event: data.effect,
    source: 'meta_live',
  });
}
