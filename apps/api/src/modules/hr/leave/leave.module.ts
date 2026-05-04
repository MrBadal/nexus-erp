import { Module } from '@nestjs/common';
import { LeaveController, EssLeaveController } from './leave.controller.js';
import { LeaveService } from './leave.service.js';
import { EmployeeModule } from '../employee/employee.module.js';

@Module({
  imports: [EmployeeModule],
  controllers: [LeaveController, EssLeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
