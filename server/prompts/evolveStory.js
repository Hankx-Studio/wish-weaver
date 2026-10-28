// Spark prompt for the 2-line evolution story (M3).
// Input is crystal stats + last-5 traits only — never raw wishes.
export const EVOLVE_STORY_SCHEMA = {
  type: "object",
  properties: {
    story: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 },
  },
  required: ["story"],
  additionalProperties: false,
};

export function storyContext({ stage, family, crystals = {}, traits = [] }) {
  const stats = Object.entries(crystals)
    .filter(([, n]) => Number(n) > 0)
    .map(([el, n]) => `${el}x${n}`)
    .join(", ") || "none yet";
  const traitLine = traits.length ? traits.join(", ") : "new light";
  return `stage ${stage}, morph family ${family}, crystals: ${stats}; recent traits: ${traitLine}`;
}

export function buildEvolveStoryPayload({ model, stage, family, crystals, traits }) {
  return {
    model,
    instructions: [
      "You are a warm forest fairy chronicler speaking to a child.",
      "Write the evolution story as JSON ONLY, matching the given schema exactly.",
      "Rules:",
      "- story: exactly 2 short lines, Traditional Chinese, gentle and hopeful.",
      "- The two lines TOGETHER are at most 80 characters.",
      "- Base it only on the given stage, morph family, crystal stats and traits.",
      "- Never ask for private info, never mention raw wishes (you are not shown any).",
    ].join("\n"),
    input: [{ role: "user", content: [{ type: "input_text", text: storyContext({ stage, family, crystals, traits }) }] }],
    text: { format: { type: "json_schema", name: "evolve_story", schema: EVOLVE_STORY_SCHEMA, strict: true } },
    reasoning: { effort: "low" },
  };
}
