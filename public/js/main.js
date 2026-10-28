import { STORAGE_KEY, MAX_WISH_LEN, EFFECT_BY_ELEMENT } from './config.js';
import { loadState, saveState, awardWish, addCrystal, addWish, todayKey, stageFor } from './state.js';
import { sendWish, friendlyMessage, getHealth, ApiError } from './api.js';
import { summonBurst, typewriter, onThresholdReached, reducedMotion } from './effects.js';
import { renderHome } from './views/home.js';
import { renderRituals } from './views/rituals.js';
import { renderRitual } from './views/ritual.js';
import { renderResult } from './views/result.js';
import { guideOverlay, guideSeen, markGuideDone } from './views/guide.js';
import { startRecording, blobToWav24k, sendVoice, applyTranscriptToBox, VOICE_MAX_SEC } from './voice.js';
import { renderGrowth } from './views/growth.js';
import { renderEvolve } from './views/evolve.js';
import { evolveToStage, playTransition, evolveErrorMessage } from './evolveFlow.js';
import { getPlayerId, stageKey, getStageImage } from './imageStore.js';
import { mountScan } from './views/scan.js';
import { mountCabinet } from './views/cabinet.js';

const query = new URLSearchParams(location.search);
const DEMO = query.has('demo');
const FAIRY_PREVIEW = query.get('preview') === 'fairy';

let state = loadState(localStorage);
let route = 'home';
let ritualId = 'meal';
let lastReading = null;
let lastGained = 0;
let thresholdNote = '';
let guideStep = null;
let recording = null;
let evolveCtx = { status: 'idle', nextStage: 1, canEvolve: false };
const STAGE_GATE = [0, 30, 90, 180];

function enterEvolve() {
  const target = Math.min(3, Math.max(1, stageFor(state.xp)));
  evolveCtx = {
    status: 'idle', error: null, nextStage: target,
    canEvolve: state.xp >= STAGE_GATE[target], current: null, previous: null,
  };
  getStageImage(stageKey(getPlayerId(), target)).then((img) => {
    if (img?.b64 && route === 'evolve') {
      evolveCtx = { ...evolveCtx, current: { stage: target, b64: img.b64, story: img.story }, story: img.story };
      renderEvolve(app, ctx());
    }
  }).catch(() => {});
}

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

function persist() {
  saveState(localStorage, state);
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 3800);
}

function navButton(id, label) {
  return `<button class="nav-item ${route === id ? 'active' : ''}" data-nav="${id}">${label}</button>`;
}

function header() {
  document.getElementById('topbar').innerHTML =
    `<button class="brand" data-nav="home" aria-label="回到精靈花庭"><span><strong>精靈之間</strong><small>FAIRY COMPANION</small></span></button>
    <nav class="top-nav" aria-label="主要導覽">${navButton('home', '精靈花庭')}${navButton('rituals', '日常儀式')}${navButton('growth', '成長之書')}${navButton('scan', '今日任務')}${navButton('cabinet', '寶物櫃')}</nav>
    <div class="header-points">${DEMO ? '<span class="demo-badge">展示模式</span>' : ''}<span>${state.xp} XP</span></div>`;
  document.getElementById('mobileNav').innerHTML =
    navButton('home', '精靈花庭') + navButton('rituals', '日常儀式') + navButton('growth', '成長之書') + navButton('scan', '今日任務') + navButton('cabinet', '寶物櫃');
}

function setRoute(r) {
  if (recording && r !== 'ritual') {
    recording.stop().catch(() => {});
    recording = null;
  }
  if (r === 'evolve' && route !== 'evolve') enterEvolve();
  route = r;
  render();
  scrollTo({ top: 0 });
}

function ctx() {
  return { state, ritualId, reading: lastReading, gained: lastGained, thresholdNote, evolve: evolveCtx };
}

function render() {
  document.body.classList.toggle('reduced', reducedMotion());
  header();
  if (route === 'home') renderHome(app, ctx());
  else if (route === 'rituals') renderRituals(app, ctx());
  else if (route === 'ritual') renderRitual(app, ctx());
  else if (route === 'result') {
    renderResult(app, ctx());
    if (lastReading && lastReading.safety !== 'block') {
      const line = document.getElementById('spiritLine');
      if (line && !line.textContent) typewriter(line, lastReading.spirit_line);
      summonBurst(document.getElementById('burst'),
        lastReading.effect || EFFECT_BY_ELEMENT[lastReading.element] || 'sparkle');
    }
  } else if (route === 'evolve') renderEvolve(app, ctx());
  else if (route === 'scan') mountScan(app, { state, demo: DEMO, persist, toast, go: setRoute });
  else if (route === 'cabinet') mountCabinet(app);
  else if (route === 'growth') renderGrowth(app, ctx());
  else if (route === 'fairy-preview' && FAIRY_PREVIEW) {
    app.innerHTML = `<section class="frame"><div class="heading"><h1 class="title">設計預覽 · fairy</h1></div>
      <img class="fairy-art" src="assets/fairy.webp" alt="設計預覽"></section>`;
  }
  maybeGuide();
  wireAmbient();
}

function wireAmbient() {
  const amb = document.getElementById('ambient');
  if (amb && !amb.children.length) {
    for (let i = 0; i < 18; i++) {
      const e = document.createElement('i');
      e.className = 'mote';
      e.style.cssText = `left:${(i * 61 + 13) % 100}%;top:${(i * 37 + 21) % 100}%;animation-delay:${i * 0.71}s;animation-duration:${9 + (i % 5)}s`;
      amb.append(e);
    }
  }
}

function doSummon() {
  if (reducedMotion()) {
    toast('精靈輕輕回應了你。');
    return;
  }
  document.querySelectorAll('.stage').forEach((e) => {
    e.classList.remove('casting');
    void e.offsetWidth;
    e.classList.add('casting');
  });
  summonBurst(document.getElementById('burst'), 'sparkle');
  setTimeout(() => document.querySelectorAll('.stage')
    .forEach((e) => e.classList.remove('casting')), 1850);
}

function setLoading(on) {
  const slot = document.getElementById('wishError');
  if (slot && on) slot.innerHTML = '<p class="listening">精靈聆聽中…</p>';
  app.querySelectorAll('[data-action="send"],[data-action="quiet"],[data-action="voice"]')
    .forEach((b) => { b.disabled = on; });
}

function voiceStatus(msg) {
  const el = document.getElementById('voiceStatus');
  if (el) el.textContent = msg;
}

function voiceFail(err) {
  const kind = err?.name === 'AbortError' ? new ApiError('timeout', 'timeout') : err;
  voiceStatus(friendlyMessage(kind) + '也可以直接打字。');
  const btn = document.getElementById('voiceBtn');
  if (btn) { btn.disabled = false; btn.textContent = '用說的'; }
}

async function toggleVoice() {
  const btn = document.getElementById('voiceBtn');
  const ta = document.getElementById('spell');
  if (!btn || !ta || btn.disabled) return;
  if (recording) {
    btn.disabled = true;
    voiceStatus('轉成文字中…');
    try {
      const blob = await recording.stop();
      recording = null;
      const wav = await blobToWav24k(blob);
      const out = await sendVoice(wav);
      const text = (out.transcript || '').trim();
      if (!text) {
        voiceStatus('沒聽清楚，再說一次好嗎？');
      } else {
        applyTranscriptToBox(ta, document.getElementById('count'), text);
        voiceStatus('已把你說的話放進心意框，確認後再送出。');
      }
    } catch (e) {
      recording = null;
      voiceFail(e);
      return;
    }
    btn.disabled = false;
    btn.textContent = '用說的';
    return;
  }
  try {
    recording = await startRecording({ maxSec: VOICE_MAX_SEC });
  } catch {
    voiceStatus('需要麥克風權限才能用說的，也可以直接打字。');
    return;
  }
  btn.textContent = `錄音中…（點一下結束，最長 ${VOICE_MAX_SEC} 秒）`;
  voiceStatus('在聽了，說完點一下按鈕結束。');
}

async function submitWish(quiet) {
  const ta = document.getElementById('spell');
  const text = quiet ? '' : (ta?.value || '').trim();
  const slot = document.getElementById('wishError');
  if (!quiet && !text) {
    slot.innerHTML = '<p class="form-error">先寫下一句心意吧（最多 120 字）。</p>';
    return;
  }
  setLoading(true);
  try {
    const reading = quiet
      ? { source: 'fallback_fixture', element: 'light', effect: 'sparkle', spirit_line: '靜靜的陪伴，也是一種光。', safety: 'none' }
      : await sendWish(ritualId, text.slice(0, MAX_WISH_LEN));
    const blocked = reading.safety === 'block';
    const before = stageFor(state.xp);
    const r = awardWish(state, { day: todayKey(), demo: DEMO, blocked });
    if (!blocked && reading.safety !== 'support' && r.counted) addCrystal(state, reading.element);
    addWish(state, {
      text: quiet ? '(安靜完成)' : text.slice(0, MAX_WISH_LEN),
      ritual: ritualId, element: reading.element, source: reading.source,
      gained: r.gained, day: todayKey(),
    });
    persist();
    lastReading = reading;
    lastGained = r.gained;
    thresholdNote = stageFor(state.xp) > before ? onThresholdReached(stageFor(state.xp)) : '';
    if (r.capped && !blocked) toast('今日可得 XP 的次數已滿，這次只留下光與回應。');
    setRoute('result');
  } catch (e) {
    setLoading(false);
    slot.innerHTML = `<p class="form-error">${friendlyMessage(e)}</p>
      <button class="btn small ghost" data-action="retry">再試一次</button>`;
  }
}

async function refreshFooter() {
  const h = await getHealth();
  const el = document.getElementById('footStatus');
  if (!el) return;
  el.textContent = h ? 'AI 回應由 Meta Muse Spark 即時生成' : '目前連不上伺服器，稍後再試';
}

document.addEventListener('click', async (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    setRoute(nav.dataset.nav);
    return;
  }
  const rit = e.target.closest('[data-ritual]');
  if (rit) {
    ritualId = rit.dataset.ritual;
    setRoute('ritual');
    return;
  }
  const act = e.target.closest('[data-action]');
  if (!act) return;
  const a = act.dataset.action;
  if (a === 'summon') doSummon();
  else if (a === 'send') submitWish(false);
  else if (a === 'quiet') submitWish(true);
  else if (a === 'voice') toggleVoice();
  else if (a === 'guide-next') { guideStep = Math.min(2, (guideStep ?? 0) + 1); render(); }
  else if (a === 'guide-back') { guideStep = Math.max(0, (guideStep ?? 0) - 1); render(); }
  else if (a === 'guide-done') { markGuideDone(localStorage); guideStep = null; render(); }
  else if (a === 'retry') setRoute('ritual');
  else if (a === 'evolve-1' || a === 'evolve-2' || a === 'evolve-3') {
    const toStage = Number(a.split('-')[1]);
    evolveCtx.status = 'evolving'; evolveCtx.error = null; render();
    await playTransition(document.getElementById('evolveStage'));
    try {
      const { result, note } = await evolveToStage(state, toStage);
      if (result.ok) {
        evolveCtx = {
          status: 'done', source: result.source, family: result.family,
          current: { stage: toStage, b64: result.image_b64, story: result.story },
          previous: evolveCtx.current?.b64 || null, story: result.story, note,
          nextStage: Math.min(3, toStage + 1), canEvolve: state.xp >= [0, 90, 180][toStage],
        };
      } else {
        evolveCtx = { ...evolveCtx, status: 'error', error: '演化失敗，原圖與 XP 保留，再試一次好嗎？' };
      }
    } catch (e2) {
      evolveCtx = { ...evolveCtx, status: 'error', error: evolveErrorMessage(e2) };
    }
    setRoute('evolve');
  }
  else if (a === 'clear') {
    localStorage.removeItem(STORAGE_KEY);
    state = loadState(localStorage);
    persist();
    toast('本機資料已清除，回到初生之光。');
    setRoute('home');
  }
});

function maybeGuide() {
  if (route !== 'home' || guideSeen(localStorage)) return;
  if (guideStep === null) guideStep = 0;
  app.insertAdjacentHTML('beforeend', guideOverlay(guideStep));
}

if (FAIRY_PREVIEW) route = 'fairy-preview';
render();
refreshFooter();
