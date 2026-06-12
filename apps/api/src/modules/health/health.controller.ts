import { Controller, Get, Inject, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { Public } from '../../common/decorators/public.decorator.js';

interface HealthStatus {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  uptime: number;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness/readiness probe (public, no auth)' })
  @ApiResponse({ status: 200, description: 'Service and database are up' })
  @ApiResponse({ status: 503, description: 'Database is unreachable' })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthStatus> {
    let db: 'up' | 'down' = 'up';

    try {
      await this.db.execute(sql`SELECT 1`);
    } catch {
      db = 'down';
    }

    const body: HealthStatus = {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      uptime: Math.round(process.uptime()),
    };

    if (db === 'down') {
      res.status(503);
    }

    return body;
  }
}
