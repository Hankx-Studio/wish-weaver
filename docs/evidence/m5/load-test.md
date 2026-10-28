# Load test 執行紀錄（M5）

指令：`node scripts/load-test.mjs`（mock fetchImpl，零花費；in-process `app.request`）。

```
PASS burst: all 20 return HTTP 200 — 29ms
PASS burst: all 20 are meta_live
PASS burst: usage logged 20 rows
PASS limit: first 5 pass
PASS limit: 6th+ fall back rate_limited
PASS limit: Retry-After header present
PASS budget: falls back budget_exhausted
PASS budget: zero model calls — 0 calls
LOAD TEST OK
```
