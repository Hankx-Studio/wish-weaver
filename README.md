# M1 scaffold pack (drafted 2026-10-29, UNVERIFIED — new session must run checks)

Copy into SpiritCompanion root: `cp -r /tmp/sc-scaffold/. <repo>/` on branch `feat/m1-scaffold`,
then `npm i && npm run typecheck && npm test && npm run build`.

## What's inside
- `package.json` — Next 15 + React 19 + Supabase + openai + zod + next-intl + vitest. M2 adds pixi/howler/tailwind.
- `.env.example` — TECH_STACK §13.1 verbatim.
- `supabase/migrations/0001_init.sql` — TECH_STACK §4 schema + RLS enable.
- `supabase/migrations/0002_functions.sql` — wallet_available + grant/reserve/claim/redeem (SECURITY DEFINER, idempotent).
- `supabase/migrations/0003_policies.sql` — RLS: owner-reads, no direct money writes.
- `supabase/seed.sql` — demo campaign + bread lot (15 pts).
- `src/lib/meta/client.ts` — server-only OpenAI-compat client, env-only ids.
- `src/lib/meta/intent.ts` — IntentResult zod schema + local preset matcher (final local_rule behavior).
- `src/app/api/v1/rituals/evaluate/route.ts` — local path live; Meta path returns 503 TODO (M1.2: auth, quota, Spark call).
- `tests/unit/intent.test.ts` — 7 vitest cases.

## Spec discrepancy (flag for human/PRD owner)
PRD F-11 intent whitelist uses `share`; TECH_STACK §6.2 schema uses `shared`. Scaffold follows PRD (`share`).

## Still needed in M1 (new session)
Skills install first (see /tmp/sc-handoff.md), then: taste preflight → landing/home pages → Supabase Auth wiring →
evaluate Meta path + ai_usage reserve/settle → 0002 functions (grant/reserve/claim/redeem) → db tests → Vercel deploy.
Human-gated: Supabase project, Google OAuth client, Vercel project + env.
