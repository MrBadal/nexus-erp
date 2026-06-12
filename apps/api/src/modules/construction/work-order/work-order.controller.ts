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
import { WorkOrderService } from './work-order.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

@ApiTags('construction-work-orders')
@ApiBearerAuth()
@Controller('construction/work-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  @Get()
  @RequirePermissions('construction:read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('contractId') contractId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.workOrderService.findAll(tenantId, {
      contractId, status, type,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('construction:read')
  findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.workOrderService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('construction:write')
  create(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() body: any) {
    return this.workOrderService.create(tenantId, user?.id, body);
  }

  @Put(':id/approve')
  @RequirePermissions('construction:write')
  approve(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    return this.workOrderService.approve(tenantId, id, user?.id);
  }

  @Post(':id/payments')
  @RequirePermissions('construction:write')
  processPayment(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.workOrderService.processPayment(tenantId, id, user?.id, body);
  }

  @Put('payments/:paymentId/approve')
  @RequirePermissions('construction:write')
  approvePayment(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('paymentId') paymentId: string) {
    return this.workOrderService.approvePayment(tenantId, paymentId, user?.id);
  }
}
