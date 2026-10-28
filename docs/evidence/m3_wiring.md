# docs/evidence/m3_wiring.md — M3 mount snippets (Leader applies)

M3 不動 `server/index.js`、`public/js/main.js`、`public/js/views/growth.js`、
`public/index.html`（M4 並行）。Leader 合併時套用以下三段。

## 1. server/index.js — 掛 /api/evolve

刪掉 stub 行：

```js
import { postEvolveHandler } from "./routes/evolve.js";
```

換成：

```js
import { createEvolveHandler } from "./routes/evolve.js";
```

在 `createApp` 內、`wishLimiter` 下一行加：

```js
const evolveLimiter = createRateLimiter({ windowMs: 86400_000, max: config.limits.evolvePerDay });
```

把：

```js
app.post("/api/evolve", postEvolveHandler);
```

換成：

```js
app.post("/api/evolve", createEvolveHandler({ config, budget, limiter: evolveLimiter, fetchImpl }));
```

## 2. public/index.html — 載入 evolve.css

在 `<link rel="stylesheet" href="style.css">` 下一行加：

```html
<link rel="stylesheet" href="css/evolve.css">
```

（注意：`public/css/` 不存在，`public/style.css` 在根目錄；
M3 新增的 `public/css/evolve.css` 用 `css/evolve.css` 引用。）

## 3. public/js/main.js — evolve 路由 + 成長之書顯示

頂部 import 加：

```js
import { renderEvolve } from './views/evolve.js';
import { evolveToStage, playTransition } from './evolveFlow.js';
import { getPlayerId, stageKey, getStageImage, listStageImages } from './imageStore.js';
```

`render()` 內、`route === 'growth'` 分支前加：

```js
else if (route === 'evolve') renderEvolve(app, ctx());
```

`document.addEventListener('click', …)` 的 action 分支加：

```js
else if (a === 'evolve-1' || a === 'evolve-2' || a === 'evolve-3') {
  const toStage = Number(a.split('-')[1]);
  const stageEl = document.getElementById('evolveStage');
  evolveCtx.status = 'evolving'; evolveCtx.error = null; render();
  await playTransition(document.getElementById('evolveStage'));
  try {
    const { result, note } = await evolveToStage(state, toStage);
    if (result.ok) {
      evolveCtx = { status: 'done', source: result.source, family: result.family,
        current: { stage: toStage, b64: result.image_b64, story: result.story },
        previous: evolveCtx.current?.b64 || null, story: result.story, note,
        nextStage: Math.min(3, toStage + 1), canEvolve: state.xp >= [0, 90, 180][toStage] };
    } else {
      evolveCtx = { ...evolveCtx, status: 'error', error: '演化失敗，原圖與 XP 保留，再試一次好嗎？' };
    }
  } catch (e) {
    evolveCtx = { ...evolveCtx, status: 'error', error: evolveErrorMessage(e) };
  }
  setRoute('evolve');
}
```

並在 `let thresholdNote` 附近加 `let evolveCtx = { status: 'idle', nextStage: 1, canEvolve: false };`，
`ctx()` 回傳加 `evolve: evolveCtx`。
`renderGrowth` 的顯示鉤子（growth.js 由 Leader 小改）：在 `renderGrowth` 頂部
`await listStageImages()` 讀各階段圖，沒有圖時維持現狀。
