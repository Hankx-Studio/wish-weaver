import { SUPPORT_LINES } from '../config.js';
import { stageBlock } from './home.js';

const CRYSTAL_NAME = {
  light: '光結晶', bloom: '花結晶', water: '水結晶',
  wind: '風結晶', ember: '暖焰結晶', star: '星結晶',
};

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function renderResult(root, ctx) {
  const { reading, gained, thresholdNote } = ctx;
  if (!reading) {
    root.innerHTML = `<section class="frame"><div class="heading">
      <h1 class="title">還沒有心意</h1>
      <p class="subtitle">先完成一段儀式吧。</p></div>
      <div class="hero-actions"><button class="btn primary" data-nav="rituals">前往儀式</button></div>
    </section>`;
    return;
  }
  const badge = reading.source === 'fallback_fixture'
    ? `<span class="rest-badge">精靈正在休息・示範回應</span>` : '';
  let body = '';
  if (reading.safety === 'block') {
    body = `<h2>這次，精靈輕輕搖了搖頭</h2>
      <p id="spiritLine">${esc(reading.spirit_line)}</p>
      <p class="tip">這樣的心意不太適合花庭，換一句話再試試吧。不加 XP。</p>`;
  } else {
    const xpLine = gained > 0 ? `<div class="receipt"><div><span>成長印記</span><strong>+${gained} XP</strong></div>
      <div><span>元素結晶</span><strong>獲得${CRYSTAL_NAME[reading.element] || ''}</strong></div></div>`
      : `<p class="tip">今日可得 XP 的次數已滿，這次只留下光與回應。</p>`;
    const support = reading.safety === 'support'
      ? `<div class="support-card"><h3>給你一個擁抱</h3><p id="spiritLine">${esc(reading.spirit_line)}</p>
        <p>${SUPPORT_LINES.map(esc).join('')}</p></div>`
      : `<h2>願這一點光，陪你記得此刻。</h2><p class="spirit-line" id="spiritLine"></p>`;
    body = `${support}${xpLine}${thresholdNote ? `<p class="threshold-note">${esc(thresholdNote)}</p>` : ''}`;
  }
  root.innerHTML = `<section class="frame result">
    <div class="heading"><p class="eyebrow">A LITTLE BLESSING</p>
    <h1 class="title">你的心意，精靈收到了</h1></div>
    <div class="two-col">${stageBlock(ctx.state, true)}
    <div class="paper effect-${esc(reading.effect)}">${badge}${body}
      <div class="button-row">
        <button class="btn primary" data-nav="rituals">再說一句心意</button>
        <button class="btn ghost" data-nav="growth">翻開成長之書</button>
      </div></div></div></section>`;
}
