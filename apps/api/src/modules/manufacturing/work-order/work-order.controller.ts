import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkOrderService } from './work-order.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateWorkOrderDto } from './dto/create-work-order.dto.js';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto.js';

@ApiTags('manufacturing-work-orders')
@ApiBearerAuth()
@Controller('manufacturing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  @Get('work-orders')
  @RequirePermissions('manufacturing:read')
  @ApiOperation({ summary: 'List work orders with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of work orders' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.workOrderService.findAll(tenantId, { status, priority, search, limit, offset });
  }

  @Get('work-orders/:id')
  @RequirePermissions('manufacturing:read')
  @ApiOperation({ summary: 'Get work order by ID with operations' })
  @ApiResponse({ status: 200, description: 'Work order details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.workOrderService.findById(tenantId, id);
  }

  @Post('work-orders')
  @RequirePermissions('manufacturing:write')
  @ApiOperation({ summary: 'Create a new work order' })
  @ApiResponse({ status: 201, description: 'Work order created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateWorkOrderDto,
  ) {
    return this.workOrderService.create(tenantId, body);
  }

  @Put('work-orders/:id')
  @RequirePermissions('manufacturing:write')
  @ApiOperation({ summary: 'Update a work order' })
  @ApiResponse({ status: 200, description: 'Work order updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateWorkOrderDto,
  ) {
    return this.workOrderService.update(tenantId, id, body);
  }

  @Post('work-orders/:id/start')
  @RequirePermissions('manufacturing:write')
  @ApiOperation({ summary: 'Start a work order' })
  @ApiResponse({ status: 200, description: 'Work order started' })
  async start(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.workOrderService.updateStatus(tenantId, id, 'in_progress');
  }

  @Post('work-orders/:id/complete')
  @RequirePermissions('manufacturing:write')
  @ApiOperation({ summary: 'Complete a work order' })
  @ApiResponse({ status: 200, description: 'Work order completed' })
  async complete(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.workOrderService.updateStatus(tenantId, id, 'completed');
  }

  @Post('work-orders/:id/stop')
  @RequirePermissions('manufacturing:write')
  @ApiOperation({ summary: 'Stop a work order' })
  @ApiResponse({ status: 200, description: 'Work order stopped' })
  async stop(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.workOrderService.updateStatus(tenantId, id, 'stopped');
  }

  @Post('work-orders/:id/cancel')
  @RequirePermissions('manufacturing:write')
  @ApiOperation({ summary: 'Cancel a work order' })
  @ApiResponse({ status: 200, description: 'Work order cancelled' })
  async cancel(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.workOrderService.updateStatus(tenantId, id, 'cancelled');
  }

  @Delete('work-orders/:id')
  @RequirePermissions('manufacturing:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a work order' })
  @ApiResponse({ status: 204, description: 'Work order deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.workOrderService.softDelete(tenantId, id);
  }
}
