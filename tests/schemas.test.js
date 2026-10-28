import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WishRequestSchema,
  ModelWishSchema,
  clampIntensity,
  mapSafety,
  EFFECT_BY_ELEMENT,
} from "../server/schemas.js";

describe("WishRequestSchema", () => {
  it("accepts a valid ritual + wish", () => {
    const r = WishRequestSchema.safeParse({ ritual: "meal", wish: "謝謝晚餐" });
    assert.equal(r.success, true);
  });

  it("rejects bad ritual, empty wish, and over-long wish", () => {
    assert.equal(WishRequestSchema.safeParse({ ritual: "party", wish: "hi" }).success, false);
    assert.equal(WishRequestSchema.safeParse({ ritual: "free", wish: "" }).success, false);
    assert.equal(WishRequestSchema.safeParse({ ritual: "free", wish: "x".repeat(121) }).success, false);
  });

  it("accepts exactly 120 chars", () => {
    assert.equal(WishRequestSchema.safeParse({ ritual: "free", wish: "x".repeat(120) }).success, true);
  });
});

describe("ModelWishSchema", () => {
  const good = {
    element: "light",
    mood: "warm",
    intensity: 2,
    traits: ["family"],
    spirit_line: "謝謝你的心意",
    safety: "none",
  };
  it("accepts a well-formed model reply", () => {
    assert.equal(ModelWishSchema.safeParse(good).success, true);
  });

  it("rejects free-text enums and over-long spirit lines", () => {
    assert.equal(ModelWishSchema.safeParse({ ...good, element: "番茄炒蛋" }).success, false);
    assert.equal(ModelWishSchema.safeParse({ ...good, mood: "溫馨感恩" }).success, false);
    assert.equal(ModelWishSchema.safeParse({ ...good, spirit_line: "x".repeat(41) }).success, false);
    assert.equal(ModelWishSchema.safeParse({ ...good, traits: [] }).success, false);
  });
});

describe("clampIntensity", () => {
  it("clamps model intensity 8 to 3 and 0 to 1", () => {
    assert.equal(clampIntensity(8), 3);
    assert.equal(clampIntensity(0), 1);
    assert.equal(clampIntensity(2), 2);
  });
});

describe("mapSafety", () => {
  it("maps observed free text to the locked enum", () => {
    assert.equal(mapSafety("safe"), "none");
    assert.equal(mapSafety("none"), "none");
    assert.equal(mapSafety("self-harm"), "support");
    assert.equal(mapSafety("refuse: sexual content"), "block");
    assert.equal(mapSafety("block"), "block");
    assert.equal(mapSafety("safe and heartwarming"), "none");
  });

  it("fails closed on unknown strings", () => {
    assert.equal(mapSafety("???"), "support");
  });
});

describe("EFFECT_BY_ELEMENT", () => {
  it("covers all six elements", () => {
    assert.deepEqual(
      Object.keys(EFFECT_BY_ELEMENT).sort(),
      ["bloom", "ember", "light", "star", "water", "wind"],
    );
  });
});
