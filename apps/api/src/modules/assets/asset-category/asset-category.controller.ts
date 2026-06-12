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
import { AssetCategoryService } from './asset-category.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateAssetCategoryDto } from './dto/create-asset-category.dto.js';
import { UpdateAssetCategoryDto } from './dto/update-asset-category.dto.js';

@ApiTags('asset-categories')
@ApiBearerAuth()
@Controller('assets/categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetCategoryController {
  constructor(private readonly assetCategoryService: AssetCategoryService) {}

  @Get()
  @RequirePermissions('assets:read')
  @ApiOperation({ summary: 'List asset categories' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of asset categories' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.assetCategoryService.findAll(tenantId, { search, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('assets:read')
  @ApiOperation({ summary: 'Get asset category by ID' })
  @ApiResponse({ status: 200, description: 'Asset category details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.assetCategoryService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Create a new asset category' })
  @ApiResponse({ status: 201, description: 'Asset category created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateAssetCategoryDto,
  ) {
    return this.assetCategoryService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Update an asset category' })
  @ApiResponse({ status: 200, description: 'Asset category updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateAssetCategoryDto,
  ) {
    return this.assetCategoryService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('assets:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an asset category' })
  @ApiResponse({ status: 204, description: 'Asset category deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.assetCategoryService.softDelete(tenantId, id);
  }
}
