# tests/db — disposable-database concurrency tests

Covers TECH_STACK §12 shapes T01 / T03 / T04 / T05 / T16 plus idempotency
replays for `grant_ritual_reward` / `reserve_item` / `claim_voucher` /
`redeem_voucher` (supabase/migrations/0002_functions.sql).

## Safety: disposable database only

These tests write and delete rows. They MUST only run against a throwaway
database. The helper (`helpers.ts`) enforces this:

- Without `SUPABASE_TEST_URL` + `SUPABASE_TEST_SERVICE_ROLE_KEY`, the suite
  **skips** (no connection, no writes).
- With a non-localhost URL and without `SUPABASE_TEST_ALLOW_NONLOCAL=1`,
  the suite **fails loudly** instead of connecting.

NEVER point these at the production Supabase project.

## Run (local Supabase preferred)

```bash
# 1. Start a local disposable Supabase (applies supabase/migrations + seed)
supabase start

# 2. Read the local API URL + service_role key (values differ per machine;
#    never commit them)
supabase status

# 3. Run only the db suite
SUPABASE_TEST_URL=http://127.0.0.1:54321 \
SUPABASE_TEST_SERVICE_ROLE_KEY=<service_role key from step 2> \
  npx vitest run --config tests/db/vitest.config.ts
```

To run against a throwaway *remote* project instead, additionally set
`SUPABASE_TEST_ALLOW_NONLOCAL=1`. There is no flag that makes production
acceptable — do not do it.

## What is verified

| Case | Shape |
|---|---|
| T01 | Same `event_id` 10x concurrently → 1 XP row, ≤1 GRANT, duplicates replay original xp/coin |
| T03 | Two users race `free_stock=1` → 1 success + 1 `OUT_OF_STOCK`, exactly 1 HOLD, no oversell |
| T04 | Two users race one SHARED voucher → 1 holder + 1 `ALREADY_CLAIMED`; holder replay returns original |
| T05 | Same voucher redeemed 2x concurrently (different keys) → 1 ok + 1 `ALREADY_REDEEMED`, single redemption row |
| T16 | Cross-merchant staff / plain user / unknown staff → `PERMISSION_DENIED`, nothing burned |
| replay | Same `reserve_item` / `redeem_voucher` key twice → original result + `DUPLICATE_EVENT` |

Note: the ISSUED→SHARED transition has no DB function in the current spec
(TECH_STACK §4.2), so the T04 test sets `SHARED` directly via service_role.
