import { Module } from '@nestjs/common';
import { AssetMaintenanceController } from './asset-maintenance.controller.js';
import { AssetMaintenanceService } from './asset-maintenance.service.js';

@Module({
  controllers: [AssetMaintenanceController],
  providers: [AssetMaintenanceService],
  exports: [AssetMaintenanceService],
})
export class AssetMaintenanceModule {}
