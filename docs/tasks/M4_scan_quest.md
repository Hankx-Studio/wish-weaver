# M4 拍下你的世界（每日任務＋SAM 3.1）

分支：feat/m4-scan　依賴：M2（可與 M3 平行，不改 M3 的檔案）　預估成本：< $1
先讀：AGENTS.md、docs/GAME_SPEC.md §3–§4、docs/API_CONTRACT.md、docs/MODEL_INVENTORY.md（sam、spark 圖片輸入段）

## 目標
把遊戲帶回真實世界：精靈出一題溫柔的現實任務，玩家拍下物品，SAM 把它切出來變成寶物。對應主題 Build for Your World。

## 範圍內
1. /api/quest：Spark 依玩家最多的元素生成 1 題當日任務 `{quest_id, title, hint, target_noun_en, element}`，例：「找一個帶著溫暖顏色的東西給我看」（target_noun_en 給 SAM 用）。任務要安全、室內外皆可完成、不涉及他人隱私（不拍人臉）。前端每天快取一題。
2. 也提供「善意任務」類別（例：「拍下你今天替別人準備的一樣東西」），讓 Impact 敘事落地；只拍物品，不拍人。
3. /api/scan：
   - 輸入：quest_id、target_noun_en、圖片（前端先縮到長邊 ≤1024px、JPEG/WebP、≤2MB；伺服器再驗 MIME 與大小）。
   - sam-3.1 以 target_noun_en 分割 → 取最高分遮罩/框。
   - Spark（圖片輸入）判斷是否符合任務並寫 1 句精靈台詞；不符合時溫柔請玩家再試。
   - 回 `{ok, matched, mask 或 box, spirit_line, source}`；伺服器不保存圖片。
4. 前端：拍照或上傳（`<input type=file accept=image/* capture=environment>`）、用遮罩在 canvas 切出物品（無遮罩時用框裁切）、寶物出現動畫、寶物櫃頁（IndexedDB）、完成任務 +20 XP。
5. 照片中若偵測到人臉或玩家拍到人，提示「精靈只收集物品喔」（以 Spark 判斷），不收錄。

## 範圍外
社群分享、多人任務、商家連動。

## 驗收
- 用 3 張真實照片（食物、花或植物、杯子）實測，切圖與台詞存 docs/evidence/m4/。
- 超過 2MB 或非圖片 → 400；預算用盡 → fallback 並標示。
- tests：輸入驗證、無遮罩時退回框裁切、拒收含人照片的分支（mock）。

## 開場指令（貼給 Muse）
```
請執行 docs/tasks/M4_scan_quest.md。先讀 AGENTS.md、GAME_SPEC、API_CONTRACT、MODEL_INVENTORY 的 sam 段。
不要改 M3 的檔案（server/routes/evolve.js、public/js/imageStore.js 以外的共用檔若要改，先告訴我）。用 /plan 開始。
```
