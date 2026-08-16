import { sql } from 'drizzle-orm';
import type { DrizzleDB } from './database.module.js';

/**
 * Runs `fn` inside a transaction with the tenant GUC set for Postgres RLS
 * policies to read (RLS itself is not activated until Phase 1b — see
 * docs/crm/02-SCHEMA-MIGRATION-DESIGN.md Part B). A plain callable, not
 * interceptor-shaped, so it has exactly one implementation used from three
 * call sites with three different tenant sources:
 *   - HTTP requests: `TenantScopeInterceptor` derives tenantId from
 *     `@CurrentTenant()` and calls this once per request.
 *   - BullMQ workers (Phase 1b): call this once per job, with the job
 *     payload's own tenantId — never once per worker process lifetime.
 *   - In-process @Cron iterations: call this once per tenant, inside the
 *     existing per-tenant loop — never once for the whole cron run.
 *
 * Uses `SET LOCAL`, not `SET` — critical with a pooled driver. `SET` persists
 * for the rest of the physical connection's life; a later, unrelated request
 * that happens to reuse the same pooled connection would inherit the previous
 * request's tenant context. `SET LOCAL` is scoped to the transaction and is
 * unconditionally reset at COMMIT or ROLLBACK, regardless of what the
 * underlying connection does afterward — the only safe option with a pool.
 *
 * RULE (S1, docs/crm/02-SCHEMA-MIGRATION-DESIGN.md Part B): `fn` may only
 * perform database work. Never `await` a GCS upload, an email send, or any
 * other external I/O inside the scoped callback — it pins a pooled
 * connection for however long that call takes, and if it hangs, the
 * connection sits idle-in-transaction (a real availability failure under
 * load, not a style concern). If a handler needs both a DB write and an
 * external call: do the DB work in here, let this function return (which
 * commits), then make the external call outside any open transaction — or
 * write an outbox/job row in here and let a separate worker perform the
 * external call later, in its own separate `withTenantScope` call.
 */
export async function withTenantScope<T>(
  db: DrizzleDB,
  tenantId: string,
  fn: (tx: DrizzleDB) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // set_config(), not `SET LOCAL app.tenant_id = ${tenantId}` -- Postgres's
    // SET/SET LOCAL statements do not accept bind parameters as the value
    // (only literals/identifiers), so a parameterized SET LOCAL is a syntax
    // error, not just a style choice. set_config(name, value, is_local) is a
    // normal function call and accepts a parameter; is_local=true gives the
    // identical transaction-scoped reset-on-commit-or-rollback behavior.
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx as unknown as DrizzleDB);
  });
}

/**
 * Reads the tenant GUC as the RLS policies will see it (Part B: wrapped in
 * `NULLIF(..., '')` before casting, so neither "never set" nor "set to
 * empty string" throws — both read back as SQL NULL, which a `tenant_id = NULL`
 * comparison correctly treats as "matches nothing" rather than an error).
 * Exists mainly for tests to assert what's actually visible inside/outside a
 * scope, without needing a real RLS-protected table (RLS lands in 1b).
 */
export async function currentTenantGuc(db: DrizzleDB): Promise<string | null> {
  const rows = (await db.execute(
    sql`SELECT NULLIF(current_setting('app.tenant_id', true), '') AS tenant_id`,
  )) as unknown as { tenant_id: string | null }[];
  return rows[0]?.tenant_id ?? null;
}
