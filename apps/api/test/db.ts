import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/database/schema/index.js';
import { TEST_DB_ENV } from './global-setup.js';

/**
 * A Drizzle client for the disposable test Postgres, mirroring
 * src/database/database.module.ts's own connection construction. Test files
 * call this directly rather than going through Nest's DI container -- these
 * are data-layer tests, not full HTTP integration tests (that's a later,
 * separate concern once the tenant-scoped query helper / RLS land in 1b).
 */
export function createTestDb(options?: { max?: number }) {
  const connectionString = `postgresql://${TEST_DB_ENV.DB_USER}:${TEST_DB_ENV.DB_PASSWORD}@${TEST_DB_ENV.DB_HOST}:${TEST_DB_ENV.DB_PORT}/${TEST_DB_ENV.DB_NAME}`;
  const client = postgres(connectionString, options?.max ? { max: options.max } : undefined);
  const db = drizzle(client, { schema });
  return { db, client };
}
