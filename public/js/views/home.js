import { THRESHOLDS } from '../config.js';
import { stageFor, nextThreshold } from '../state.js';

export function orbArt(label = '初生粒子光球') {
  return `<div class="orb-wrap" role="img" aria-label="${label}">
    <div class="orb-core"></div>
    <div class="orb-ring r1"></div><div class="orb-ring r2"></div>
    <i class="orb-mote m1"></i><i class="orb-mote m2"></i><i class="orb-mote m3"></i>
    <i class="orb-mote m4"></i><i class="orb-mote m5"></i><i class="orb-mote m6"></i>
  </div>`;
}

export function stageBlock(state, compact = false) {
  return `<div class="stage ${compact ? 'compact' : ''}">
    <span class="star-dot one">✧</span><span class="star-dot two">✧</span>
    <span class="star-dot three">✧</span>
    <div class="summon-ring" aria-hidden="true"></div>
    <button class="fairy-button" data-action="summon" aria-label="輕觸召喚精靈">${orbArt()}</button>
    <p class="fairy-name">初生之光</p>
    <p class="fairy-note">它的模樣，還沒有被寫好。</p>
  </div>`;
}

export function renderHome(root, ctx) {
  const { state } = ctx;
  const next = nextThreshold(state.xp);
  const pct = next ? Math.min(100, Math.round((state.xp / next) * 100)) : 100;
  root.innerHTML = `<section class="frame"><div class="heading home-heading">
    <p class="eyebrow">YOUR LITTLE SANCTUARY</p>
    <h1 class="title">今日也，讓心意發光</h1>
    <p class="subtitle">回到花庭，和你的精靈相遇。</p></div>
    <div class="home-grid">
    <aside class="home-side greeting"><div class="paper">
      <p class="date">今日花庭</p><h2>早安，旅人</h2>
      <p class="quote">「小小的溫柔，<br>也會讓世界亮一點。」</p>
      <div class="fine-rule"></div><h3 class="small-title">一起慢慢長大</h3>
      <div class="progress-label"><span>stage ${stageFor(state.xp)}</span><span>${state.xp} / ${next ? next + ' XP' : 'MAX'}</span></div>
      <div class="progress-track"><span style="width:${pct}%"></span></div>
      <p>${next ? `再 ${next - state.xp} XP，精靈將醞釀變化。` : '精靈已經綻放了。'}</p>
      <button class="quiet-link" data-nav="growth">翻開成長之書 →</button>
    </div></aside>
    <div class="stage-wrap">${stageBlock(state)}
      <div class="hero-actions">
        <button class="btn primary" data-nav="rituals">開始一段祝福</button>
        <button class="btn gold" data-action="summon">輕輕召喚</button>
      </div>
    </div>
    <aside class="home-side"><div class="paper">
      <span class="mini-tag">給今天的你</span><h2>每天 30 秒</h2>
      <p>用一句真心話，養大一隻獨一無二的精靈。</p>
      <div class="little-line"><button class="btn small ghost" data-nav="rituals">翻開今日的祝福</button></div>
    </div></aside>
    </div></section>`;
}
