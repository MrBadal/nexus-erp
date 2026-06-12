import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { eq } from 'drizzle-orm';
import { PurchaseOrderService } from './purchase-order.service.js';
import { PdfService, type PurchaseOrderPdfData } from '../../shared/pdf.service.js';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { suppliers, tenants } from '../../../database/schema/index.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto.js';

@ApiTags('buying-purchase-orders')
@ApiBearerAuth()
@Controller('buying')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseOrderController {
  constructor(
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly pdfService: PdfService,
    @Inject(DATABASE) private readonly db: DrizzleDB,
  ) {}

  @Get('purchase-orders')
  @RequirePermissions('buying:read')
  @ApiOperation({ summary: 'List purchase orders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of purchase orders' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.purchaseOrderService.findAll(tenantId, { status, supplierId, search, limit, offset });
  }

  @Get('purchase-orders/:id')
  @RequirePermissions('buying:read')
  @ApiOperation({ summary: 'Get purchase order by ID with line items' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.purchaseOrderService.findById(tenantId, id);
  }

  @Post('purchase-orders')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Create a purchase order' })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreatePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.create(tenantId, body);
  }

  @Put('purchase-orders/:id')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Update a purchase order' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.update(tenantId, id, body);
  }

  @Post('purchase-orders/:id/submit')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Submit a purchase order for approval' })
  async submit(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.purchaseOrderService.updateStatus(tenantId, id, 'submitted');
  }

  @Post('purchase-orders/:id/approve')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Approve a purchase order' })
  async approve(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.purchaseOrderService.updateStatus(tenantId, id, 'approved');
  }

  @Post('purchase-orders/:id/create-bill')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Create a bill from an approved/received purchase order' })
  @ApiResponse({ status: 201, description: 'Bill created from purchase order' })
  async createBill(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.purchaseOrderService.createBill(tenantId, id, user.userId);
  }

  @Post('purchase-orders/:id/create-grn')
  @RequirePermissions('buying:write', 'inventory:write')
  @ApiOperation({ summary: 'Create a purchase receipt (GRN) from an approved purchase order' })
  @ApiResponse({ status: 201, description: 'GRN created from purchase order' })
  async createGRN(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: { warehouseId: string },
  ) {
    return this.purchaseOrderService.createGRN(tenantId, id, body.warehouseId);
  }

  @Post('purchase-orders/:id/cancel')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Cancel a purchase order' })
  async cancel(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.purchaseOrderService.updateStatus(tenantId, id, 'cancelled');
  }

  @Get('purchase-orders/:id/pdf')
  @RequirePermissions('buying:read')
  @ApiOperation({ summary: 'Download purchase order as PDF' })
  async downloadPdf(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Res() res: Response,
  ) {
    const po = await this.purchaseOrderService.findById(tenantId, id);

    const [supplier] = await this.db
      .select({ name: suppliers.name, address: suppliers.address })
      .from(suppliers)
      .where(eq(suppliers.id, po.supplierId))
      .limit(1);

    const [tenant] = await this.db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const pdfData: PurchaseOrderPdfData = {
      header: { companyName: tenant?.name || 'Company' },
      orderNumber: po.orderNumber,
      orderDate: po.orderDate,
      expectedDelivery: po.expectedDelivery || '',
      supplierName: supplier?.name || 'Supplier',
      supplierAddress: supplier?.address || undefined,
      lines: po.lines.map((l: Record<string, unknown>, i: number) => ({
        sn: i + 1,
        description: (l.description as string) || 'Item',
        quantity: parseFloat(l.quantity as string),
        unitPrice: parseFloat(l.unitPrice as string),
        taxRate: l.taxRate ? parseFloat(l.taxRate as string) : undefined,
        amount: parseFloat(l.lineTotal as string),
      })),
      subtotal: parseFloat(po.subtotal),
      taxAmount: parseFloat(po.taxAmount),
      discountAmount: parseFloat(po.discountAmount || '0'),
      totalAmount: parseFloat(po.totalAmount),
      notes: po.notes || undefined,
    };

    const buffer = await this.pdfService.generatePurchaseOrderPdf(pdfData);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${po.orderNumber}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Delete('purchase-orders/:id')
  @RequirePermissions('buying:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a purchase order' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.purchaseOrderService.softDelete(tenantId, id);
  }
}
