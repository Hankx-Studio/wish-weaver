// GET /api/health — no keys, no IPs (API_CONTRACT §health).
export function createHealthHandler({ config, budget }) {
  return (c) => {
    const snap = budget.snapshot();
    return c.json({
      ok: true,
      version: "1.0",
      budget: { daily_used_usd: snap.todayUsd, daily_cap_usd: snap.dailyCap },
      models: {
        text: config.models.text,
        image: config.models.image,
        seg: config.models.seg,
        asr: config.models.asr,
      },
    });
  };
}
