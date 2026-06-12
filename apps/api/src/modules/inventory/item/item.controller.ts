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
import { ItemService } from './item.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateItemDto, CreateItemCategoryDto } from './dto/create-item.dto.js';
import { UpdateItemDto, UpdateItemCategoryDto } from './dto/update-item.dto.js';

@ApiTags('inventory-items')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  // ─── Items ──────────────────────────────────────────────

  @Get('items')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'List items with filters' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'itemType', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of items' })
  async findAllItems(
    @CurrentTenant() tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('itemType') itemType?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.itemService.findAllItems(tenantId, {
      categoryId,
      itemType,
      isActive,
      search,
      limit,
      offset,
    });
  }

  @Get('items/:id')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get item by ID with warehouse stock levels' })
  @ApiResponse({ status: 200, description: 'Item details with stock levels' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async findItemById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.itemService.findItemById(tenantId, id);
  }

  @Post('items')
  @RequirePermissions('inventory:write')
  @ApiOperation({ summary: 'Create a new item' })
  @ApiResponse({ status: 201, description: 'Item created' })
  @ApiResponse({ status: 409, description: 'Item code conflict' })
  async createItem(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateItemDto,
  ) {
    return this.itemService.createItem(tenantId, body);
  }

  @Put('items/:id')
  @RequirePermissions('inventory:write')
  @ApiOperation({ summary: 'Update an item' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  async updateItem(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateItemDto,
  ) {
    return this.itemService.updateItem(tenantId, id, body);
  }

  @Delete('items/:id')
  @RequirePermissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an item' })
  @ApiResponse({ status: 204, description: 'Item deleted' })
  async removeItem(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.itemService.softDeleteItem(tenantId, id);
  }

  // ─── Categories ─────────────────────────────────────────

  @Get('categories')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get item categories as a tree' })
  @ApiResponse({ status: 200, description: 'Category tree' })
  async getCategories(@CurrentTenant() tenantId: string) {
    return this.itemService.getCategoryTree(tenantId);
  }

  @Post('categories')
  @RequirePermissions('inventory:write')
  @ApiOperation({ summary: 'Create an item category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateItemCategoryDto,
  ) {
    return this.itemService.createCategory(tenantId, body);
  }

  @Put('categories/:id')
  @RequirePermissions('inventory:write')
  @ApiOperation({ summary: 'Update an item category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async updateCategory(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateItemCategoryDto,
  ) {
    return this.itemService.updateCategory(tenantId, id, body);
  }

  @Delete('categories/:id')
  @RequirePermissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an item category' })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  async removeCategory(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.itemService.softDeleteCategory(tenantId, id);
  }
}
