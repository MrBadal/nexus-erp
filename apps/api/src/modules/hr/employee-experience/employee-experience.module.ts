import { Module } from '@nestjs/common';
import { EmployeeExperienceController } from './employee-experience.controller.js';
import { EmployeeExperienceService } from './employee-experience.service.js';

@Module({
  imports: [],
  controllers: [EmployeeExperienceController],
  providers: [EmployeeExperienceService],
  exports: [EmployeeExperienceService],
})
export class EmployeeExperienceModule {}
