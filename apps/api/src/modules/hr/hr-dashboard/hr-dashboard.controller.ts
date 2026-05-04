import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { HrDashboardService } from './hr-dashboard.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';

@ApiTags('hr-dashboard')
@ApiBearerAuth()
@Controller('hr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrDashboardController {
  constructor(private readonly hrDashboardService: HrDashboardService) {}

  @Get('dashboard')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'HR landing dashboard with operational KPIs' })
  @ApiResponse({ status: 200, description: 'HR dashboard payload' })
  async getDashboard(@CurrentTenant() tenantId: string) {
    return this.hrDashboardService.getDashboard(tenantId);
  }
}
