# 交接紀錄（最新在最上面）

## M5 語音、打磨、健壯性 — 2026-10-28 10:57（台北） — 狀態：done（待人類驗收＋選平台）
- 完成：/api/transcribe 真實作（LOCAL zod、WAV 檢核 mono16/16-24kHz/≤30s/≤2MB、
  budget＋transcribeLimiter＋usage.jsonl、失敗回 200 固定 reason、空稿回
  empty_transcript；index.js 掛真 handler＋transcribeLimiter）；心意頁語音鈕
  （MediaRecorder→前端轉 24kHz mono WAV→填框待確認、不支援隱藏、錄音中切頁停軌；
  空稿/拒絕/逾時皆友善中文）；3 步可略過新手引導（一次性 localStorage）；
  M5 拋光 CSS（按鈕回饋、過場、loading/empty/error、focus 可見、reduced-motion）；
  scripts/load-test.mjs（20 併發 mock、全過）＋usage-report.mjs（全真實數字）＋
  e2e-smoke.mjs（空庫→stage1→1 掃描 8 步全過）＋voice-probe.mjs；
  usage_summary.md（總 spend ≈ $0.1734，全來源標註）；render.yaml＋fly.toml
  雙平台備好（未部署）；playtest_template.md＋自玩筆記。
- 改動檔案：server/routes/transcribe.js（重寫）、server/index.js、
  tests/app.test.js（501→400 斷言）、tests/transcribe.test.js（新增 5 測）、
  public/js/voice.js（新增）、public/js/views/guide.js（新增）、
  public/js/views/ritual.js、public/js/main.js、public/style.css（M5 段）、
  scripts/load-test.mjs、scripts/usage-report.mjs、scripts/e2e-smoke.mjs、
  scripts/voice-probe.mjs、docs/evidence/usage_summary.md、docs/evidence/m5/
  （voice_probe.json、e2e.log、load-test.log/.md、deploy_notes.md、
  playtest_template.md）、render.yaml、fly.toml、docs/HANDOFF.md。
- 測試：`npm test --cache /tmp/npm-cache-m5w` 107/107 pass（原 102＋transcribe 5）；
  load-test 8 項全 PASS（20 併發 200/model 零呼叫於預算零）；e2e 8 步 OK；
  live voice plumbing 200 meta_live＋empty_transcript（2s、$0.0001、1717ms）。
- 未測（HUMAN-NEEDED，人類驗收清單）：①真實中文語音轉錄品質（sandbox 擋 `say`
  音訊合成：afinfo 證實 0 bytes/0.000s，見 voice_probe 旁證據說明；探測改走
  ffmpeg 正弦波驗端點）；②真機瀏覽器（錄音/轉檔/IndexedDB/動畫）＋截圖
  （M2/M3/M4 遞延同此）；③5 位試玩者（模板已備）；④平台選擇＋真部署＋上線驗；
  ⑤`fly config validate`（沙盒無 fly CLI，只做結構檢查）、render.yaml 完整匯入驗證；
  ⑥手機 iOS Safari/Android Chrome 實玩一輪。
- 阻礙：①sandbox 擋 `say` 音訊（有列出中文音色、寫檔皆 0 位元組）→真實語音品質
  留待人類；②sandbox 禁 listen()/背景程序/Chrome headless（沿用 M2 模式：
  in-process app.request＋mock）；③本機無 pyyaml/fly CLI（deploy configs 只結構檢查）。
- Meta 用量：M5 新增 live 1 次（voice tone 2s ≈ $0.0001；見 m5/voice_probe.json）。
  全專案實測總 spend ≈ $0.1734（« $3；明細見 usage_summary.md）。
- 決策：①前端轉 WAV（AudioContext 解碼→24kHz mono 16-bit），伺服器只收 WAV
  並驗 header——契約寫 m4a/webm 但無 ffmpeg 依賴不新增（AGENTS 硬規則），
  前端隱藏格式差異；m4a 直送一律 400。②非 WAV/超大/超 30s→400（scan 前例）；
  限流/預算/模型失敗→200＋reason（quest 前例，玩家端點永不 5xx）。
  ③e2e.log 保留 brief 原名（被 .gitignore `*.log` 排除），內容同步 load-test.md
  ＋本段，未遺失。④評審期預算 DAILY=2/TOTAL=20（依據見 deploy_notes.md）。
- 下一步：人類①選平台部署②真機＋真實中文語音驗③5 位試玩④11/2 功能凍結後只修 bug。

## M3+M4 整合（Leader） — 2026-10-28 — 狀態：done
- 完成：feat/m5-polish 從 M3 tip 開出，merge M4（disjoint 無衝突）；套用
  m3/m4_wiring.md：index.js 掛 evolve/quest/scan 真路由（含 limiter＋fetchImpl
  透傳）、index.html 加 2 css、main.js 加 evolve/scan/cabinet 路由＋寶物櫃 nav
  ＋evolve-N 動作、growth.js 加 stage 畫廊＋演化入口；app.test.js stub 斷言改
  寫（transcribe 仍 501、evolve/scan 先驗證、quest 斷網回模板）。
- 改動檔案：server/index.js、public/index.html、public/js/main.js、
  public/js/views/growth.js、tests/app.test.js、docs/API_CONTRACT.md（v1.1）、
  docs/HANDOFF.md（併入 M3/M4）。
- 測試：`npm test` 102/102 pass（M1 50＋M2 17＋M3 12＋M4 17＋app 更新）。
- 未測：掛載後整站 `?demo=1` zero→stage3（留 M5 E2E/手動）。
- 阻礙：無。
- Meta 用量：整合本身 $0。
- 決策（契約裁定）：M4 回報契約 quest/scan 節與任務檔衝突（fixture-only／5MB
  /413 vs Spark 出題／2MB／400／ok-matched-spirit_line）。裁定：任務檔＋
  GAME_SPEC 意圖勝出，契約修訂為 v1.1（Spark 出題＋模板回退、2MB/400、
  mask_tiny/best_box 新欄位）；M4 超集回應保留舊欄位，相容 v1.0 讀者。
- 下一步：M5（語音＋檔案重測 transcribe 真實中文、健壯性、部署人類選平台）。

## M3 演化 — 2026-10-28 — 狀態：done（Leader 已驗收＋接線）
- 完成：/api/evolve 全鏈（XP 門檻 30/90/180、家族加權抽籤 seed=playerId+stage、
  stage1 generations／stage2-3 edits＋IDENTITY_KEEP、Spark 2 句故事 ≤80 字、
  budget＋日限流＋usage.jsonl、失敗回 {ok:false, keep:true}）；前端 imageStore
  ＋evolveFlow＋views/evolve＋evolve.css；tune grid 9 張（bloom/tide/starlight）。
- 改動檔案：server/routes/evolve.js、server/evolveFamily.js、
  server/prompts/styleLock.js、server/prompts/evolveStory.js、
  public/js/imageStore.js、public/js/evolveFlow.js、public/js/views/evolve.js、
  public/css/evolve.css、scripts/evolve-tune.mjs、tests/evolve.test.js、
  docs/evidence/m3/、wiring＋handoff 片段。
- 測試：分支上 80/80 pass；live trio 同一角色親驗（bloom-s1→s3 臉/髮/姿勢保留）；
  mock 圖片失敗回 keep:true。
- 未測：接線後整站 demo、真機 reduced-motion、IndexedDB 跨階段（待 M5）。
- 阻礙：無。
- Meta 用量：tune 9×image ≈ US$0.09。
- 決策：前端先用推薦風格 A 接線；grid/bloom trio 等人類早上確認（見
  docs/evidence/m3/style_pick.md）。
- 下一步：Leader 接線（已做）→ M5。

## M4 拍下你的世界 — 2026-10-28 — 狀態：done（Leader 已驗收＋接線）
- 完成：/api/quest（Spark 出題＋模板回退，id/text/hint 相容契約舊欄位）；
  /api/scan（MIME 魔數＋≤2MB、SAM 最佳 mask/box＋Spark 判定＋一句台詞、
  人臉拒收無 XP、圖片不存檔）；server/samMask.js（wire 解析＋雙編碼解碼器，
  與 @meta-sam/parser 21 向量＋3 真機逐位元一致）；前端 maskCut／
  treasureStore／scan／cabinet／scan.css。
- 改動檔案：server/samMask.js、server/prompts/quest.js、
  server/prompts/scanJudge.js、server/routes/quest.js、server/routes/scan.js、
  public/js/maskCut.js、public/js/treasureStore.js、public/js/views/scan.js、
  public/js/views/cabinet.js、public/css/scan.css、tests/quest.test.js、
  tests/scan.test.js、docs/evidence/m4/、wiring＋handoff 片段。
- 測試：分支上 87/87 pass；真機 1 quest＋8 scans 全 meta_live
  （food/flower/bowl matched、人臉拒收；見 evidence/m4/README.md）。
- 未測：瀏覽器實測（views、IndexedDB、縮圖、動畫；留 M5）；真杯實拍
  （風格化小杯 SAM 回 0 boxes，證據改用飯碗）。
- 阻礙／決策：range decoder 短路語意已修＋回歸鎖定；契約衝突已報 Leader
  裁定（見上）；ffmpeg webp 剪裁需先 format=rgb24。
- Meta 用量：1 quest＋8 scans＋探測 ≈ US$0.065。
- 建議：quest 文案引導拍大容器；mask_tiny 寬 64px 可調。
- 下一步：Leader 接線（已做）→ M5。

## M2 遊戲主循環（前端） — 2026-10-28 11:00（台北） — 狀態：done
- 完成：public/app.js（50 行原型）拆成 ES modules：public/js/config.js（GAME_SPEC §4 全部數值）、
  state.js（key `wishweaver.v1`、版本號、損壞重置；純函式可被 node:test import）、api.js（timeout 25s 競速＋友善錯誤＋ApiError kind）、
  effects.js（6 元素光效＋typewriter＋prefers-reduced-motion＋onThresholdReached 掛鉤）、views/home|rituals|ritual|result|growth.js、main.js（路由＋demo/preview＋頁尾真實狀態）。
  新玩家 0 XP＋stage0 粒子光球；fairy.webp 只在 `?preview=fairy`。導覽縮為精靈花庭/日常儀式/成長之書；範圍外頁全移除。
  儀式頁 3 儀式＋自由心意、120 字計數、「精靈聆聽中」；結果頁光效＋逐字＋XP/結晶、support 求助卡（1925/110/119）無慶祝、block 婉拒無 XP；
  fallback 角落徽章；成長之書 XP 條/6 結晶/近 20 筆/清除按鈕；`?demo=1` ×3＋展示徽章；頁尾接 /api/health 真實狀態。
- 改動檔案：public/index.html（重寫 module 殼）、public/style.css（M2 段落附加）、public/js/（新增 11 檔）、
  public/app.js（刪除）、tests/state.test.js（新增 17 tests）、docs/evidence/m2/rounds.json（新增）。
- 測試：`npm test` 67/67 pass（M1 50＋state 17）；3 輪真實心意全 meta_live（見 rounds.json）；
  demo 1 輪 30 XP→stage1→hook；離線 kind=offline＋友善訊息＋重試鈕（node 實測 api.js；UI 重試渲染同槽）。
- 未測：4 視圖×2 尺寸截圖（sandbox 跑不起 Chrome headless 也禁 listen，defer 到 M5 E2E/手動驗收）；
  真機逐字/typewriter 視覺、support/block 真實分支（驗收用 wishes 全 safety=none）。
- 阻礙：sandbox 禁 listen()（驗收改走 app.request in-process）、禁背景程序、Chrome headless 無輸出。
- Meta 用量：wish×6（兩批各 3）/ in ~2190＋out ~4020 tokens / 成本 ≈ US$0.02（« $1）。明細見 rounds.json（第二批 $0.0094395）。
- 決策：api.js timeout 用 Promise.race 而非只靠 AbortSignal（忽略 signal 的實作也不會卡死）；安靜完成走本地 fallback（不花錢）。
- 下一步：M3 演化（接 onThresholdReached、生圖＋IndexedDB）。

---

每個任務結束時新增一段，格式：

```
## Mx 任務名 — YYYY-MM-DD HH:mm（台北） — 狀態：done / partial / blocked
- 完成：
- 改動檔案：
- 測試：指令與結果摘要
- 未測：
- 阻礙：
- Meta 用量：呼叫次數 / tokens / 圖片數 / 成本 USD（來源：data/usage.jsonl 或後台）
- 決策：（偏離 GAME_SPEC 的地方與原因）
- 下一步：
```

---

## M1 後端代理（含預算守門） — 2026-10-28 10:20（台北） — 狀態：done
- 完成：server/ 全實作（config/metaClient/budget/rateLimit/usageLog/schemas/fixtures/prompts/wish、
  routes health+wish、evolve/quest/scan/transcribe 501 stubs、index Hono app＋靜態 public/）；
  tests/ 9 檔 50 測全過；smoke 3/3 meta_live；DAILY_BUDGET_USD=0 證實回 fallback；缺 key 啟動即報錯退出 1。
- 改動檔案：server/config.js、server/metaClient.js（含去重 /v1 修正）、server/budget.js、
  server/rateLimit.js、server/usageLog.js、server/schemas.js、server/fixtures.js、
  server/prompts/wish.js、server/routes/health.js、server/routes/wish.js、
  server/routes/evolve.js、server/routes/quest.js、server/routes/scan.js、
  server/routes/transcribe.js、server/index.js、tests/*.test.js（9 檔）、
  scripts/smoke-wish.mjs、docs/evidence/m1_smoke.json。
- 測試：`npm test --cache /tmp/npm-cache-m1` → 50 pass / 0 fail（含輸入驗證、壞 JSON 重試後 fallback、
  重試成功復原、預算用盡、per-IP 限流＋Retry-After、block/support 分支、usage 無原文、靜態檔、501 stubs）。
  smoke：gratitude 中文 ember/grateful（2952ms, $0.002742）、meal 英文 ember/grateful（1916ms, $0.002650）、
  bedtime 負面情緒 star/tired＋safety=support（2679ms, $0.003186），3/3 meta_live 且格式全 valid。
  預算零點：PORT=8788＋DAILY/TOTAL=0 → 200 fallback_fixture＋reason=budget_exhausted（health 顯示已用 0.008578/上限 0）。
  `grep -rn MODEL_API_KEY public/` 0 筆；repo 內無 Bearer/sk- 金鑰字串；usage.jsonl 無玩家原文（0 命中）。
- 未測：併發/重啟後 budget 重建（僅程式邏輯＋單元測試覆蓋，未做 kill -9 實測）；限流分散式情境（單程序假設）。
- 阻礙：①sandbox 擋 listen（EPERM），改走 require_escalated 跑本機伺服器才完成 smoke。②初版 metaClient
  把 META_API_BASE 後再拼 /v1 造成 /v1/v1 404 而全回 fallback（M0 已踩過的坑）；已修＋加測試鎖定。
- Meta 用量：本任務實測 4 次呼叫（instructions 探測 1＋smoke 3）/ in 約 1244＋out 約 2294 tokens /
  圖片 0 / 成本 ≈ US$0.0113（« $0.5；來源：m1_smoke.json＋探測輸出）。
- 決策：①契約凍結優先——health 照 API_CONTRACT（ok/version/budget.daily_used_usd/daily_cap_usd/models），
  不用 brief 內另一形狀；請求欄位用契約的 `wish`（不用任務檔的 `text`）。
  ②限流在玩家端點回 200 fallback＋reason＋Retry-After（依 brief 流程與 M1_backend §範圍內；
  契約的 429 保留給非玩家端點/未來）。③模型失敗也附 reason=model_unavailable（契約只說 fallback，
  多帶原因便於除錯）。④系統提示用 Responses `instructions` 頂層參數（已真機驗證 200）。
  ⑤enum schema 仍擋不住模型（再現 intensity 8、safety 自由文字），伺服器鉗制＋映射才是真正防線。
  ⑥unknown safety 字串 fail-closed → support。
- 下一步：M2 遊戲主循環（前端用契約 `wish` 欄位打 /api/wish；展示 `help` 與 fallback 標示）。
- 建議：M5 前記得重測 transcribe 中文語音（M0 未驗）。

## M0 探測與契約凍結 — 2026-10-28 09:45（台北） — 狀態：done
- 完成：五模型皆有真實 200 結果；凍結 API_CONTRACT v1.0；GAME_SPEC 轉 v1.0 凍結並補語音價格。
- 改動檔案：scripts/probe.mjs（新增，`npm run probe`，支援 `npm run probe -- <only>` 子集重跑）、
  docs/evidence/probe_results.json（8 筆：spark structured×3/image×1/image gen+edit/sam/voice）、
  docs/MODEL_INVENTORY.md（新增）、docs/API_CONTRACT.md（新增 v1.0）、
  docs/GAME_SPEC.md（狀態→v1.0 凍結；§9 語音 $0.18/音訊小時，查核價目頁）、
  data/probe/（gen1.webp、edit1.webp、hello.wav，gitignored）。
- 測試：`npm test` 通過（M0 尚無 tests，0 fail）；探測 8/8 有 HTTP 結果，
  5 模型各 ≥1 個 200；`git grep MODEL_API_KEY=` 唯一命中是 M0 任務檔內驗收指令本文，無金鑰值。
- 未測：voice 轉錄文字品質（sandbox 擋 `say`，用正弦波只驗端點/格式；M5 用真實中文語音重測）、
  SAM mask 解碼（M4 實作 client libraries 解析時再驗）、Chat Completions 相容寫法（本專案只用 Responses）。
- 阻礙：初期 `curl api.meta.ai` 超時、probe 路徑誤疊 `/v1/v1`（已修：endpoint 以 host root 拼接）；
  `say` 在 sandbox 零位元組輸出（Operation not permitted），改 ffmpeg 正弦波驗端點。
- Meta 用量：計費呼叫 8 次（spark×4、image×2、sam×1、voice×1）＋5 次 4xx 免費（雙/v1、截斷圖、錯 MIME、錯編碼）/
  tokens 約 33in＋(323+685+1312+450)out＋圖 token 參考值 / 圖片 2 張 / 成本 ≈ US$0.036（« $0.5）。
  版本：hono 4.13.14、@hono/node-server 2.1.5、zod 4.6.7。
- 決策：①遊戲預設 `reasoning.effort=low`（同品質下最快 4.7s、token 居中；none 會 400）。
  ②契約 enum 化 element/mood/effect/safety＋intensity 鉗制 1–3（模型曾回自由文字與 intensity 8）。
  ③effect 由伺服器映射（模型 effect 欄位亦自由發揮）。④預算用盡仍 200＋fallback（永不 5xx）。
  ⑤mask 全文不回前端，只回 boxes＋雜湊。⑥/image `/v1` 拼接、edits MIME 須與位元組一致、
  transcribe `audioEncoding:"WAV"`＋必填 `model`（皆為實測踩坑）。
- 下一步：M1 後端代理——照 API_CONTRACT 實作 budget guard、per-IP 限流、metaClient（逾時 20s＋重試 1 次）、
  zod 驗證、usage.jsonl；M5 前用真實語音重測 transcribe。
- 建議：無（範圍外想法：轉錄可試 ENDPOINTING 模式切多句心意，M5 評估）。

## S0 骨架 — 2026-10-28 — 狀態：done
- 完成：建立 repo、匯入 UI V3 原型到 public/、寫 GAME_SPEC v1 草案、AGENTS.md、M0–M6 任務檔。
- 未做：任何後端與模型串接（從 M0 開始）。
- 下一步：M0 API 探測與契約凍結。
