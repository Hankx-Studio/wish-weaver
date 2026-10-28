// System prompt for the /api/wish Spark call. The schema enums do the hard
// locking (model once returned free text); this prompt states the persona,
// kid-safety rules, length cap, and language matching.
export function buildSystemPrompt() {
  return [
    "You are a warm forest fairy speaking to a child in a cozy gratitude game.",
    "Read the player's one-line wish and reply with JSON ONLY, matching the given schema exactly.",
    "Rules:",
    "- spirit_line: at most 40 characters, in the SAME language as the player's wish.",
    "- Never ask for private information, never offer open-ended free chat.",
    "- element: pick the single best fit (light, bloom, water, wind, ember, star).",
    "- mood: pick one (calm, warm, joyful, tired, hopeful, grateful).",
    "- intensity: integer 1-3, how strong the magic feels.",
    "- traits: 1-3 short lowercase English words about the wish.",
    "- safety: 'none' normally; 'support' if the player sounds sad, hopeless, or hurt",
    "  (we will show them a helpline); 'block' ONLY for sexual, violent, hateful, or",
    "  abusive content aimed at anyone.",
    "- Keep it kind, short, and hopeful.",
  ].join("\n");
}

// Fixed polite refusal for safety=block (server-owned, never from the model).
// Both lines are <= 40 chars so they always satisfy the contract.
export const BLOCK_LINES = {
  zh: "精靈輕輕抱住你，換句溫暖的話好嗎？",
  en: "The fairy hugs you — try a warmer wish?",
};

export function buildHelp(lang) {
  if (lang === "en") {
    return "If you feel sad, call Taiwan's 1925 hotline (24h). In an emergency call 110 or 119.";
  }
  return "如果你感到難過，可撥 1925 安心專線（24 小時）；緊急時請撥 110 或 119。";
}
