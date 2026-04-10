import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { ProcurementDashboardService } from './procurement-dashboard.service.js';
import { JwtAuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly procurementDashboardService: ProcurementDashboardService,
  ) {}

  @Get('kpis')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Get dashboard KPIs including revenue, expenses, AR, AP, cash' })
  @ApiResponse({ status: 200, description: 'Dashboard KPIs' })
  async getKpis(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getKpis(tenantId);
  }

  @Get('procurement')
  @RequirePermissions('buying:read')
  @ApiOperation({ summary: 'Procurement dashboard KPIs' })
  async getProcurementDashboard(@CurrentTenant() tenantId: string) {
    return this.procurementDashboardService.getKpis(tenantId);
  }
}
