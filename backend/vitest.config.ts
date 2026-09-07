import 'dotenv/config';
import { defineConfig } from 'vitest/config';

// Route ALL tests to an isolated Postgres schema (`test`) so they never touch
// development/production data. Derived from DATABASE_URL in .env — same server,
// separate schema. vitest.config runs in the main process and forked workers
// inherit this env, so the Prisma client picks up the test schema.
const base = process.env.DATABASE_URL ?? '';
process.env.DATABASE_URL = /schema=/.test(base)
  ? base.replace(/schema=[^&]+/, 'schema=test')
  : base + (base.includes('?') ? '&' : '?') + 'schema=test';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 30000,
    globalSetup: './tests/globalSetup.ts',
  },
});
