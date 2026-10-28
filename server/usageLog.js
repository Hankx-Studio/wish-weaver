import { mkdir, appendFile, readFile } from "node:fs/promises";
import path from "node:path";

const FIELDS = ["ts", "endpoint", "model", "inputTokens", "outputTokens", "images", "costUsd", "latencyMs", "source"];

// Only whitelisted cost/telemetry fields are persisted; player text and
// images must never reach this module's input (AGENTS.md rule 2).
export async function appendUsage(file, entry) {
  const row = {};
  for (const k of FIELDS) row[k] = entry[k] ?? (k === "source" ? "unknown" : 0);
  if (!row.ts) row.ts = new Date().toISOString();
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, JSON.stringify(row) + "\n", "utf8");
  return row;
}

export async function readUsage(file) {
  let raw;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    return [];
  }
  const rows = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      continue;
    }
  }
  return rows;
}
