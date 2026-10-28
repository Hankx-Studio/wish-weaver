import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt, BLOCK_LINES, buildHelp } from "../server/prompts/wish.js";

describe("wish prompt", () => {
  it("encodes the kid-safe contract rules", () => {
    const p = buildSystemPrompt();
    assert.match(p, /40/);
    assert.match(p, /JSON/);
    assert.match(p, /same language/i);
    assert.match(p, /safety/i);
  });

  it("block lines stay within 40 chars in both languages", () => {
    for (const line of Object.values(BLOCK_LINES)) {
      assert.ok(Array.from(line).length <= 40, line);
    }
  });

  it("help text names Taiwan resources", () => {
    assert.match(buildHelp("zh"), /1925/);
    assert.match(buildHelp("zh"), /110/);
    assert.match(buildHelp("en"), /1925/);
  });
});
