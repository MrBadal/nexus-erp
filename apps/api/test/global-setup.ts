import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Test-DB connection, matching docker-compose.test.yml. Exported so test files
// (via test/db.ts) connect to the same disposable instance this setup boots.
export const TEST_DB_ENV = {
  DB_HOST: '127.0.0.1',
  DB_PORT: '5433',
  DB_NAME: 'nexuserp_test',
  DB_USER: 'postgres',
  DB_PASSWORD: 'postgres',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

function sh(cmd: string, cwd: string) {
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...TEST_DB_ENV } });
}

/**
 * Vitest globalSetup: boots a disposable Postgres via docker-compose.test.yml,
 * waits for it to report healthy, then applies the full versioned migration
 * chain (the same 0000-0006 files that produced production's actual schema --
 * see docs/crm/02-SCHEMA-MIGRATION-DESIGN.md) so tests run against a real
 * schema, not a hand-maintained approximation of one.
 */
export async function setup() {
  sh('docker compose -f docker-compose.test.yml up -d --wait', repoRoot);
  // `npx` (not the raw node_modules/.bin/drizzle-kit path) so this resolves
  // correctly cross-platform -- the bare .bin entry is a POSIX shell script
  // on Windows and needs its .cmd shim, which npx already knows how to find.
  sh('npx drizzle-kit migrate', path.resolve(__dirname, '..'));
}

export async function teardown() {
  sh('docker compose -f docker-compose.test.yml down -v', repoRoot);
}
