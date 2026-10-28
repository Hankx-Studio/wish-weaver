import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../server/config.js";

const baseEnv = {
  MODEL_API_KEY: "test-key",
  META_API_BASE: "https://api.meta.ai/v1",
  MODEL_TEXT: "muse-spark-1.3",
  PORT: "8787",
};

describe("loadConfig", () => {
  it("loads defaults from a minimal env", () => {
    const c = loadConfig({ ...baseEnv });
    assert.equal(c.models.text, "muse-spark-1.3");
    assert.equal(c.budget.dailyCap, 5);
    assert.equal(c.budget.totalCap, 100);
    assert.equal(c.limits.wishPerHour, 30);
    assert.equal(c.prices.sparkInPerM, 1.25);
    assert.equal(c.wishEstimateUsd, 0.01);
  });

  it("throws when MODEL_API_KEY is missing or blank", () => {
    assert.throws(() => loadConfig({}), /MODEL_API_KEY/);
    assert.throws(() => loadConfig({ MODEL_API_KEY: "  " }), /MODEL_API_KEY/);
  });

  it("respects explicit zero budget caps", () => {
    const c = loadConfig({ ...baseEnv, DAILY_BUDGET_USD: "0", TOTAL_BUDGET_USD: "0" });
    assert.equal(c.budget.dailyCap, 0);
    assert.equal(c.budget.totalCap, 0);
  });

  it("falls back to defaults on blank or NaN numerics", () => {
    const c = loadConfig({ ...baseEnv, PORT: "", LIMIT_WISH_PER_HOUR: "abc" });
    assert.equal(c.port, 8787);
    assert.equal(c.limits.wishPerHour, 30);
  });
});
