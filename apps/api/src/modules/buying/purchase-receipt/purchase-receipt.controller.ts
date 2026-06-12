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
import { PurchaseReceiptService } from './purchase-receipt.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreatePurchaseReceiptDto } from './dto/create-purchase-receipt.dto.js';

@ApiTags('buying-purchase-receipts')
@ApiBearerAuth()
@Controller('buying')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseReceiptController {
  constructor(private readonly purchaseReceiptService: PurchaseReceiptService) {}

  @Get('purchase-receipts')
  @RequirePermissions('buying:read')
  @ApiOperation({ summary: 'List purchase receipts' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'purchaseOrderId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.purchaseReceiptService.findAll(tenantId, { status, supplierId, purchaseOrderId, search, limit, offset });
  }

  @Get('purchase-receipts/:id')
  @RequirePermissions('buying:read')
  @ApiOperation({ summary: 'Get purchase receipt by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.purchaseReceiptService.findById(tenantId, id);
  }

  @Post('purchase-receipts')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Create a purchase receipt (GRN)' })
  @ApiResponse({ status: 201, description: 'Purchase receipt created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreatePurchaseReceiptDto,
  ) {
    return this.purchaseReceiptService.create(tenantId, body);
  }

  @Post('purchase-receipts/:id/submit')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Submit a purchase receipt' })
  async submit(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.purchaseReceiptService.updateStatus(tenantId, id, 'submitted');
  }

  @Post('purchase-receipts/:id/complete')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Complete a purchase receipt' })
  async complete(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.purchaseReceiptService.updateStatus(tenantId, id, 'completed');
  }

  @Delete('purchase-receipts/:id')
  @RequirePermissions('buying:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a purchase receipt' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.purchaseReceiptService.softDelete(tenantId, id);
  }
}
