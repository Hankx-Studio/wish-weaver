import { z } from "zod";

export const RITUALS = ["meal", "gratitude", "bedtime", "free"];
export const ELEMENTS = ["light", "bloom", "water", "wind", "ember", "star"];
export const MOODS = ["calm", "warm", "joyful", "tired", "hopeful", "grateful"];
export const EFFECTS = ["sparkle", "petals", "ripple", "breeze", "glow", "constellation"];
export const SAFETIES = ["none", "support", "block"];

// Server owns the element -> effect mapping; the model's own effect
// field is ignored (API_CONTRACT: model once free-styled it).
export const EFFECT_BY_ELEMENT = {
  light: "sparkle",
  bloom: "petals",
  water: "ripple",
  wind: "breeze",
  ember: "glow",
  star: "constellation",
};

// Player request. Contract field name is `wish` (frozen API_CONTRACT wins
// over the looser `text` wording in the task note).
export const WishRequestSchema = z.object({
  ritual: z.enum(RITUALS),
  wish: z.string().min(1).max(120),
});

// Raw model reply: enums locked (model once returned free text and
// intensity 8), spirit_line capped at 40 chars, safety left as free text
// for server-side mapping below.
export const ModelWishSchema = z.object({
  element: z.enum(ELEMENTS),
  mood: z.enum(MOODS),
  intensity: z.number().int(),
  traits: z.array(z.string().min(1)).min(1).max(3),
  spirit_line: z.string().min(1).refine((s) => Array.from(s).length <= 40),
  safety: z.string().min(1),
});

export const UsageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cost_usd: z.number().nonnegative(),
});

export const WishReadingSchema = z.object({
  source: z.enum(["meta_live", "fallback_fixture"]),
  element: z.enum(ELEMENTS),
  mood: z.enum(MOODS),
  intensity: z.number().int().min(1).max(3),
  traits: z.array(z.string()).min(1).max(3),
  spirit_line: z.string().min(1),
  effect: z.enum(EFFECTS),
  safety: z.enum(SAFETIES),
  usage: UsageSchema,
  reason: z.string().optional(),
  help: z.string().optional(),
});

export function clampIntensity(n) {
  return Math.min(3, Math.max(1, Math.round(n)));
}

// Model safety arrives as free text (observed: "safe"). Map to the locked
// enum; unknown strings fail closed to "support" (child-safe).
export function mapSafety(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (/block|refus|sexual|violen|hate|harass|abuse|explicit|disallow|nsfw|gore/.test(s)) return "block";
  if (/\b(safe|none|ok(ay)?|fine|neutral|calm|low|minimal|wholesome|positive|heartwarming|no[ _]?issue)\b/.test(s)) {
    return "none";
  }
  if (/support|crisis|self[\s_-]?harm|suicid|distress|concern|danger|help|hotline|1925/.test(s)) return "support";
  return "support";
}
