import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  items,
  warehouses,
  itemWarehouses,
  stockMovements,
  stockAdjustments,
  stockAdjustmentLines,
  journalEntries,
  journalLines,
  accounts,
} from '../../../database/schema/index.js';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto.js';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  // ─── Stock Levels ───────────────────────────────────────

  async getStockLevels(
    tenantId: string,
    options?: {
      itemId?: string;
      warehouseId?: string;
      belowReorder?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [eq(itemWarehouses.tenantId, tenantId)];

    if (options?.itemId) {
      conditions.push(eq(itemWarehouses.itemId, options.itemId));
    }

    if (options?.warehouseId) {
      conditions.push(eq(itemWarehouses.warehouseId, options.warehouseId));
    }

    let query = this.db
      .select({
        id: itemWarehouses.id,
        itemId: itemWarehouses.itemId,
        itemName: items.name,
        itemCode: items.code,
        warehouseId: itemWarehouses.warehouseId,
        warehouseName: warehouses.name,
        warehouseCode: warehouses.code,
        quantity: itemWarehouses.quantity,
        reservedQuantity: itemWarehouses.reservedQuantity,
        reorderLevel: itemWarehouses.reorderLevel,
      })
      .from(itemWarehouses)
      .innerJoin(items, eq(itemWarehouses.itemId, items.id))
      .innerJoin(warehouses, eq(itemWarehouses.warehouseId, warehouses.id))
      .where(and(...conditions))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    const result = await query;

    if (options?.belowReorder === 'true') {
      return result.filter(
        (r) => parseFloat(r.quantity) <= r.reorderLevel,
      );
    }

    return result;
  }

  // ─── Stock Movements ───────────────────────────────────

  async getStockMovements(
    tenantId: string,
    options?: {
      itemId?: string;
      warehouseId?: string;
      movementType?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [eq(stockMovements.tenantId, tenantId)];

    if (options?.itemId) {
      conditions.push(eq(stockMovements.itemId, options.itemId));
    }

    if (options?.warehouseId) {
      conditions.push(eq(stockMovements.warehouseId, options.warehouseId));
    }

    if (options?.movementType) {
      conditions.push(
        eq(
          stockMovements.movementType,
          options.movementType as 'receipt' | 'issue' | 'transfer' | 'adjustment' | 'return',
        ),
      );
    }

    return this.db
      .select({
        id: stockMovements.id,
        itemId: stockMovements.itemId,
        itemName: items.name,
        itemCode: items.code,
        warehouseId: stockMovements.warehouseId,
        warehouseName: warehouses.name,
        toWarehouseId: stockMovements.toWarehouseId,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        unitCost: stockMovements.unitCost,
        reference: stockMovements.reference,
        description: stockMovements.description,
        sourceType: stockMovements.sourceType,
        sourceId: stockMovements.sourceId,
        createdBy: stockMovements.createdBy,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(items, eq(stockMovements.itemId, items.id))
      .innerJoin(warehouses, eq(stockMovements.warehouseId, warehouses.id))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  // ─── Stock Adjustments ─────────────────────────────────

  async createStockAdjustment(
    tenantId: string,
    userId: string,
    data: CreateStockAdjustmentDto,
  ) {
    // Validate warehouse
    const [warehouse] = await this.db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, data.warehouseId),
          eq(warehouses.tenantId, tenantId),
          isNull(warehouses.deletedAt),
        ),
      )
      .limit(1);

    if (!warehouse) {
      throw new BadRequestException('Warehouse not found');
    }

    // Validate all items exist
    for (const line of data.lines) {
      const [item] = await this.db
        .select()
        .from(items)
        .where(
          and(
            eq(items.id, line.itemId),
            eq(items.tenantId, tenantId),
            isNull(items.deletedAt),
          ),
        )
        .limit(1);

      if (!item) {
        throw new BadRequestException(`Item with ID "${line.itemId}" not found`);
      }
    }

    const adjustmentNumber = await this.generateAdjustmentNumber(tenantId);

    const [adjustment] = await this.db
      .insert(stockAdjustments)
      .values({
        tenantId,
        adjustmentNumber,
        warehouseId: data.warehouseId,
        reason: data.reason,
        status: 'draft',
        notes: data.notes || null,
        adjustedBy: userId,
      })
      .returning();

    // Insert adjustment lines
    const lineValues = data.lines.map((line) => {
      const currentQty = parseFloat(line.currentQty);
      const adjustedQty = parseFloat(line.adjustedQty);
      const differenceQty = adjustedQty - currentQty;

      return {
        adjustmentId: adjustment.id,
        itemId: line.itemId,
        currentQty: line.currentQty,
        adjustedQty: line.adjustedQty,
        differenceQty: differenceQty.toFixed(4),
        reason: line.reason || null,
      };
    });

    await this.db.insert(stockAdjustmentLines).values(lineValues);

    return this.findAdjustmentById(tenantId, adjustment.id);
  }

  async findAdjustmentById(tenantId: string, id: string) {
    const [adjustment] = await this.db
      .select()
      .from(stockAdjustments)
      .where(
        and(
          eq(stockAdjustments.id, id),
          eq(stockAdjustments.tenantId, tenantId),
          isNull(stockAdjustments.deletedAt),
        ),
      )
      .limit(1);

    if (!adjustment) {
      throw new NotFoundException(`Stock adjustment with ID "${id}" not found`);
    }

    const lines = await this.db
      .select({
        id: stockAdjustmentLines.id,
        adjustmentId: stockAdjustmentLines.adjustmentId,
        itemId: stockAdjustmentLines.itemId,
        itemName: items.name,
        itemCode: items.code,
        currentQty: stockAdjustmentLines.currentQty,
        adjustedQty: stockAdjustmentLines.adjustedQty,
        differenceQty: stockAdjustmentLines.differenceQty,
        reason: stockAdjustmentLines.reason,
      })
      .from(stockAdjustmentLines)
      .innerJoin(items, eq(stockAdjustmentLines.itemId, items.id))
      .where(eq(stockAdjustmentLines.adjustmentId, id));

    return { ...adjustment, lines };
  }

  async approveStockAdjustment(tenantId: string, id: string, userId: string) {
    const adjustment = await this.findAdjustmentById(tenantId, id);

    if (adjustment.status === 'approved') {
      throw new BadRequestException('Adjustment is already approved');
    }

    if (adjustment.status === 'draft') {
      throw new BadRequestException('Adjustment must be submitted before approval');
    }

    // Apply stock changes
    for (const line of adjustment.lines) {
      const differenceQty = parseFloat(line.differenceQty);

      // Upsert item warehouse record
      const [existingStock] = await this.db
        .select()
        .from(itemWarehouses)
        .where(
          and(
            eq(itemWarehouses.itemId, line.itemId),
            eq(itemWarehouses.warehouseId, adjustment.warehouseId),
            eq(itemWarehouses.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (existingStock) {
        const newQty = parseFloat(existingStock.quantity) + differenceQty;
        await this.db
          .update(itemWarehouses)
          .set({
            quantity: newQty.toFixed(4),
            updatedAt: new Date(),
          })
          .where(eq(itemWarehouses.id, existingStock.id));
      } else {
        await this.db.insert(itemWarehouses).values({
          tenantId,
          itemId: line.itemId,
          warehouseId: adjustment.warehouseId,
          quantity: line.adjustedQty,
          reservedQuantity: '0',
          reorderLevel: 0,
        });
      }

      // Create stock movement record
      await this.db.insert(stockMovements).values({
        tenantId,
        itemId: line.itemId,
        warehouseId: adjustment.warehouseId,
        movementType: 'adjustment',
        quantity: line.differenceQty,
        reference: adjustment.adjustmentNumber,
        description: `Stock adjustment: ${adjustment.reason}`,
        sourceType: 'stock_adjustment',
        sourceId: adjustment.id,
        createdBy: userId,
      });
    }

    // Post stock adjustment GL journal (DR/CR Inventory vs Miscellaneous Expense)
    await this.postStockAdjustmentJournal(tenantId, adjustment, userId);

    // Update adjustment status
    const [updated] = await this.db
      .update(stockAdjustments)
      .set({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(stockAdjustments.id, id))
      .returning();

    return this.findAdjustmentById(tenantId, id);
  }

  async submitStockAdjustment(tenantId: string, id: string) {
    const adjustment = await this.findAdjustmentById(tenantId, id);

    if (adjustment.status !== 'draft') {
      throw new BadRequestException('Only draft adjustments can be submitted');
    }

    const [updated] = await this.db
      .update(stockAdjustments)
      .set({ status: 'submitted', updatedAt: new Date() })
      .where(eq(stockAdjustments.id, id))
      .returning();

    return this.findAdjustmentById(tenantId, id);
  }

  // ─── Stock Transfer ────────────────────────────────────────────

  async transferStock(
    tenantId: string,
    userId: string,
    data: {
      fromWarehouseId: string;
      toWarehouseId: string;
      lines: { itemId: string; quantity: string }[];
      notes?: string;
    },
  ) {
    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must be different');
    }

    // Validate warehouses exist
    const [fromWh] = await this.db.select({ id: warehouses.id, name: warehouses.name })
      .from(warehouses).where(and(eq(warehouses.id, data.fromWarehouseId), eq(warehouses.tenantId, tenantId))).limit(1);
    const [toWh] = await this.db.select({ id: warehouses.id, name: warehouses.name })
      .from(warehouses).where(and(eq(warehouses.id, data.toWarehouseId), eq(warehouses.tenantId, tenantId))).limit(1);

    if (!fromWh) throw new BadRequestException('Source warehouse not found');
    if (!toWh) throw new BadRequestException('Destination warehouse not found');

    const transferRef = `TF-${Date.now()}`;
    const results: { itemId: string; itemName: string; quantity: string; status: string }[] = [];

    for (const line of data.lines) {
      const qty = parseFloat(line.quantity);
      if (qty <= 0) {
        throw new BadRequestException(`Transfer quantity must be positive for item ${line.itemId}`);
      }

      // Check available stock in source warehouse
      const [sourceStock] = await this.db
        .select({ quantity: itemWarehouses.quantity, reservedQuantity: itemWarehouses.reservedQuantity })
        .from(itemWarehouses)
        .where(
          and(
            eq(itemWarehouses.itemId, line.itemId),
            eq(itemWarehouses.warehouseId, data.fromWarehouseId),
            eq(itemWarehouses.tenantId, tenantId),
          ),
        )
        .limit(1);

      const available = sourceStock
        ? parseFloat(sourceStock.quantity) - parseFloat(sourceStock.reservedQuantity)
        : 0;

      if (available < qty) {
        const [item] = await this.db.select({ name: items.name }).from(items).where(eq(items.id, line.itemId)).limit(1);
        throw new BadRequestException(
          `Insufficient stock for ${item?.name || line.itemId}: available ${available}, requested ${qty}`,
        );
      }

      // Deduct from source warehouse
      await this.db
        .update(itemWarehouses)
        .set({
          quantity: sql`CAST(${itemWarehouses.quantity} AS numeric) - ${qty}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(itemWarehouses.itemId, line.itemId),
            eq(itemWarehouses.warehouseId, data.fromWarehouseId),
            eq(itemWarehouses.tenantId, tenantId),
          ),
        );

      // Add to destination warehouse (upsert)
      const [destStock] = await this.db
        .select({ id: itemWarehouses.id })
        .from(itemWarehouses)
        .where(
          and(
            eq(itemWarehouses.itemId, line.itemId),
            eq(itemWarehouses.warehouseId, data.toWarehouseId),
            eq(itemWarehouses.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (destStock) {
        await this.db
          .update(itemWarehouses)
          .set({
            quantity: sql`CAST(${itemWarehouses.quantity} AS numeric) + ${qty}`,
            updatedAt: new Date(),
          })
          .where(eq(itemWarehouses.id, destStock.id));
      } else {
        await this.db.insert(itemWarehouses).values({
          tenantId,
          itemId: line.itemId,
          warehouseId: data.toWarehouseId,
          quantity: line.quantity,
          reservedQuantity: '0',
          reorderLevel: 0,
        });
      }

      // Create stock movement (transfer type with toWarehouseId)
      await this.db.insert(stockMovements).values({
        tenantId,
        itemId: line.itemId,
        warehouseId: data.fromWarehouseId,
        toWarehouseId: data.toWarehouseId,
        movementType: 'transfer',
        quantity: line.quantity,
        reference: transferRef,
        description: data.notes || `Transfer: ${fromWh.name} → ${toWh.name}`,
        sourceType: 'stock_transfer',
        sourceId: null,
        createdBy: userId,
      });

      const [item] = await this.db.select({ name: items.name }).from(items).where(eq(items.id, line.itemId)).limit(1);
      results.push({
        itemId: line.itemId,
        itemName: item?.name || 'Unknown',
        quantity: line.quantity,
        status: 'transferred',
      });
    }

    this.logger.log(`Stock transfer ${transferRef}: ${results.length} items from ${fromWh.name} to ${toWh.name}`);

    return {
      reference: transferRef,
      fromWarehouse: fromWh.name,
      toWarehouse: toWh.name,
      lines: results,
    };
  }

  private async generateAdjustmentNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ADJ-${year}-`;

    const [latest] = await this.db
      .select({ adjustmentNumber: stockAdjustments.adjustmentNumber })
      .from(stockAdjustments)
      .where(
        and(
          eq(stockAdjustments.tenantId, tenantId),
          sql`${stockAdjustments.adjustmentNumber} LIKE ${prefix + '%'}`,
        ),
      )
      .orderBy(desc(stockAdjustments.adjustmentNumber))
      .limit(1);

    let nextNum = 1;
    if (latest) {
      const currentNum = parseInt(latest.adjustmentNumber.replace(prefix, ''), 10);
      if (!isNaN(currentNum)) {
        nextNum = currentNum + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(6, '0')}`;
  }

  /**
   * Post GL journal entry for a stock adjustment.
   * Positive adjustment: DR Inventory (1200) / CR Stock Adjustment Expense (6200)
   * Negative adjustment: DR Stock Adjustment Expense (6200) / CR Inventory (1200)
   */
  private async postStockAdjustmentJournal(
    tenantId: string,
    adjustment: { id: string; adjustmentNumber: string; reason: string; lines: { itemId: string; differenceQty: string }[] },
    userId: string,
  ) {
    try {
      // Calculate total adjustment value using item purchase prices
      let totalValue = 0;
      for (const line of adjustment.lines) {
        const [item] = await this.db
          .select({ purchasePrice: items.purchasePrice })
          .from(items)
          .where(eq(items.id, line.itemId))
          .limit(1);

        const qty = parseFloat(line.differenceQty);
        const price = parseFloat(item?.purchasePrice || '0');
        totalValue += qty * price;
      }

      if (totalValue === 0) return; // No value to journal

      // Look up Inventory (1200) and Miscellaneous Expense (6200) accounts
      const [inventoryAcct] = await this.db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, '1200')))
        .limit(1);

      const [expenseAcct] = await this.db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, '6200')))
        .limit(1);

      if (!inventoryAcct || !expenseAcct) {
        this.logger.warn(`Stock adjustment GL skipped: missing accounts 1200 or 6200 for tenant ${tenantId}`);
        return;
      }

      const absValue = Math.abs(totalValue).toFixed(2);
      const isPositive = totalValue > 0;

      // Create journal entry
      const [entry] = await this.db
        .insert(journalEntries)
        .values({
          tenantId,
          entryNumber: `JE-ADJ-${adjustment.adjustmentNumber}`,
          date: new Date().toISOString().split('T')[0],
          description: `Stock adjustment: ${adjustment.reason || adjustment.adjustmentNumber}`,
          status: 'posted',
          totalDebit: absValue,
          totalCredit: absValue,
          postedDate: new Date().toISOString().split('T')[0],
          createdBy: userId,
          sourceId: adjustment.id,
        })
        .returning();

      // Journal lines: positive adj = DR inventory, CR expense; negative = opposite
      await this.db.insert(journalLines).values([
        {
          tenantId,
          journalEntryId: entry.id,
          lineNumber: 1,
          accountId: isPositive ? inventoryAcct.id : expenseAcct.id,
          debitAmount: absValue,
          creditAmount: '0',
          description: `Stock adjustment ${adjustment.adjustmentNumber}`,
        },
        {
          tenantId,
          journalEntryId: entry.id,
          lineNumber: 2,
          accountId: isPositive ? expenseAcct.id : inventoryAcct.id,
          debitAmount: '0',
          creditAmount: absValue,
          description: `Stock adjustment ${adjustment.adjustmentNumber}`,
        },
      ]);

      this.logger.log(`Stock adjustment GL posted: ${entry.entryNumber} for ₹${absValue}`);
    } catch (error) {
      this.logger.error(`Failed to post stock adjustment GL for ${adjustment.adjustmentNumber}:`, error);
      // Don't throw — the stock adjustment itself should still succeed
    }
  }
}
