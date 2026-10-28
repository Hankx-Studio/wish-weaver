# AGENTS.md — 給 Muse Code（及任何 coding agent）的固定規則

每個 session 開始先讀：本檔 → docs/GAME_SPEC.md → docs/HANDOFF.md 最新一段 → 指定的 docs/tasks/Mx_*.md。
只做該任務檔列出的範圍；範圍外的想法寫進 HANDOFF 的「建議」，不要順手實作。

## 技術棧（不得更換）
- 前端：public/ 原生 HTML/CSS/ES modules，無建置步驟、無框架。視覺沿用 UI V3（style.css、assets/、docs/design_tokens.json）。
- 後端：Node 20+、Hono（@hono/node-server）、zod 驗證。單一程序。
- 測試：node:test（`npm test`），Meta API 一律 mock；真實呼叫只在 scripts/ 與手動驗收。
- Meta Model API：`https://api.meta.ai/v1`，Bearer `MODEL_API_KEY`。模型 ID 只從環境變數讀（見 .env.example）。

## 硬規則
1. 金鑰只存在伺服器環境變數。public/、tests/、docs/、commit 內容都不可出現金鑰。
2. 每個呼叫 Meta 的端點都要經過 budget guard 與 per-IP rate limit，並把 usage 與成本寫入 data/usage.jsonl（不記玩家原文、不記圖片）。
3. 回應一律帶 `source`：`meta_live` 或 `fallback_fixture`。不得把 fixture 標成 live，也不得在 UI 隱藏 fallback 標示。
4. 模型輸出一律用 zod 驗證；不合格重試 1 次，再失敗回 fallback。
5. XP、門檻、上限等數值只在 config 檔定義；XP 不由模型決定。
6. 不新增範圍外功能（GAME_SPEC §8）。
7. 每個函式 < 50 行、檔案 < 400 行；錯誤要處理並給玩家友善訊息。
8. 輸出精簡：程式單元一次 ≤ 4000 tokens 為原則，太大就拆。

## 模型與 effort 預設
開發一律 `muse-spark-1.3-contributor`。effort 依任務設定，用啟動參數 `--reasoning-effort`，或在 session 中用 `/effort` 切換：

| 任務 | effort | 原因 |
|---|---|---|
| M0 探測與契約 | high | 契約錯了後面全部重做 |
| M1 後端代理 | high | 預算、限流、重試的邊界情況多 |
| M2 遊戲主循環 | medium | 規格明確，主要是拆模組與接 UI |
| M3 演化 | high | 生圖提示詞調校、身分連續 |
| M4 拍照任務 | high | 遮罩格式、圖片處理、隱私判斷 |
| M5 打磨與部署 | medium | 細節多但不難 |
| M6 提交材料 | medium | 文件為主 |

- 開工時若目前 effort 與上表不符，先提醒人類切換，再開始。
- `max`、`ultra` 只在卡關時用：同一個錯誤修一次沒過才升級，解掉後切回上表。不得自行長時間停在 max。
- 遊戲執行時給玩家的呼叫（/api/wish 等）用低推理強度以壓低延遲；實際參數值以 M0 的實測為準，寫在 server/config.js。
- 背景 observer（記憶、skill、目標、驗證）會額外耗 token，保持預設開啟；需要省錢時再關。

## 多代理
- 要拆給多個子代理平行做時，用本 repo 的 `muse-team` skill（.agents/skills/muse-team/）。
- `~/.claude/skills/ai-team` 是 Claude Code 專用（依賴 Claude 的工具與模型），在 Muse 裡不要使用。

## Git
- 每個任務在自己的分支：`feat/m1-backend` 這類命名。小步 commit，訊息格式 `feat: ...` / `fix: ...` / `test: ...` / `docs: ...`。
- 不要 merge 到 main、不要 push --force。合併由人類審核後處理。

## 收尾（每個任務都要）
1. `npm test` 通過（附輸出摘要）。
2. 更新 docs/HANDOFF.md：完成了什麼、改了哪些檔、測了什麼、沒測什麼、阻礙、實際 Meta 用量與成本、下一步。
3. 證據放 docs/evidence/（探測結果、截圖、用量彙總）。未實測的東西不得標成完成。
