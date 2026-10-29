// scripts/verify-meta.mjs — one live Muse Spark intent call (M1 gate).
// Reads META_API_BASE_URL / META_API_KEY / META_MODEL_INTENT from the
// environment (falls back to .env.local). Reports set/unset only and never
// prints secret values. Exit 0 = live call OK, 2 = blocked (env missing).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, '.env.local');

function loadEnvLocal() {
  if (!existsSync(ENV_PATH)) return;
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

loadEnvLocal();

const baseURL = process.env.META_API_BASE_URL || '';
const apiKey = process.env.META_API_KEY || '';
const model = process.env.META_MODEL_INTENT || '';

console.log(`META_API_BASE_URL: ${baseURL ? 'set' : 'MISSING'}`);
console.log(`META_API_KEY: ${apiKey ? 'set' : 'MISSING'}`);
console.log(`META_MODEL_INTENT: ${model || 'MISSING'}`);

if (!baseURL || !apiKey || !model) {
  console.error('BLOCKED: Meta intent env incomplete; skipping live call.');
  process.exit(2);
}

const client = new OpenAI({ baseURL, apiKey });
const resp = await client.responses.create({
  model,
  input: [
    { role: 'system', content: 'Classify a short ritual utterance. Reply JSON only: {"intent": <bless|gratitude|calm|sleep|greet|encourage|share|unknown>, "confidence": <0..1>}.' },
    { role: 'user', content: 'I feel restless and cannot relax tonight' },
  ],
  text: {
    format: {
      type: 'json_schema',
      name: 'intent_probe',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['intent', 'confidence'],
        properties: {
          intent: { type: 'string', enum: ['bless', 'gratitude', 'calm', 'sleep', 'greet', 'encourage', 'share', 'unknown'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
      strict: true,
    },
  },
  max_output_tokens: 200,
});

console.log(JSON.stringify({
  output_text: resp.output_text,
  usage: resp.usage ?? null,
  model: resp.model || null,
}, null, 2));
