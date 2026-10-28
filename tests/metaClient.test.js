import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { callSpark, extractOutputText, sparkCostUsd, MetaError } from "../server/metaClient.js";

const PRICES = { sparkInPerM: 1.25, sparkOutPerM: 4.25 };

function okBody(over = {}) {
  return {
    usage: { input_tokens: 33, output_tokens: 100, total_tokens: 133 },
    output: [
      { type: "reasoning", status: "completed" },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: '{"a":1}' }],
      },
    ],
    ...over,
  };
}

function mockFetch(handler) {
  let calls = 0;
  const fn = async (...args) => {
    calls += 1;
    return handler(calls, ...args);
  };
  fn.calls = () => calls;
  return fn;
}

const jsonRes = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const base = {
  apiBase: "https://api.meta.ai/v1",
  apiKey: "k",
  model: "muse-spark-1.3",
  payload: { model: "m", input: [] },
  retryDelayMs: 1,
};

describe("sparkCostUsd", () => {
  it("applies the M0 formula (in x1.25 + out x4.25 per 1M)", () => {
    assert.equal(sparkCostUsd(33, 685, PRICES), (33 * 1.25 + 685 * 4.25) / 1e6);
  });
});

describe("extractOutputText", () => {
  it("finds the assistant output_text among reasoning items", () => {
    assert.equal(extractOutputText(okBody()), '{"a":1}');
  });

  it("throws bad_response when no text is present", () => {
    try {
      extractOutputText({ output: [] });
      assert.fail("should have thrown");
    } catch (err) {
      assert.equal(err.code, "bad_response");
    }
  });
});

describe("callSpark", () => {
  it("returns data, usage, cost and latency on 200", async () => {
    const fetchImpl = mockFetch(async () => jsonRes(200, okBody()));
    const r = await callSpark({ ...base, fetchImpl });
    assert.deepEqual(r.usage, { inputTokens: 33, outputTokens: 100 });
    assert.equal(r.costUsd, sparkCostUsd(33, 100, undefined));
    assert.ok(r.latencyMs >= 0);
    assert.equal(fetchImpl.calls(), 1);
  });

  it("retries once on 5xx then succeeds", async () => {
    const fetchImpl = mockFetch(async (n) => (n === 1 ? jsonRes(500, {}) : jsonRes(200, okBody())));
    const r = await callSpark({ ...base, fetchImpl });
    assert.equal(r.usage.inputTokens, 33);
    assert.equal(fetchImpl.calls(), 2);
  });

  it("retries once on 429 then succeeds", async () => {
    const fetchImpl = mockFetch(async (n) => (n === 1 ? jsonRes(429, {}) : jsonRes(200, okBody())));
    await callSpark({ ...base, fetchImpl });
    assert.equal(fetchImpl.calls(), 2);
  });

  it("throws after the retry is exhausted", async () => {
    const fetchImpl = mockFetch(async () => jsonRes(503, {}));
    await assert.rejects(() => callSpark({ ...base, fetchImpl }), MetaError);
    assert.equal(fetchImpl.calls(), 2);
  });

  it("strips a trailing /v1 from the base (M0 double-prefix pitfall)", async () => {
    let seenUrl = "";
    const fetchImpl = async (url) => {
      seenUrl = url;
      return jsonRes(200, okBody());
    };
    await callSpark({ ...base, apiBase: "https://api.meta.ai/v1", fetchImpl });
    assert.equal(seenUrl, "https://api.meta.ai/v1/responses");
  });

  it("does not retry on 400", async () => {
    const fetchImpl = mockFetch(async () => jsonRes(400, { error: "bad" }));
    await assert.rejects(() => callSpark({ ...base, fetchImpl }), /400/);
    assert.equal(fetchImpl.calls(), 1);
  });
});
