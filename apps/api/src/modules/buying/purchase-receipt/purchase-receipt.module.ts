import { Module } from '@nestjs/common';
import { PurchaseReceiptController } from './purchase-receipt.controller.js';
import { PurchaseReceiptService } from './purchase-receipt.service.js';

@Module({
  controllers: [PurchaseReceiptController],
  providers: [PurchaseReceiptService],
  exports: [PurchaseReceiptService],
})
export class PurchaseReceiptModule {}
