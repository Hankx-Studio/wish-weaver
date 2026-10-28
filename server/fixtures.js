import { ELEMENTS, EFFECT_BY_ELEMENT } from "./schemas.js";

// Fallback lines a judge might see: warm, specific, never cheesy.
// Every spirit_line is <= 40 chars (Array.from count).
const LINES = {
  light: [
    { lang: "zh", mood: "warm", traits: ["family", "food"], spirit_line: "這句心意亮亮的，精靈替你收好了。" },
    { lang: "zh", mood: "grateful", traits: ["thanks"], spirit_line: "謝謝你記得說謝謝，光都聚過來了。" },
    { lang: "en", mood: "warm", traits: ["thanks"], spirit_line: "Your wish glows softly. Well kept." },
  ],
  bloom: [
    { lang: "zh", mood: "joyful", traits: ["garden", "smile"], spirit_line: "花庭開了一朵小花，是你種的。" },
    { lang: "zh", mood: "hopeful", traits: ["spring"], spirit_line: "心意發芽了，精靈陪你一起澆水。" },
    { lang: "en", mood: "joyful", traits: ["garden"], spirit_line: "A small flower bloomed for you." },
  ],
  water: [
    { lang: "zh", mood: "calm", traits: ["rest", "night"], spirit_line: "像水一樣靜靜的，今晚好好睡吧。" },
    { lang: "zh", mood: "tired", traits: ["care"], spirit_line: "累了就靠一下，精靈幫你捧著。" },
    { lang: "en", mood: "calm", traits: ["rest"], spirit_line: "Quiet as water. Rest well tonight." },
  ],
  wind: [
    { lang: "zh", mood: "hopeful", traits: ["tomorrow"], spirit_line: "風把心意送出去了，明天會更好。" },
    { lang: "zh", mood: "joyful", traits: ["play"], spirit_line: "呼——精靈乘著風轉了一圈！" },
    { lang: "en", mood: "hopeful", traits: ["tomorrow"], spirit_line: "The wind carries your wish onward." },
  ],
  ember: [
    { lang: "zh", mood: "warm", traits: ["home"], spirit_line: "暖暖的火光，替你留了一盞燈。" },
    { lang: "zh", mood: "grateful", traits: ["meal"], spirit_line: "這頓飯的香，精靈也聞到了。" },
    { lang: "en", mood: "warm", traits: ["home"], spirit_line: "A warm ember glows just for you." },
  ],
  star: [
    { lang: "zh", mood: "hopeful", traits: ["dream"], spirit_line: "星星記下你的願望，一閃一閃的。" },
    { lang: "zh", mood: "calm", traits: ["night"], spirit_line: "睡前數三顆星，精靈陪你數。" },
    { lang: "en", mood: "hopeful", traits: ["dream"], spirit_line: "The stars noted your wish. Shiny!" },
  ],
};

export function detectLang(text) {
  return /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text || "") ? "zh" : "en";
}

export function pickFixture({ element, lang = "zh" } = {}) {
  const el = ELEMENTS.includes(element) ? element : ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
  const pool = LINES[el].filter((l) => l.lang === lang);
  const line = (pool.length ? pool : LINES[el])[Math.floor(Math.random() * (pool.length || LINES[el].length))];
  return {
    source: "fallback_fixture",
    element: el,
    mood: line.mood,
    intensity: 1 + Math.floor(Math.random() * 2),
    traits: line.traits,
    spirit_line: line.spirit_line,
    effect: EFFECT_BY_ELEMENT[el],
    safety: "none",
    usage: { input_tokens: 0, output_tokens: 0, cost_usd: 0 },
  };
}
