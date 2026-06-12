import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service.js';
import { JwtAuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Get audit log entries' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.auditService.findAll(tenantId, { entityType, entityId, userId, action, limit, offset });
  }

  @Get('security-events')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Get security events' })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSecurityEvents(
    @CurrentTenant() tenantId: string,
    @Query('eventType') eventType?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getSecurityEvents(tenantId, eventType, limit);
  }
}
