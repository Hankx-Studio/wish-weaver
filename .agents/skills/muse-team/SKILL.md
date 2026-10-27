---
name: muse-team
description: Muse Code 版的 AI 組隊。目前 session 當 Leader，把任務分級（L0–L3）並對應 effort，用 Muse 子代理（各自 worktree）或 muse exec 平行派工，Leader 驗收、整合、commit，PR 等人類回覆「Pass」才合併。在 Muse 裡要拆工、平行做、組隊時使用；取代 Claude Code 專用的 ai-team。
---

# Muse 組隊（目前 session 當 Leader）

Leader 只做：拆工、定契約、分級派工、驗收、整合、commit。實作交給子代理。
開場說一句：「這次由 <目前模型>／effort <目前等級> 當 Leader」。

## 1. 拆工與契約先行
- 先讀 AGENTS.md、docs/GAME_SPEC.md、指定的任務檔，再拆工。
- 共用介面、資料格式、檔名、常數由 Leader 先寫好並 commit（附契約測試）；package.json 這類共用檔只由 Leader 改。
- 每個子任務列出「可以改的檔案」，子任務之間不得重疊。

## 2. 分級（決定 effort）
依任務裡最難的部分分級；介於兩級之間取高的。

| 等級 | 判斷訊號 | effort |
|---|---|---|
| L0 機械 | 改名、搬檔、改字串與文案、照清單逐項改 | low |
| L1 明確 | 契約已定的新功能、UI 接線、補測試、寫文件 | medium |
| L2 驗證 | 修 bug、改既有行為、邊界與錯誤處理、部署腳本 | high |
| L3 深度 | 架構、跨模組契約、並行與狀態、資安、根因不明的除錯 | xhigh |

- `max`、`ultra` 不在分級內，只有人類明說才用。
- 模型一律 `muse-spark-1.3-contributor`。`muse-wonder-1.0` 沒有 contributor 方案（輸入 $4／輸出 $20 每百萬 token），只有人類同意才能用在 L3。

派工前先回報一張表（不用等回覆）：

| 子任務 | 等級 | effort | 方式 | 可改檔案 |
|---|---|---|---|---|

## 3. 派工方式
Muse 的 `subagent_spawn` 只接受 role、objective、worktree_isolation，子代理沿用 Leader 的模型與 effort。所以：

- **等級對應的 effort ＝ Leader 的 effort** → 用原生子代理：`subagent_spawn`，寫入型子代理一律 `worktree_isolation: true`；唯讀子代理留在共用 checkout。
- **effort 不同** → 用 headless 另開一個 session（第一次使用先跑 `muse exec --help` 確認參數名稱）：
  ```bash
  git worktree add .worktrees/<task> -b feat/<task>
  cd .worktrees/<task>
  muse exec --model muse-spark-1.3-contributor --reasoning-effort <level> --max-model-steps 60 "<自足的 prompt>"
  ```
  多個 exec 可以在背景平行跑。exec 的結束碼只代表 session 有沒有跑完，不代表成功；結果一律以 `npm test` 判斷。
- 同時最多 4 個寫入型子代理（整棵代理樹預設最多 8 個，包含 Leader）。
- 每個 prompt 都要自足：目標、可改檔案、契約、禁止事項（不碰金鑰、不 merge、不 push）、驗收條件（測試、要 grep 為 0 的字串）、回報格式（改了哪些檔、測試結果、自己做的判斷）。

## 4. 驗收（不能只看回報）
- 逐項看 diff 並跑 `npm test`；Muse 內建的驗證 observer 只是輔助，不能取代實際跑測試。
- 子代理發現契約衝突要回報 Leader，不得自己改契約。
- 驗收沒過：
  - 漏做或沒照指示：退回同一個子代理補齊（effort 不變），這不算重試。
  - 做了但結果錯：升一級 effort，開新的子代理重做一次，prompt 附上前一位試過什麼和錯誤訊息。
  - 升級後還是錯，或原本就是 L3：停下，向人類回報錯誤、試過什麼、建議下一步。

## 5. 整合與 Review
- Leader 把各 worktree 的成果合回任務分支，跑全部測試，然後 commit（conventional commits）。
- Review：開一個唯讀子代理，回報 CRITICAL／HIGH／MEDIUM／LOW 並附檔案:行號；也可以請人類交給 Claude Code 做跨廠牌審查。
- 有 CRITICAL 或 HIGH 就修一次再驗；仍然有就停下回報。
- 清理：`git worktree remove .worktrees/<task>`。

## 6. 收尾
- 更新 docs/HANDOFF.md：分工表（子任務、等級、effort、方式、有沒有升級）、測試結果、review 結論、Meta 用量。
- 不得 merge 到 main。回報分支名稱後停下，等人類審核並回覆「Pass」。
