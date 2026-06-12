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
import { RaBillService } from './ra-bill.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

@ApiTags('construction-ra-bills')
@ApiBearerAuth()
@Controller('construction/ra-bills')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RaBillController {
  constructor(private readonly raBillService: RaBillService) {}

  @Get()
  @RequirePermissions('construction:read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('contractId') contractId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.raBillService.findAll(tenantId, {
      contractId,
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('construction:read')
  findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.raBillService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('construction:write')
  create(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() body: any) {
    return this.raBillService.create(tenantId, user?.id, body);
  }

  @Put(':id/certify')
  @RequirePermissions('construction:write')
  certify(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('certifiedBy') certifiedBy: string,
  ) {
    return this.raBillService.certify(tenantId, id, user?.id, certifiedBy);
  }

  @Put(':id/status')
  @RequirePermissions('construction:write')
  updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.raBillService.updateStatus(tenantId, id, status);
  }
}
