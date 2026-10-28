# M4 HANDOFF 片段（給 Leader 併入 docs/HANDOFF.md — M4 未直接改該檔）

## M4 拍下你的世界（每日任務＋SAM 掃描）— 2026-10-28 — 狀態：done（待接線）
- 完成：/api/quest（Spark 依 dominant element＋kindness 出題，zod＋重試1次，
  失敗回伺服器模板；quest_id=`q-日-element-kind` 前端按日快取）；
  /api/scan（multipart 照片，伺服器驗 MIME 魔數＋≤2MB；SAM 分割取最佳
  mask/box＋Spark 圖片判定 matched/human＋一句台詞；人臉固定句拒收、
  無 XP；圖片只在記憶體、不存檔；budget/限流走 200 fallback＋usage log）；
  server/samMask.js（SAM wire 解析＋`~`/`!` 雙編碼解碼器，與
  @meta-sam/parser（僅 /tmp 參照、未進依賴）21 向量＋3 次真機 lossless
  逐位元一致）；前端 maskCut（tiny mask 切圖／box fallback）、
  treasureStore（IndexedDB）、views/scan（拍照上傳、1024px 縮圖、善意任務
  切換、+20 XP）、views/cabinet（寶物櫃）、css/scan.css（未動 style.css）。
- 改動檔案：server/samMask.js（新增 399 行）、server/prompts/quest.js、
  server/prompts/scanJudge.js（新增）、server/routes/quest.js、
  server/routes/scan.js（factory 新增；501 stub 保留給未接線的 index.js，
  app.test.js 因此仍綠）、public/js/maskCut.js、public/js/treasureStore.js、
  public/js/views/scan.js、public/js/views/cabinet.js、public/css/scan.css
  （新增）、tests/quest.test.js、tests/scan.test.js（新增）、
  docs/evidence/m4/（quest.json、scan_food/flower/cup/face.json、
  cutout_food/flower/cup.png、README.md）、docs/evidence/m4_wiring.md。
- 測試：`npm test` 87/87 通過（含新 17：quest 驗證/重試/預算/限流；
  scan 400/無mask退回box/人臉拒收/mock 失敗分支/預算/限流/usage 無圖；
  samMask 向量＋tiny round-trip＋前端純函式）。真機：1 quest＋8 scans
  全 meta_live（見 docs/evidence/m4/README.md）。
- 未測：瀏覽器實測（scan/cabinet views、IndexedDB、1024px 縮圖、
  appear 動畫皆未在真瀏覽器跑過；無 headless 環境，留 M5）；
  transcribe 不在範圍。
- 阻礙／決策：
  ① range decoder 的 underflow renormalization 必須照參考實作短路語意
  （top 命中時不 remap），初版在大 raster 靜默漂移，靠 oracle 測出，
  已修＋回歸鎖定。
  ② API_CONTRACT 的 quest/scan 節與 M4 任務檔有出入：契約寫 quest 純
  fixture（無模型）且 scan 回 found/boxes/usage；M4 任務檔＋brief 要求
  Spark 出題與 ok/matched/spirit_line。M4 採超集回應相容兩者
  （quest 恆帶 id/text/hint；scan 恆帶 found/boxes/usage），但 quest 用
  模型時 source=meta_live、scan 照片上限 2MB／>2MB 回 400（驗收指定，
  非契約 413）。請 Leader 裁定是否修契約。
  ③ mask 全文不回前端（契約）：前端切圖改用 `mask_tiny`（≤64px 下採樣
  位圖，新增欄位）＋`best_box`（新增欄位，決定性切圖）。
  ④ ffmpeg 剪裁 webp 需先 `format=rgb24`（yuv420p 會把奇數幾何偷減 1px）。
  ⑤ 風格化小杯（vignettes 茶杯、market 湯杯）SAM 回 0 boxes，杯證據改用
  market 飯碗（target `bowl`）；M5 若要真杯子需實拍。
- 實際 Meta 用量與成本：計費呼叫 1 quest＋8 scans（16 列）＋3 直連 SAM
  探測／conformance ≈ $0.065 « $1（usage.jsonl 17 列 $0.057＋探測約 $0.008）。
  版本：hono 4.13.14、zod 4.6.7。無新增依賴。
- 下一步（Leader）：按 m4_wiring.md 接 server/index.js、main.js
 （scan/cabinet 路由＋寶物櫃 nav）、index.html（scan.css），並更新
  app.test.js 的 stub 斷言；M5 做瀏覽器實測＋真杯實拍。
- 建議：杯類小物可考慮 quest 文案引導拍「碗、馬克杯等大一點的容器」；
  mask_tiny 目前固定寬 64px，視切圖品質可調。
