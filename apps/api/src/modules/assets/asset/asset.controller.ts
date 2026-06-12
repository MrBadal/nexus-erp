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
import { AssetService } from './asset.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateAssetDto } from './dto/create-asset.dto.js';
import { UpdateAssetDto } from './dto/update-asset.dto.js';

@ApiTags('assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get()
  @RequirePermissions('assets:read')
  @ApiOperation({ summary: 'List assets with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of assets' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.assetService.findAll(tenantId, { status, categoryId, search, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('assets:read')
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiResponse({ status: 200, description: 'Asset details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.assetService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateAssetDto,
  ) {
    return this.assetService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Update an asset' })
  @ApiResponse({ status: 200, description: 'Asset updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateAssetDto,
  ) {
    return this.assetService.update(tenantId, id, body);
  }

  @Post(':id/submit')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Submit a draft asset' })
  @ApiResponse({ status: 200, description: 'Asset submitted' })
  async submit(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.assetService.updateStatus(tenantId, id, 'submitted');
  }

  @Post(':id/activate')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Put asset in use' })
  @ApiResponse({ status: 200, description: 'Asset activated' })
  async activate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.assetService.updateStatus(tenantId, id, 'in_use');
  }

  @Post(':id/dispose')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Dispose of an asset' })
  @ApiResponse({ status: 200, description: 'Asset disposed' })
  async dispose(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.assetService.updateStatus(tenantId, id, 'disposed');
  }

  @Post(':id/scrap')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Scrap an asset' })
  @ApiResponse({ status: 200, description: 'Asset scrapped' })
  async scrap(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.assetService.updateStatus(tenantId, id, 'scrapped');
  }

  @Post(':id/depreciate')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Calculate and apply depreciation' })
  @ApiResponse({ status: 200, description: 'Depreciation applied' })
  async depreciate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.assetService.calculateDepreciation(tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('assets:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an asset' })
  @ApiResponse({ status: 204, description: 'Asset deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.assetService.softDelete(tenantId, id);
  }
}
