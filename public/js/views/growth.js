import { ELEMENTS } from '../config.js';
import { stageFor, nextThreshold } from '../state.js';
import { esc } from './result.js';

const CRYSTAL_NAME = {
  light: '光', bloom: '花', water: '水', wind: '風', ember: '暖焰', star: '星',
};

export function renderGrowth(root, ctx) {
  const { state } = ctx;
  const next = nextThreshold(state.xp);
  const pct = next ? Math.min(100, Math.round((state.xp / next) * 100)) : 100;
  const recent = [...state.wishes].reverse();
  root.innerHTML = `<section class="frame">
    <div class="heading"><p class="eyebrow">A STORY STILL UNFOLDING</p>
    <h1 class="title">成長之書</h1>
    <p class="subtitle">從一顆光球開始，每一次相處都留下痕跡。</p></div>
    <div class="paper growth-paper">
      <h2>stage ${stageFor(state.xp)} · ${state.xp} XP</h2>
      <div class="progress-label"><span>下一階段</span><span>${next ? next + ' XP' : '已滿'}</span></div>
      <div class="progress-track"><span style="width:${pct}%"></span></div>
      <h3>元素結晶</h3>
      <ul class="crystal-grid">${ELEMENTS.map((e) =>
        `<li><span class="crystal-dot c-${e}"></span>${CRYSTAL_NAME[e]} × ${state.crystals[e] || 0}</li>`).join('')}</ul>
      <h3>最近的心意（只存在這台裝置）</h3>
      ${recent.length ? `<ul class="wish-list">${recent.map((w) =>
        `<li><span class="wish-el">${CRYSTAL_NAME[w.element] || ''}</span>${esc(w.text)}<small>+${w.gained} XP · ${esc(w.day)}</small></li>`).join('')}</ul>`
        : '<p class="tip">還沒有心意，去說第一句吧。</p>'}
      <div class="button-row">
        <button class="btn ghost" data-nav="rituals">再說一句心意</button>
        <button class="btn danger" data-action="clear">清除本機資料</button>
      </div>
    </div></section>`;
}
