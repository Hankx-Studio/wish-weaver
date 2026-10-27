# MODEL_INVENTORY — M0 探測結果（v1.0, 2026-10-28）

來源：`scripts/probe.mjs`（`npm run probe`）實測 + 官方文件。
原始紀錄：[evidence/probe_results.json](evidence/probe_results.json)。
圖片輸出：`data/probe/`（gitignored，不進版控）。

## 1. muse-spark-1.3（文字/VLM）

- 端點：`POST {base}/v1/responses`（`{base}` 見 `.env` 的 `META_API_BASE`）
- 結構化輸出：Responses API 用 **`text.format`**（`{type:"json_schema",name,schema,strict:true}`）。
  `response_format` 是 Chat Completions 的參數，兩邊不可混用（[文件](https://dev.meta.ai/docs/structured-output)）。
- 推理強度：`reasoning: {effort}`（頂層 `reasoning_effort` 是 Chat Completions 的寫法）。
  **`"none"` 會回 HTTP 400**（Spark/Wonder 不支援關閉推理，[文件](https://dev.meta.ai/docs/reasoning.md)）。
- 圖片輸入：content part `{type:"input_image", image_url:"data:image/webp;base64,..."}`；
  傳截斷/損毀的 base64 會回 400（實測確認：送全檔 428KB 即 200）。
- 實測（同一句心意「謝謝今天的晚餐…番茄炒蛋」）：

| effort | HTTP | 延遲 | in/out tokens（reasoning） | 台詞品質 |
|---|---|---|---|---|
| minimal | 200 | 6.4s | 33 / 323（249） | 好 |
| low | 200 | 4.7s | 33 / 685（615） | 好 |
| medium | 200 | 9.8s | 1312 reasoning，線性成長 | 好 |

- 全文範例（以 resp id 向 `GET /v1/responses/{id}` 取回）：
  low → `{"element":"fire","mood":"grateful","intensity":8,"safety":"safe",
  "spirit_line":"謝謝媽媽的番茄炒蛋，溫暖了我的心。",
  "traits":["warm","grateful","homely"],"effect":"convey gratitude..."}`。
- **怪癖（契約必須處理）**：模型不理會「暗示性」限制——schema 沒寫 `enum` 時，
  `element` 回過 `"番茄炒蛋"`、`mood` 回過 `"溫馨感恩"`、`safety` 回 `"safe"`、
  `intensity` 回過 `8`（超出 1–3）。→ 契約要求 schema 用 `enum`，
  伺服器再用 zod 二次驗證＋鉗制，失敗重試 1 次。
- usage 欄位：`usage.{input_tokens, output_tokens, total_tokens,
  input_tokens_details:{cached_tokens}, output_tokens_details:{reasoning_tokens}}`。
- 價格（Standard，[價目](https://dev.meta.ai/docs/pricing-rate-limits)）：
  輸入 $1.25 / 輸出 $4.25 / 快取 $0.15（每 1M tokens）。
  單次 wish（low）約 $0.003 « $0.01 目標。限流：3000 RPM / 4M TPM。
- **遊戲預設：`reasoning.effort = "low"`**（三者台詞品質相當時取最快＋ token 居中者）。

## 2. muse-image-1.0（生圖/改圖）

- 端點（OpenAI Images 相容）：`POST {base}/v1/images/generations`、
  `POST {base}/v1/images/edits`（multipart：`model`、`prompt`、`image`）。
- `size` 是 `"WxH"` 長寬比字串（非精確像素），本專案用 `"512x512"`；
  預設回 webp（`output_format` 欄位明示），`background:"opaque"`。
- 宣告的 MIME 必須與實際位元組一致（送 webp 檔卻宣告 `image/png` → 400，實測）。
- 回應：`{created, data:[{b64_json}], output_format, background, usage}`；
  `usage.input_tokens/output_tokens` 僅供參考，**生圖不按 token 計費**。
- 實測：generations 200（12.3s）、edits 200（13.1s）；改圖加星光環後
  同一角色、姿勢、構圖完整保留（見 `data/probe/gen1.webp`、`edit1.webp`）。
- 價格：**$0.01 / 張**（失敗/被過濾的不計費）。限流：150 RPM。
- 決策：stage1 用 generations、stage2/3 用 edits（前一階段圖作輸入），身分連續性成立。

## 3. sam-3.1（分割）

- 端點：`POST {base}/v1/responses`（model `"sam-3.1"`，與 Spark 同一 Responses API）。
- 請求：noun phrase 短語（如 `"bread"`）＋ `input_image`（data URL）。
- 回應：特殊 token 文字，每個 match 一組
  `<|box;x1=248;y1=270;x2=449;y2=410;w=2048;h=683|><|mask;x=0;y=0;data=…|>`，
  box 為像素座標＋畫布 `w/h`；mask 為同前綴的編碼字串（RLE-like，需用
  [client libraries](https://dev.meta.ai/docs/sam/client-libraries) 解碼——M4 實作時再驗）。
- 實測：200（3.1s），`vignettes.webp` 找 bread 得一組 box+mask。
- usage：token 全 0，`images_processed:1` 計費。價格：**$2.50 / 1000 張**。
  無 TPM 限流（按張計費）。

## 4. muse-voice-transcribe-1.0（語音轉文字）

- 端點：`POST {base}/v1/asr/transcribe`（query `sessionId` 可選，缺省伺服器產生）。
  認證走 `Authorization` header（multipart；realtime 另有 `wss://…/asr/realtime`，本專案不用）。
- multipart 兩 part：`request`（JSON，content-type `application/json`）、`audio`（wav 檔）。
  request 必填：`{model:"muse-voice-transcribe-1.0", audioEncoding:"WAV", mode:"PUSH_TO_TALK"}`。
  **注意**：檔案上傳的 `audioEncoding` 只能是 `"WAV"`（`PCM_24KHZ` 是 realtime 專用，
  送錯＋缺 `model` → 400 "Malformed request"，實測）。
- 音檔格式：RIFF/WAVE、mono、16-bit PCM、16/24 kHz（`ffmpeg -i in.m4a -ac 1 -ar 24000
  -c:a pcm_s16le -map_metadata -1 out.wav`；超過 10 分鐘 → 400）。
- 回應：`{sessionId, transcript, audioDurationMs, turns:[]}`（PUSH_TO_TALK 無 turns；
  ENDPOINTING/DIARIZATION 才有 turn 細節；只要 turn-level timestamps，無逐字時間戳）。
  `Accept` 可選 JSON / SSE / text。**回應無 `usage`**（按秒計費）。
- 實測：200（2.4s），2 秒測試音回 `transcript:""`、`audioDurationMs:2000`——端點與格式成立。
- **未驗證**：轉錄文字品質。本機能 `say` 在 sandbox 被擋（0-byte 輸出），
  探測用 ffmpeg 正弦波代替；**M5 必須用真實中文語音重測**（`say -v Tingting`）。
- 價格：**$0.18 / 音訊小時**（整秒計）。2 秒 ≈ $0.0001。
  限流：256 併發串流 / 16000 串流小時（無 RPM/TPM）。

## 5. 費用彙總（本次探測）

| 呼叫 | 費用（Standard） |
|---|---|
| spark structured ×3（minimal/low/medium） | ≈ $0.0014 / $0.0030 / $0.0056 |
| spark image-input ×1 | ≈ $0.0035 |
| image generations + edits | $0.02 |
| sam ×1 | $0.0025 |
| voice ×1（2s） | $0.0001 |
| 400 失敗（4 次：路徑/mime/編碼錯誤） | $0（無 usage，不計費） |
| **合計** | **≈ $0.036 « $0.5** |
