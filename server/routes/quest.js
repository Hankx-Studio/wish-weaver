// POST /api/quest — 501 stub until its milestone (M1 scope: wish + health only).
export function postQuestHandler(c) {
  return c.json(
    { source: "fallback_fixture", error: "not_implemented", message: "/api/quest ships in a later milestone" },
    501,
  );
}
