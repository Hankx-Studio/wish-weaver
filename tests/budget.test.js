import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createBudget } from "../server/budget.js";

let dir;
let file;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "budget-"));
  file = path.join(dir, "usage.jsonl");
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function entry(costUsd, ts = new Date().toISOString()) {
  return { ts, endpoint: "wish", model: "m", inputTokens: 1, outputTokens: 1, images: 0, costUsd, latencyMs: 1, source: "meta_live" };
}

describe("budget", () => {
  it("starts empty and allows spend under cap", async () => {
    const b = createBudget({ dailyCap: 5, totalCap: 100, usageFile: file });
    await b.load();
    assert.equal(b.canSpend(0.01), true);
    assert.deepEqual(b.snapshot().todayUsd, 0);
  });

  it("rebuilds counters from the log and blocks when over cap", async () => {
    const b = createBudget({ dailyCap: 5, totalCap: 100, usageFile: file });
    await b.load();
    await b.record(entry(4.999));
    assert.equal(b.canSpend(0.01), false);
    assert.equal(b.canSpend(0.001), true);
  });

  it("counts only today for the daily cap but all history for total", async () => {
    const b = createBudget({ dailyCap: 5, totalCap: 6, usageFile: file });
    await b.load();
    await b.record(entry(5, "2020-01-01T00:00:00.000Z"));
    assert.equal(b.canSpend(0.5), true);
    assert.equal(b.canSpend(1.01), false);
  });

  it("zero caps block everything (used for the budget-zero proof)", async () => {
    const b = createBudget({ dailyCap: 0, totalCap: 0, usageFile: file });
    await b.load();
    assert.equal(b.canSpend(0.01), false);
  });
});
