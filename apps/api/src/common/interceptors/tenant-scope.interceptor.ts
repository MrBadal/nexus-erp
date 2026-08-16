import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TENANT_ID_STORAGE } from '../../database/tenant-scope.js';

/**
 * The "thin caller" from docs/crm/02-SCHEMA-MIGRATION-DESIGN.md Part B --
 * derives tenantId from the already-authenticated request and makes it
 * available via TENANT_ID_STORAGE (owned by database/tenant-scope.ts, not
 * this file — the data-access layer defines its own context primitive
 * rather than depending on a presentation-layer interceptor for it).
 *
 * Deliberately does NOT open a database transaction itself. Each unit of DB
 * work opens its own short-lived scope via withCurrentTenantScope() instead
 * — see tenant-scope.ts for why (an earlier version of this interceptor held
 * one transaction open for the whole request, which is the S1 problem).
 *
 * NOT wired into app.module.ts as a global interceptor in Phase 1a — RLS
 * isn't active yet, so this has no enforcement effect until 1b; built now so
 * 1b turns it on rather than designs it under pressure. No existing CRM
 * service reads from currentTenantId()/withCurrentTenantScope() yet —
 * migrating services off direct `@Inject(DATABASE)` is Phase 1b work.
 */
@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const tenantId: string | undefined = request.user?.tenantId ?? request.tenantId;

    if (!tenantId) {
      // No tenant context (e.g. a @Public() route) -- nothing to scope.
      return next.handle();
    }

    return new Observable((subscriber) => {
      TENANT_ID_STORAGE.run({ tenantId }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
