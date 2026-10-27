# M3 演化（Muse Image 身分連續）

分支：feat/m3-evolution　依賴：M2　預估成本：< $3
先讀：AGENTS.md、docs/GAME_SPEC.md §5、docs/API_CONTRACT.md、docs/MODEL_INVENTORY.md（image 段）、docs/art_prompts/fairy_prompt.txt

## 目標
精靈從光球長成「只屬於這位玩家」的樣子，而且每次演化都是同一隻。這是 Use of Meta AI Tooling 的主要亮點。

## 範圍內
1. 風格鎖定：從 fairy_prompt.txt 抽出風格段落（日式奇幻、Q 版比例、象牙金巴洛克、透明背景、端莊、不仿任何既有角色）存成 server/prompts/styleLock.js。
2. 形態家族（有限制的隨機）：依元素結晶占比加權抽 fairy / animal / flower / abstract_light；種子＝玩家本機 id＋stage，讓重試結果一致。
3. /api/evolve：
   - 輸入：stage（1–3）、元素統計、最近 5 筆 traits、上一階段圖片（stage≥2 必填，base64，≤1.5MB）。
   - stage1 用 generations；stage2、3 用 edits（輸入上一張，提示只描述新增特徵並要求保持同一角色臉型、髮色、比例）。
   - 同時請 Spark 寫 2 句演化故事（≤80 字）。
   - 經 budget 與 rate limit；失敗回 `{ok:false, keep:true}`，前端保留原圖與 XP。
4. 前端：演化過場動畫（光球裂開或光芒包覆，約 3 秒；reduced-motion 時改淡入）、前後對照、圖片存 IndexedDB（public/js/imageStore.js）、成長之書顯示各階段圖與故事。
5. 調校：先用 scripts/evolve-tune.mjs 對 3 組不同元素組合各跑 stage1→3（最多 9 張圖，約 $0.09），挑最好的提示詞，圖存 docs/evidence/m3/（縮成 512px webp）。

## 範圍外
背景重繪、多隻精靈、分享頁。

## 驗收
- `?demo=1` 從零玩到 stage3，三張圖看得出是同一角色（證據圖＋簡短說明）。
- 生圖失敗（mock）時保留原圖與 XP，可重試。
- tests：形態抽籤的決定性、輸入驗證、失敗回退、budget 拒絕。

## 開場指令（貼給 Muse）
```
請執行 docs/tasks/M3_evolution.md。先讀 AGENTS.md、GAME_SPEC §5、MODEL_INVENTORY 的 image 段與 docs/art_prompts/fairy_prompt.txt。
先跑提示詞調校（最多 9 張圖），把結果給我看，我選定風格後再接前端。
```
