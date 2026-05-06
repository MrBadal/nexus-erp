import { Module } from '@nestjs/common';
import { EmployeeFamilyController } from './employee-family.controller.js';
import { EmployeeFamilyService } from './employee-family.service.js';

@Module({
  imports: [],
  controllers: [EmployeeFamilyController],
  providers: [EmployeeFamilyService],
  exports: [EmployeeFamilyService],
})
export class EmployeeFamilyModule {}
