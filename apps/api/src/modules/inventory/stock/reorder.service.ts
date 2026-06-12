import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, isNull, sql, lte, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  items,
  itemWarehouses,
  warehouses,
  purchaseOrders,
  purchaseOrderLines,
} from '../../../database/schema/index.js';

export interface ReorderItem {
  itemId: string;
  itemName: string;
  itemCode: string;
  warehouseId: string;
  warehouseName: string;
  currentQty: number;
  minStockLevel: number;
  reorderQuantity: number;
  defaultSupplierId: string | null;
  purchasePrice: number;
}

export interface ReorderResult {
  itemsChecked: number;
  itemsBelowMin: number;
  purchaseOrdersCreated: number;
  purchaseOrderIds: string[];
  skippedNoSupplier: string[];
}

@Injectable()
export class ReorderService {
  private readonly logger = new Logger(ReorderService.name);

  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  /**
   * Check all items across all warehouses for reorder needs.
   * Returns items where total quantity across all warehouses <= minStockLevel.
   */
  async checkReorderLevels(tenantId: string): Promise<ReorderItem[]> {
    // Get aggregate quantities per item across all warehouses
    const stockLevels = await this.db
      .select({
        itemId: itemWarehouses.itemId,
        warehouseId: itemWarehouses.warehouseId,
        quantity: itemWarehouses.quantity,
      })
      .from(itemWarehouses)
      .where(eq(itemWarehouses.tenantId, tenantId));

    // Get all active stock items with min stock levels > 0
    const activeItems = await this.db
      .select({
        id: items.id,
        name: items.name,
        code: items.code,
        minStockLevel: items.minStockLevel,
        reorderQuantity: items.reorderQuantity,
        defaultSupplierId: items.defaultSupplierId,
        purchasePrice: items.purchasePrice,
      })
      .from(items)
      .where(
        and(
          eq(items.tenantId, tenantId),
          eq(items.isActive, true),
          eq(items.itemType, 'stock'),
          isNull(items.deletedAt),
        ),
      );

    // Get warehouses for name lookup
    const warehouseList = await this.db
      .select({ id: warehouses.id, name: warehouses.name })
      .from(warehouses)
      .where(and(eq(warehouses.tenantId, tenantId), isNull(warehouses.deletedAt)));
    const warehouseMap = new Map(warehouseList.map((w) => [w.id, w.name]));

    // Aggregate stock per item
    const itemStockMap = new Map<string, { totalQty: number; warehouses: { id: string; qty: number }[] }>();
    for (const sl of stockLevels) {
      const entry = itemStockMap.get(sl.itemId) ?? { totalQty: 0, warehouses: [] };
      const qty = parseFloat(sl.quantity);
      entry.totalQty += qty;
      entry.warehouses.push({ id: sl.warehouseId, qty });
      itemStockMap.set(sl.itemId, entry);
    }

    // Find items below minimum
    const belowMin: ReorderItem[] = [];
    for (const item of activeItems) {
      if (item.minStockLevel <= 0) continue;

      const stock = itemStockMap.get(item.id);
      const totalQty = stock?.totalQty ?? 0;

      if (totalQty <= item.minStockLevel) {
        // Find the warehouse with the most stock (or first one)
        const primaryWarehouse = stock?.warehouses.sort((a, b) => b.qty - a.qty)[0];
        belowMin.push({
          itemId: item.id,
          itemName: item.name,
          itemCode: item.code,
          warehouseId: primaryWarehouse?.id ?? '',
          warehouseName: primaryWarehouse ? (warehouseMap.get(primaryWarehouse.id) ?? '') : '',
          currentQty: totalQty,
          minStockLevel: item.minStockLevel,
          reorderQuantity: item.reorderQuantity || item.minStockLevel * 2,
          defaultSupplierId: item.defaultSupplierId,
          purchasePrice: parseFloat(item.purchasePrice),
        });
      }
    }

    return belowMin;
  }

  /**
   * Check reorder levels and automatically create draft Purchase Orders
   * grouped by supplier.
   */
  async generateReorderPurchaseOrders(tenantId: string): Promise<ReorderResult> {
    const belowMin = await this.checkReorderLevels(tenantId);
    const skippedNoSupplier: string[] = [];
    const purchaseOrderIds: string[] = [];

    // Group items by supplier
    const supplierGroups = new Map<string, ReorderItem[]>();
    for (const item of belowMin) {
      if (!item.defaultSupplierId) {
        skippedNoSupplier.push(item.itemName);
        continue;
      }
      const group = supplierGroups.get(item.defaultSupplierId) ?? [];
      group.push(item);
      supplierGroups.set(item.defaultSupplierId, group);
    }

    // Create draft PO for each supplier group
    for (const [supplierId, reorderItems] of supplierGroups) {
      try {
        const poNumber = await this.generatePoNumber(tenantId);

        // Calculate totals
        let subtotal = 0;
        const lines = reorderItems.map((item) => {
          const lineTotal = item.reorderQuantity * item.purchasePrice;
          subtotal += lineTotal;
          return {
            itemId: item.itemId,
            quantity: item.reorderQuantity,
            unitPrice: item.purchasePrice,
          };
        });

        const [po] = await this.db
          .insert(purchaseOrders)
          .values({
            tenantId,
            orderNumber: poNumber,
            supplierId,
            orderDate: new Date().toISOString().split('T')[0],
            expectedDelivery: this.addDays(new Date(), 14).toISOString().split('T')[0],
            subtotal: subtotal.toFixed(4),
            taxAmount: '0',
            totalAmount: subtotal.toFixed(4),
            status: 'draft',
            notes: 'Auto-generated from reorder level check',
          })
          .returning();

        // Create PO lines
        for (const line of lines) {
          await this.db.insert(purchaseOrderLines).values({
            purchaseOrderId: po.id,
            itemId: line.itemId,
            quantity: line.quantity.toString(),
            unitPrice: line.unitPrice.toFixed(4),
            lineTotal: (line.quantity * line.unitPrice).toFixed(4),
          });
        }

        purchaseOrderIds.push(po.id);
        this.logger.log(
          `Reorder PO ${poNumber} created for supplier ${supplierId}: ${reorderItems.length} items, total ₹${subtotal.toFixed(2)}`,
        );
      } catch (err) {
        this.logger.error(`Failed to create reorder PO for supplier ${supplierId}: ${err}`);
      }
    }

    return {
      itemsChecked: belowMin.length + skippedNoSupplier.length,
      itemsBelowMin: belowMin.length,
      purchaseOrdersCreated: purchaseOrderIds.length,
      purchaseOrderIds,
      skippedNoSupplier,
    };
  }

  private async generatePoNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;

    const [latest] = await this.db
      .select({ orderNumber: purchaseOrders.orderNumber })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          sql`${purchaseOrders.orderNumber} LIKE ${prefix + '%'}`,
        ),
      )
      .orderBy(desc(purchaseOrders.orderNumber))
      .limit(1);

    let nextNum = 1;
    if (latest) {
      const currentNum = parseInt(latest.orderNumber.replace(prefix, ''), 10);
      if (!isNaN(currentNum)) nextNum = currentNum + 1;
    }

    return `${prefix}${String(nextNum).padStart(6, '0')}`;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
