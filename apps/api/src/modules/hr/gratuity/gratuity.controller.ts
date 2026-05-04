import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GratuityService } from './gratuity.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';

@ApiTags('hr-gratuity')
@ApiBearerAuth()
@Controller('hr/gratuity')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GratuityController {
  constructor(private readonly gratuityService: GratuityService) {}

  @Get('provisions')
  @RequirePermissions('hr:run_payroll')
  @ApiOperation({ summary: 'List gratuity provisions' })
  @ApiQuery({ name: 'fy', required: false, description: 'Filter by fiscal year (e.g. 2025-26)' })
  @ApiResponse({ status: 200, description: 'List of provisions' })
  async listProvisions(
    @CurrentTenant() tenantId: string,
    @Query('fy') fy?: string,
  ) {
    return this.gratuityService.listProvisions(tenantId, fy);
  }

  @Post('provisions/run/:fy')
  @RequirePermissions('hr:run_payroll')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run gratuity provisioning for all eligible active employees' })
  @ApiResponse({ status: 200, description: 'Provisioning summary' })
  async runProvisioning(
    @CurrentTenant() tenantId: string,
    @Param('fy') fy: string,
  ) {
    return this.gratuityService.provisionAllEligible(tenantId, fy);
  }

  @Get('compute/:employeeId/:fy')
  @RequirePermissions('hr:run_payroll')
  @ApiOperation({ summary: 'Compute gratuity provision (preview, no persistence)' })
  @ApiResponse({ status: 200, description: 'Computed provision' })
  async compute(
    @CurrentTenant() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Param('fy') fy: string,
  ) {
    return this.gratuityService.computeProvision(tenantId, employeeId, fy);
  }
}
