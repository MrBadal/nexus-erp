import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SiteGrnService } from './site-grn.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

@ApiTags('construction-site-grns')
@ApiBearerAuth()
@Controller('construction/site-grns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SiteGrnController {
  constructor(private readonly siteGrnService: SiteGrnService) {}

  @Get()
  @RequirePermissions('construction:read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('contractId') contractId?: string,
    @Query('status') status?: string,
  ) {
    return this.siteGrnService.findAll(tenantId, { contractId, status });
  }

  @Get(':id')
  @RequirePermissions('construction:read')
  findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.siteGrnService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('construction:write')
  create(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() body: any) {
    return this.siteGrnService.create(tenantId, user?.id, body);
  }

  @Put(':id/submit')
  @RequirePermissions('construction:write')
  submit(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.siteGrnService.updateStatus(tenantId, id, 'submitted');
  }

  @Put(':id/approve')
  @RequirePermissions('construction:write')
  approve(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    return this.siteGrnService.approve(tenantId, id, user?.id);
  }
}
