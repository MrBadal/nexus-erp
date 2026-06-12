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
import { SupplierQuotationService } from './supplier-quotation.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateSupplierQuotationDto } from './dto/create-supplier-quotation.dto.js';

@ApiTags('buying-supplier-quotations')
@ApiBearerAuth()
@Controller('buying')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupplierQuotationController {
  constructor(private readonly supplierQuotationService: SupplierQuotationService) {}

  @Get('supplier-quotations')
  @RequirePermissions('buying:read')
  @ApiOperation({ summary: 'List supplier quotations' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.supplierQuotationService.findAll(tenantId, { status, supplierId, search, limit, offset });
  }

  @Get('supplier-quotations/:id')
  @RequirePermissions('buying:read')
  @ApiOperation({ summary: 'Get supplier quotation by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.supplierQuotationService.findById(tenantId, id);
  }

  @Post('supplier-quotations')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Create a supplier quotation request' })
  @ApiResponse({ status: 201, description: 'Supplier quotation created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateSupplierQuotationDto,
  ) {
    return this.supplierQuotationService.create(tenantId, body);
  }

  @Post('supplier-quotations/:id/receive')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Mark quotation as received from supplier' })
  async receive(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.supplierQuotationService.updateStatus(tenantId, id, 'received');
  }

  @Post('supplier-quotations/:id/accept')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Accept a supplier quotation' })
  async accept(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.supplierQuotationService.updateStatus(tenantId, id, 'accepted');
  }

  @Post('supplier-quotations/:id/convert-to-po')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Convert supplier quotation to purchase order' })
  @ApiResponse({ status: 201, description: 'Purchase order created from supplier quotation' })
  async convertToPurchaseOrder(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.supplierQuotationService.convertToPurchaseOrder(tenantId, id, user.userId);
  }

  @Post('supplier-quotations/:id/reject')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Reject a supplier quotation' })
  async reject(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.supplierQuotationService.updateStatus(tenantId, id, 'rejected');
  }

  @Delete('supplier-quotations/:id')
  @RequirePermissions('buying:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a supplier quotation' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.supplierQuotationService.softDelete(tenantId, id);
  }
}
