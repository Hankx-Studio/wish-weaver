# M4 證據：3 張真實掃描＋切圖＋台詞（2026-10-28，真機）

公共素材皆為遊戲美術圖，選用最接近的 pantry 物品；每案皆走完整
`/api/scan`（SAM 分割＋Spark 判定），`source` 皆為 `meta_live`。
切圖由回傳的 `mask_tiny`＋`best_box` 在本機合成（與前端 `maskCut.js`
同一算法；前端未做瀏覽器實測，見未測）。

## 1. 食物 food — `scan_food.json`＋`cutout_food.png`
- 素材：`public/assets/market.webp`（左格麵包籃），target `bread`
- 結果：matched=true，boxes=2，tiny=64x41，xp_awarded=20，cost ≈ $0.0065
- 台詞：「香香的麵包找到了，森林好溫暖喔！」

## 2. 花 flower — `scan_flower.json`＋`cutout_flower.png`
- 素材：`public/assets/vignettes.webp`（左格粉玫瑰），target `flower`
- 結果：matched=true，tiny=64x54，xp_awarded=20，cost ≈ $0.007
- 台詞：「哇！粉嫩的花朵好美，森林都笑了！」
- 註：初用 `sanctuary.webp`＋`rose` 亦 matched，但最大框落在前景
  散景玫瑰，切圖糊；改用 vignettes 銳利玫瑰（SAM 多次推論框不同，
  以 `best_box` 對齊為準）。

## 3. 杯 cup — `scan_cup.json`＋`cutout_cup.png`
- 素材：`public/assets/market.webp`（右格飯碗＋湯杯），target `bowl`
- 結果：matched=true，boxes=2，tiny=64x41，xp_awarded=20，cost ≈ $0.0066
- 台詞：「哇！熱騰騰的碗找到啦，好溫暖好棒！」
- 註：`vignettes` 小茶杯＋`market` 小湯杯用 target `cup` 時 SAM 皆回
  0 boxes（風格化小杯切不出），改以最接近的飯碗（bowl）為證；
  杯類小物是已知弱點（見 handoff 建議）。

## 4. 人臉拒收 face（加測）— `scan_face.json`
- 素材：`public/assets/fairy.webp`（精靈人像），target `flower`
- 結果：matched=false，human=true，xp_awarded=0，cost ≈ $0.0063
- 台詞：「精靈只收集物品喔，這張先不收錄。」（伺服器固定句）

## 當日任務 — `quest.json`
- `POST /api/quest {element: ember}` → meta_live：
  「暖暖的馬克杯」（target_noun_en `warm mug`），cost ≈ $0.0031

## 用量
- `data/usage.jsonl`（gitignored）：本機 17 列 ≈ $0.057；
  另有 3 次直連 SAM 探測（conformance＋wirecheck）≈ $0.008；
  合計 ≈ **$0.065 « $1**。
