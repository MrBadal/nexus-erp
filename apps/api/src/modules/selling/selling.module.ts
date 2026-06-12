import { Module } from '@nestjs/common';
import { CustomerModule } from './customer/customer.module.js';
import { SalesOrderModule } from './sales-order/sales-order.module.js';
import { QuotationModule } from './quotation/quotation.module.js';
import { DeliveryNoteModule } from './delivery-note/delivery-note.module.js';

@Module({
  imports: [CustomerModule, SalesOrderModule, QuotationModule, DeliveryNoteModule],
  exports: [CustomerModule, SalesOrderModule, QuotationModule, DeliveryNoteModule],
})
export class SellingModule {}
