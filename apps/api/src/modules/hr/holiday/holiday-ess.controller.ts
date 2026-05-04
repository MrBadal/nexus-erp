import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HolidayService } from './holiday.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';

/**
 * ESS (Employee Self-Service) controller for holidays.
 * No scope guard needed because holidays are tenant-wide and visible to all employees of the tenant.
 */
@ApiTags('ess-holidays')
@ApiBearerAuth()
@Controller('ess/holidays')
@UseGuards(JwtAuthGuard)
export class HolidayEssController {
  constructor(private readonly holidayService: HolidayService) {}

  @Get()
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
