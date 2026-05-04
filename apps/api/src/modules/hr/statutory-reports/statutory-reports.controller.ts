import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StatutoryReportsService } from './statutory-reports.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';

@ApiTags('hr-statutory-reports')
@ApiBearerAuth()
@Controller('hr/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StatutoryReportsController {
  constructor(private readonly service: StatutoryReportsService) {}

  @Get('pf-return/:fy/:month')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'PF return for a fiscal-year month' })
  @ApiResponse({ status: 200, description: 'Per-employee EPF and EPS contributions' })
  async pfReturn(
    @CurrentTenant() tenantId: string,
    @Param('fy') fy: string,
    @Param('month') month: string,
  ) {
    return this.service.pfReturn(tenantId, fy, month);
  }

  @Get('esi-return/:fy/:month')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'ESI return — employees with monthly gross <= 21,000' })
  @ApiResponse({ status: 200, description: 'Per-employee ESI contributions' })
  async esiReturn(
    @CurrentTenant() tenantId: string,
    @Param('fy') fy: string,
    @Param('month') month: string,
  ) {
    return this.service.esiReturn(tenantId, fy, month);
  }

  @Get('pt-register/:fy/:month')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Professional Tax register grouped by state' })
  @ApiResponse({ status: 200, description: 'Per-employee PT deductions' })
  async ptRegister(
    @CurrentTenant() tenantId: string,
    @Param('fy') fy: string,
    @Param('month') month: string,
  ) {
    return this.service.ptRegister(tenantId, fy, month);
  }

  @Get('tds-quarterly/:fy/:quarter')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'TDS deductions for a quarter (Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar)' })
  @ApiResponse({ status: 200, description: 'Per-employee TDS for the 3 months' })
  async tdsQuarterly(
    @CurrentTenant() tenantId: string,
    @Param('fy') fy: string,
    @Param('quarter') quarter: string,
  ) {
    return this.service.tdsQuarterly(tenantId, fy, quarter);
  }
}
