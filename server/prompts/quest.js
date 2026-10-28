// Daily-quest prompt + server-owned fallback quests (M4).
// The model proposes ONE safe, indoor/outdoor, object-only quest from the
// player's dominant element; the server validates it and owns the quest_id.
// Fallback templates below guarantee a quest with zero model spend.
export const QUEST_MODEL_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    hint: { type: "string" },
    target_noun_en: { type: "string" },
    element: {
      type: "string",
      enum: ["light", "bloom", "water", "wind", "ember", "star"],
    },
    kind: { type: "string", enum: ["normal", "kindness"] },
  },
  required: ["title", "hint", "target_noun_en", "element", "kind"],
  additionalProperties: false,
};

export function buildQuestPrompt({ element, lang, kindness }) {
  const language = lang === "en" ? "English" : "Traditional Chinese (繁體中文)";
  const brief = kindness
    ? "a KINDNESS quest: photograph something the player prepared for someone else"
    : "a cozy everyday quest: photograph one warm object nearby";
  return [
    "You are a warm forest fairy in a cozy gratitude game for children.",
    `Propose ${brief}. Reply with JSON ONLY, matching the given schema exactly.`,
    "Rules:",
    `- title and hint: in ${language}, title at most 20 characters.`,
    "- The quest must be safe, doable indoors or outdoors, and involve",
    "  ONLY an object. NEVER ask to photograph a person, a face, or anyone",
    "  else's private things.",
    `- element: use exactly "${element}".`,
    `- kind: use exactly "${kindness ? "kindness" : "normal"}".`,
    "- target_noun_en: 1-3 lowercase English words naming the object",
    "  (for the segmenter, e.g. \"cup\", \"apple\", \"rose\").",
    "- hint: one gentle sentence telling the player where to look.",
  ].join("\n");
}

// Server-owned fallback quests: [element][kind][lang]. Every target noun
// is segmenter-friendly English; every quest photographs objects only.
const FALLBACKS = {
  light: {
    normal: {
      zh: { title: "找一個發光的小東西", hint: "看看桌上：小燈、蠟燭或會反光的東西。", target_noun_en: "lamp" },
      en: { title: "Find a small glowing thing", hint: "Look around your desk for a lamp or candle.", target_noun_en: "lamp" },
    },
    kindness: {
      zh: { title: "拍下你為別人留的一盞燈", hint: "為晚歸的人留燈，拍下那盞燈。", target_noun_en: "lamp" },
      en: { title: "A light you left on for someone", hint: "Photograph the lamp you kept on for them.", target_noun_en: "lamp" },
    },
  },
  bloom: {
    normal: {
      zh: { title: "找一朵花或一片葉子", hint: "陽台、路邊或桌上的植物都可以。", target_noun_en: "flower" },
      en: { title: "Find a flower or a leaf", hint: "Any plant on the balcony, roadside, or desk.", target_noun_en: "flower" },
    },
    kindness: {
      zh: { title: "拍下你想送人的一朵花", hint: "想起一個人，為他留一朵花。", target_noun_en: "flower" },
      en: { title: "A flower you would give away", hint: "Think of someone, keep a flower for them.", target_noun_en: "flower" },
    },
  },
  water: {
    normal: {
      zh: { title: "找一個裝水的杯子", hint: "水杯、茶杯或水壺都可以。", target_noun_en: "cup" },
      en: { title: "Find a cup holding water", hint: "A glass, mug, or bottle will do.", target_noun_en: "cup" },
    },
    kindness: {
      zh: { title: "拍下你為別人倒的一杯水", hint: "倒一杯水給家人，拍下那個杯子。", target_noun_en: "cup" },
      en: { title: "A cup of water you poured", hint: "Pour water for family, photograph the cup.", target_noun_en: "cup" },
    },
  },
  wind: {
    normal: {
      zh: { title: "找一樣會隨風動的東西", hint: "窗簾、風鈴或晾著的衣服都可以。", target_noun_en: "curtain" },
      en: { title: "Something that moves in wind", hint: "A curtain, wind chime, or hanging cloth.", target_noun_en: "curtain" },
    },
    kindness: {
      zh: { title: "拍下你替別人準備的擋風物", hint: "一件外套或一條圍巾，替某人擋風。", target_noun_en: "scarf" },
      en: { title: "Something warm against the wind", hint: "A coat or scarf you set out for someone.", target_noun_en: "scarf" },
    },
  },
  ember: {
    normal: {
      zh: { title: "找一樣暖暖的食物", hint: "麵包、水果或一碗熱湯都可以。", target_noun_en: "bread" },
      en: { title: "Find something warm to eat", hint: "Bread, fruit, or a warm bowl.", target_noun_en: "bread" },
    },
    kindness: {
      zh: { title: "拍下你替別人準備的東西", hint: "一份早餐、一顆水果，心意最重要。", target_noun_en: "apple" },
      en: { title: "Something you prepared for someone", hint: "Breakfast or a fruit — the thought counts.", target_noun_en: "apple" },
    },
  },
  star: {
    normal: {
      zh: { title: "找一本睡前會翻的書", hint: "書桌或床頭的書，拍下它的封面。", target_noun_en: "book" },
      en: { title: "A book you read before sleep", hint: "Any book by your bed or desk.", target_noun_en: "book" },
    },
    kindness: {
      zh: { title: "拍下你想和人分享的一頁", hint: "把喜歡的一頁拍下來，記得只拍書。", target_noun_en: "book" },
      en: { title: "A page you would share", hint: "Photograph a beloved page — book only.", target_noun_en: "book" },
    },
  },
};

export function pickFallbackQuest({ element, lang, kindness }) {
  const el = FALLBACKS[element] ? element : "ember";
  const kind = kindness ? "kindness" : "normal";
  const l = lang === "en" ? "en" : "zh";
  return { element: el, kind, ...FALLBACKS[el][kind][l] };
}

export function questIdFor(day, element, kind) {
  return `q-${day}-${element}-${kind}`;
}
