import { appendUsage, readUsage } from "./usageLog.js";

function dayOf(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Daily + total spend counters, rebuilt from data/usage.jsonl at boot so a
// restart never forgets past spend. Single process only (GAME_SPEC §7).
export function createBudget({ dailyCap, totalCap, usageFile }) {
  const state = { today: dayOf(new Date().toISOString()), todayUsd: 0, totalUsd: 0 };

  function rollover(now = new Date()) {
    const day = dayOf(now.toISOString());
    if (day !== state.today) {
      state.today = day;
      state.todayUsd = 0;
    }
  }

  async function load() {
    const rows = await readUsage(usageFile);
    rollover();
    state.totalUsd = 0;
    state.todayUsd = 0;
    for (const r of rows) {
      const c = Number(r.costUsd) || 0;
      state.totalUsd += c;
      if (r.ts && dayOf(r.ts) === state.today) state.todayUsd += c;
    }
    return snapshot();
  }

  function canSpend(estimateUsd) {
    rollover();
    return state.todayUsd + estimateUsd <= dailyCap && state.totalUsd + estimateUsd <= totalCap;
  }

  async function record(entry) {
    const row = await appendUsage(usageFile, entry);
    rollover();
    const c = Number(row.costUsd) || 0;
    state.totalUsd += c;
    if (row.ts && dayOf(row.ts) === state.today) state.todayUsd += c;
    return row;
  }

  function snapshot() {
    rollover();
    return { todayUsd: round6(state.todayUsd), totalUsd: round6(state.totalUsd), dailyCap, totalCap };
  }

  return { load, canSpend, record, snapshot };
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}
