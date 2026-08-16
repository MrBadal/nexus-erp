import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable, from, firstValueFrom } from 'rxjs';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { withTenantScope } from '../../database/tenant-scope.js';

/**
 * Request-scoped store for the tx opened by TenantScopeInterceptor. Exists so
 * a future (Phase 1b) service can retrieve the already-scoped tx instead of
 * injecting DATABASE directly -- not consumed by any service yet in Phase 1a.
 * That migration (every CRM service reading from this instead of DATABASE) is
 * Phase 1b work; this interceptor is the thin caller Phase 1a commits to
 * building now, not a retrofit of existing services.
 */
export const TENANT_TX_STORAGE = new AsyncLocalStorage<{ tx: DrizzleDB }>();

/** Returns the current request's scoped tx, or null outside any scope (e.g.
 *  a @Public() route, or code that hasn't opted into the ALS-based lookup
 *  yet -- callers must handle null, this never throws). */
export function currentScopedTx(): DrizzleDB | null {
  return TENANT_TX_STORAGE.getStore()?.tx ?? null;
}

/**
 * The "thin caller" from docs/crm/02-SCHEMA-MIGRATION-DESIGN.md Part B --
 * derives tenantId from the already-authenticated request and calls
 * withTenantScope exactly the way a BullMQ job handler or a @Cron per-tenant
 * iteration will in Phase 1b. NOT wired into app.module.ts as a global
 * interceptor in Phase 1a -- RLS isn't active yet, so scoping every request
 * would add transaction overhead with no enforcement benefit until 1b. Built
 * now so 1b turns it on rather than designs it under pressure.
 */
@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const tenantId: string | undefined = request.user?.tenantId ?? request.tenantId;

    if (!tenantId) {
      // No tenant context (e.g. a @Public() route) -- nothing to scope.
      return next.handle();
    }

    const result = withTenantScope(this.db, tenantId, (tx) =>
      TENANT_TX_STORAGE.run({ tx }, () => firstValueFrom(next.handle(), { defaultValue: undefined })),
    );

    return from(result);
  }
}
