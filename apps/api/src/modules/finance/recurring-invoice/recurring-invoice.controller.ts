import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecurringInvoiceService } from './recurring-invoice.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('recurring-invoices')
@ApiBearerAuth()
@Controller('finance/recurring-invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecurringInvoiceController {
  constructor(private readonly recurringInvoiceService: RecurringInvoiceService) {}

  @Get()
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'List recurring invoice templates' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.recurringInvoiceService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Get recurring invoice template by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.recurringInvoiceService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Create a recurring invoice template' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: { sourceInvoiceId: string; frequency: string; nextRunDate: string; endDate?: string },
  ) {
    return this.recurringInvoiceService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Update a recurring invoice template' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: { frequency?: string; nextRunDate?: string; endDate?: string; isActive?: boolean },
  ) {
    return this.recurringInvoiceService.update(tenantId, id, body);
  }

  @Post(':id/deactivate')
  @RequirePermissions('finance:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a recurring invoice template' })
  async deactivate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.recurringInvoiceService.deactivate(tenantId, id);
  }
}
