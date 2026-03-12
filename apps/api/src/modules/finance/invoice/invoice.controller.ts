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
import { InvoiceService } from './invoice.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('finance/invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @RequirePermissions('invoices:read')
  @ApiOperation({ summary: 'List invoices' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.invoiceService.findAll(tenantId, { status, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('invoices:read')
  @ApiOperation({ summary: 'Get invoice with lines' })
  @ApiResponse({ status: 200, description: 'Invoice details with lines' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.invoiceService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('invoices:write')
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: any,
  ) {
    return this.invoiceService.create(tenantId, user.sub, body);
  }

  @Put(':id')
  @RequirePermissions('invoices:write')
  @ApiOperation({ summary: 'Update a draft invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: any,
  ) {
    return this.invoiceService.update(tenantId, id, body);
  }

  @Post(':id/confirm')
  @RequirePermissions('invoices:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a draft invoice (mark as sent)' })
  @ApiResponse({ status: 200, description: 'Invoice confirmed' })
  async confirm(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.invoiceService.confirm(tenantId, id);
  }

  @Post(':id/send')
  @RequirePermissions('invoices:send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send invoice to customer via email' })
  @ApiResponse({ status: 200, description: 'Invoice queued for sending' })
  async send(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.invoiceService.send(tenantId, id);
  }

  @Post(':id/payment')
  @RequirePermissions('invoices:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a payment against the invoice' })
  @ApiResponse({ status: 200, description: 'Payment recorded' })
  async recordPayment(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: { amount: string; date: string; reference?: string; paymentMethod?: string },
  ) {
    return this.invoiceService.recordPayment(tenantId, id, body);
  }

  @Post(':id/void')
  @RequirePermissions('invoices:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void an invoice' })
  @ApiResponse({ status: 200, description: 'Invoice voided' })
  async voidInvoice(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.invoiceService.voidInvoice(tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('invoices:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a draft invoice' })
  @ApiResponse({ status: 204, description: 'Invoice deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.invoiceService.softDelete(tenantId, id);
  }
}
