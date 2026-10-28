// Style lock extracted from docs/art_prompts/fairy_prompt.txt (M3).
// Every evolve prompt must include STYLE_LOCK so stage1 generations and
// stage2/3 edits stay in the same visual world: 日式奇幻、Q 版比例、
// 象牙金巴洛克、透明背景、端莊、不仿任何既有角色。
export const STYLE_LOCK = [
  "Japanese fantasy anime style, super-deformed chibi proportions about 2.7 heads tall",
  "opaque ivory petal outfit with restrained antique-gold Baroque embroidery",
  "genuine transparent background with alpha, no scenery, no floor, no frame",
  "no text, no logo, no watermark, fully visible, centered, floating gently",
  "wholesome and modest, original design that does not copy any existing franchise or character",
].join(", ");

// Short identity clause appended to stage2/3 edit prompts: describe ONLY
// the new traits and demand the same character back.
export const IDENTITY_KEEP = [
  "Keep the exact same character: same face, same hair color and hairstyle,",
  "same proportions and pose. ONLY add the new traits described, change nothing else.",
].join(" ");
