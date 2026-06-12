import { Module } from '@nestjs/common';
import { TimesheetController } from './timesheet.controller.js';
import { TimesheetService } from './timesheet.service.js';

@Module({
  controllers: [TimesheetController],
  providers: [TimesheetService],
  exports: [TimesheetService],
})
export class TimesheetModule {}
