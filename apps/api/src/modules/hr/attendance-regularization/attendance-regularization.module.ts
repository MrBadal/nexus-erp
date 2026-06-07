import { Module } from '@nestjs/common';
import {
  AttendanceRegularizationController,
  EssAttendanceRegularizationController,
} from './attendance-regularization.controller.js';
import { AttendanceRegularizationService } from './attendance-regularization.service.js';

@Module({
  controllers: [
    AttendanceRegularizationController,
    EssAttendanceRegularizationController,
  ],
  providers: [AttendanceRegularizationService],
  exports: [AttendanceRegularizationService],
})
export class AttendanceRegularizationModule {}
