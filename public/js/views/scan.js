// Daily scan quest view (M4): fetch quest, capture/upload, resize,
// scan, cut out the treasure, award XP. Mounted by main.js (see
// m4_wiring.md); env injects {state, demo, persist, toast, go}.
import { XP_PER_QUEST, DEMO_MULTIPLIER } from "../config.js";
import { todayKey } from "../state.js";
import { boxCrop, maskCutout, canvasDataUrl, tinyToRaster } from "../maskCut.js";
import { buildTreasure, saveTreasure } from "../treasureStore.js";

const QUEST_CACHE_KEY = "wishweaver.quest.v1";
const MAX_CLIENT_BYTES = 2 * 1024 * 1024;
const SCAN_TIMEOUT_MS = 45000;

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export function dominantElement(state) {
  let best = "ember";
  let n = 0;
  for (const [el, c] of Object.entries(state.crystals || {})) {
    if (c > n) {
      best = el;
      n = c;
    }
  }
  return best;
}

async function postJson(path, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), SCAN_TIMEOUT_MS);
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

async function resizePhoto(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(bmp.width * scale));
  cv.height = Math.max(1, Math.round(bmp.height * scale));
  cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
  bmp.close();
  return new Promise((resolve, reject) => {
    cv.toBlob((b) => (b ? resolve(b) : reject(new Error("resize failed"))), "image/jpeg", 0.85);
  });
}

function loadCachedQuest() {
  try {
    const raw = localStorage.getItem(QUEST_CACHE_KEY);
    if (!raw) return null;
    const q = JSON.parse(raw);
    return q.day === todayKey() ? q : null;
  } catch {
    return null;
  }
}

function badge(source) {
  return source === "fallback_fixture" ? `<span class="rest-badge">精靈正在休息・示範回應</span>` : "";
}

export function renderScan(root, vm) {
  const { status, quest, previewUrl, result, cutoutUrl, gained, error } = vm;
  let body = "";
  if (status === "done" && result) {
    body = `<div class="treasure-appear">${cutoutUrl ? `<img class="treasure-img" src="${cutoutUrl}" alt="寶物">` : `<p class="tip">這次沒有留下寶物。</p>`}
      <p class="spirit-line">${esc(result.spirit_line)}</p>
      ${gained > 0 ? `<div class="receipt"><div><span>成長印記</span><strong>+${gained} XP</strong></div>
      <div><span>寶物收藏</span><strong>+1</strong></div></div>` : `<p class="tip">這次沒有 XP，再試一次吧。</p>`}
      <div class="button-row"><button class="btn primary" data-scan="again">再拍一張</button>
      <button class="btn ghost" data-scan="cabinet">前往寶物櫃</button></div></div>`;
  } else {
    body = `${previewUrl ? `<img class="scan-preview" src="${previewUrl}" alt="待鑑定的照片">` : ""}
      <label class="btn gold wide" ${status === "working" ? 'aria-disabled="true"' : ""}>${status === "working" ? "精靈鑑定中…" : "拍照或上傳"}
      <input type="file" accept="image/*" capture="environment" data-scan="file" hidden ${status === "working" ? "disabled" : ""}></label>
      ${error ? `<p class="form-error">${esc(error)}</p>` : ""}
      <p class="tip">只拍物品、不拍人。照片縮到 1024px 內、不超過 2MB，且不會上傳原圖以外的東西。</p>`;
  }
  root.innerHTML = `<section class="frame scan">
    <div class="heading"><p class="eyebrow">A LITTLE QUEST</p>
    <h1 class="title">今日任務・拍下你的世界</h1>
    <p class="subtitle">把現實裡的溫柔，帶回花庭收藏。</p></div>
    <div class="two-col"><div class="paper">${badge(quest?.source)}<h2>${esc(quest ? quest.title : "精靈正在想題目…")}</h2>
      ${quest ? `<p>${esc(quest.hint)}</p><p class="tip">目標：${esc(quest.target_noun_en)}・${quest.kind === "kindness" ? "善意任務" : "日常任務"}</p>` : ""}
      <div class="button-row"><button class="btn small ghost" data-scan="kindness">換個善意任務</button></div></div>
    <div class="paper scan-side">${badge(result?.source)}${body}</div></div></section>`;
}

export function mountScan(root, env) {
  const api = {
    root,
    env,
    vm: { status: "quest", quest: null, previewUrl: null, result: null, cutoutUrl: null, gained: 0, error: null },
  };
  api.draw = () => renderScan(root, api.vm);
  wireScanInput(api);
  wireScanButtons(api);
  fetchQuest(api, false);
}

async function fetchQuest(api, kindness) {
  const { vm, env, draw } = api;
  const cached = !kindness && loadCachedQuest();
  if (cached?.quest) {
    vm.quest = cached.quest;
    draw();
    return;
  }
  try {
    const out = await postJson("/api/quest", { element: dominantElement(env.state), lang: "zh", kindness });
    vm.quest = out.quest;
    try {
      localStorage.setItem(QUEST_CACHE_KEY, JSON.stringify({ day: todayKey(), quest: out.quest }));
    } catch { /* private mode: quest still works for this visit */ }
  } catch {
    vm.quest = null;
    vm.error = "連不上精靈花庭，稍後再試。";
  }
  draw();
}

async function submitScan(api, blob, previewUrl) {
  const { vm, draw } = api;
  vm.status = "working";
  vm.previewUrl = previewUrl;
  vm.error = null;
  draw();
  try {
    const fd = new FormData();
    fd.set("photo", blob, "quest.jpg");
    fd.set("quest_id", vm.quest.quest_id);
    fd.set("target_noun_en", vm.quest.target_noun_en);
    fd.set("quest_title", vm.quest.title);
    fd.set("lang", "zh");
    const out = await postScanForm(fd);
    vm.result = out;
    vm.cutoutUrl = null;
    vm.gained = 0;
    if (out.matched && out.boxes?.length) await completeTreasure(api, blob, out);
    vm.status = "done";
  } catch (e) {
    vm.status = "quest";
    vm.error = e?.message || "發生了一點小狀況，再試一次好嗎？";
  }
  draw();
}

async function postScanForm(fd) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), SCAN_TIMEOUT_MS);
  try {
    const res = await fetch("/api/scan", { method: "POST", body: fd, signal: ctrl.signal });
    if (res.status === 400) throw new Error("這張照片格式不對，換一張試試（JPEG/PNG/WebP，2MB 內）。");
    if (!res.ok) throw new Error(`http ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

async function completeTreasure(api, blob, out) {
  const { vm, env } = api;
  vm.cutoutUrl = await cutTreasure(blob, out);
  const gained = out.xp_awarded > 0 ? XP_PER_QUEST * (env.demo ? DEMO_MULTIPLIER : 1) : 0;
  env.state.xp += gained;
  vm.gained = gained;
  env.persist();
  try {
    await saveTreasure(buildTreasure({
      questId: out.quest_id, title: vm.quest.title, cutoutDataUrl: vm.cutoutUrl,
      maskHash: out.mask_hash, spiritLine: out.spirit_line, source: out.source,
    }));
  } catch {
    env.toast("寶物櫃滿了（瀏覽器空間不足），XP 已入帳。");
  }
}

function wireScanInput(api) {
  const { root, vm } = api;
  root.addEventListener("change", async (e) => {
    const input = e.target.closest('[data-scan="file"]');
    if (!input?.files?.length || vm.status === "working") return;
    const file = input.files[0];
    if (file.size > 8 * 1024 * 1024) {
      vm.error = "這張照片太大了，換一張小一點的試試。";
      api.draw();
      return;
    }
    try {
      const blob = await resizePhoto(file);
      if (blob.size > MAX_CLIENT_BYTES) throw new Error("oversize");
      await submitScan(api, blob, URL.createObjectURL(blob));
    } catch {
      vm.error = "讀不到這張照片，換一張試試。";
      api.draw();
    }
    input.value = "";
  });
}

function wireScanButtons(api) {
  const { root, vm, env } = api;
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-scan]");
    if (!btn) return;
    if (btn.dataset.scan === "again") {
      Object.assign(vm, { status: "quest", result: null, cutoutUrl: null, previewUrl: null });
      api.draw();
    } else if (btn.dataset.scan === "cabinet") {
      env.go("cabinet");
    } else if (btn.dataset.scan === "kindness") {
      fetchQuest(api, true);
    }
  });
}

async function cutTreasure(blob, out) {
  const img = await blobToImage(blob);
  const box = out.best_box || out.boxes[0];
  let cv = null;
  if (out.mask_tiny) {
    const raster = tinyToRaster(out.mask_tiny);
    cv = maskCutout(img, { raster, box, mask: { w: out.mask_tiny.w, h: out.mask_tiny.h } });
  }
  if (!cv) cv = boxCrop(img, box, box.w, box.h);
  return canvasDataUrl(cv || boxCrop(img, box, box.w, box.h));
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}
