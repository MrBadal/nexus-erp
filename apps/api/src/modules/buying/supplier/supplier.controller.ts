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
import { SupplierService } from './supplier.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';

@ApiTags('buying-suppliers')
@ApiBearerAuth()
@Controller('buying')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get('suppliers')
  @RequirePermissions('buying:read')
  @ApiOperation({ summary: 'List suppliers with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of suppliers' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.supplierService.findAll(tenantId, { status, search, limit, offset });
  }

  @Get('suppliers/:id')
  @RequirePermissions('buying:read')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiResponse({ status: 200, description: 'Supplier details' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.supplierService.findById(tenantId, id);
  }

  @Post('suppliers')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateSupplierDto,
  ) {
    return this.supplierService.create(tenantId, body);
  }

  @Put('suppliers/:id')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateSupplierDto,
  ) {
    return this.supplierService.update(tenantId, id, body);
  }

  @Delete('suppliers/:id')
  @RequirePermissions('buying:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a supplier' })
  @ApiResponse({ status: 204, description: 'Supplier deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.supplierService.softDelete(tenantId, id);
  }
}
