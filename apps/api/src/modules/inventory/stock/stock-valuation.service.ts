import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { itemWarehouses, items, stockMovements } from '../../../database/schema/index.js';

@Injectable()
export class StockValuationService {
  private readonly logger = new Logger(StockValuationService.name);

  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  /**
   * Update the weighted average valuation rate for an item in a warehouse
   * after a stock receipt.
   *
   * Formula:
   *   newRate = ((existingQty * existingRate) + (incomingQty * incomingRate)) / (existingQty + incomingQty)
   *
   * Only applies to receipt-type movements (purchase receipts, returns, production).
   * Issue-type movements do not change the rate.
   */
  async updateValuationOnReceipt(
    tenantId: string,
    itemId: string,
    warehouseId: string,
    incomingQty: number,
    incomingUnitCost: number,
  ): Promise<{ newRate: number; newQty: number }> {
    if (incomingQty <= 0 || incomingUnitCost <= 0) {
      return { newRate: 0, newQty: 0 };
    }

    // Get current stock level and valuation rate
    const [current] = await this.db
      .select({
        quantity: itemWarehouses.quantity,
        valuationRate: itemWarehouses.valuationRate,
      })
      .from(itemWarehouses)
      .where(
        and(
          eq(itemWarehouses.itemId, itemId),
          eq(itemWarehouses.warehouseId, warehouseId),
          eq(itemWarehouses.tenantId, tenantId),
        ),
      )
      .limit(1);

    const existingQty = current ? parseFloat(current.quantity) : 0;
    const existingRate = current ? parseFloat(current.valuationRate) : 0;

    const totalQty = existingQty + incomingQty;
    const newRate =
      totalQty > 0
        ? ((existingQty * existingRate) + (incomingQty * incomingUnitCost)) / totalQty
        : incomingUnitCost;

    // Update the valuation rate
    if (current) {
      await this.db
        .update(itemWarehouses)
        .set({
          valuationRate: newRate.toFixed(4),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(itemWarehouses.itemId, itemId),
            eq(itemWarehouses.warehouseId, warehouseId),
            eq(itemWarehouses.tenantId, tenantId),
          ),
        );
    }

    this.logger.debug(
      `Valuation updated: item=${itemId}, warehouse=${warehouseId}, ` +
      `existing=(${existingQty} @ ${existingRate.toFixed(2)}), ` +
      `incoming=(${incomingQty} @ ${incomingUnitCost.toFixed(2)}), ` +
      `new rate=${newRate.toFixed(4)}`,
    );

    return { newRate: parseFloat(newRate.toFixed(4)), newQty: totalQty };
  }

  /**
   * Get the total inventory valuation for a tenant.
   * Returns per-item-warehouse breakdown plus total.
   */
  async getInventoryValuation(
    tenantId: string,
    warehouseId?: string,
  ): Promise<{
    lines: {
      itemId: string;
      itemName: string;
      itemCode: string;
      warehouseId: string;
      warehouseName: string;
      quantity: number;
      valuationRate: number;
      totalValue: number;
    }[];
    totalValue: number;
  }> {
    const conditions = [eq(itemWarehouses.tenantId, tenantId)];
    if (warehouseId) {
      conditions.push(eq(itemWarehouses.warehouseId, warehouseId));
    }

    const rows = await this.db
      .select({
        itemId: itemWarehouses.itemId,
        itemName: items.name,
        itemCode: items.code,
        warehouseId: itemWarehouses.warehouseId,
        quantity: itemWarehouses.quantity,
        valuationRate: itemWarehouses.valuationRate,
        purchasePrice: items.purchasePrice,
      })
      .from(itemWarehouses)
      .innerJoin(items, eq(itemWarehouses.itemId, items.id))
      .where(and(...conditions));

    // For now we don't join warehouses in this query for perf,
    // but we include the warehouseId for lookup
    let totalValue = 0;
    const lines = rows.map((r) => {
      const qty = parseFloat(r.quantity);
      // Use valuation rate if available, otherwise fall back to purchase price
      const rate = parseFloat(r.valuationRate) || parseFloat(r.purchasePrice);
      const value = qty * rate;
      totalValue += value;
      return {
        itemId: r.itemId,
        itemName: r.itemName,
        itemCode: r.itemCode,
        warehouseId: r.warehouseId,
        warehouseName: '', // Will be populated by controller if needed
        quantity: qty,
        valuationRate: rate,
        totalValue: parseFloat(value.toFixed(4)),
      };
    });

    return { lines, totalValue: parseFloat(totalValue.toFixed(4)) };
  }
}
