import { RITUALS, MAX_WISH_LEN } from '../config.js';
import { stageBlock } from './home.js';
import { voiceSupported } from '../voice.js';

export function ritualById(id) {
  if (id === 'free') {
    return { id: 'free', title: '自由心意', sub: '不設題目，把心裡的話說出來', phrase: '' };
  }
  return RITUALS.find((r) => r.id === id) || RITUALS[0];
}

export function renderRitual(root, ctx) {
  const r = ritualById(ctx.ritualId);
  root.innerHTML = `<section class="frame">
    <div class="heading"><p class="eyebrow">A MOMENT OF INTENTION</p>
    <h1 class="title">${r.title}</h1>
    <p class="subtitle">把心意放進一句話，也可以安靜地完成。</p></div>
    <div class="two-col"><div class="letter-paper">
      <label class="field-label" for="spell">你的心意</label>
      <textarea id="spell" maxlength="${MAX_WISH_LEN}" placeholder="${r.phrase}"></textarea>
      <div class="count-row"><span id="count">0</span> / ${MAX_WISH_LEN}</div>
      <div class="button-row">
        <button class="btn primary" data-action="send">讓精靈回應</button>
        <button class="btn ghost" data-action="voice" id="voiceBtn">用說的</button>
        <button class="btn ghost" data-action="quiet">安靜完成</button>
      </div>
      <p class="voice-status" id="voiceStatus" role="status"></p>
      <div class="error-slot" id="wishError" role="alert"></div>
      <p class="tip">心意由 Meta Muse Spark 即時解讀，變成精靈的回應與光效。說出的話只轉文字、不保存錄音。</p>
    </div>${stageBlock(ctx.state, true)}</div></section>`;
  const ta = root.querySelector('#spell');
  const count = root.querySelector('#count');
  ta.addEventListener('input', () => { count.textContent = String(ta.value.length); });
  const vb = root.querySelector('#voiceBtn');
  if (vb && !voiceSupported()) vb.hidden = true;
}
