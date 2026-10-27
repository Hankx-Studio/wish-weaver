# GAME_SPEC v1 — 精靈之間：心意召喚（Fairy Companion: Wish Weaver）

狀態：v1.0 凍結（2026-10-28，M0 探測完成；之後改動需在 docs/HANDOFF.md 記錄）
截止：2026-11-04 21:00 ET＝台北 11-05 10:00。目標在台北 11-04 晚上提交。

## 1. 一句話
每天 30 秒，用一句真心話養大一隻獨一無二的精靈；它把你的感謝變成魔法，也帶你把善意做回真實世界。

主題：Build for Your World（幫人省下心力、建立感恩與照顧自己的日常習慣）。
不宣稱任何療效；不以虔誠、痛苦程度或私密揭露決定任何獎勵。

## 2. 評分對照（正式規則）
| 項目 | 比重 | 本作怎麼拿分 |
|---|---|---|
| Impact | 30% | 30 秒感恩習慣、兒童可用（短句、無自由對話）、現實善意任務；說清楚誰受益 |
| Use of Meta AI Tooling | 25% | Spark 解讀心意（結構化）、Image 多輪編輯讓「同一隻」精靈演化、SAM 3.1 把真實物品切成遊戲寶物、Voice Transcribe 說出心意；開發全程用 Muse Code |
| Technical Depth | 20% | 伺服器端預算守門、速率限制、結構化輸出驗證、失敗回退、來源標記 meta_live / fallback_fixture、測試 |
| Demo | 25% | 現場可玩（評審自己玩得動）、3 分鐘影片、手機與桌面皆可 |

## 3. 核心循環（一輪 ≤ 30 秒）
1. 首頁：精靈在花庭中央（新玩家為 0 XP 粒子光球）。
2. 選儀式（MVP 三個：飯前祝福 meal、一日感恩 gratitude、晚安儀式 bedtime；另有「自由心意」free）。
3. 輸入一句心意（文字；M5 加語音）。上限 120 字。
4. `POST /api/wish` → Muse Spark 回傳 WishReading（見 §6）。
5. 結果畫面：依 element 播放魔法光效、精靈說出 spirit_line、獲得 XP 與一顆元素結晶。
6. XP 到門檻 → 演化（§5）。
7. 每日任務（M4）：精靈出一題現實世界任務 → 拍照 → SAM 切出物品 → 成為寶物櫃收藏。

## 4. 規則與數值（全部放 public/js/config.js 或 server/config.js，不寫死在邏輯裡）
- XP：每次完成心意 +10；每日任務完成 +20。XP 永久、不可消耗。
- XP 不由模型決定。模型只決定敘事、元素與光效（V2 規則：共鳴只調整敘事與光效）。
- 每日可得 XP 的心意上限 10 次；超過仍可對話與看光效，但不加 XP。
- 演化門檻：stage1＝30 XP、stage2＝90 XP、stage3＝180 XP。
- 展示模式 `?demo=1`：XP ×3，畫面角落明確標示「展示模式」。
- 元素（6）：light 光、bloom 花、water 水、wind 風、ember 暖焰、star 星。每次心意得到 1 顆該元素結晶。
- 安全：safety=support（出現危機訊號）→ 精靈溫柔回應＋顯示求助資源（台灣：1925 安心專線、110/119），不播放慶祝光效；safety=block（性、暴力、仇恨等）→ 婉拒、不給 XP。
- 兒童友善：精靈台詞 ≤ 40 字、不提問私密資料、不提供開放式自由聊天。

## 5. 演化（身分連續性是賣點）
- stage0：光球（前端 CSS/Canvas 特效，不需生圖）。
- stage1：`muse-image-1.0` generations，以 docs/art_prompts/fairy_prompt.txt 的風格鎖定段落為基底；形態家族由元素占比做「有限制的隨機」：fairy / animal / flower / abstract_light。
- stage2、stage3：`muse-image-1.0` edits，以前一階段圖片為輸入，維持同一角色身分，只加入新元素特徵（翅膀紋樣、配色、配件）。
- Spark 依結晶統計與最近 5 次心意的 traits（不是原文）寫 2 句「演化故事」。
- 失敗：保留原圖與 XP，可重試（V2 R006）。
- 圖片存在玩家瀏覽器 IndexedDB；伺服器不保存玩家圖片。

## 6. 資料契約（M0 依實測凍結為 docs/API_CONTRACT.md）
WishReading（伺服器驗證後回給前端）：
```json
{
  "source": "meta_live | fallback_fixture",
  "element": "light | bloom | water | wind | ember | star",
  "mood": "calm | warm | joyful | tired | hopeful | grateful",
  "intensity": 1,
  "traits": ["family", "food"],
  "spirit_line": "精靈的一句回應（與玩家同語言，≤40 字）",
  "effect": "sparkle | petals | ripple | breeze | glow | constellation",
  "safety": "none | support | block",
  "usage": { "input_tokens": 0, "output_tokens": 0, "cost_usd": 0 }
}
```
- intensity 為 1–3，只影響光效強度。
- 模型輸出不合格式 → 重試 1 次 → 仍失敗則回 fallback_fixture 並標示。

## 7. 架構
```
瀏覽器（public/，原生 HTML/CSS/ES modules，無建置步驟）
  └─ localStorage：遊戲狀態　IndexedDB：精靈圖、寶物切圖
       │ fetch /api/*
Node 20 單一程序（Hono）：server/
  ├─ 靜態檔 public/
  ├─ /api/health  /api/wish  /api/evolve  /api/quest  /api/scan  /api/transcribe
  ├─ budget guard（每日與總額 USD 上限）、per-IP rate limit
  ├─ metaClient（逾時 20s、5xx/429 退避重試 1 次、從 usage 計算成本）
  └─ data/usage.jsonl（只記時間、端點、模型、token、成本；不記玩家原文）
Meta Model API  https://api.meta.ai/v1
```
- 金鑰只在伺服器；前端與 repo 不得出現金鑰。
- 單一程序部署（Render / Fly.io / 自有主機擇一，M5 決定），讓限流與預算計數一致。

## 8. 範圍外（本次不做；影片最後 15 秒以願景帶過）
善意集市、商家物資、精靈幣與 K≥O+H+J 帳本、票券核銷、監管者流程、帳號登入、雙人共鳴房、硬體吊墜與磁力戒指、管理後台、申訴頁。
原型中這些頁面在 M2 移除或隱藏，不得以假資料出現在 Demo。

## 9. 成本（官方價目，2026-10-28 查核）
| 模型 | 價格 |
|---|---|
| muse-spark-1.3 | 輸入 $1.25 / 輸出 $4.25 / 快取 $0.15（每 1M tokens） |
| muse-spark-1.3-contributor（只用於 Muse Code 開發） | $0.10 / $0.20 / $0.002 |
| muse-image-1.0 | $0.01 / 張 |
| sam-3.1 | $2.50 / 1000 張 |
| muse-voice-transcribe-1.0 | $0.18 / 音訊小時（整秒計，M0 查核價目頁） |

目標：每位玩家完成一輪 ≤ US$0.01；完整體驗（10 心意＋3 演化＋2 掃描）≤ US$0.10。實際數字以 data/usage.jsonl 彙總為準。

## 10. 時程（台北）
| 日期 | 任務 |
|---|---|
| 10/28 | M0 探測與契約凍結 |
| 10/28–29 | M1 後端代理 |
| 10/29 | M2 遊戲主循環 |
| 10/30 | M3 演化 |
| 10/31 | M4 拍下你的世界 |
| 11/1–2 | M5 語音、打磨、部署；11/2 功能凍結 |
| 11/3–4 | M6 提交材料；11/4 晚上提交 |
