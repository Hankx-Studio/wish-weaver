import { RITUALS } from '../config.js';

export function renderRituals(root) {
  root.innerHTML = `<section class="frame">
    <div class="heading"><p class="eyebrow">THE RITUAL BOOK</p>
    <h1 class="title">翻開今日的祝福</h1>
    <p class="subtitle">選一段心意，讓精靈用光回應你。</p></div>
    <div class="book-panel"><div class="ritual-grid">
    ${RITUALS.map((r) => `<button class="ritual-card" data-ritual="${r.id}">
      <div class="vignette ritual-art art"></div>
      <div class="card-copy"><h2>${r.title}</h2><p>${r.sub}</p></div>
    </button>`).join('')}
    <button class="ritual-card" data-ritual="free">
      <div class="vignette ritual-art art"></div>
      <div class="card-copy"><h2>自由心意</h2><p>不設題目，把心裡的話說出來</p></div>
    </button></div>
    <p class="book-note">說一句、寫一句，或安靜點選，都能參與。沒有特定信仰門檻。</p>
    </div></section>`;
}
