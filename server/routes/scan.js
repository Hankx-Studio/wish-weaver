// POST /api/scan — 501 stub until M4 (M1 scope: wish + health only).
export function postScanHandler(c) {
  return c.json(
    { source: "fallback_fixture", error: "not_implemented", message: "/api/scan ships in a later milestone" },
    501,
  );
}
