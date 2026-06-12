import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';

@ApiTags('inventory-warehouses')
@ApiBearerAuth()
@Controller('inventory/warehouses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get()
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'List all warehouses' })
  @ApiResponse({ status: 200, description: 'List of warehouses' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.warehouseService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiResponse({ status: 200, description: 'Warehouse details' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.warehouseService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('inventory:write')
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created' })
  @ApiResponse({ status: 409, description: 'Warehouse code conflict' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateWarehouseDto,
  ) {
    return this.warehouseService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('inventory:write')
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateWarehouseDto,
  ) {
    return this.warehouseService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a warehouse' })
  @ApiResponse({ status: 204, description: 'Warehouse deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.warehouseService.softDelete(tenantId, id);
  }
}
