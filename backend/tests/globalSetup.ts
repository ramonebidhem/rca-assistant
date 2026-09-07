import { execSync } from 'node:child_process';

// Applies the current migrations to the isolated `test` schema before the suite
// runs. DATABASE_URL was already rewritten to schema=test in vitest.config.ts,
// and this runs in the same process, so migrate deploy targets the test schema.
export default function setup() {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
