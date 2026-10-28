# 試玩回饋表（M5：模板＋作者自玩筆記 — 5 位外部試玩者 HUMAN-NEEDED）

## 玩法（每位試玩者填一份）
- 試玩者：（暱稱／年齡層／裝置：iOS Safari / Android Chrome / 桌機 Chrome）
- 日期：
- 卡在哪（越具體越好，哪一頁、看到什麼）：
- 最喜歡什麼（一句話）：
- 精靈台詞有沒有怪怪的地方（有請貼原文）：
- 語音按鈕有用嗎（有/無此按鈕/沒用到/聽不懂我說的話）：
- 新手引導 3 步有看完嗎（看完/略過/沒注意到）：
- 其他：

## 作者自玩筆記（in-process E2E，非真機）
- 空 storage → 3 心意 → 30 XP → stage1 → quest → scan matched，8 步全過
  （見 `e2e.log`；mock 模型，零花費）。
- 空 transcript 走 `reason:"empty_transcript"`＋「沒聽清楚」提示，
  不會卡死、不會自動送出（見 `voice_probe.json`＋`transcribe.test.js`）。
- 錄音中切頁會自動停軌並釋放麥克風（`setRoute` guard；未真機驗證）。

## 待補（HUMAN-NEEDED，見 HANDOFF 未測）
1. 5 位試玩者（手機＋桌機）照上表填寫 → `playtest.md`。
2. 真實中文語音轉錄品質（sandbox 擋 `say` 音訊合成，見下）。
3. 真機瀏覽器＋截圖（M2/M3/M4 遞延）。
