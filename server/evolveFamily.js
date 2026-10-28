// Morph-family draw with limits: fairy / animal / flower / abstract_light.
// Weights come from crystal ratios via AFFINITY; the seed is
// `${playerId}:${stage}` so a retry redraws the same family (deterministic).
export const FAMILIES = ["fairy", "animal", "flower", "abstract_light"];

const AFFINITY = {
  fairy: { light: 3, star: 2, bloom: 1, water: 0, wind: 1, ember: 1 },
  animal: { light: 0, star: 0, bloom: 1, water: 2, wind: 3, ember: 1 },
  flower: { light: 1, star: 0, bloom: 3, water: 2, wind: 0, ember: 2 },
  abstract_light: { light: 2, star: 3, bloom: 0, water: 1, wind: 1, ember: 0 },
};

const FRAGMENTS = {
  fairy: "a tiny chibi fairy child with delicate translucent wings",
  animal: "a small round original guardian-beast cub with oversized ears and soft fur, no fangs, friendly",
  flower: "a blooming flower spirit with a petal dress and a small blossom crown",
  abstract_light: "a living spark of light, a soft glowing wisp with tiny starry hands and curious eyes",
};

export function familyFragment(family) {
  return FRAGMENTS[family] || FRAGMENTS.fairy;
}

// FNV-1a 32-bit, then mulberry32 — tiny, dependency-free, deterministic.
export function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function familyWeights(crystals = {}) {
  const weights = {};
  for (const f of FAMILIES) {
    let w = 1;
    for (const [el, count] of Object.entries(crystals)) {
      const n = Number(count);
      if (Number.isFinite(n) && n > 0) w += (AFFINITY[f][el] || 0) * n;
    }
    weights[f] = w;
  }
  return weights;
}

export function drawFamily({ crystals = {}, playerId = "anon", stage = 1 } = {}) {
  const weights = familyWeights(crystals);
  const total = FAMILIES.reduce((s, f) => s + weights[f], 0);
  const roll = mulberry32(hashSeed(`${playerId}:${stage}`))() * total;
  let acc = 0;
  for (const f of FAMILIES) {
    acc += weights[f];
    if (roll < acc) return { family: f, weights, roll };
  }
  return { family: "fairy", weights, roll };
}
