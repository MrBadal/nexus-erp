import { Module } from '@nestjs/common';
import { EmployeeController, EssProfileController } from './employee.controller.js';
import { EmployeeService } from './employee.service.js';

@Module({
  controllers: [EmployeeController, EssProfileController],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
