import { Module } from '@nestjs/common';
import { OffboardingController } from './offboarding.controller.js';
import { OffboardingTemplateService } from './offboarding-template.service.js';
import { OffboardingChecklistService } from './offboarding-checklist.service.js';

@Module({
  controllers: [OffboardingController],
  providers: [OffboardingTemplateService, OffboardingChecklistService],
  exports: [OffboardingTemplateService, OffboardingChecklistService],
})
export class OffboardingModule {}
