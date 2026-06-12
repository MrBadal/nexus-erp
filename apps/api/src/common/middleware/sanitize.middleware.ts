import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Strips dangerous HTML tags and script content from string values in request bodies.
 * Prevents stored XSS by sanitizing at the API boundary.
 */
@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitize(req.body);
    }
    next();
  }

  private sanitize(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/on\w+\s*=\s*'[^']*'/gi, '');
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        sanitized[key] = this.sanitize(value);
      }
      return sanitized;
    }

    return obj;
  }
}
