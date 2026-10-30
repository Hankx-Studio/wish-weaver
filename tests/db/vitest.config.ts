import { defineConfig } from 'vitest/config';

// Scoped runner for the disposable-database suite. The root vitest.config.ts
// intentionally covers only tests/unit (safe, no DB); this config runs
// tests/db explicitly so `npm test` can never touch a database by accident.
// Run from the repo root, e.g.:
//
//   SUPABASE_TEST_URL=http://127.0.0.1:54321 \
//   SUPABASE_TEST_SERVICE_ROLE_KEY=<key> \
//     npx vitest run --config tests/db/vitest.config.ts
//
// See tests/db/README.md. NEVER point these at production.
export default defineConfig({
  test: {
    include: ['tests/db/**/*.test.ts'],
    environment: 'node',
  },
});
