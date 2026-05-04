import { Module } from '@nestjs/common';
import { AssetModule } from './asset/asset.module.js';
import { AssetCategoryModule } from './asset-category/asset-category.module.js';
import { AssetMaintenanceModule } from './asset-maintenance/asset-maintenance.module.js';
import { AssetAssignmentModule } from './asset-assignment/asset-assignment.module.js';

@Module({
  imports: [AssetModule, AssetCategoryModule, AssetMaintenanceModule, AssetAssignmentModule],
  exports: [AssetModule, AssetCategoryModule, AssetMaintenanceModule, AssetAssignmentModule],
})
export class AssetsModule {}
