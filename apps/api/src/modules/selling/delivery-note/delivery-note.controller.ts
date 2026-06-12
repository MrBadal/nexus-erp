import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DeliveryNoteService } from './delivery-note.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateDeliveryNoteDto } from './dto/create-delivery-note.dto.js';

@ApiTags('selling-delivery-notes')
@ApiBearerAuth()
@Controller('selling')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeliveryNoteController {
  constructor(private readonly deliveryNoteService: DeliveryNoteService) {}

  @Get('delivery-notes')
  @RequirePermissions('selling:read')
  @ApiOperation({ summary: 'List delivery notes' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'salesOrderId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of delivery notes' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('salesOrderId') salesOrderId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.deliveryNoteService.findAll(tenantId, { status, customerId, salesOrderId, search, limit, offset });
  }

  @Get('delivery-notes/:id')
  @RequirePermissions('selling:read')
  @ApiOperation({ summary: 'Get delivery note by ID with line items' })
  @ApiResponse({ status: 200, description: 'Delivery note details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.deliveryNoteService.findById(tenantId, id);
  }

  @Post('delivery-notes')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Create a delivery note' })
  @ApiResponse({ status: 201, description: 'Delivery note created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateDeliveryNoteDto,
  ) {
    return this.deliveryNoteService.create(tenantId, body);
  }

  @Post('delivery-notes/:id/dispatch')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Mark delivery note as dispatched' })
  @ApiResponse({ status: 200, description: 'Delivery note dispatched' })
  async dispatch(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.deliveryNoteService.updateStatus(tenantId, id, 'dispatched');
  }

  @Post('delivery-notes/:id/deliver')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Mark delivery note as delivered' })
  @ApiResponse({ status: 200, description: 'Delivery note delivered' })
  async deliver(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.deliveryNoteService.updateStatus(tenantId, id, 'delivered');
  }

  @Post('delivery-notes/:id/create-invoice')
  @RequirePermissions('selling:write', 'finance:write')
  @ApiOperation({ summary: 'Create an invoice from a delivered delivery note' })
  @ApiResponse({ status: 201, description: 'Invoice created from delivery note' })
  async createInvoice(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.deliveryNoteService.createInvoice(tenantId, id, user.userId);
  }

  @Delete('delivery-notes/:id')
  @RequirePermissions('selling:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a delivery note' })
  @ApiResponse({ status: 204, description: 'Delivery note deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.deliveryNoteService.softDelete(tenantId, id);
  }
}
