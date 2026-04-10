import { Module } from '@nestjs/common';
import { PurchaseOrderController } from './purchase-order.controller.js';
import { PurchaseOrderService } from './purchase-order.service.js';
import { BudgetModule } from '../../finance/budget/budget.module.js';

@Module({
  imports: [BudgetModule],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
