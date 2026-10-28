// POST /api/evolve — 501 stub until M3 (M1 scope: wish + health only).
export function postEvolveHandler(c) {
  return c.json(
    { source: "fallback_fixture", error: "not_implemented", message: "/api/evolve ships in a later milestone" },
    501,
  );
}
