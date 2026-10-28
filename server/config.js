// Central numeric/string config. All XP, thresholds, caps and prices live here;
// game logic must never hard-code them (AGENTS.md rule 5).
export function loadConfig(env = process.env) {
  const key = (env.MODEL_API_KEY || "").trim();
  if (!key) {
    throw new Error("MODEL_API_KEY is missing. Copy .env.example to .env and set it.");
  }
  return {
    apiKey: key,
    apiBase: (env.META_API_BASE || "https://api.meta.ai/v1").replace(/\/$/, ""),
    models: {
      text: env.MODEL_TEXT || "muse-spark-1.3",
      image: env.MODEL_IMAGE || "muse-image-1.0",
      seg: env.MODEL_SEG || "sam-3.1",
      asr: env.MODEL_ASR || "muse-voice-transcribe-1.0",
    },
    port: num(env.PORT, 8787),
    budget: {
      dailyCap: num(env.DAILY_BUDGET_USD, 5),
      totalCap: num(env.TOTAL_BUDGET_USD, 100),
    },
    limits: {
      wishPerHour: num(env.LIMIT_WISH_PER_HOUR, 30),
      evolvePerDay: num(env.LIMIT_EVOLVE_PER_DAY, 6),
      scanPerDay: num(env.LIMIT_SCAN_PER_DAY, 10),
      transcribePerHour: num(env.LIMIT_TRANSCRIBE_PER_HOUR, 30),
    },
    prices: {
      sparkInPerM: 1.25,
      sparkOutPerM: 4.25,
      imagePerPic: 0.01,
      samPerKImages: 2.5,
      voicePerAudioHour: 0.18,
    },
    wishEstimateUsd: 0.01,
    usageFile: env.USAGE_FILE || "data/usage.jsonl",
  };
}

function num(raw, fallback) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}
