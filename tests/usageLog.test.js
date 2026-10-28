import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { appendUsage, readUsage } from "../server/usageLog.js";

let dir;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "usage-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const entry = {
  ts: "2026-10-28T00:00:00.000Z",
  endpoint: "wish",
  model: "muse-spark-1.3",
  inputTokens: 33,
  outputTokens: 100,
  images: 0,
  costUsd: 0.0005,
  latencyMs: 1200,
  source: "meta_live",
};

describe("usageLog", () => {
  it("appends one JSON line per entry, creating dirs", async () => {
    const file = path.join(dir, "sub", "usage.jsonl");
    await appendUsage(file, entry);
    await appendUsage(file, entry);
    const lines = (await readFile(file, "utf8")).trim().split("\n");
    assert.equal(lines.length, 2);
    assert.deepEqual(JSON.parse(lines[0]), entry);
  });

  it("readUsage parses lines and skips corrupt ones", async () => {
    const file = path.join(dir, "usage.jsonl");
    await appendUsage(file, entry);
    await appendUsage(file, { ...entry, costUsd: 0.001 });
    const raw = await readFile(file, "utf8");
    await import("node:fs/promises").then((fs) => fs.writeFile(file, raw + "not json\n"));
    const rows = await readUsage(file);
    assert.equal(rows.length, 2);
    assert.equal(rows[1].costUsd, 0.001);
  });

  it("readUsage returns [] for a missing file", async () => {
    assert.deepEqual(await readUsage(path.join(dir, "nope.jsonl")), []);
  });
});
