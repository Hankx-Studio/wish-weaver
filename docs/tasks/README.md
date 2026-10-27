# 任務清單與執行方式

| 任務 | 檔案 | 分支 | 台北日期 | 依賴 | 預估 Meta 成本 |
|---|---|---|---|---|---|
| M0 API 探測與契約凍結 | [M0_probe_contract.md](M0_probe_contract.md) | feat/m0-probe | 10/28 | 無 | < $0.5 |
| M1 後端代理 | [M1_backend.md](M1_backend.md) | feat/m1-backend | 10/28–29 | M0 | < $0.5 |
| M2 遊戲主循環 | [M2_game_loop.md](M2_game_loop.md) | feat/m2-game-loop | 10/29 | M1 | < $1 |
| M3 演化 | [M3_evolution.md](M3_evolution.md) | feat/m3-evolution | 10/30 | M2 | < $3 |
| M4 拍下你的世界 | [M4_scan_quest.md](M4_scan_quest.md) | feat/m4-scan | 10/31 | M2 | < $1 |
| M5 語音、打磨、部署 | [M5_voice_polish_deploy.md](M5_voice_polish_deploy.md) | feat/m5-polish | 11/1–2 | M3 M4 | < $3 |
| M6 提交材料 | [M6_submission.md](M6_submission.md) | feat/m6-submission | 11/3–4 | M5 | < $1 |

M3 與 M4 都只依賴 M2，可平行（兩個 Muse session、各自分支、不改同一檔案）。

## 每個任務怎麼跑
1. 終端機 `cd ~/PERSONAL/META_Hackathon/spirit-quest`，`git switch main && git pull`（若有 remote），再 `muse`。
2. 確認模型：`/model muse-spark-1.3-contributor`（開發用，便宜；程式碼會被 Meta 用於訓練，repo 本來就公開）。
3. 貼上該任務檔最下方「開場指令」。大任務先用 `/plan`，看過計畫再放行。
4. Muse 收尾後，請 Claude Code 審查該分支（`git diff main...feat/xxx`），通過後開 PR，你回「Pass」才合併。
5. 中途當機：`muse resume`。

## 卡關規則
- 同一錯誤修一次不過就停，把錯誤訊息、試過什麼寫進 HANDOFF 的「阻礙」，交給人類或 Claude Code。
- 時間不夠時的裁切順序：M5 語音 → M4 拍照 → M3 的 stage3（保留 stage1、2）。M1、M2 與一次真實演化不可砍。
