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
import { SalesOrderService } from './sales-order.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto.js';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto.js';

@ApiTags('selling-sales-orders')
@ApiBearerAuth()
@Controller('selling')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesOrderController {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Get('sales-orders')
  @RequirePermissions('selling:read')
  @ApiOperation({ summary: 'List sales orders with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of sales orders' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.salesOrderService.findAll(tenantId, { status, customerId, search, limit, offset });
  }

  @Get('sales-orders/:id')
  @RequirePermissions('selling:read')
  @ApiOperation({ summary: 'Get sales order by ID with line items' })
  @ApiResponse({ status: 200, description: 'Sales order details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.salesOrderService.findById(tenantId, id);
  }

  @Post('sales-orders')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Create a new sales order' })
  @ApiResponse({ status: 201, description: 'Sales order created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateSalesOrderDto,
  ) {
    return this.salesOrderService.create(tenantId, body);
  }

  @Put('sales-orders/:id')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Update a sales order' })
  @ApiResponse({ status: 200, description: 'Sales order updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateSalesOrderDto,
  ) {
    return this.salesOrderService.update(tenantId, id, body);
  }

  @Post('sales-orders/:id/confirm')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Confirm a draft sales order' })
  @ApiResponse({ status: 200, description: 'Sales order confirmed' })
  async confirm(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.salesOrderService.updateStatus(tenantId, id, 'confirmed');
  }

  @Post('sales-orders/:id/create-invoice')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Create an invoice from a delivered sales order' })
  @ApiResponse({ status: 201, description: 'Invoice created from sales order' })
  async createInvoice(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.salesOrderService.createInvoice(tenantId, id, user.userId);
  }

  @Post('sales-orders/:id/create-delivery-note')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Create a delivery note from a confirmed sales order' })
  @ApiResponse({ status: 201, description: 'Delivery note created from sales order' })
  async createDeliveryNote(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.salesOrderService.createDeliveryNote(tenantId, id, user.userId);
  }

  @Post('sales-orders/:id/cancel')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Cancel a sales order' })
  @ApiResponse({ status: 200, description: 'Sales order cancelled' })
  async cancel(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.salesOrderService.updateStatus(tenantId, id, 'cancelled');
  }

  @Delete('sales-orders/:id')
  @RequirePermissions('selling:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a sales order' })
  @ApiResponse({ status: 204, description: 'Sales order deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.salesOrderService.softDelete(tenantId, id);
  }
}
