import { Module } from '@nestjs/common';
import { EmployeeSkillController } from './employee-skill.controller.js';
import { EmployeeSkillService } from './employee-skill.service.js';

@Module({
  imports: [],
  controllers: [EmployeeSkillController],
  providers: [EmployeeSkillService],
  exports: [EmployeeSkillService],
})
export class EmployeeSkillModule {}
