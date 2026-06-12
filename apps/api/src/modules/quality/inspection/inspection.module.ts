import { Module } from '@nestjs/common';
import { InspectionController } from './inspection.controller.js';
import { InspectionService } from './inspection.service.js';

@Module({
  controllers: [InspectionController],
  providers: [InspectionService],
  exports: [InspectionService],
})
export class InspectionModule {}
