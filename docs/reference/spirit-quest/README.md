# spirit-quest reference archive (read-only)

Source: `../spirit-quest` (sibling folder, old Hono/Vite project, M0–M6 + V2 world).
Copied 2026-10-29 during repo consolidation. New development happens in
`src/`, `supabase/`, `docs/PRD.md`, `docs/TECH_STACK.md` — NOT here.

Rules:
- Read-only reference. Do not `import` these files into `src/`; port patterns to TypeScript as needed.
- Contest rule: all shipped game assets must be (re)generated with Meta Muse during the contest.
  Old prompts/images are patterns only, never shipped verbatim.
- Secrets: none stored here (verified at migration; `.env`/tokens were never committed upstream).

Contents:
- `MODEL_INVENTORY.md` + `evidence/probe_results.json` — Meta API day-1 verification answers:
  base URL `https://api.meta.ai/v1`, Responses API, model ids
  (muse-spark-1.3 / muse-image-1.0 / sam-3.1 / muse-voice-transcribe-1.0),
  pricing, quirks (`reasoning.effort` required, enum clamp server-side, WAV-only ASR).
- `evidence/usage_summary.md`, `evidence/m1_smoke.json` — real spend/latency baselines (~$0.17 total).
- `prompts/` — wish/evolve/quest/scan/styleLock prompt patterns.
- `server/` — metaClient (no `/v1` double-append), budget guard, rate limit,
  usage log, samMask decoder (bit-verified vs @meta-sam/parser).
- `scripts/probe.mjs` — standalone re-probe tool (`META_API_BASE`, `MODEL_API_KEY` from env).
- `art/` — art prompts + design tokens (style reference for M2, regenerate before ship).
- `HANDOFF.md` — old project's session log (provenance only).
