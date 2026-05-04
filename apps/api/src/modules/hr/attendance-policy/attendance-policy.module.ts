import { Module } from '@nestjs/common';
import { AttendancePolicyController } from './attendance-policy.controller.js';
import { AttendancePolicyService } from './attendance-policy.service.js';
import { ShiftModule } from '../shift/shift.module.js';

@Module({
  imports: [ShiftModule],
  controllers: [AttendancePolicyController],
  providers: [AttendancePolicyService],
  exports: [AttendancePolicyService],
})
export class AttendancePolicyModule {}
