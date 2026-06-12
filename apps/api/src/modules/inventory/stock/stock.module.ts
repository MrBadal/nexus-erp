import { Module } from '@nestjs/common';
import { StockController } from './stock.controller.js';
import { StockService } from './stock.service.js';
import { StockValuationService } from './stock-valuation.service.js';
import { ReorderService } from './reorder.service.js';

@Module({
  controllers: [StockController],
  providers: [StockService, StockValuationService, ReorderService],
  exports: [StockService, StockValuationService, ReorderService],
})
export class StockModule {}
