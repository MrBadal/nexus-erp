import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillService } from './bill.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('finance-bills')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Get('bills')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'List bills with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'purchaseOrderId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('vendorId') vendorId?: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.billService.findAll(tenantId, { status, vendorId, purchaseOrderId, limit, offset });
  }

  @Get('bills/:id')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Get bill by ID with line items' })
  @ApiResponse({ status: 200, description: 'Bill details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.billService.findById(tenantId, id);
  }

  @Post('bills')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Create a new bill' })
  @ApiResponse({ status: 201, description: 'Bill created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Body() body: {
      vendorId: string;
      vendorInvoiceNumber?: string;
      purchaseOrderId?: string;
      issueDate: string;
      dueDate: string;
      paymentTerms?: string;
      currencyCode?: string;
      notes?: string;
      lines: {
        itemId?: string;
        purchaseOrderLineId?: string;
        description?: string;
        quantity: string;
        unitPrice: string;
        discountType?: string;
        discountValue?: string;
        taxAmount?: string;
        accountId?: string;
        hsnCode?: string;
      }[];
    },
  ) {
    return this.billService.create(tenantId, user.userId, body);
  }

  @Post('bills/:id/approve')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Approve a bill and post GL journal' })
  @ApiResponse({ status: 200, description: 'Bill approved' })
  async approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.billService.approve(tenantId, id, user.userId);
  }

  @Put('bills/:id/void')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Void a bill and reverse GL journal' })
  @ApiResponse({ status: 200, description: 'Bill voided' })
  async voidBill(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.billService.voidBill(tenantId, id);
  }
}
