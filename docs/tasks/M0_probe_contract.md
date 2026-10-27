# M0 API 探測與契約凍結

分支：feat/m0-probe　依賴：無　預估成本：< $0.5
先讀：AGENTS.md、docs/GAME_SPEC.md（§4–§7、§9）

## 目標
用真實小請求確認五個模型的請求格式、回應格式、usage 欄位與延遲，然後把 /api/* 契約寫死，後面所有任務照這份做。

## 範圍內
1. `npm install`：hono、@hono/node-server、zod（記錄實際安裝版本）。
2. scripts/probe.mjs（`npm run probe`），每個模型最多 2 次請求，逐項記錄 HTTP 狀態、延遲 ms、usage、回應結構（截斷內容，不存完整圖片）：
   - muse-spark-1.3：`POST /v1/responses`。測三件事：(a) 是否支援 JSON schema 結構化輸出（OpenAI 相容的 `text.format` / `response_format` 擇一試）；(b) 圖片輸入（用 public/assets/fairy.webp 縮圖）；(c) `reasoning_effort`（文件 https://dev.meta.ai/docs/reasoning.md）：同一句心意分別用 none／low／medium 各跑 1 次，比較延遲、輸出 tokens 與台詞品質，選出遊戲端預設值。
   - muse-image-1.0：`/v1/images/generations` 生 1 張 512px；`/v1/images/edits` 用上一張改 1 次（例如加一圈星光），確認角色是否維持。圖片存 data/probe/，不進 git。
   - sam-3.1：`POST /v1/responses`，對 public/assets/vignettes.webp 用文字提示（如 "bread"）取得 boxes/masks，記錄遮罩格式（RLE、PNG、polygon？）。
   - muse-voice-transcribe-1.0：用 macOS `say -o data/probe/hello.aiff "謝謝今天的晚餐"` 轉 wav 或 m4a 後測一次，記錄端點與格式；若端點不明，記錄嘗試過程並標 blocked。
3. 依探測結果寫 docs/MODEL_INVENTORY.md：模型 ID、端點、請求範例（去掉金鑰）、回應欄位、usage 欄位名、實測延遲、單次成本、限制與怪癖。
4. 寫 docs/API_CONTRACT.md（凍結 v1.0）：`/api/health`、`/api/wish`、`/api/evolve`、`/api/quest`、`/api/scan`、`/api/transcribe` 的請求、回應、錯誤碼（400 驗證失敗、413 太大、429 限流、503 預算用盡→仍回 200＋fallback_fixture 的規則寫清楚）。WishReading 以 GAME_SPEC §6 為準，依實測調整。
5. 把 GAME_SPEC 狀態改為「v1.0 凍結」，§9 補上語音價格（查官方價目頁 https://dev.meta.ai/docs/pricing-rate-limits）。

## 範圍外
任何伺服器端點、前端修改。

## 交付物
scripts/probe.mjs、docs/evidence/probe_results.json、docs/MODEL_INVENTORY.md、docs/API_CONTRACT.md、HANDOFF 更新。

## 驗收
- 五個模型各有一筆真實結果（成功或明確失敗原因），沒有任何一筆是猜的。
- 契約裡每個欄位都能對應到探測結果或明確的設計決定。
- `git grep -n "MODEL_API_KEY=" -- ':!.env.example'` 沒有結果；探測紀錄不含金鑰。

## 開場指令（貼給 Muse）
```
請執行 docs/tasks/M0_probe_contract.md。先讀 AGENTS.md 與 docs/GAME_SPEC.md。
先用 /plan 列出探測步驟與每個模型的請求數上限，等我確認後再執行。
金鑰在 .env 的 MODEL_API_KEY，不可印出或寫入任何檔案。
```
