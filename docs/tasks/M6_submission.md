# M6 提交材料（11/4 台北晚上提交）

分支：feat/m6-submission　依賴：M5　預估成本：< $1
先讀：AGENTS.md、docs/GAME_SPEC.md §2、docs/HANDOFF.md 全部、docs/evidence/usage_summary.md、docs/PROVENANCE.md

## 目標
讓評審在 3 分鐘內看懂四項評分，每一個說法都有證據。

## 範圍內
1. README.md 改寫成提交版（英文為主，附中文摘要）：
   - The problem & who benefits（對應 Impact 30%）
   - How to play（3 張截圖或 GIF）
   - How we use Meta AI（Spark 結構化解讀、Image 身分連續演化、SAM 3.1 真實物品切割、Voice Transcribe、開發用 Muse Code；各一段＋為何超越基本串接）
   - Architecture（mermaid 圖）、safety & privacy（不存原文與照片、兒童友善、標示 fallback）
   - Cost per player（引用 usage_summary 真實數字）
   - Run locally、Live demo URL、Provenance（連 PROVENANCE.md）、Team
2. docs/DEMO_SCRIPT.md：3:00 分鏡（時間碼、畫面、旁白、字幕）：
   - 0:00–0:15 鉤子：說一句「謝謝媽媽今天幫我做便當」→ 光球化成專屬精靈
   - 0:15–1:30 實際遊玩：三種儀式、不同元素光效、演化前後
   - 1:30–2:10 拍下你的世界：SAM 切出物品成為寶物
   - 2:10–2:40 技術：架構圖、預算守門、每位玩家成本、fallback 標示
   - 2:40–3:00 願景：善意集市與實體吊墜（只講方向，不展示假資料）
3. docs/SUBMISSION.md：提交表單各欄位的草稿（專案名稱、一句話、描述、使用的 Meta 工具、賽道、團隊成員、repo 與 demo 連結、影片連結）。欄位以 Cerebral Valley 提交頁實際內容為準，請人類貼上欄位清單。
4. 最終檢查清單：repo 公開且無金鑰（git log 全歷史掃描）、demo 網址可用、影片公開可看、/api/health 正常、預算餘額足夠評審期（11/5–11/8）。
5. git tag v1.0。

## 範圍外
新功能、重構。

## 驗收
- 人類照 DEMO_SCRIPT 錄完影片且長度 ≤ 3:00。
- 檢查清單全部打勾，附證據。

## 開場指令（貼給 Muse）
```
請執行 docs/tasks/M6_submission.md。先讀 AGENTS.md、GAME_SPEC §2、HANDOFF 全部與 usage_summary。
所有數字只能引用 docs/evidence 裡的實測資料，沒有實測的不要寫。
```
