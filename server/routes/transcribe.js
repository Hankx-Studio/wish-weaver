// POST /api/transcribe — voice wish to text (M5).
// Client sends mono 16-bit WAV (any of 16/24kHz; the frontend converts
// MediaRecorder output via AudioContext — no ffmpeg on the server).
// Audio stays in memory only: never stored, never logged.
// Source is honest: meta_live only for a validated model reply.
import { z } from "zod";

const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPE = "audio/wav";
const MAX_SECONDS = 30;
const RATES = new Set([16000, 24000]);

// 30s at 24kHz mono 16-bit ≈ $0.0015 (voice $0.18/audio-hour, ceil seconds).
const TRANSCRIBE_ESTIMATE_USD = 0.002;

const AsrReplySchema = z.object({
  sessionId: z.string().optional(),
  transcript: z.string(),
  audioDurationMs: z.number(),
  turns: z.array(z.unknown()).optional(),
});

function clientIp(c) {
  const fwd = c.req.header("x-forwarded-for");
  return (fwd && fwd.split(",")[0].trim()) || "unknown";
}

function fallback(reason) {
  return {
    source: "fallback_fixture",
    transcript: "",
    audioDurationMs: 0,
    usage: { seconds: 0, cost_usd: 0 },
    reason,
  };
}

// Minimal RIFF/WAVE fmt parse: returns {rate, seconds} or null.
function parseWav(bytes) {
  if (bytes.length < 44) return null;
  const tag = (o, n) => String.fromCharCode(...bytes.subarray(o, o + n));
  if (tag(0, 4) !== "RIFF" || tag(8, 4) !== "WAVE") return null;
  if (tag(12, 4) !== "fmt " || bytes[20] !== 1 || bytes[22] !== 1) return null;
  const rate = bytes[24] | (bytes[25] << 8) | (bytes[26] << 16) | (bytes[27] << 24);
  const bits = bytes[34] | (bytes[35] << 8);
  if (!RATES.has(rate) || bits !== 16) return null;
  return { rate, seconds: (bytes.length - 44) / (rate * 2) };
}

async function readAudioInput(c) {
  let form;
  try {
    form = await c.req.formData();
  } catch {
    return { error: "body must be multipart with an audio field" };
  }
  const audio = form.get("audio");
  const bytes = audio && typeof audio.arrayBuffer === "function"
    ? new Uint8Array(await audio.arrayBuffer()) : null;
  if (!bytes || bytes.length === 0) return { error: "audio is required" };
  if (audio.type !== ALLOWED_TYPE || bytes.length > MAX_AUDIO_BYTES) {
    return { error: "audio must be WAV within 2MB" };
  }
  const wav = parseWav(bytes);
  if (!wav) return { error: "audio must be mono 16-bit WAV at 16/24kHz" };
  if (!(wav.seconds > 0) || wav.seconds > MAX_SECONDS) {
    return { error: "audio must be within 30 seconds" };
  }
  return { bytes, seconds: wav.seconds };
}

function asrCost(seconds, prices) {
  const s = Math.max(1, Math.ceil(seconds));
  return { seconds: s, cost_usd: (s / 3600) * (prices?.voicePerAudioHour ?? 0.18) };
}

async function callAsrOnce({ apiBase, apiKey, bytes, timeoutMs, fetchImpl }) {
  const host = apiBase.replace(/\/?$/, "").replace(/\/v1$/, "");
  const form = new FormData();
  form.set("request", new File(
    [JSON.stringify({ model: "muse-voice-transcribe-1.0", audioEncoding: "WAV", mode: "PUSH_TO_TALK" })],
    "request.json", { type: "application/json" },
  ));
  form.set("audio", new File([bytes], "wish.wav", { type: "audio/wav" }));
  const res = await fetchImpl(`${host}/v1/asr/transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 429 || res.status >= 500) {
    const err = new Error(`asr HTTP ${res.status}`);
    err.retryable = true;
    throw err;
  }
  if (!res.ok) throw new Error(`asr HTTP ${res.status}`);
  return res.json();
}

// One backoff retry on 5xx/429 (contract mirrors metaClient).
async function callAsr(args) {
  try {
    return await callAsrOnce(args);
  } catch (err) {
    if (!err.retryable) throw err;
    await new Promise((r) => setTimeout(r, 500));
    return callAsrOnce(args);
  }
}

async function logUse(budget, entry) {
  try {
    await budget.record(entry);
  } catch {
    // Usage logging must never break the player's response.
  }
}

export function createTranscribeHandler({ config, budget, limiter = null, fetchImpl = fetch } = {}) {
  return async (c) => {
    const input = await readAudioInput(c);
    if (input.error) return c.json({ error: "invalid_request", message: input.error }, 400);
    const finish = (body, headers) => {
      const res = c.json(body, 200);
      if (headers) for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
      return res;
    };
    if (limiter) {
      const rl = limiter.check(`transcribe:${clientIp(c)}`);
      if (!rl.allowed) {
        return finish({ ...fallback("rate_limited") }, { "Retry-After": String(rl.retryAfterSec) });
      }
    }
    if (!budget.canSpend(TRANSCRIBE_ESTIMATE_USD)) {
      return finish({ ...fallback("budget_exhausted") });
    }
    let data;
    try {
      data = await callAsr({ apiBase: config.apiBase, apiKey: config.apiKey, bytes: input.bytes, timeoutMs: 20000, fetchImpl });
    } catch {
      return finish({ ...fallback("model_unavailable") });
    }
    const parsed = AsrReplySchema.safeParse(data);
    if (!parsed.success) return finish({ ...fallback("model_unavailable") });
    const usage = asrCost((parsed.data.audioDurationMs || 0) / 1000, config.prices);
    await logUse(budget, {
      ts: new Date().toISOString(), endpoint: "transcribe", model: config.models.asr,
      inputTokens: 0, outputTokens: 0, images: 0,
      costUsd: usage.cost_usd, latencyMs: 0, source: "meta_live",
    });
    const transcript = parsed.data.transcript.slice(0, 120);
    if (!transcript.trim()) return finish({ source: "meta_live", transcript: "", audioDurationMs: parsed.data.audioDurationMs, usage, reason: "empty_transcript" });
    return finish({ source: "meta_live", transcript, audioDurationMs: parsed.data.audioDurationMs, usage });
  };
}

// Legacy 501 stub (kept for reference; index.js mounts the real handler).
export function postTranscribeHandler(c) {
  return c.json(
    { source: "fallback_fixture", error: "not_implemented", message: "/api/transcribe ships in a later milestone" },
    501,
  );
}
