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

describe("stubs and static", () => {
  it("later-milestone endpoints return 501 with a source tag", async () => {
    for (const name of ["evolve", "quest", "scan", "transcribe"]) {
      const res = await app.request(`/api/${name}`, { method: "POST" });
      assert.equal(res.status, 501);
      const body = await res.json();
      assert.equal(body.source, "fallback_fixture");
      assert.equal(body.error, "not_implemented");
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
