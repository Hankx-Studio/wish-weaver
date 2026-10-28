# Fairy Companion: Wish Weaver · 精靈之間：心意召喚

> Meta Global AI Developer Hackathon 2026 submission — Impact 30% · Meta AI Tooling 25% · Technical Depth 20% · Demo 25%.

**One line:** 30 seconds a day — speak one heartfelt sentence, raise a one-of-a-kind spirit, and turn gratitude into real-world kindness.

**中文摘要：** 每天 30 秒，用一句真心話養大一隻獨一無二的精靈。Muse Spark 解讀心意並化為魔法光效，Muse Image 讓「同一隻」精靈隨你成長演化，SAM 3.1 把真實小物切成遊戲寶物，Voice 轉錄說出的心意。全程以 Muse Code 開發。伺服器不存玩家原文與照片，兒童可用，每次回應都標示 `meta_live` / `fallback_fixture` 來源。

## 1. The problem & who benefits (Impact)

Gratitude habits improve wellbeing, but journaling apps demand writing time and reward confession depth — children and busy caregivers drop out. Wish Weaver asks for **one sentence, 30 seconds**: a child thanks a parent for lunch, picks a ritual, and watches a light-orb become their spirit. A daily real-world kindness quest (photograph something, turn it into a treasure) carries the habit offline.

Who benefits: **children** (short input, no free chat, no private-data questions), **parents/caregivers** (a shared bedtime ritual), and **anyone** building a low-friction gratitude routine. Safety is designed in: crisis signals get a gentle reply plus Taiwan helplines (1925 / 110 / 119) with no celebratory effects; disallowed content is declined with no XP. No account, no login, no data harvesting.

## 2. How to play

1. **Home** — your spirit lives in the flower court (new players start as a light orb at 0 XP).
2. **Pick a ritual** — meal blessing, daily gratitude, bedtime, or a free wish. Type one sentence (≤120 chars) or speak it (voice button transcribes).
3. **Watch the magic** — the spirit answers in one line (≤40 chars, your language) with an element light effect; you earn +10 XP and one element crystal.
4. **Evolve** — at 30 / 90 / 180 XP your spirit grows (stage 1–3), keeping its identity.
5. **Daily quest** — the spirit gives a real-world task; photograph it, SAM cuts out the object, it becomes a treasure in your cabinet (+20 XP).

Gameplay screenshots: **TBD-human** (to be captured during human acceptance recording per [DEMO_SCRIPT](docs/DEMO_SCRIPT.md)). Existing in-repo visuals referenced by the demo:

- `public/assets/fairy.webp` — spirit art style reference
- `public/assets/sanctuary.webp` — sanctuary scene art
- `docs/evidence/m3/grid/bloom-s1.webp` → `bloom-s3.webp` — identity-continuous evolution trio
- `docs/evidence/m4/cutout_food.png` — SAM cutout treasure example

## 3. How we use Meta AI

**Spark structured reading** (`muse-spark-1.3`, `reasoning.effort=low`). Every wish goes through `POST /v1/responses` with a strict `text.format` schema (element / mood / intensity / traits / spirit_line / safety), zod-validated server-side with one retry, then fallback. Beyond basic wiring: the model never decides XP (server issues +10, max 10/day), free-text fields are clamped to enums server-side (the model once returned intensity 8), and unknown safety strings fail closed to `support`. Measured: $0.0026–$0.0035 per round, 6/6 `meta_live` ([rounds](docs/evidence/m2/rounds.json)).

**Image identity-continuous evolution** (`muse-image-1.0`). Stage 1 generates from a locked style paragraph (`docs/art_prompts/fairy_prompt.txt`) with element-weighted family sampling (seed = playerId+stage); stages 2–3 edit the previous image so the *same* spirit grows new traits. Beyond basic wiring: a 9-image tuning grid picked the style, and failure keeps the old image + XP for retry. Evidence: [tuning grid](docs/evidence/m3/) ($0.09 for 9 images).

**SAM 3.1 cutouts** (`sam-3.1`). Daily-quest photos are segmented (`images_processed` billing, $2.50/1000); the best mask/box becomes a downsampled `mask_tiny` cutout treasure. Beyond basic wiring: a custom wire-format parser verified bit-identical against the reference parser on 21 vectors + 3 live images, RLE masks never reach the client (hash only), and face photos are refused with no XP. Evidence: [m4 evidence](docs/evidence/m4/) (4 scans, costs $0.0063–$0.0071 each).

**Voice transcribe** (`muse-voice-transcribe-1.0`, $0.18/audio-hour). The client records, converts to 24 kHz mono WAV locally, and posts it; the server validates the WAV header (mono, 16-bit, ≤30 s, ≤2 MB) and transcribes. Beyond basic wiring: non-WAV/oversize → 400, model/budget failure → 200 with a fixed reason (player endpoints never 5xx), empty transcripts get their own message. Live probe: 2 s tone → `meta_live`, $0.0001, 1717 ms ([probe](docs/evidence/m5/voice_probe.json)).

**Built with Muse Code.** The whole server, game loop, evolution, scan pipeline, voice flow, and tests were implemented with Muse Code (Meta), with Claude Code used for spec writing and code review as technical assistance. See [PROVENANCE](docs/PROVENANCE.md) for the pre-competition vs in-competition split.

## 4. Architecture

```mermaid
flowchart LR
  B[Browser<br/>public/ native ES modules<br/>localStorage + IndexedDB] -->|fetch /api/*| N[Node 20 single process<br/>Hono server/]
  N --> H[/api/health /wish /evolve<br/>/quest /scan /transcribe]
  N --> G[budget guard + per-IP rate limit<br/>metaClient 20s timeout + 1 retry<br/>zod validation + usage.jsonl]
  G -->|Bearer MODEL_API_KEY<br/>server-side only| M[Meta Model API<br/>api.meta.ai/v1]
```

Single process keeps budget/rate-limit counters consistent. Every model call is logged to `data/usage.jsonl` (time, endpoint, model, tokens, cost — never player text or images). Every response carries `source: meta_live | fallback_fixture`, shown in the UI as a corner badge.

## 5. Safety & privacy

- No player text or photo is stored on the server (images live only in the player's IndexedDB; masks stay as hashes).
- Kid-safe: spirit lines ≤40 chars, no private-data questions, no open free chat.
- Fallback responses are always labeled in the UI; the `source` field never lies (contract-tested).
- Crisis (`support`) → helplines 1925/110/119, no celebration effects. Disallowed (`block`) → declined, no XP.

## 6. Cost per player

All figures from [usage_summary](docs/evidence/usage_summary.md) (real measured spend, total ≈ **$0.1734**, far under the $3 cap):

- One wish round: **$0.0026–$0.0035** (avg $0.0030, target ≤$0.01 ✓)
- Full experience (10 wishes + 3 evolutions + 2 scans): **≤$0.10** ✓
- Voice: $0.0001 per short utterance. Evolution image: $0.01 each. Scan: ≈$0.0063–$0.0071.
- Judging-period budget (Render/Fly): daily $2 / total $20 — covers thousands of demo rounds.

## 7. Run locally

```bash
cp .env.example .env   # fill in MODEL_API_KEY (server-side only)
npm install
npm run dev            # http://localhost:8787
npm test               # 107/107 green (M5)
```

Deploy: `render.yaml` + `fly.toml` included (platform TBD-human).

## 8. Links & team

- Live demo: **TBD-human** (URL after deploy; health check `/api/health` must return 200).
- Demo video (≤3:00): **TBD-human** (record per [DEMO_SCRIPT](docs/DEMO_SCRIPT.md)).
- Submission field drafts: [SUBMISSION](docs/SUBMISSION.md). Final checklist: [checklist](docs/evidence/m6/checklist.md).
- Provenance (originality & rights): [PROVENANCE](docs/PROVENANCE.md).
- Team: **TBD-human** (names + roles).
