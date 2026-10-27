# M2 遊戲主循環（前端）

分支：feat/m2-game-loop　依賴：M1　預估成本：< $1
先讀：AGENTS.md、docs/GAME_SPEC.md（§3、§4、§8）、docs/API_CONTRACT.md、public/app.js（原型，31KB）

## 目標
把 UI V3 原型改成真正能玩的遊戲：光球開局 → 儀式 → 輸入心意 → 真實 Spark 回應 → 魔法光效 → XP 與結晶 → 成長之書。

## 範圍內
1. 把 public/app.js 拆成 ES modules（public/js/）：config.js（GAME_SPEC §4 全部數值）、state.js（localStorage，key `wishweaver.v1`，含版本號與損壞時重置）、api.js（fetch /api/*，逾時與錯誤處理）、effects.js（6 種元素光效，尊重 prefers-reduced-motion）、views/home.js、views/rituals.js、views/ritual.js、views/result.js、views/growth.js、main.js（路由）。
2. 移除範圍外頁面與導覽：sharing、detail、ticket、account、hardware、shared、merchant、admin、appeal、精靈幣顯示。頂部導覽改為：精靈花庭、日常儀式、成長之書（M4 後加「寶物櫃」）。
3. 新玩家：0 XP、stage0 光球（CSS/Canvas 粒子，置於原本 fairy 位置）。原型的 fairy.webp 不再當新玩家形象；它只用於 `?preview=fairy` 的設計預覽。
4. 儀式頁：MVP 三個儀式＋自由心意；沿用原型文案與提示語 phrase；輸入框 120 字上限與字數顯示；送出時 loading 動畫（精靈聆聽中）。
5. 結果頁：element 光效＋spirit_line 逐字出現＋「+10 XP」「獲得 ○○結晶」；safety=support 顯示求助卡片，不放慶祝效果；safety=block 顯示婉拒。
6. source=fallback_fixture 時，結果卡角落顯示「精靈正在休息・示範回應」，不得隱藏。
7. 成長之書：XP 進度條與下一階段門檻、六元素結晶數、最近 20 筆心意（只存在本機）、清除資料按鈕。
8. XP 規則：每日 10 次上限（本機日期）、`?demo=1` ×3 並顯示「展示模式」標籤。
9. 頁尾「互動設計示範」文字改為真實狀態（例：「AI 回應由 Meta Muse Spark 即時生成」）。
10. 響應式：390×844 與 1440×960 兩種尺寸都可用；最小寬度 320。

## 範圍外
演化生圖（M3 只先留 `onThresholdReached()` 掛鉤，觸發時顯示「精靈正在醞釀變化…」）、拍照、語音。

## 驗收
- 從清空 localStorage 開始，連續玩 3 輪真實心意都正常；`?demo=1` 下 1 輪即達 stage1 門檻並觸發掛鉤。
- 斷網或伺服器關閉時顯示友善錯誤，可重試，不會卡死。
- 兩種尺寸的截圖（首頁、儀式、結果、成長之書）存 docs/evidence/m2/。
- tests/：state.js 的 XP、每日上限、門檻判斷、損壞資料重置（node:test 可直接 import 純函式）。

## 開場指令（貼給 Muse）
```
請執行 docs/tasks/M2_game_loop.md。先讀 AGENTS.md、GAME_SPEC、API_CONTRACT，再看 public/app.js 的結構。
用 /plan 列出模組拆分與要刪除的頁面，我確認後再改。視覺沿用 public/style.css，不要換風格。
```
