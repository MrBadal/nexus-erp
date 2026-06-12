import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

@Controller('finance/payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @RequirePermissions('finance:read')
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.paymentService.findAll(tenantId, {
      type,
      status,
      customerId,
      vendorId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('finance:read')
  async findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.paymentService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('finance:write')
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() data: {
      date: string;
      amount: string;
      currencyCode?: string;
      paymentMethod: string;
      reference?: string;
      bankAccountId?: string;
      customerId?: string;
      vendorId?: string;
      type: 'received' | 'made';
      notes?: string;
    },
  ) {
    return this.paymentService.create(tenantId, user.id, data);
  }

  @Put(':id/confirm')
  @RequirePermissions('finance:write')
  async confirm(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.paymentService.confirm(tenantId, id, user.id);
  }

  @Put(':id/void')
  @RequirePermissions('finance:write')
  async voidPayment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.paymentService.voidPayment(tenantId, id);
  }

  @Post(':id/allocations')
  @RequirePermissions('finance:write')
  async addAllocation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() data: {
      documentType: 'invoice' | 'bill' | 'credit_note' | 'debit_note';
      documentId: string;
      amount: string;
    },
  ) {
    return this.paymentService.addAllocation(tenantId, id, user.id, data);
  }
}
