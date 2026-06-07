import { Module } from '@nestjs/common';
import { LoanController, EssLoanController } from './loan.controller.js';
import { LoanService } from './loan.service.js';

@Module({
  controllers: [LoanController, EssLoanController],
  providers: [LoanService],
  exports: [LoanService],
})
export class LoanModule {}
