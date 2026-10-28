# 部署筆記（M5：只準備、不部署 — 平台由人類選）

## 兩個平台都已備好（本分支未執行任何部署指令）
- `render.yaml`：Blueprint，`npm ci --omit=dev`＋`node server/index.js`，
  健康檢查 `/api/health`。結構檢查通過（必填鍵齊、無金鑰字串）；
  完整驗證需人類在 Render dashboard 匯入（缺 pyyaml 本機只做結構檢查）。
- `fly.toml`：`sin` 區單機＋`min_machines_running=1`（保限流/預算計數一致，
  GAME_SPEC §7 單一程序），`/api/health` check。`fly` CLI 沙盒無此指令，
  未經 `fly config validate` — 人類執行前請先跑一次。

## 環境變數清單（兩平台同值，見各檔）
`PORT`、`META_API_BASE`、`MODEL_TEXT/IMAGE/SEG/ASR`、`DAILY/TOTAL_BUDGET_USD`、
`LIMIT_*`。`MODEL_API_KEY` 一律走平台 secret 設定：
Render＝Environment → Secret File/Value；Fly＝`fly secrets set MODEL_API_KEY=…`。
repo 內只有 `.env.example`，無真值（`grep` 可驗）。

## 評審期預算建議值（已寫入兩檔）
- `DAILY_BUDGET_USD=2`、`TOTAL_BUDGET_USD=20`。
- 依據：實測單輪心意 $0.0026–$0.0035（見 usage_summary.md），
  完整體驗（10 心意＋3 演化＋2 掃描）≈ $0.16；5 位試玩者全走完約 $1，
  評審現場另估 20 輪 ≈ $0.1。$2/日上限綽綽有餘，被盜刷也有熔斷。
- 預算用盡行為：玩家端點仍回 200＋`source:"fallback_fixture"`（永不 5xx）；
  `/api/health` 可公開查看 `budget.daily_used_usd`。

## 人類部署步驟（擇一）
1. Render：dashboard → New → Blueprint → 選 repo → 填 `MODEL_API_KEY` → Deploy；
   `autoDeploy: false`，更新需手動按。
2. Fly：`fly launch --no-deploy`（沿用本檔）→ `fly secrets set MODEL_API_KEY=…`
   → `fly deploy` → `curl https://<app>.fly.dev/api/health`。
3. 上線後驗：手機＋桌機各走一輪（心意→演化門檻→掃描），確認 `source` 多為
   `meta_live` 且 fallback 徽章只在該出現時出現。
