import { Module } from '@nestjs/common';
import { EmployeeEducationController } from './employee-education.controller.js';
import { EmployeeEducationService } from './employee-education.service.js';

@Module({
  imports: [],
  controllers: [EmployeeEducationController],
  providers: [EmployeeEducationService],
  exports: [EmployeeEducationService],
})
export class EmployeeEducationModule {}
