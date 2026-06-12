import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SiteMaterialIssueService } from './site-material-issue.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

@ApiTags('construction-material-issues')
@ApiBearerAuth()
@Controller('construction/material-issues')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SiteMaterialIssueController {
  constructor(private readonly siteMaterialIssueService: SiteMaterialIssueService) {}

  @Get()
  @RequirePermissions('construction:read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('contractId') contractId?: string,
    @Query('status') status?: string,
  ) {
    return this.siteMaterialIssueService.findAll(tenantId, { contractId, status });
  }

  @Get(':id')
  @RequirePermissions('construction:read')
  findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.siteMaterialIssueService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('construction:write')
  create(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() body: any) {
    return this.siteMaterialIssueService.create(tenantId, user?.id, body);
  }

  @Put(':id/approve')
  @RequirePermissions('construction:write')
  approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.siteMaterialIssueService.approve(tenantId, id, user?.id);
  }
}
