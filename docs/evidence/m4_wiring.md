# M4 掃描任務 — 接線指南（給 Leader：以下 3 檔由你改，M4 未碰）

## 1. server/index.js
- 取代 import：
  ```js
  import { createQuestHandler } from "./routes/quest.js";
  import { createScanHandler } from "./routes/scan.js";
  ```
  （刪掉 `postQuestHandler`／`postScanHandler` 的 import；stub 仍在檔內，
  但掛載改用 factory。）
- 在 `createApp` 內、wishLimiter 旁加：
  ```js
  const questLimiter = createRateLimiter({ windowMs: 3600_000, max: 30 });
  const scanLimiter = createRateLimiter({ windowMs: 86400_000, max: config.limits.scanPerDay });
  ```
- 取代掛載：
  ```js
  app.post("/api/quest", createQuestHandler({ config, budget, limiter: questLimiter }));
  app.post("/api/scan", createScanHandler({ config, budget, limiter: scanLimiter }));
  ```
- 同步更新 `tests/app.test.js` 的 stub 測試：quest/scan 不再是 501
  （改斷言 200＋fixture 形狀，或刪該兩項；M4 沒改此檔是刻意留給你）。

## 2. public/js/main.js
- import 加：
  ```js
  import { renderScan, mountScan } from './views/scan.js';
  import { mountCabinet } from './views/cabinet.js';
  ```
- `render()` 加：
  ```js
  else if (route === 'scan') mountScan(app, { state, demo: DEMO, persist, toast, go: setRoute });
  else if (route === 'cabinet') mountCabinet(app);
  ```
  （`persist`、`toast`、`setRoute`、`DEMO` 皆 main.js 現有函式/變數。）
- `header()` 的 top-nav 與 mobileNav 各加：
  ```js
  navButton('scan', '今日任務') + navButton('cabinet', '寶物櫃')
  ```
  （「寶物櫃」nav item 為本任務指定。）

## 3. public/index.html
- `<head>` 內加：
  ```html
  <link rel="stylesheet" href="css/scan.css">
  ```

## 回應形狀（前端已照此實作）
- quest：`{source, quest:{id, quest_id, title, text, hint, target_noun_en, element, kind}}`
- scan：`{source, ok, matched, found, quest_id, boxes, best_box, mask_rle_preview,
  mask_hash, mask_tiny:{w,h,b64}, spirit_line, human?, usage, xp_awarded, reason?}`
- XP：scan 回 `xp_awarded`（20/0，服務端數值引自 `public/js/config.js`
  的 `XP_PER_QUEST`）；前端 `mountScan` 直接加 XP 並 `persist()`。
  M5 可考慮把加 XP 收進 `state.js`（M4 不動該檔）。
