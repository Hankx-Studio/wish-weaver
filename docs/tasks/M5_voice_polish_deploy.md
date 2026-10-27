# M5 語音、打磨、部署（11/2 功能凍結）

分支：feat/m5-polish　依賴：M3、M4　預估成本：< $3
先讀：AGENTS.md、docs/GAME_SPEC.md、docs/HANDOFF.md 全部、docs/MODEL_INVENTORY.md（voice 段）

## 目標
讓第一次打開的評審 30 秒內就會玩、玩不壞、在公開網址上穩定運作。

## 範圍內
1. 語音心意：按住說話（MediaRecorder）→ /api/transcribe（muse-voice-transcribe-1.0）→ 填入輸入框讓玩家確認後送出。音檔 ≤ 30 秒、不保存。不支援的瀏覽器隱藏按鈕。
2. 新手引導 30 秒：首次開啟時精靈自我介紹（3 步，可跳過）。
3. 打磨：光效與過場順暢、按鈕回饋、空狀態、錯誤狀態、載入骨架；鍵盤可操作、焦點可見、對比足夠。
4. 健壯性：
   - scripts/load-test.mjs：20 個並發 /api/wish（對 mock 模式），確認限流與 budget 正確、無崩潰。
   - 端到端煙霧測試：從空資料到 stage1、完成 1 次掃描（可用 Playwright，或手動逐步截圖存 docs/evidence/m5/）。
5. 部署：單一程序（Render 或 Fly.io 擇一；先問人類選哪個）；HTTPS；環境變數設定；DAILY_BUDGET_USD 與 TOTAL_BUDGET_USD 設成評審期可承受的值；/api/health 可公開查看。
6. 用量報告：scripts/usage-report.mjs 彙總 data/usage.jsonl → docs/evidence/usage_summary.md（每輪平均成本、各模型總花費、延遲 p50/p95）。

## 範圍外
任何新玩法。11/2 晚上之後只修 bug。

## 驗收
- 公開網址在手機（iOS Safari、Android Chrome）與桌機 Chrome 都能玩完一輪。
- 5 位試玩者回饋整理在 docs/evidence/m5/playtest.md（每人：卡在哪、最喜歡什麼）。
- usage_summary.md 有真實數字。

## 開場指令（貼給 Muse）
```
請執行 docs/tasks/M5_voice_polish_deploy.md。先讀 AGENTS.md、GAME_SPEC、HANDOFF 全部。
先做語音與新手引導，再做健壯性，最後部署。部署平台先問我。用 /plan 開始。
```
