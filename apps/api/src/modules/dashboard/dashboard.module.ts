import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { ProcurementDashboardService } from './procurement-dashboard.service.js';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, ProcurementDashboardService],
  exports: [DashboardService, ProcurementDashboardService],
})
export class DashboardModule {}
