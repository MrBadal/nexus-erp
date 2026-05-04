import { Module } from '@nestjs/common';
import { HrDashboardController } from './hr-dashboard.controller.js';
import { HrDashboardService } from './hr-dashboard.service.js';

@Module({
  controllers: [HrDashboardController],
  providers: [HrDashboardService],
  exports: [HrDashboardService],
})
export class HrDashboardModule {}
