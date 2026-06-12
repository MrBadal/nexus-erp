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
import { QuotationService } from './quotation.service.js';
import { PdfService, type QuotationPdfData } from '../../shared/pdf.service.js';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { customers, tenants } from '../../../database/schema/index.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateQuotationDto } from './dto/create-quotation.dto.js';
import { UpdateQuotationDto } from './dto/update-quotation.dto.js';

@ApiTags('selling-quotations')
@ApiBearerAuth()
@Controller('selling')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuotationController {
  constructor(
    private readonly quotationService: QuotationService,
    private readonly pdfService: PdfService,
    @Inject(DATABASE) private readonly db: DrizzleDB,
  ) {}

  @Get('quotations')
  @RequirePermissions('selling:read')
  @ApiOperation({ summary: 'List quotations with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of quotations' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.quotationService.findAll(tenantId, { status, customerId, search, limit, offset });
  }

  @Get('quotations/:id')
  @RequirePermissions('selling:read')
  @ApiOperation({ summary: 'Get quotation by ID with line items' })
  @ApiResponse({ status: 200, description: 'Quotation details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.quotationService.findById(tenantId, id);
  }

  @Post('quotations')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Create a new quotation' })
  @ApiResponse({ status: 201, description: 'Quotation created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateQuotationDto,
  ) {
    return this.quotationService.create(tenantId, body);
  }

  @Put('quotations/:id')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Update a quotation' })
  @ApiResponse({ status: 200, description: 'Quotation updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateQuotationDto,
  ) {
    return this.quotationService.update(tenantId, id, body);
  }

  @Post('quotations/:id/send')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Mark quotation as sent' })
  @ApiResponse({ status: 200, description: 'Quotation marked as sent' })
  async send(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.quotationService.updateStatus(tenantId, id, 'sent');
  }

  @Post('quotations/:id/accept')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Accept a quotation' })
  @ApiResponse({ status: 200, description: 'Quotation accepted' })
  async accept(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.quotationService.updateStatus(tenantId, id, 'accepted');
  }

  @Post('quotations/:id/convert-to-so')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Convert a quotation to a sales order' })
  @ApiResponse({ status: 201, description: 'Sales order created from quotation' })
  async convertToSalesOrder(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.quotationService.convertToSalesOrder(tenantId, id, user.userId);
  }

  @Post('quotations/:id/reject')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Reject a quotation' })
  @ApiResponse({ status: 200, description: 'Quotation rejected' })
  async reject(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.quotationService.updateStatus(tenantId, id, 'rejected');
  }

  @Get('quotations/:id/pdf')
  @RequirePermissions('selling:read')
  @ApiOperation({ summary: 'Download quotation as PDF' })
  async downloadPdf(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Res() res: Response,
  ) {
    const quotation = await this.quotationService.findById(tenantId, id);

    const [customer] = await this.db
      .select({ name: customers.name, billingAddress: customers.billingAddress })
      .from(customers)
      .where(eq(customers.id, quotation.customerId))
      .limit(1);

    const [tenant] = await this.db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const pdfData: QuotationPdfData = {
      header: { companyName: tenant?.name || 'Company' },
      quotationNumber: quotation.quotationNumber,
      quotationDate: quotation.quotationDate,
      validUntil: quotation.validUntil,
      customerName: customer?.name || 'Customer',
      customerAddress: customer?.billingAddress || undefined,
      lines: (quotation.lines || []).map((l: Record<string, unknown>, i: number) => ({
        sn: i + 1,
        description: (l.description as string) || 'Item',
        quantity: parseFloat(l.quantity as string),
        unitPrice: parseFloat(l.unitPrice as string),
        taxRate: l.taxRate ? parseFloat(l.taxRate as string) : undefined,
        amount: parseFloat(l.lineTotal as string),
      })),
      subtotal: parseFloat(quotation.subtotal),
      taxAmount: parseFloat(quotation.taxAmount),
      discountAmount: parseFloat(quotation.discountAmount || '0'),
      totalAmount: parseFloat(quotation.totalAmount),
      notes: quotation.notes || undefined,
      termsAndConditions: quotation.termsAndConditions || undefined,
    };

    const buffer = await this.pdfService.generateQuotationPdf(pdfData);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${quotation.quotationNumber}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Delete('quotations/:id')
  @RequirePermissions('selling:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a quotation' })
  @ApiResponse({ status: 204, description: 'Quotation deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.quotationService.softDelete(tenantId, id);
  }
}
