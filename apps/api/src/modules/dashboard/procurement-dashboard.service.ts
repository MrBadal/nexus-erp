import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import {
  purchaseOrders,
  materialRequests,
  purchaseReceipts,
  suppliers,
  approvalRequests,
} from '../../database/schema/index.js';

@Injectable()
export class ProcurementDashboardService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async getKpis(tenantId: string) {
    // Open POs
    const openPOs = await this.db.select({
      count: sql<number>`COUNT(*)::int`,
      totalValue: sql<string>`COALESCE(SUM(CAST(${purchaseOrders.totalAmount} AS numeric)), 0)::text`,
    }).from(purchaseOrders).where(and(
      eq(purchaseOrders.tenantId, tenantId),
      sql`${purchaseOrders.status} IN ('approved', 'partially_received')`,
    ));

    // Pending MRs
    const pendingMRs = await this.db.select({
      count: sql<number>`COUNT(*)::int`,
    }).from(materialRequests).where(and(
      eq(materialRequests.tenantId, tenantId),
      sql`${materialRequests.status} IN ('submitted') OR ${materialRequests.isPendingApproval} = true`,
    ));

    // Pending approvals
    const pendingApprovals = await this.db.select({
      count: sql<number>`COUNT(*)::int`,
    }).from(approvalRequests).where(and(
      eq(approvalRequests.tenantId, tenantId),
      eq(approvalRequests.status, 'pending'),
      sql`${approvalRequests.documentType} IN ('purchase_order', 'material_request', 'bill')`,
    ));

    // Top 5 suppliers by PO value (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const topSuppliers = await this.db.select({
      supplierId: purchaseOrders.supplierId,
      supplierName: suppliers.name,
      totalValue: sql<string>`SUM(CAST(${purchaseOrders.totalAmount} AS numeric))::text`,
      orderCount: sql<number>`COUNT(*)::int`,
    }).from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(and(
        eq(purchaseOrders.tenantId, tenantId),
        sql`${purchaseOrders.orderDate} >= ${ninetyDaysAgo.toISOString().split('T')[0]}`,
      ))
      .groupBy(purchaseOrders.supplierId, suppliers.name)
      .orderBy(sql`SUM(CAST(${purchaseOrders.totalAmount} AS numeric)) DESC`)
      .limit(5);

    // Recent GRNs
    const recentGRNs = await this.db.select().from(purchaseReceipts)
      .where(eq(purchaseReceipts.tenantId, tenantId))
      .orderBy(desc(purchaseReceipts.createdAt))
      .limit(10);

    return {
      openPOs: { count: openPOs[0]?.count || 0, totalValue: openPOs[0]?.totalValue || '0' },
      pendingMRs: { count: pendingMRs[0]?.count || 0 },
      pendingApprovals: { count: pendingApprovals[0]?.count || 0 },
      topSuppliers,
      recentGRNs,
    };
  }
}
