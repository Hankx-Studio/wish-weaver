// Per-IP sliding window, in memory. Single process only (GAME_SPEC §7).
export function createRateLimiter({ windowMs, max }) {
  const hits = new Map();

  function check(key, now = Date.now()) {
    const cutoff = now - windowMs;
    const kept = (hits.get(key) || []).filter((t) => t > cutoff);
    if (kept.length >= max) {
      hits.set(key, kept);
      return { allowed: false, retryAfterSec: Math.ceil((kept[0] + windowMs - now) / 1000) };
    }
    kept.push(now);
    hits.set(key, kept);
    return { allowed: true, retryAfterSec: 0 };
  }

  return { check };
}
