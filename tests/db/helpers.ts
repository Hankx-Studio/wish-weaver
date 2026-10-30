import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Disposable-database guard for tests/db.
 *
 * These tests perform writes and deletes and MUST only run against a
 * throwaway database (local `supabase start` preferred). They refuse to
 * run when:
 * - SUPABASE_TEST_URL / SUPABASE_TEST_SERVICE_ROLE_KEY are unset (tests skip), or
 * - the URL is not localhost and SUPABASE_TEST_ALLOW_NONLOCAL != '1' (tests fail loudly).
 *
 * NEVER point these at the production Supabase project.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function testEnv(): { url: string; serviceKey: string } | null {
  const url = process.env.SUPABASE_TEST_URL;
  const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`tests/db: SUPABASE_TEST_URL is not a valid URL: ${url}`);
  }
  if (!LOCAL_HOSTS.has(host) && process.env.SUPABASE_TEST_ALLOW_NONLOCAL !== '1') {
    throw new Error(
      `tests/db: refusing to run against non-localhost URL (${url}). ` +
        `Use a disposable database (local \`supabase start\`) or set SUPABASE_TEST_ALLOW_NONLOCAL=1 ` +
        `for a throwaway remote project. NEVER use production.`,
    );
  }
  return { url, serviceKey };
}

export function hasTestDb(): boolean {
  try {
    return testEnv() !== null;
  } catch {
    // Non-local URL without the allow flag: env is "present" so the guard
    // error surfaces instead of silently skipping.
    return true;
  }
}

/** service_role client (bypasses RLS): the only client tests/db may use. */
export function testClient(): SupabaseClient {
  const env = testEnv();
  if (!env) throw new Error('tests/db: test env missing (this should have skipped)');
  return createClient(env.url, env.serviceKey, { auth: { persistSession: false } });
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Create an auth user + profile row; returns ids for cleanup. */
export async function makeUser(
  sb: SupabaseClient,
  opts: { role?: string; merchant_id?: string | null } = {},
): Promise<{ id: string }> {
  const email = `${uid('t').replace(/[^a-z0-9-]/g, '')}@example.test`;
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: 'Test-Pass-1234!',
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`makeUser auth.admin.createUser: ${error?.message}`);
  const id = data.user.id;
  const { error: pErr } = await sb.from('profiles').insert({
    id,
    role: opts.role ?? 'user',
    merchant_id: opts.merchant_id ?? null,
  });
  if (pErr) throw new Error(`makeUser profiles insert: ${pErr.message}`);
  return { id };
}

export async function deleteUser(sb: SupabaseClient, id: string): Promise<void> {
  await sb.from('profiles').delete().eq('id', id);
  await sb.auth.admin.deleteUser(id);
}

export async function makeSpirit(sb: SupabaseClient, ownerId: string): Promise<{ id: string }> {
  const { data, error } = await sb
    .from('spirits')
    .insert({ owner_id: ownerId })
    .select('id')
    .single();
  if (error || !data) throw new Error(`makeSpirit: ${error?.message}`);
  return { id: data.id as string };
}

export async function makeCampaign(
  sb: SupabaseClient,
  opts: { committed_units?: number; buffer_fraction?: number; status?: string } = {},
): Promise<{ id: string }> {
  const { data, error } = await sb
    .from('campaigns')
    .insert({
      name: uid('camp'),
      region: 'test',
      status: opts.status ?? 'ACTIVE',
      committed_units: opts.committed_units ?? 100000,
      buffer_fraction: opts.buffer_fraction ?? 0.2,
      is_demo: true,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`makeCampaign: ${error?.message}`);
  return { id: data.id as string };
}

/** Direct GRANT ledger insert (test funding; production funds only via grant_ritual_reward). */
export async function fundUser(
  sb: SupabaseClient,
  campaignId: string,
  userId: string,
  units: number,
): Promise<void> {
  const { error } = await sb.from('ledger_events').insert({
    campaign_id: campaignId,
    user_id: userId,
    kind: 'GRANT',
    units,
    ref_id: crypto.randomUUID(),
    idempotency_key: uid('fund'),
    rule_version: 'test',
  });
  if (error) throw new Error(`fundUser: ${error.message}`);
}

export async function makeLot(
  sb: SupabaseClient,
  campaignId: string,
  merchantId: string,
  opts: { price_units?: number; free_stock?: number } = {},
): Promise<{ id: string }> {
  const { data, error } = await sb
    .from('stock_lots')
    .insert({
      campaign_id: campaignId,
      merchant_id: merchantId,
      product: uid('lot'),
      price_units: opts.price_units ?? 150,
      free_stock: opts.free_stock ?? 10,
      reserved_stock: 0,
      is_demo: true,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`makeLot: ${error?.message}`);
  return { id: data.id as string };
}

export type RpcResult = Record<string, unknown>;

/** Call a money function via RPC; throws on transport errors, returns the jsonb payload. */
export async function rpc(
  sb: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<RpcResult> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(`rpc ${fn}: ${error.message}`);
  return data as RpcResult;
}
