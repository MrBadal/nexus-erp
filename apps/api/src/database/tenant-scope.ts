import { sql } from 'drizzle-orm';
import { BadRequestException } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { DrizzleDB } from './database.module.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  // Validated even though set_config() below binds tenantId as a parameter
  // (safe from injection as written today). The value it's about to set
  // governs row visibility under RLS once Phase 1b activates it -- that's
  // worth a cheap, unconditional format check at the one chokepoint every
  // caller goes through, so a future refactor that swaps set_config() for a
  // sql.raw()-built statement (an easy, plausible "optimization" someone
  // makes without reading this file) can't turn an unvalidated tenantId into
  // a real injection point into the GUC. Defense in depth, not a response to
  // a currently-exploitable path.
  if (!UUID_RE.test(tenantId)) {
    throw new BadRequestException(`withTenantScope: tenantId is not a valid UUID: ${JSON.stringify(tenantId)}`);
  }

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

// ─── Request-scoped tenant context (Phase 1b consumption point) ───────────

/**
 * Carries the current tenantId only — never an open transaction. A request
 * that needs three separate DB operations opens (and commits) three separate
 * short-lived scopes via withCurrentTenantScope() below, each reading
 * tenantId from here; it does not hold one transaction open for the whole
 * request. See docs/crm/02-SCHEMA-MIGRATION-DESIGN.md Part B — an earlier
 * version of this design stashed an open tx here for the request's lifetime,
 * which reintroduced the exact S1 problem (external I/O awaited while a
 * transaction sits open) this module's own doc comment warns against.
 * Populated by `TenantScopeInterceptor` (common/interceptors/tenant-scope.interceptor.ts).
 */
export const TENANT_ID_STORAGE = new AsyncLocalStorage<{ tenantId: string }>();

/** The current request's tenantId, or null outside any scope (e.g. a
 *  @Public() route, or code running outside a request entirely). Callers
 *  must handle null — this never throws. */
export function currentTenantId(): string | null {
  return TENANT_ID_STORAGE.getStore()?.tenantId ?? null;
}

/**
 * The shape Phase 1b's CRM services actually call: opens ONE short-lived
 * withTenantScope for this one unit of DB work, using the tenantId already
 * populated by TenantScopeInterceptor for the current request. Throws if
 * called outside any tenant-scoped context (e.g. a @Public() route calling
 * this by mistake) rather than silently running unscoped.
 */
export async function withCurrentTenantScope<T>(db: DrizzleDB, fn: (tx: DrizzleDB) => Promise<T>): Promise<T> {
  const tenantId = currentTenantId();
  if (!tenantId) {
    throw new BadRequestException('withCurrentTenantScope: no tenant context is active for this request');
  }
  return withTenantScope(db, tenantId, fn);
}
