# 來源與權利紀錄

正式規則要求提交物為參賽者原創、權利屬於參賽者、不侵權；允許第三方技術協助與遵守授權的開源軟體。本檔區分賽前設計準備與賽期實作，供評審查核。

## 賽前設計準備（2026-10-26 前，團隊自有）
| 項目 | 位置 | 說明 |
|---|---|---|
| UI V3 互動原型（HTML/CSS/JS，假資料） | public/ 初始版本（commit「chore: import UI V3 prototype」） | 團隊設計原型，無任何模型串接 |
| 四張美術（fairy、sanctuary、market、vignettes） | public/assets/*.webp | 團隊以 AI 繪圖工具生成，提示詞保存在 docs/art_prompts/ |
| 字型 FairySerif / FairySans（Noto CJK 子集） | public/assets/*.woff | SIL Open Font License 1.1，見 FONT_LICENSE.txt |
| 產品書、經濟規則、UI 指南 | repo 外（~/PERSONAL/META_Hackathon） | 參考資料，不在提交物內 |

## 賽期實作（2026-10-26 之後）
以 git 歷史為準：後端代理、Meta 模型串接、遊戲循環、演化、拍照任務、語音、測試、部署。
開發工具：Muse Code（Meta）為主，Claude Code 作為規格撰寫與程式審查的技術協助。

## 執行時生成內容
玩家的精靈圖與寶物切圖由 Meta 模型即時生成或處理，僅存於玩家瀏覽器。
