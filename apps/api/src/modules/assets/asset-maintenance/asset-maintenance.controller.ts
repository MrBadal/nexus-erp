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
import { AssetMaintenanceService } from './asset-maintenance.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateAssetMaintenanceDto } from './dto/create-asset-maintenance.dto.js';
import { UpdateAssetMaintenanceDto } from './dto/update-asset-maintenance.dto.js';

@ApiTags('asset-maintenance')
@ApiBearerAuth()
@Controller('assets/maintenance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetMaintenanceController {
  constructor(private readonly assetMaintenanceService: AssetMaintenanceService) {}

  @Get()
  @RequirePermissions('assets:read')
  @ApiOperation({ summary: 'List maintenance records' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assetId', required: false })
  @ApiQuery({ name: 'maintenanceType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of maintenance records' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('assetId') assetId?: string,
    @Query('maintenanceType') maintenanceType?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.assetMaintenanceService.findAll(tenantId, { status, assetId, maintenanceType, search, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('assets:read')
  @ApiOperation({ summary: 'Get maintenance record by ID' })
  @ApiResponse({ status: 200, description: 'Maintenance record details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.assetMaintenanceService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Create a new maintenance record' })
  @ApiResponse({ status: 201, description: 'Maintenance record created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateAssetMaintenanceDto,
  ) {
    return this.assetMaintenanceService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Update a maintenance record' })
  @ApiResponse({ status: 200, description: 'Maintenance record updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateAssetMaintenanceDto,
  ) {
    return this.assetMaintenanceService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('assets:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a maintenance record' })
  @ApiResponse({ status: 204, description: 'Maintenance record deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.assetMaintenanceService.softDelete(tenantId, id);
  }
}
