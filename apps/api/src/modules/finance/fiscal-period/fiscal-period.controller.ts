import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FiscalPeriodService } from './fiscal-period.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('fiscal-periods')
@ApiBearerAuth()
@Controller('finance/fiscal-periods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FiscalPeriodController {
  constructor(private readonly fiscalPeriodService: FiscalPeriodService) {}

  @Get()
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'List all fiscal periods' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.fiscalPeriodService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Get fiscal period by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.fiscalPeriodService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('accounts:write')
  @ApiOperation({ summary: 'Create fiscal period' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: { name: string; type: 'month' | 'quarter' | 'year'; startDate: string; endDate: string },
  ) {
    return this.fiscalPeriodService.create(tenantId, body);
  }

  @Post(':id/close')
  @RequirePermissions('accounts:write')
  @ApiOperation({ summary: 'Close fiscal period' })
  async close(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() userId: string,
  ) {
    return this.fiscalPeriodService.close(tenantId, id, userId);
  }

  @Post(':id/reopen')
  @RequirePermissions('accounts:write')
  @ApiOperation({ summary: 'Reopen a closed fiscal period' })
  async reopen(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.fiscalPeriodService.reopen(tenantId, id);
  }

  @Post(':id/lock')
  @RequirePermissions('accounts:write')
  @ApiOperation({ summary: 'Lock fiscal period (permanent)' })
  async lock(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.fiscalPeriodService.lock(tenantId, id);
  }
}
