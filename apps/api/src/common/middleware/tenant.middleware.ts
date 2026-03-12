import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Extract tenant from multiple sources:
    // 1. JWT payload (set by auth guard)
    // 2. X-Tenant-ID header
    // 3. Subdomain

    const headerTenantId = req.headers['x-tenant-id'] as string | undefined;

    if (headerTenantId) {
      (req as any).tenantId = headerTenantId;
    } else {
      // Try to extract from subdomain
      const host = req.headers.host || '';
      const parts = host.split('.');

      if (parts.length >= 3) {
        const subdomain = parts[0];
        if (subdomain !== 'www' && subdomain !== 'api') {
          (req as any).tenantSlug = subdomain;
        }
      }
    }

    next();
  }
}
