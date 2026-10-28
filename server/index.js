import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { pathToFileURL } from "node:url";
import { loadConfig } from "./config.js";
import { createBudget } from "./budget.js";
import { createRateLimiter } from "./rateLimit.js";
import { createHealthHandler } from "./routes/health.js";
import { createWishHandler } from "./routes/wish.js";
import { postEvolveHandler } from "./routes/evolve.js";
import { postQuestHandler } from "./routes/quest.js";
import { postScanHandler } from "./routes/scan.js";
import { postTranscribeHandler } from "./routes/transcribe.js";

export function createApp({ config, budget, fetchImpl = fetch } = {}) {
  const app = new Hono();
  const wishLimiter = createRateLimiter({ windowMs: 3600_000, max: config.limits.wishPerHour });

  app.get("/api/health", createHealthHandler({ config, budget }));
  app.post("/api/wish", createWishHandler({ config, budget, limiter: wishLimiter, fetchImpl }));
  app.post("/api/evolve", postEvolveHandler);
  app.post("/api/quest", postQuestHandler);
  app.post("/api/scan", postScanHandler);
  app.post("/api/transcribe", postTranscribeHandler);

  app.get("/", serveStatic({ path: "./public/index.html" }));
  app.use("/*", serveStatic({ root: "./public" }));
  return app;
}

async function boot() {
  const config = loadConfig();
  const budget = createBudget({
    dailyCap: config.budget.dailyCap,
    totalCap: config.budget.totalCap,
    usageFile: config.usageFile,
  });
  await budget.load();
  const app = createApp({ config, budget });
  serve({ fetch: app.fetch, port: config.port });
  console.log(`spirit-quest M1 listening on :${config.port}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  boot().catch((err) => {
    console.error(`boot failed: ${err.message}`);
    process.exit(1);
  });
}
