import { Module } from '@nestjs/common';
import { SupplierModule } from './supplier/supplier.module.js';
import { PurchaseOrderModule } from './purchase-order/purchase-order.module.js';
import { PurchaseReceiptModule } from './purchase-receipt/purchase-receipt.module.js';
import { SupplierQuotationModule } from './supplier-quotation/supplier-quotation.module.js';
import { MaterialRequestModule } from './material-request/material-request.module.js';

@Module({
  imports: [SupplierModule, PurchaseOrderModule, PurchaseReceiptModule, SupplierQuotationModule, MaterialRequestModule],
  exports: [SupplierModule, PurchaseOrderModule, PurchaseReceiptModule, SupplierQuotationModule, MaterialRequestModule],
})
export class BuyingModule {}
