import { Module } from '@nestjs/common';
import { ExpenseClaimController, EssExpenseClaimController } from './expense-claim.controller.js';
import { ExpenseClaimService } from './expense-claim.service.js';

@Module({
  controllers: [ExpenseClaimController, EssExpenseClaimController],
  providers: [ExpenseClaimService],
  exports: [ExpenseClaimService],
})
export class ExpenseClaimModule {}
