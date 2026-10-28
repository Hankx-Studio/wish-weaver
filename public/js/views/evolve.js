// Evolution view (M3): cocoon transition, before/after compare, story.
// Pure render — fetching lives in evolveFlow.js; mounting is done by main.js
// (see docs/evidence/m3_wiring.md for the Leader-applied mount snippet).
import { esc } from "./result.js";

const STAGE_NAME = { 1: "初綻", 2: "成長", 3: "綻放" };

function sourceBadge(source) {
  const live = source === "meta_live";
  return `<span class="src-badge ${live ? "live" : "fixture"}">${live ? "AI 即時演化" : "離線樣貌"}</span>`;
}

function storyHtml(story) {
  if (!story?.length) return "";
  return `<blockquote class="evolve-story">${story.map((l) => `<p>${esc(l)}</p>`).join("")}</blockquote>`;
}

export function renderEvolve(root, ctx) {
  const { evolve } = ctx;
  const cur = evolve?.current || null;
  const prev = evolve?.previous || null;
  const story = evolve?.story || cur?.story || null;
  const busy = evolve?.status === "evolving";
  const err = evolve?.error || null;
  const next = evolve?.nextStage || 1;

  const compare = cur
    ? `<div class="compare">
        ${prev ? `<figure><img src="${prev}" alt="演化前"><figcaption>演化前</figcaption></figure>` : ""}
        <figure><img src="${cur.b64 ? `data:image/webp;base64,${cur.b64}` : cur}" alt="現在的精靈"><figcaption>stage ${cur.stage} · ${STAGE_NAME[cur.stage] || ""}</figcaption></figure>
      </div>`
    : `<p class="tip">精靈還是一顆光球——收集心意，迎接第一次演化吧。</p>`;

  root.innerHTML = `<section class="frame evolve-wrap" aria-label="精靈演化">
    <div class="heading"><p class="eyebrow">EVOLUTION</p>
    <h1 class="title">精靈演化</h1>
    <p class="subtitle">同一隻精靈，慢慢長出屬於你的樣子。</p></div>
    <div class="paper evolve-paper" id="evolveStage">
      <div class="evolve-head">${sourceBadge(evolve?.source)}<span class="evolve-family">${esc(evolve?.family || "")}</span></div>
      ${compare}
      ${storyHtml(story)}
      ${evolve?.note ? `<p class="threshold-note">${esc(evolve.note)}</p>` : ""}
      ${err ? `<p class="form-error">${esc(err)}</p>` : ""}
      <div class="button-row">
        ${busy
          ? `<p class="listening">光芒包覆中…約 3 秒</p>`
          : `<button class="btn" data-action="evolve-${next}" ${evolve?.canEvolve ? "" : "disabled"}>演化到 stage ${next}</button>
             ${err ? `<button class="btn ghost" data-action="evolve-${next}">再試一次</button>` : ""}`}
      </div>
    </div></section>`;
}
