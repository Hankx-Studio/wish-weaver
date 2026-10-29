# 用量彙總（真實數字，M5）

產生時間：2026-10-28T02:55:55.801Z

## M0 探測（source: docs/evidence/probe_results.json）

- spark-image-input: 4165ms, in=1239 out=349, cost=$0.003032
- image-generations: 12320ms, in=10275 out=1178, cost=$0.010000
- image-edits: 13306ms, in=11881 out=633, cost=$0.010000
- voice-transcribe: 2402ms, in=null out=null, cost=$0.000100
- spark-structured-minimal: 6377ms, in=33 out=323, cost=$0.001414
- spark-structured-low: 4697ms, in=33 out=685, cost=$0.002952
- spark-structured-medium: 9782ms, in=33 out=1312, cost=$0.005617
- sam-segment-bread: 3132ms, in=0 out=0, cost=$0.002500
- M0 小計 ≈ $0.035616（spark 依契約公式由實測 tokens 換算；image/sam/voice 固定價）

## 心意輪（source: m1_smoke.json 3 輪＋m2/rounds.json 3 輪）

- 第1輪：cost=$0.0027420, latency=2952ms
- 第2輪：cost=$0.0026502, latency=1916ms
- 第3輪：cost=$0.0031858, latency=2679ms
- 第4輪：cost=$0.0030095
- 第5輪：cost=$0.0029642
- 第6輪：cost=$0.0034658
- 單輪平均 $0.0030029（6 輪皆 meta_live）

## M3 演化調參（source: m3/tuning-grid.json stage 計數）

- 9 張 × $0.01 = $0.09

## M4 每日任務（source: m4/quest.json＋scan_*.json body.usage）

- quest（meta_live): cost 未逐筆記錄，見 README ≈ $0.0031
- scan_food.json: cost=$0.0065018, matched=true
- scan_flower.json: cost=$0.0071223, matched=true
- scan_cup.json: cost=$0.0066263, matched=true
- scan_face.json: cost=$0.0062915, matched=false

## M5 語音探測（source: m5/voice_probe.json，live）

- tone 2s → meta_live, transcript="", cost=$0.0001000, latency=1717ms

## 本機 data/usage.jsonl

- 無（gitignored；探測皆走直連＋in-process，未寫入 repo 內 data/）

## 延遲（可測者：M0 8 次＋M1 3 次＋M5 voice 1 次；M2/M4 未逐筆記錄）

- n=12, p50=4165ms, p95=13306ms

## 模型別總計

- spark（文字/VLM）≈ $0.031033（M0 探測＋M1/M2 6 輪）
- image（生圖）= $0.09（M3 tune 9 張）
- sam＋judge（掃描 4 次）≈ $0.026542（SAM＋Spark judge 皆在 usage 內）
- voice（轉錄）≈ $0.000200（M0＋M5 各 2 秒）
- 全專案實測總 spend ≈ $0.1734（« $3 上限；quest $0.0031 以 README 值計入）

目標對照：單輪 ≤ $0.01（實測 $0.0026–$0.0035 ✓）；完整體驗 ≤ $0.10 ✓。
