import { Module } from '@nestjs/common';
import { AssetAssignmentController } from './asset-assignment.controller.js';
import { AssetAssignmentService } from './asset-assignment.service.js';

@Module({
  controllers: [AssetAssignmentController],
  providers: [AssetAssignmentService],
  exports: [AssetAssignmentService],
})
export class AssetAssignmentModule {}
