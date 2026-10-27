# API_CONTRACT v1.0（凍結，2026-10-28，M0）

後面所有任務照這份實作。`source` 欄位永不說謊：
`meta_live` 僅限真實模型回應通過 zod 驗證者，餘者一律 `fallback_fixture`。
每個欄位可追溯：標 `[P]`＝探測實證（[probe_results.json](evidence/probe_results.json) /
[MODEL_INVENTORY](MODEL_INVENTORY.md)），標 `[D]`＝設計決定。

## 通用規則

- 所有回應 JSON 都有 `source: "meta_live" | "fallback_fixture"` [D, AGENTS#3]。
- 模型輸出全部經 zod 驗證；不合格重試 1 次，再失敗回 fallback [D, AGENTS#4]。
- 預算用盡（guard）時**仍回 HTTP 200＋`source:"fallback_fixture"`**，永不為預算回 5xx [D]。
- 錯誤碼：`400` 請求驗證失敗（zod）／`413` body 或圖超過上限／`429` per-IP 限流
  （附 `Retry-After`）／`502` 模型端 5xx 或逾時且重試仍敗（僅健康檢查與除錯用，
  玩家端點一律轉 fallback 200）[D]。
- 每次模型呼叫寫 `data/usage.jsonl`：時間、端點、模型、token、成本 USD；
  不記玩家原文、不記圖片 [D, AGENTS#2]。
- 逾時 20s；模型端 5xx/`429` 退避重試 1 次 [D, GAME_SPEC §7]。
- 成本公式（Standard，[價目](https://dev.meta.ai/docs/pricing-rate-limits)）：
  spark＝in×$1.25＋out×$4.25（/1M，含 reasoning_tokens）[P]；
  image＝$0.01/張 [P]；sam＝$2.50/1000 張（`images_processed`）[P]；
  voice＝$0.18/音訊小時（整秒）[P]。單輪目標 ≤ $0.01，完整體驗 ≤ $0.10 [D]。

## POST /api/wish

- 請求：`{ritual:"meal"|"gratitude"|"bedtime"|"free", wish:"string(1..120)"}` [D]。
- 模型：`muse-spark-1.3`，`POST /v1/responses`，`text.format`＝下表 schema（strict），
  `reasoning:{effort:"low"}`（M0 抉擇）[P]。輸入僅传 `wish`＋ritual 標籤。
- 成功回應 200：

| 欄位 | 型別 | 來源 |
|---|---|---|
| source | "meta_live" \| "fallback_fixture" | [D] |
| element | "light"\|"bloom"\|"water"\|"wind"\|"ember"\|"star"（enum，防模型自由發揮） | [P§怪癖→D] |
| mood | "calm"\|"warm"\|"joyful"\|"tired"\|"hopeful"\|"grateful"（enum） | [P→D] |
| intensity | 1\|2\|3（伺服器鉗制，模型曾回 8） | [P→D] |
| traits | string[1..3] | [P] |
| spirit_line | string（≤40 字，與玩家同語言） | [P＋D] |
| effect | "sparkle"\|"petals"\|"ripple"\|"breeze"\|"glow"\|"constellation"（element→effect 映射由伺服器決定） | [D] |
| safety | "none"\|"support"\|"block"（模型自由文字由伺服器映射；block→拒玩、不給 XP） | [P→D] |
| usage | {input_tokens, output_tokens, cost_usd} | [P] |

- safety=support→溫柔回應＋台灣資源（1925/110/119），無慶祝光效 [D]。
- XP 由伺服器發（+10/次，每日上限 10 次），模型不決定 XP [D, AGENTS#5]。

## POST /api/evolve

- 請求：`{to_stage:1\|2\|3}`；伺服器校驗 XP 門檻（30/90/180）＋結晶統計 [D]。
- stage1：`muse-image-1.0` generations（`size:"512x512"`，風格鎖定段來自
  `docs/art_prompts/`，形態家族按元素占比有限隨機）[P＋D]。
- stage2/3：`muse-image-1.0` edits（前一階段圖＋新元素特徵 prompt）；
  探測證實角色/姿勢/構圖保留 [P]。失敗保留原圖＋XP，可重試 [D]。
- 回應 200：`{source, stage, image_urn, story:[line1, line2]}`；
  story 由 spark（low）依結晶統計＋最近 5 次 traits 寫 2 句，不含玩家原文 [D]。
- 圖片存玩家瀏覽器 IndexedDB；伺服器不存玩家圖 [D]。

## POST /api/quest

- 純伺服器端：依 stage/元素出每日現實任務（不呼叫模型亦可；文案模板在 config）[D]。
- 回應 200：`{source:"fallback_fixture", quest:{id, text, hint}}`——此端點 source 恆為
  fixture（無模型背書），完成條件見 /api/scan [D]。

## POST /api/scan

- 請求：multipart `photo`（≤5MB，伺服器壓至 ≤1024px 後送測，M4 定案）[D]。
- 模型：`sam-3.1`，`POST /v1/responses`，`{model:"sam-3.1", input:[{text: quest_keyword},
  {input_image}]}` [P]。
- 回應 200：`{source, found:boolean, boxes:[{x1,y1,x2,y2}], mask_rle_preview:string|null,
  usage:{images_processed, cost_usd}}`；box 像素座標＋畫布 w/h [P]。
  mask 全文不回前端（RLE 可達數 KB），只存遮罩雜湊供去重 [D]。
- 成功＋1 寶物、XP＋20（伺服器發）[D]。

## POST /api/transcribe

- 請求：multipart `audio`（wav/m4a/webm ≤2MB，伺服器轉 mono 16-bit 24kHz wav）[D]。
- 模型：`muse-voice-transcribe-1.0`，`POST /v1/asr/transcribe`，
  `request` part＝`{model, audioEncoding:"WAV", mode:"PUSH_TO_TALK"}`（audioEncoding 只能是
  `"WAV"`；`model` 必填——兩者送錯即 400，實測）[P]。
- 回應 200：`{source, transcript:string, audioDurationMs:number, usage:{seconds, cost_usd}}`；
  transcript 轉交 /api/wish（≤120 字截斷），音檔不落盤留存 [D]。
- ⚠️ 轉錄**文字品質尚未驗證**（sandbox 擋 `say`，探測用正弦波只驗了端點/格式）——
  M5 必須用真實中文語音重測後才能上線 [P]。

## GET /api/health

- 回應 200：`{ok:true, version:"1.0", budget:{daily_used_usd, daily_cap_usd},
  models:{text,image,seg,asr}}`（只報模型 ID，不含 key）[D]。
- 模型 ID 只從環境變數讀（見 `.env.example`），key 只在伺服器環境 [D, AGENTS#1]。
