import { Module } from '@nestjs/common';
import { ExitClearanceController } from './exit-clearance.controller.js';
import { ExitClearanceService } from './exit-clearance.service.js';

@Module({
  controllers: [ExitClearanceController],
  providers: [ExitClearanceService],
  exports: [ExitClearanceService],
})
export class ExitClearanceModule {}
