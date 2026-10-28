import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadConfig } from "../server/config.js";
import { createBudget } from "../server/budget.js";
import { createApp } from "../server/index.js";

let dir;
let app;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "app-"));
  const config = loadConfig({ MODEL_API_KEY: "test-key", USAGE_FILE: path.join(dir, "usage.jsonl") });
  const budget = createBudget({ dailyCap: 5, totalCap: 100, usageFile: path.join(dir, "usage.jsonl") });
  await budget.load();
  app = createApp({ config, budget });
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("wired routes and static", () => {
  it("transcribe validates input (empty multipart is a 400)", async () => {
    const res = await app.request("/api/transcribe", { method: "POST" });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "invalid_request");
  });

  it("evolve and scan validate input before touching models", async () => {
    const json = { "content-type": "application/json" };
    const evolve = await app.request("/api/evolve", { method: "POST", headers: json, body: JSON.stringify({}) });
    assert.equal(evolve.status, 400);
    const scan = await app.request("/api/scan", { method: "POST", headers: json, body: JSON.stringify({}) });
    assert.equal(scan.status, 400);
  });

  it("quest falls back to a template quest when the model is unreachable", async () => {
    const deadDir = await mkdtemp(path.join(tmpdir(), "app-dead-"));
    try {
      const config = loadConfig({ MODEL_API_KEY: "test-key", USAGE_FILE: path.join(deadDir, "usage.jsonl") });
      const deadBudget = createBudget({ dailyCap: 5, totalCap: 100, usageFile: path.join(deadDir, "usage.jsonl") });
      await deadBudget.load();
      const deadApp = createApp({
        config, budget: deadBudget, fetchImpl: () => { throw new Error("no network in test"); },
      });
      const res = await deadApp.request("/api/quest", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ element: "ember" }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.source, "fallback_fixture");
      assert.ok(body.quest?.id && body.quest?.text && body.quest?.hint);
    } finally {
      await rm(deadDir, { recursive: true, force: true });
    }
  });

  it("serves the static frontend", async () => {
    const root = await app.request("/");
    assert.equal(root.status, 200);
    assert.match(root.headers.get("content-type") || "", /html/);
    const css = await app.request("/style.css");
    assert.equal(css.status, 200);
  });
});
