import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { eq } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { auditLog } from '../../database/schema/index.js';

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const METHOD_TO_ACTION: Record<string, string> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    if (!MUTATION_METHODS.includes(method)) {
      return next.handle();
    }

    const user = (request as any).user;
    if (!user) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          const path = request.path;
          const pathParts = path.split('/').filter(Boolean);

          // Derive entity type from route path (e.g., /api/v1/accounts -> accounts)
          const entityType = pathParts[pathParts.length - (request.params.id ? 2 : 1)] || 'unknown';
          const entityId = request.params.id || responseData?.id || null;
          const action = METHOD_TO_ACTION[method] || 'update';

          await this.db.insert(auditLog).values({
            tenantId: user.tenantId,
            userId: user.sub,
            action: action as any,
            entityType,
            entityId,
            changes: method === 'DELETE' ? null : (request.body as any),
            metadata: {
              ip: request.ip,
              userAgent: request.headers['user-agent'],
              path: request.path,
              method,
              duration: Date.now() - startTime,
            },
          });
        } catch (error) {
          // Audit logging should never break the request
          console.error('Audit log error:', error);
        }
      }),
    );
  }
}
