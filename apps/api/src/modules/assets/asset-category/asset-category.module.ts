import { Module } from '@nestjs/common';
import { AssetCategoryController } from './asset-category.controller.js';
import { AssetCategoryService } from './asset-category.service.js';

@Module({
  controllers: [AssetCategoryController],
  providers: [AssetCategoryService],
  exports: [AssetCategoryService],
})
export class AssetCategoryModule {}
