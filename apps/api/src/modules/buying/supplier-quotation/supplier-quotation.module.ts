import { Module } from '@nestjs/common';
import { SupplierQuotationController } from './supplier-quotation.controller.js';
import { SupplierQuotationService } from './supplier-quotation.service.js';

@Module({
  controllers: [SupplierQuotationController],
  providers: [SupplierQuotationService],
  exports: [SupplierQuotationService],
})
export class SupplierQuotationModule {}
