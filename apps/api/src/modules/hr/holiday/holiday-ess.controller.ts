import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HolidayService } from './holiday.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';

/**
 * ESS (Employee Self-Service) controller for holidays.
 * No RECORD-scope guard needed because holidays are tenant-wide and visible to
 * all employees of the tenant, regardless of role -- gated on `ess:read_holidays`,
 * which every seeded role has (not `ess:read`, which is ESS-portal-specific and
 * NOT held by e.g. hr_manager/telecaller/sales_manager -- using it here would
 * have silently broken holiday visibility for every non-`employee` role).
 */
@ApiTags('ess-holidays')
@ApiBearerAuth()
@Controller('ess/holidays')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HolidayEssController {
  constructor(private readonly holidayService: HolidayService) {}

  @Get()
  @RequirePermissions('ess:read_holidays')
  @ApiOperation({ summary: 'List holidays for the current tenant (ESS view)' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of holidays' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('year') year?: string,
  ) {
    if (year !== undefined && year !== null && year !== '') {
      const yr = Number(year);
      if (Number.isFinite(yr)) {
        return this.holidayService.listForYear(tenantId, yr);
      }
    }
    return this.holidayService.findAll(tenantId);
  }
}
