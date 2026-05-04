import { Module } from '@nestjs/common';
import { StatutoryReportsController } from './statutory-reports.controller.js';
import { StatutoryReportsService } from './statutory-reports.service.js';

@Module({
  controllers: [StatutoryReportsController],
  providers: [StatutoryReportsService],
  exports: [StatutoryReportsService],
})
export class StatutoryReportsModule {}
