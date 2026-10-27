# 交接紀錄（最新在最上面）

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
