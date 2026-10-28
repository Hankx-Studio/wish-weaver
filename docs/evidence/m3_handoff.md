# M3 HANDOFF fragment（Leader 合併到 docs/HANDOFF.md；勿改 HANDOFF 本體）

## M3 演化（2026-10-28，分支 feat/m3-evolution）

- 完成：/api/evolve 全鏈（XP 門檻 30/90/180、形態家族加權抽籤 seed=playerId+stage、
  stage1 generations／stage2-3 edits＋IDENTITY_KEEP、Spark 2 句故事 ≤80 字、
  budget＋per-IP 日限流＋usage.jsonl、失敗回 {ok:false, keep:true}）；
  前端 imageStore（IndexedDB）＋evolveFlow（3s 過場／reduced-motion 淡入、
  調用 M2 onThresholdReached）＋views/evolve（前後對照）＋css/evolve.css；
  tests/evolve.test.js（抽籤決定性、驗證、失敗回退、budget 拒絕）；
  scripts/evolve-tune.mjs；m3_wiring.md（Leader 套用掛載）。
- 改了：server/routes/evolve.js（stub 保留待 Leader 換掛載）、server/evolveFamily.js（新）、
  server/prompts/styleLock.js、server/prompts/evolveStory.js、public/js/imageStore.js、
  public/js/evolveFlow.js、public/js/views/evolve.js、public/css/evolve.css、
  scripts/evolve-tune.mjs、tests/evolve.test.js、docs/evidence/m3/（grid 9 張＋
  tuning-grid.json＋style_pick.md）。
- 沒改（禁區）：server/index.js、server/schemas.js、public/js/main.js、
  views/growth.js、index.html、style.css、HANDOFF、package.json、M4 檔案。
- 測了：`npm test` 80/80 通過（含 M1/M2＋12 個 evolve 新測）；
  live tuning 9 張圖三組 trio 皆同一角色（bloom-s1→s3 親驗：臉／髮／姿勢保留，
  s3 加蜜蜂澆水壺蘑菇）；mock 圖片失敗回 keep:true。
- 沒測：Leader 掛載後的整站 `?demo=1` zero→stage3（index.js/main.js 由 Leader 接線）；
  真機 reduced-motion；IndexedDB 跨階段存取（待接線後測）。
- 阻礙：無。
- Meta 用量成本：tune 9×image ≈ **$0.09**（provider 計費；tune 直調不經 usage.jsonl）。
  伺服器 mediated 调用 $0（全 mock）。累计 <$3。
- 下一步（Leader）：套 m3_wiring.md 三段→跑全站 demo→人類看 grid/bloom trio 回「A 通過」。
- 建議：B/C 不必再測；stage3 可考慮限定華麗特徵（見 style_pick.md）。
