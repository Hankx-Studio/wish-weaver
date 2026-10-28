export class MetaError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// M0-frozen cost formula (Standard tier): in x $1.25 + out x $4.25 per 1M,
// output tokens include reasoning tokens.
export function sparkCostUsd(inputTokens, outputTokens, prices = { sparkInPerM: 1.25, sparkOutPerM: 4.25 }) {
  return (inputTokens * prices.sparkInPerM + outputTokens * prices.sparkOutPerM) / 1e6;
}

// Pull the assistant's text out of a Responses API body (output[0] is
// usually the reasoning item, the message comes after).
export function extractOutputText(data) {
  const items = data?.output || [];
  for (const item of items) {
    for (const part of item?.content || []) {
      if ((part?.type === "output_text" || part?.type === "text") && typeof part.text === "string") {
        return part.text;
      }
    }
  }
  throw new MetaError("bad_response", "no output_text in model response");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// POST {apiBase}/v1/responses with a 20s timeout and ONE backoff retry on
// 5xx/429. Returns {data, usage, costUsd, latencyMs}; throws MetaError.
export async function callSpark({
  apiBase,
  apiKey,
  payload,
  fetchImpl = fetch,
  timeoutMs = 20000,
  retryDelayMs = 500,
  prices,
}) {
  // META_API_BASE may carry a trailing /v1 (see .env.example); endpoints
// below already start with /v1, so normalize to the host root (M0 pitfall).
  const url = `${apiBase.replace(/\/?$/, "").replace(/\/v1$/, "")}/v1/responses`;
  const t0 = Date.now();
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) await sleep(retryDelayMs);
    let res;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      lastErr = err?.name === "TimeoutError"
        ? new MetaError("timeout", "model request timed out")
        : new MetaError("network", `model request failed: ${err?.message || err}`);
      break;
    }
    if (res.status === 429 || res.status >= 500) {
      lastErr = new MetaError(res.status === 429 ? "rate_limited" : "http_5xx", `model HTTP ${res.status}`, res.status);
      continue;
    }
    if (!res.ok) throw new MetaError("bad_request", `model HTTP ${res.status}`, res.status);
    const data = await res.json().catch(() => null);
    if (!data) throw new MetaError("bad_response", "model returned non-JSON");
    const usage = {
      inputTokens: data?.usage?.input_tokens ?? 0,
      outputTokens: data?.usage?.output_tokens ?? 0,
    };
    return { data, usage, costUsd: sparkCostUsd(usage.inputTokens, usage.outputTokens, prices), latencyMs: Date.now() - t0 };
  }
  throw lastErr;
}
