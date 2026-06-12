import { Module } from '@nestjs/common';
import { FiscalPeriodController } from './fiscal-period.controller.js';
import { FiscalPeriodService } from './fiscal-period.service.js';

@Module({
  controllers: [FiscalPeriodController],
  providers: [FiscalPeriodService],
  exports: [FiscalPeriodService],
})
export class FiscalPeriodModule {}
