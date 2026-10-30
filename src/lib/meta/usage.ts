import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-only ai_usage ledger + daily quota. ai_usage carries no RLS policies
// (migration 0003), so every read/write here uses the service-role key.

export const INTENT_KIND = 'intent' as const;
export const DEFAULT_DAILY_INTENT_LIMIT = 30;

export function dailyIntentLimit(): number {
  const raw = process.env.AI_DAILY_INTENT_LIMIT;
  const n = raw !== undefined ? Number.parseInt(raw, 10) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : DEFAULT_DAILY_INTENT_LIMIT;
}

export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing supabase service env');
  return createClient(url, key, { auth: { persistSession: false } });
}

// Rough token estimate (chars/4). Returns null when prices are unconfigured
// (META_PRICE_* pending verification) — ai_usage.usd columns stay null then.
export function estimateCostUsd(inputTokens: number, outputTokens: number): number | null {
  const pi = Number(process.env.META_PRICE_INPUT_PER_M);
  const po = Number(process.env.META_PRICE_OUTPUT_PER_M);
  if (!Number.isFinite(pi) || !Number.isFinite(po) || pi < 0 || po < 0) return null;
  return (inputTokens * pi + outputTokens * po) / 1_000_000;
}

export function estimateInputTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function todayUtcStartIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// Quota counts live spend only: RESERVED (in-flight) + SETTLED. RELEASED
// rows are failed calls and must not consume the user's daily quota.
export async function countTodayIntentUsage(
  sb: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await sb
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', INTENT_KIND)
    .in('status', ['RESERVED', 'SETTLED'])
    .gte('created_at', todayUtcStartIso());
  if (error) throw error;
  return count ?? 0;
}

export async function reserveIntentUsage(
  sb: SupabaseClient,
  args: { userId: string; modelId: string; estUsd: number | null },
): Promise<number> {
  const { data, error } = await sb
    .from('ai_usage')
    .insert({
      user_id: args.userId,
      kind: INTENT_KIND,
      model_id: args.modelId,
      status: 'RESERVED',
      est_usd: args.estUsd,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: number }).id;
}

export async function settleIntentUsage(
  sb: SupabaseClient,
  id: number,
  args: { inputTokens: number; outputTokens: number; actualUsd: number | null },
): Promise<void> {
  const { error } = await sb
    .from('ai_usage')
    .update({
      status: 'SETTLED',
      input_tokens: args.inputTokens,
      output_tokens: args.outputTokens,
      actual_usd: args.actualUsd,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function releaseIntentUsage(sb: SupabaseClient, id: number): Promise<void> {
  const { error } = await sb.from('ai_usage').update({ status: 'RELEASED' }).eq('id', id);
  if (error) throw error;
}
