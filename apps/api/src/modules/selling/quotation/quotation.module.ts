import { Module } from '@nestjs/common';
import { QuotationController } from './quotation.controller.js';
import { QuotationService } from './quotation.service.js';

@Module({
  controllers: [QuotationController],
  providers: [QuotationService],
  exports: [QuotationService],
})
export class QuotationModule {}
