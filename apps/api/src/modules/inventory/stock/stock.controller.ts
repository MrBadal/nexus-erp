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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StockService } from './stock.service.js';
import { StockValuationService } from './stock-valuation.service.js';
import { ReorderService } from './reorder.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto.js';

@ApiTags('inventory-stock')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StockController {
  constructor(
    private readonly stockService: StockService,
    private readonly valuationService: StockValuationService,
    private readonly reorderService: ReorderService,
  ) {}

  @Get('stock-levels')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get stock levels per item per warehouse' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'belowReorder', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Stock levels' })
  async getStockLevels(
    @CurrentTenant() tenantId: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('belowReorder') belowReorder?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.stockService.getStockLevels(tenantId, {
      itemId,
      warehouseId,
      belowReorder,
      limit,
      offset,
    });
  }

  @Get('stock-movements')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get stock movements log' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'movementType', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Stock movements' })
  async getStockMovements(
    @CurrentTenant() tenantId: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('movementType') movementType?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.stockService.getStockMovements(tenantId, {
      itemId,
      warehouseId,
      movementType,
      limit,
      offset,
    });
  }

  @Post('stock-adjustments')
  @RequirePermissions('inventory:write')
  @ApiOperation({ summary: 'Create a stock adjustment' })
  @ApiResponse({ status: 201, description: 'Stock adjustment created' })
  async createStockAdjustment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateStockAdjustmentDto,
  ) {
    return this.stockService.createStockAdjustment(tenantId, user.sub, body);
  }

  @Post('stock-adjustments/:id/submit')
  @RequirePermissions('inventory:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a draft stock adjustment for approval' })
  @ApiResponse({ status: 200, description: 'Stock adjustment submitted' })
  async submitStockAdjustment(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.stockService.submitStockAdjustment(tenantId, id);
  }

  @Post('stock/transfer')
  @RequirePermissions('inventory:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  @ApiResponse({ status: 200, description: 'Stock transferred' })
  async transferStock(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: {
      fromWarehouseId: string;
      toWarehouseId: string;
      lines: { itemId: string; quantity: string }[];
      notes?: string;
    },
  ) {
    return this.stockService.transferStock(tenantId, user.sub, body);
  }

  @Post('stock-adjustments/:id/approve')
  @RequirePermissions('inventory:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a submitted stock adjustment and apply changes' })
  @ApiResponse({ status: 200, description: 'Stock adjustment approved and stock updated' })
  async approveStockAdjustment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.stockService.approveStockAdjustment(tenantId, id, user.sub);
  }

  // ─── Stock Valuation ────────────────────────────────────

  @Get('valuation')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get inventory valuation report' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiResponse({ status: 200, description: 'Inventory valuation' })
  async getValuation(
    @CurrentTenant() tenantId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.valuationService.getInventoryValuation(tenantId, warehouseId);
  }

  // ─── Auto-Reorder ──────────────────────────────────────

  @Get('check-reorder')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Check items below reorder levels' })
  @ApiResponse({ status: 200, description: 'Items needing reorder' })
  async checkReorderLevels(
    @CurrentTenant() tenantId: string,
  ) {
    return this.reorderService.checkReorderLevels(tenantId);
  }

  @Post('check-reorder')
  @RequirePermissions('inventory:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check reorder levels and auto-generate draft Purchase Orders' })
  @ApiResponse({ status: 200, description: 'Reorder POs created' })
  async generateReorderPOs(
    @CurrentTenant() tenantId: string,
  ) {
    return this.reorderService.generateReorderPurchaseOrders(tenantId);
  }
}
