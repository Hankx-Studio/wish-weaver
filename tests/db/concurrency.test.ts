import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  deleteUser,
  fundUser,
  hasTestDb,
  makeCampaign,
  makeLot,
  makeSpirit,
  makeUser,
  rpc,
  testClient,
  uid,
} from './helpers';

// Skips (no DB writes) unless SUPABASE_TEST_URL/SUPABASE_TEST_SERVICE_ROLE_KEY
// point at a disposable database. See tests/db/README.md. NEVER production.
const ENABLED = hasTestDb();

describe.skipIf(!ENABLED)('db concurrency (T01/T03/T04/T05/T16)', () => {
  let sb: SupabaseClient;
  const users: string[] = [];
  const campaigns: string[] = [];

  async function user(opts?: { role?: string; merchant_id?: string | null }) {
    const u = await makeUser(sb, opts);
    users.push(u.id);
    return u.id;
  }

  async function campaign(opts?: {
    committed_units?: number;
    buffer_fraction?: number;
    status?: string;
  }) {
    const c = await makeCampaign(sb, opts);
    campaigns.push(c.id);
    return c.id;
  }

  beforeAll(() => {
    sb = testClient(); // throws loudly on non-local URL without the allow flag
  });

  afterAll(async () => {
    if (!sb) return;
    for (const id of campaigns) {
      await sb.from('ledger_events').delete().eq('campaign_id', id);
      const { data: lots } = await sb.from('stock_lots').select('id').eq('campaign_id', id);
      for (const lot of lots ?? []) {
        const { data: res } = await sb.from('reservations').select('id').eq('lot_id', lot.id);
        for (const r of res ?? []) {
          await sb.from('redemptions').delete().eq('reservation_id', r.id);
          await sb.from('vouchers').delete().eq('reservation_id', r.id);
          await sb.from('reservations').delete().eq('id', r.id);
        }
        await sb.from('stock_lots').delete().eq('id', lot.id);
      }
      await sb.from('campaigns').delete().eq('id', id);
    }
    for (const id of users) {
      const { data: evts } = await sb.from('interactions').select('event_id').eq('user_id', id);
      for (const e of evts ?? []) {
        await sb.from('xp_receipts').delete().eq('event_id', e.event_id as string);
      }
      await sb.from('interactions').delete().eq('user_id', id);
      await sb.from('ledger_events').delete().eq('user_id', id);
      await sb.from('spirits').delete().eq('owner_id', id);
      await deleteUser(sb, id).catch(() => undefined);
    }
  });

  it('T01: same event 10x concurrently -> one XP row, at most one GRANT, duplicates replay original', async () => {
    const userId = await user();
    const spirit = await makeSpirit(sb, userId);
    const camp = await campaign();
    const eventId = crypto.randomUUID();
    const day = new Date().toISOString().slice(0, 10);

    const calls = Array.from({ length: 10 }, (_, i) =>
      rpc(sb, 'grant_ritual_reward', {
        p_event: eventId,
        p_user: userId,
        p_spirit: spirit.id,
        p_category: 'ritual',
        p_campaign: camp,
        p_day: day,
        p_is_simulated: false,
        p_is_demo: false,
        p_key: `t01-${eventId}-${i}`,
      }),
    );
    const results = await Promise.all(calls);
    const first = results.filter((r) => r.code === undefined);
    const dups = results.filter((r) => r.code === 'DUPLICATE_EVENT');
    expect(first).toHaveLength(1);
    expect(dups).toHaveLength(9);
    // Duplicates replay the ORIGINAL xp/coin, not zeros.
    for (const d of dups) {
      expect(d.xp).toBe(first[0].xp);
      expect(d.coin_units).toBe(first[0].coin_units);
    }
    expect(first[0].xp).toBe(10);
    expect(first[0].coin_units).toBe(50);

    const { count: xpCount } = await sb
      .from('xp_receipts')
      .select('event_id', { count: 'exact', head: true })
      .eq('event_id', eventId);
    expect(xpCount).toBe(1);
    const { count: grantCount } = await sb
      .from('ledger_events')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'GRANT')
      .eq('ref_id', eventId);
    expect(grantCount).toBeLessThanOrEqual(1);
  });

  it('T03: two users race last unit -> one success, one OUT_OF_STOCK, no leftover HOLD', async () => {
    const camp = await campaign();
    const merchantA = crypto.randomUUID();
    const lot = await makeLot(sb, camp, merchantA, { price_units: 150, free_stock: 1 });
    const u1 = await user();
    const u2 = await user();
    await fundUser(sb, camp, u1, 150);
    await fundUser(sb, camp, u2, 150);

    const [r1, r2] = await Promise.all([
      rpc(sb, 'reserve_item', {
        p_lot: lot.id,
        p_user: u1,
        p_mode: 'SELF',
        p_key: uid('t03a'),
        p_token_hash: uid('tok-a'),
      }),
      rpc(sb, 'reserve_item', {
        p_lot: lot.id,
        p_user: u2,
        p_mode: 'SELF',
        p_key: uid('t03b'),
        p_token_hash: uid('tok-b'),
      }),
    ]);
    const codes = [r1.code, r2.code];
    expect(codes.filter((c) => c === undefined)).toHaveLength(1);
    expect(codes.filter((c) => c === 'OUT_OF_STOCK')).toHaveLength(1);

    // No oversell and no leftover HOLD from the loser.
    const { data: lotRow } = await sb
      .from('stock_lots')
      .select('free_stock,reserved_stock')
      .eq('id', lot.id)
      .single();
    expect(lotRow?.free_stock).toBe(0);
    expect(lotRow?.reserved_stock).toBe(1);
    const { count: resCount } = await sb
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('lot_id', lot.id);
    expect(resCount).toBe(1);
    const { count: holdCount } = await sb
      .from('ledger_events')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', camp)
      .eq('kind', 'HOLD');
    expect(holdCount).toBe(1);
  });

  it('reserve idempotency: same key twice -> same reservation + DUPLICATE_EVENT', async () => {
    const camp = await campaign();
    const lot = await makeLot(sb, camp, crypto.randomUUID(), { price_units: 150, free_stock: 5 });
    const u1 = await user();
    await fundUser(sb, camp, u1, 500);
    const key = uid('t03-replay');
    const first = await rpc(sb, 'reserve_item', {
      p_lot: lot.id,
      p_user: u1,
      p_mode: 'SELF',
      p_key: key,
      p_token_hash: uid('tok'),
    });
    expect(first.reservation_id).toBeTruthy();
    const replay = await rpc(sb, 'reserve_item', {
      p_lot: lot.id,
      p_user: u1,
      p_mode: 'SELF',
      p_key: key,
      p_token_hash: uid('tok-other'),
    });
    expect(replay.code).toBe('DUPLICATE_EVENT');
    expect(replay.reservation_id).toBe(first.reservation_id);
    const { count } = await sb
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('lot_id', lot.id);
    expect(count).toBe(1);
  });

  it('T04: two users race one shared voucher -> exactly one holder', async () => {
    const camp = await campaign();
    const lot = await makeLot(sb, camp, crypto.randomUUID(), { price_units: 150, free_stock: 5 });
    const owner = await user();
    await fundUser(sb, camp, owner, 500);
    const res = await rpc(sb, 'reserve_item', {
      p_lot: lot.id,
      p_user: owner,
      p_mode: 'SHARE',
      p_key: uid('t04-res'),
      p_token_hash: uid('tok-share'),
    });
    // ISSUED -> SHARED transition has no DB function yet (spec gap, see report);
    // tests set the shared state directly via service_role.
    const { data: vou } = await sb
      .from('vouchers')
      .select('id,token_hash')
      .eq('reservation_id', res.reservation_id as string)
      .single();
    await sb.from('vouchers').update({ state: 'SHARED' }).eq('id', vou!.id as string);

    const claimA = await user();
    const claimB = await user();
    const [c1, c2] = await Promise.all([
      rpc(sb, 'claim_voucher', {
        p_token_hash: vou!.token_hash as string,
        p_user: claimA,
        p_key: uid('t04a'),
      }),
      rpc(sb, 'claim_voucher', {
        p_token_hash: vou!.token_hash as string,
        p_user: claimB,
        p_key: uid('t04b'),
      }),
    ]);
    const codes = [c1.code, c2.code];
    expect(codes.filter((c) => c === undefined)).toHaveLength(1);
    expect(codes.filter((c) => c === 'ALREADY_CLAIMED')).toHaveLength(1);

    const { data: final } = await sb
      .from('vouchers')
      .select('holder_id,state')
      .eq('id', vou!.id as string)
      .single();
    expect(final?.state).toBe('CLAIMED');
    expect([claimA, claimB]).toContain(final?.holder_id);

    // Holder replay returns the ORIGINAL success.
    const winner = final?.holder_id as string;
    const replay = await rpc(sb, 'claim_voucher', {
      p_token_hash: vou!.token_hash as string,
      p_user: winner,
      p_key: uid('t04-replay'),
    });
    expect(replay.code).toBe('DUPLICATE_EVENT');
    expect(replay.voucher_id).toBe(vou!.id);
  });

  it('T05: same voucher redeemed twice concurrently -> one ok, one ALREADY_REDEEMED', async () => {
    const camp = await campaign();
    const merchantA = crypto.randomUUID();
    const lot = await makeLot(sb, camp, merchantA, { price_units: 150, free_stock: 5 });
    const buyer = await user();
    await fundUser(sb, camp, buyer, 500);
    const staff = await user({ role: 'merchant_staff', merchant_id: merchantA });
    const res = await rpc(sb, 'reserve_item', {
      p_lot: lot.id,
      p_user: buyer,
      p_mode: 'SELF',
      p_key: uid('t05-res'),
      p_token_hash: uid('tok-red'),
    });
    const { data: vou } = await sb
      .from('vouchers')
      .select('token_hash')
      .eq('reservation_id', res.reservation_id as string)
      .single();

    const [d1, d2] = await Promise.all([
      rpc(sb, 'redeem_voucher', {
        p_token_hash: vou!.token_hash as string,
        p_staff: staff,
        p_key: uid('t05a'),
      }),
      rpc(sb, 'redeem_voucher', {
        p_token_hash: vou!.token_hash as string,
        p_staff: staff,
        p_key: uid('t05b'),
      }),
    ]);
    const oks = [d1, d2].filter((d) => d.ok === true && d.code === undefined);
    const dups = [d1, d2].filter((d) => d.code === 'ALREADY_REDEEMED');
    expect(oks).toHaveLength(1);
    expect(dups).toHaveLength(1);

    const { count: redCount } = await sb
      .from('redemptions')
      .select('reservation_id', { count: 'exact', head: true })
      .eq('reservation_id', res.reservation_id as string);
    expect(redCount).toBe(1);
    const { data: lotRow } = await sb
      .from('stock_lots')
      .select('reserved_stock')
      .eq('id', lot.id)
      .single();
    expect(lotRow?.reserved_stock).toBe(0);
  });

  it('redeem idempotency: same key twice -> ok replay, still one redemption', async () => {
    const camp = await campaign();
    const merchantA = crypto.randomUUID();
    const lot = await makeLot(sb, camp, merchantA, { price_units: 150, free_stock: 5 });
    const buyer = await user();
    await fundUser(sb, camp, buyer, 500);
    const staff = await user({ role: 'merchant_staff', merchant_id: merchantA });
    const res = await rpc(sb, 'reserve_item', {
      p_lot: lot.id,
      p_user: buyer,
      p_mode: 'SELF',
      p_key: uid('t05r-res'),
      p_token_hash: uid('tok-redr'),
    });
    const { data: vou } = await sb
      .from('vouchers')
      .select('token_hash')
      .eq('reservation_id', res.reservation_id as string)
      .single();
    const key = uid('t05r');
    const first = await rpc(sb, 'redeem_voucher', {
      p_token_hash: vou!.token_hash as string,
      p_staff: staff,
      p_key: key,
    });
    expect(first.ok).toBe(true);
    const replay = await rpc(sb, 'redeem_voucher', {
      p_token_hash: vou!.token_hash as string,
      p_staff: staff,
      p_key: key,
    });
    expect(replay.ok).toBe(true);
    expect(replay.code).toBe('DUPLICATE_EVENT');
    expect(replay.reservation_id).toBe(res.reservation_id);
  });

  it('T16: cross-merchant and unknown staff redeem -> PERMISSION_DENIED, nothing burned', async () => {
    const camp = await campaign();
    const merchantA = crypto.randomUUID();
    const merchantB = crypto.randomUUID();
    const lot = await makeLot(sb, camp, merchantA, { price_units: 150, free_stock: 5 });
    const buyer = await user();
    await fundUser(sb, camp, buyer, 500);
    const otherStaff = await user({ role: 'merchant_staff', merchant_id: merchantB });
    const plainUser = await user();
    const res = await rpc(sb, 'reserve_item', {
      p_lot: lot.id,
      p_user: buyer,
      p_mode: 'SELF',
      p_key: uid('t16-res'),
      p_token_hash: uid('tok-t16'),
    });
    const { data: vou } = await sb
      .from('vouchers')
      .select('token_hash')
      .eq('reservation_id', res.reservation_id as string)
      .single();
    const token = vou!.token_hash as string;

    for (const [label, staffId] of [
      ['cross-merchant staff', otherStaff],
      ['plain user', plainUser],
      ['unknown staff', crypto.randomUUID()],
    ] as const) {
      const r = await rpc(sb, 'redeem_voucher', {
        p_token_hash: token,
        p_staff: staffId,
        p_key: uid('t16'),
      });
      expect(r.code, label).toBe('PERMISSION_DENIED');
    }

    const { count: redCount } = await sb
      .from('redemptions')
      .select('reservation_id', { count: 'exact', head: true })
      .eq('reservation_id', res.reservation_id as string);
    expect(redCount).toBe(0);
    const { data: vouRow } = await sb
      .from('vouchers')
      .select('state')
      .eq('reservation_id', res.reservation_id as string)
      .single();
    expect(vouRow?.state).not.toBe('REDEEMED');
  });
});
