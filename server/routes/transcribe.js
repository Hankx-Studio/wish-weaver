// POST /api/transcribe — 501 stub until M5 (M1 scope: wish + health only).
export function postTranscribeHandler(c) {
  return c.json(
    { source: "fallback_fixture", error: "not_implemented", message: "/api/transcribe ships in a later milestone" },
    501,
  );
}
