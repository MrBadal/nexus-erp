import { Module } from '@nestjs/common';
import { RecurringInvoiceService } from './recurring-invoice.service.js';
import { RecurringInvoiceController } from './recurring-invoice.controller.js';
import { SharedModule } from '../../shared/shared.module.js';

@Module({
  imports: [SharedModule],
  controllers: [RecurringInvoiceController],
  providers: [RecurringInvoiceService],
  exports: [RecurringInvoiceService],
})
export class RecurringInvoiceModule {}
