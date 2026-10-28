// Treasure cabinet view (M4): treasures saved in IndexedDB.
import { listTreasures } from "../treasureStore.js";

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export function renderCabinet(root, { treasures, loading }) {
  const cards = (treasures || []).map((t) => `<figure class="treasure-card">
      <img src="${t.image}" alt="${esc(t.title)} 的寶物" loading="lazy">
      <figcaption><strong>${esc(t.title)}</strong>
      <span>${esc(t.spiritLine || "")}</span>
      ${t.source === "fallback_fixture" ? `<em class="mini-tag">示範回應</em>` : ""}</figcaption>
    </figure>`).join("");
  root.innerHTML = `<section class="frame cabinet">
    <div class="heading"><p class="eyebrow">THE CABINET</p>
    <h1 class="title">寶物櫃</h1>
    <p class="subtitle">你從真實世界帶回來的光，都在這裡。</p></div>
    ${loading ? `<p class="tip">正在打開寶物櫃…</p>`
      : cards ? `<div class="cabinet-grid">${cards}</div>`
      : `<div class="empty"><p>寶物櫃還是空的。</p><p>去完成今日任務，帶回第一件寶物吧。</p>
        <button class="btn primary" data-nav="scan">前往今日任務</button></div>`}
    </section>`;
}

export function mountCabinet(root) {
  renderCabinet(root, { treasures: [], loading: true });
  listTreasures().then(
    (treasures) => renderCabinet(root, { treasures, loading: false }),
    () => renderCabinet(root, { treasures: [], loading: false }),
  );
}
