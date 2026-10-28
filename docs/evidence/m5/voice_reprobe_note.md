# Voice re-probe（M5，先做）：sandbox 仍擋真實中文語音合成

- `say -v '?'` 可列出音色，含 `Meijia zh_TW`、`Tingting zh_CN`（合成器存在）。
- `say -v Tingting '謝謝今天的晚餐…' -o /tmp/m5voice/zh.aiff`：exit 0，
  但附 `sandbox_extension_issue_file failed ... Operation not permitted`，
  輸出檔 4096 bytes；`afinfo` 證實 `audio bytes: 0`、`estimated duration: 0.000000 sec`
  —— header 有、零音訊。`.wav`（`--data-format=LEI16@24000`）同狀。
- 結論：與 M0 一致，sandbox 禁止音訊合成，真實中文轉錄品質**無法在本機驗證**。

## 改走的 plumbing 驗證（live，零捏造）
- `ffmpeg` 正弦波 2s mono 24kHz WAV（96078 bytes）→ in-process
  `POST /api/transcribe`（真實 `MODEL_ASR`，`--env-file=.env`）：
  `docs/evidence/m5/voice_probe.json`：200、`meta_live`、`transcript:""`、
  `audioDurationMs:2000`、`reason:"empty_transcript"`、cost $0.0001、1717ms。
- 正弦波無語音，空稿正是正確的 live 答案；並驗了 multipart 契約
  （request JSON `audioEncoding:"WAV"`＋必填 `model`）、budget/usage 寫入路徑。
- 前端空稿路徑：「沒聽清楚，再說一次好嗎？」不卡死、不自動送出
 （`transcribe.test.js`＋`main.js#toggleVoice`）。

## HUMAN-NEEDED
真實中文（美佳/婷婷嗓音或真人錄音）進 `/api/transcribe` 的逐字品質，
待人類在可發聲的機器上驗（`scripts/voice-probe.mjs` 改讀真實 wav 即用）。
