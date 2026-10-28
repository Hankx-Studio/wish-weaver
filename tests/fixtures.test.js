import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickFixture, detectLang } from "../server/fixtures.js";
import { WishReadingSchema } from "../server/schemas.js";

describe("detectLang", () => {
  it("detects CJK vs english", () => {
    assert.equal(detectLang("謝謝今天的晚餐"), "zh");
    assert.equal(detectLang("thank you for dinner"), "en");
  });
});

describe("pickFixture", () => {
  it("returns a contract-valid reading for every element", () => {
    for (const el of ["light", "bloom", "water", "wind", "ember", "star"]) {
      const r = pickFixture({ element: el, lang: "zh" });
      assert.equal(WishReadingSchema.safeParse(r).success, true);
      assert.equal(r.element, el);
      assert.equal(r.source, "fallback_fixture");
    }
  });

  it("picks a random element when none is given", () => {
    const seen = new Set(Array.from({ length: 30 }, () => pickFixture({}).element));
    assert.ok(seen.size > 1);
  });

  it("serves english lines for english wishes", () => {
    const r = pickFixture({ element: "star", lang: "en" });
    assert.match(r.spirit_line, /[a-zA-Z]/);
  });
});
