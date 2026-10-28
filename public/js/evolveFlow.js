// Evolution client flow (M3): POST /api/evolve, 3s cocoon transition,
// persist to IndexedDB, then call the M2 threshold hook for its note.
// api.js is M1-frozen, so the POST lives here; only friendlyMessage is reused.
import { WISH_TIMEOUT_MS } from "./config.js";
import { friendlyMessage, ApiError } from "./api.js";
import { getPlayerId, stageKey, saveStageImage, getStageImage } from "./imageStore.js";
import { onThresholdReached, reducedMotion } from "./effects.js";

export const EVOLVE_TIMEOUT_MS = 60000;
export const TRANSITION_MS = 3000;
export const TRANSITION_REDUCED_MS = 600;

export function lastTraits(state, n = 5) {
  const out = [];
  for (const w of [...(state.wishes || [])].reverse()) {
    for (const t of w.traits || []) {
      if (!out.includes(t)) out.push(t);
      if (out.length >= n) return out;
    }
  }
  return out;
}

async function postEvolve(body, { timeoutMs = EVOLVE_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl("/api/evolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (res.status === 413) throw new ApiError("bad", "上一階段圖片太大了，請重試。");
    if (res.status === 400) throw new ApiError("bad", "演化條件還沒滿足，再收集一點心意吧。");
    if (!res.ok && res.status !== 200) throw new ApiError("offline", `http ${res.status}`);
    return res.json();
  } catch (e) {
    if (e?.name === "AbortError") throw new ApiError("timeout", "timeout");
    if (e instanceof ApiError) throw e;
    throw new ApiError("offline", "offline");
  } finally {
    clearTimeout(timer);
  }
}

// Runs one evolution. Resolves {result, note} on live success and saves the
// image; on {ok:false, keep:true} resolves {result, note:null} — the caller
// keeps the old image and offers retry. Network errors throw ApiError.
export async function evolveToStage(state, toStage, opts = {}) {
  const playerId = opts.playerId || getPlayerId();
  const prev = toStage >= 2 ? await getStageImage(stageKey(playerId, toStage - 1)) : null;
  const body = {
    to_stage: toStage,
    xp: state.xp,
    crystals: state.crystals || {},
    traits: lastTraits(state),
    player_id: playerId,
  };
  if (prev?.b64) body.prev_image = prev.b64;
  const result = await postEvolve(body, opts);
  if (result?.ok && result?.image_b64) {
    await saveStageImage({
      key: stageKey(playerId, toStage), b64: result.image_b64,
      story: result.story, family: result.family, stage: toStage,
    });
    return { result, note: onThresholdReached(toStage) };
  }
  return { result, note: null };
}

// Cocoon transition: 3s glow/crack, or a short fade under reduced-motion.
export function playTransition(root) {
  const ms = reducedMotion() ? TRANSITION_REDUCED_MS : TRANSITION_MS;
  return new Promise((resolve) => {
    if (!root) {
      setTimeout(resolve, ms);
      return;
    }
    root.classList.remove("evolving");
    void root.offsetWidth;
    root.classList.add("evolving");
    setTimeout(() => {
      root.classList.remove("evolving");
      resolve();
    }, ms);
  });
}

export function evolveErrorMessage(err) {
  return friendlyMessage(err);
}
