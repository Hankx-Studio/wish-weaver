# AGENTS.md — SpiritCompanion agent 固定規則

開工先讀：本檔 → docs/PRD.md → docs/TECH_STACK.md → docs/HANDOFF.md 最新一段。
只做指定的里程碑範圍；範圍外想法寫進 HANDOFF「建議」，不順手實作。

## 技術棧（M1 已定，不得更換）
- Next.js 15 App Router＋TypeScript strict，部署 Vercel（iad1）。
- Supabase（Postgres＋Auth Google＋Realtime＋Storage）；改餘額／庫存／XP 只經 SECURITY DEFINER 函式。
- Meta API：base URL 與 model id 只從環境變數讀（見 .env.example），不寫死。
- 繪圖 PixiJS v8；測試 Vitest＋Playwright；英文 UI。

## 硬規則
1. 金鑰只在伺服器環境變數與 .env.local；公開 repo 永遠無值（.env.example 保持空值）。
2. 每次 Meta 呼叫先寫 ai_usage（RESERVED），附 per-user 限流；全站 US$150 硬上限，100% 停用並退回本地規則。
3. 輸出一律帶 source：meta_live／local_rule／demo_fixture；三者永不合併計算。
4. 模型輸出用 Zod 驗證；confidence<0.6 或格式錯 → 本地回退（T09）。
5. XP 與精靈幣只由規則函式決定，模型不碰帳本。
6. 11/2 freeze 前只做 P0；freeze 後只修 bug。

## Git
- 功能分支（feat/...）＋PR；人類回「Pass」才 merge；不直推 main、不 force-push。
- 每日收工一個 PR；commit 格式 feat:／fix:／test:／docs:。

## 收尾（每個任務）
1. 相關測試＋typecheck 綠；PR 前跑全套（test＋build＋lint）。
2. 更新 docs/HANDOFF.md（完成／改檔／測試／未測／阻礙／Meta 用量／下一步）。
3. 證據放 docs/evidence/；未實測不標完成、不寫虛構數字。
