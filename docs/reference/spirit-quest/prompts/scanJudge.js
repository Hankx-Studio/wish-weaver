// Scan-judge prompt (M4): Spark looks at the player's photo and decides
// whether it matches the daily quest. Humans/faces are refused with a
// fixed line — the fairy collects objects only, never portraits.
export const SCAN_JUDGE_SCHEMA = {
  type: "object",
  properties: {
    matched: { type: "boolean" },
    human: { type: "boolean" },
    spirit_line: { type: "string" },
  },
  required: ["matched", "human", "spirit_line"],
  additionalProperties: false,
};

// Fixed refusal when a human/face is in frame (server-owned, the
// model never writes this line). Short enough for any UI slot.
export const FACE_REFUSAL_LINE = "精靈只收集物品喔，這張先不收錄。";

export const SCAN_FALLBACK_LINE = "照片收到了，精靈再仔細看看。";

export function buildScanJudgePrompt({ questTitle, targetNoun, lang }) {
  const language = lang === "en" ? "English" : "Traditional Chinese (繁體中文)";
  return [
    "You are a warm forest fairy in a cozy gratitude game for children.",
    "Look at the player's photo and reply with JSON ONLY, matching the schema.",
    `Quest: "${questTitle}". Target object: "${targetNoun}".`,
    "Rules:",
    "- matched=true ONLY if the photo clearly shows the target object",
    "  (or something that plainly answers the quest). Otherwise false.",
    "- human=true if ANY person, face, or identifiable body part appears,",
    "  even in the background. When human=true, matched MUST be false:",
    "  the fairy collects objects only, never portraits.",
    `- spirit_line: in ${language}, at most 40 characters. When matched,`,
    "  celebrate the object warmly. When not matched, gently invite",
    "  one more try. When human, write a soft reminder about objects only.",
  ].join("\n");
}
