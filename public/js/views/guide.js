// First-run guide: 3 skippable steps, shown once over the home view.
// Pure HTML builders; step state lives in main.js. Keyboard: native buttons.
import { THRESHOLDS } from './config.js';

export const GUIDE_KEY = 'wishweaver.guide.v1';
const TOTAL = 3;

export function guideSeen(store = localStorage) {
  try {
    return store.getItem(GUIDE_KEY) === 'done';
  } catch {
    return true;
  }
}

export function markGuideDone(store = localStorage) {
  try {
    store.setItem(GUIDE_KEY, 'done');
  } catch {
    // Private mode: the guide simply shows again next visit.
  }
}

const STEPS = [
  {
    title: '嗨，我是你的精靈',
    body: '每天 30 秒，一句真心話就能養大我。不用聊很久，一句就好。',
  },
  {
    title: `長大只需要 ${THRESHOLDS.stage1} XP`,
    body: '每次心意 +10 XP。XP 到門檻，我就換上新的模樣，身分不會變。',
  },
  {
    title: '說出來也可以',
    body: '在心意頁按「用說的」，說完我會幫你填好，確認後再送出。',
  },
];

export function guideOverlay(step) {
  const s = STEPS[Math.min(step, TOTAL - 1)];
  const dots = STEPS.map((_, i) => `<span class="guide-dot${i === step ? ' on' : ''}" aria-hidden="true"></span>`).join('');
  return `<div class="guide-veil" role="dialog" aria-modal="true" aria-label="新手引導">
    <div class="guide-card">
      <p class="eyebrow">30 秒上手（${step + 1} / ${TOTAL}）</p>
      <h2 class="title">${s.title}</h2>
      <p class="subtitle">${s.body}</p>
      <div class="guide-dots">${dots}</div>
      <div class="button-row">
        ${step > 0 ? '<button class="btn ghost" data-action="guide-back">上一步</button>' : ''}
        ${step < TOTAL - 1
          ? '<button class="btn primary" data-action="guide-next">下一步</button>'
          : '<button class="btn primary" data-action="guide-done">開始養精靈</button>'}
        <button class="quiet-link" data-action="guide-done">略過</button>
      </div>
    </div>
  </div>`;
}
