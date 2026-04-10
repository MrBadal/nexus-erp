import { Module } from '@nestjs/common';
import { MaterialRequestController } from './material-request.controller.js';
import { MaterialRequestService } from './material-request.service.js';
import { BudgetModule } from '../../finance/budget/budget.module.js';

@Module({
  imports: [BudgetModule],
  controllers: [MaterialRequestController],
  providers: [MaterialRequestService],
  exports: [MaterialRequestService],
})
export class MaterialRequestModule {}
