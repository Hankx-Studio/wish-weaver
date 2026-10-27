# M1 後端代理（含預算守門）

分支：feat/m1-backend　依賴：M0　預估成本：< $0.5
先讀：AGENTS.md、docs/GAME_SPEC.md、docs/API_CONTRACT.md、docs/MODEL_INVENTORY.md

## 目標
一個安全、會省錢、壞了也不會讓遊戲停擺的伺服器，先完成 `/api/health` 與 `/api/wish`。

## 範圍內
1. server/ 結構（每檔 < 400 行）：
   - index.js：Hono app、靜態檔 public/、掛路由、啟動。
   - config.js：讀環境變數並驗證（缺 MODEL_API_KEY 時啟動即報錯；價目表放這裡）。
   - metaClient.js：fetch 包裝；逾時 20s；5xx/429 指數退避重試 1 次；回傳 `{data, usage, costUsd, latencyMs}`。
   - budget.js：每日與總額花費計數，啟動時從 data/usage.jsonl 重建；`canSpend(estimateUsd)`、`record(entry)`。
   - rateLimit.js：per-IP 滑動視窗（記憶體），限額讀 config。
   - usageLog.js：append JSONL：`{ts, endpoint, model, inputTokens, outputTokens, images, costUsd, latencyMs, source}`。不記玩家原文。
   - prompts/wish.js：系統提示（精靈人設、兒童友善、≤40 字、與玩家同語言、安全分類規則、只輸出 JSON）。
   - schemas.js：zod 的 WishRequest、WishReading。
   - fixtures.js：每個 element 至少 2 筆 fallback 回應（台詞要好，評審可能看到）。
   - routes/health.js、routes/wish.js。
2. /api/wish 流程：驗證輸入（ritual ∈ meal|gratitude|bedtime|free，text 1–120 字）→ rate limit → budget → Spark（結構化輸出依 M0 結論）→ zod 驗證，失敗重試 1 次 → 回 WishReading（含 source、usage）。預算或限流不足時回 fallback_fixture（200）並附 `reason`。
3. 安全規則落在伺服器：safety=block 時 spirit_line 用固定婉拒句；safety=support 時附 `help` 欄位（1925 安心專線、110/119）。
4. /api/health：回傳 `{ok, models, budget:{todayUsd, totalUsd, dailyCap, totalCap}}`，不回金鑰或 IP。
5. tests/（node:test，mock fetch）：輸入驗證、模型回壞 JSON 會重試再 fallback、預算用盡回 fallback、限流、block/support 分支、usage 寫入且不含原文、靜態檔可取得。
6. scripts/smoke-wish.mjs：對本機伺服器打 3 句真實心意（中文、英文、一句負面情緒），結果存 docs/evidence/m1_smoke.json。

## 範圍外
前端改動、/api/evolve、/api/scan、/api/quest、/api/transcribe（只先放 501 路由）。

## 驗收
- `npm test` 全過。
- smoke 3 句皆為 meta_live、格式正確，延遲與成本記在 evidence。
- 把 DAILY_BUDGET_USD 設成 0 重啟後，/api/wish 回 fallback_fixture。
- `grep -rn "MODEL_API_KEY" public/` 無結果。

## 開場指令（貼給 Muse）
```
請執行 docs/tasks/M1_backend.md。先讀 AGENTS.md、GAME_SPEC、API_CONTRACT、MODEL_INVENTORY。
用 /plan 先列出檔案與測試清單，我確認後再寫。先寫測試再實作（TDD），每完成一個模組就跑 npm test。
```
