import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../server/rateLimit.js";

describe("rateLimit", () => {
  it("allows max hits then blocks with retryAfterSec", () => {
    const rl = createRateLimiter({ windowMs: 3600_000, max: 2 });
    assert.equal(rl.check("1.2.3.4", 1000).allowed, true);
    assert.equal(rl.check("1.2.3.4", 2000).allowed, true);
    const r = rl.check("1.2.3.4", 3000);
    assert.equal(r.allowed, false);
    assert.ok(r.retryAfterSec > 0);
  });

  it("tracks keys independently and resets after the window", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 1 });
    assert.equal(rl.check("a", 0).allowed, true);
    assert.equal(rl.check("b", 0).allowed, true);
    assert.equal(rl.check("a", 500).allowed, false);
    assert.equal(rl.check("a", 1001).allowed, true);
  });
});
