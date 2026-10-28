import { STORAGE_KEY, MAX_WISH_LEN, EFFECT_BY_ELEMENT } from './config.js';
import { loadState, saveState, awardWish, addCrystal, addWish, todayKey, stageFor } from './state.js';
import { sendWish, friendlyMessage, getHealth } from './api.js';
import { summonBurst, typewriter, onThresholdReached, reducedMotion } from './effects.js';
import { renderHome } from './views/home.js';
import { renderRituals } from './views/rituals.js';
import { renderRitual } from './views/ritual.js';
import { renderResult } from './views/result.js';
import { renderGrowth } from './views/growth.js';

const query = new URLSearchParams(location.search);
const DEMO = query.has('demo');
const FAIRY_PREVIEW = query.get('preview') === 'fairy';

let state = loadState(localStorage);
let route = 'home';
let ritualId = 'meal';
let lastReading = null;
let lastGained = 0;
let thresholdNote = '';

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
    <nav class="top-nav" aria-label="主要導覽">${navButton('home', '精靈花庭')}${navButton('rituals', '日常儀式')}${navButton('growth', '成長之書')}</nav>
    <div class="header-points">${DEMO ? '<span class="demo-badge">展示模式</span>' : ''}<span>${state.xp} XP</span></div>`;
  document.getElementById('mobileNav').innerHTML =
    navButton('home', '精靈花庭') + navButton('rituals', '日常儀式') + navButton('growth', '成長之書');
}

function setRoute(r) {
  route = r;
  render();
  scrollTo({ top: 0 });
}

function ctx() {
  return { state, ritualId, reading: lastReading, gained: lastGained, thresholdNote };
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
  } else if (route === 'growth') renderGrowth(app, ctx());
  else if (route === 'fairy-preview' && FAIRY_PREVIEW) {
    app.innerHTML = `<section class="frame"><div class="heading"><h1 class="title">設計預覽 · fairy</h1></div>
      <img class="fairy-art" src="assets/fairy.webp" alt="設計預覽"></section>`;
  }
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
  app.querySelectorAll('[data-action="send"],[data-action="quiet"]')
    .forEach((b) => { b.disabled = on; });
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

document.addEventListener('click', (e) => {
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
  else if (a === 'retry') setRoute('ritual');
  else if (a === 'clear') {
    localStorage.removeItem(STORAGE_KEY);
    state = loadState(localStorage);
    persist();
    toast('本機資料已清除，回到初生之光。');
    setRoute('home');
  }
});

if (FAIRY_PREVIEW) route = 'fairy-preview';
render();
refreshFooter();
