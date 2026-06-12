import { Module } from '@nestjs/common';
import { ProjectModule } from './project/project.module.js';
import { TaskModule } from './task/task.module.js';
import { TimesheetModule } from './timesheet/timesheet.module.js';

@Module({
  imports: [ProjectModule, TaskModule, TimesheetModule],
  exports: [ProjectModule, TaskModule, TimesheetModule],
})
export class ProjectsModule {}
