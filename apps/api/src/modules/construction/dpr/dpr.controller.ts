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
import { DprService } from './dpr.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

@ApiTags('construction-daily-progress')
@ApiBearerAuth()
@Controller('construction/dprs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DprController {
  constructor(private readonly dprService: DprService) {}

  @Get()
  @RequirePermissions('construction:read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('contractId') contractId?: string,
    @Query('status') status?: string,
  ) {
    return this.dprService.findAll(tenantId, { contractId, status });
  }

  @Get(':id')
  @RequirePermissions('construction:read')
  findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.dprService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('construction:write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.dprService.create(tenantId, user?.id, body);
  }

  @Put(':id/submit')
  @RequirePermissions('construction:write')
  submit(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.dprService.submit(tenantId, id, user?.id);
  }

  @Put(':id/approve')
  @RequirePermissions('construction:write')
  approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.dprService.approve(tenantId, id, user?.id);
  }
}
