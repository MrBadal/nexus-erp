import { Module } from '@nestjs/common';
import { WorkstationController } from './workstation.controller.js';
import { WorkstationService } from './workstation.service.js';

@Module({
  controllers: [WorkstationController],
  providers: [WorkstationService],
  exports: [WorkstationService],
})
export class WorkstationModule {}
