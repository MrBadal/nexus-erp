import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller.js';
import { OnboardingTemplateService } from './onboarding-template.service.js';
import { OnboardingChecklistService } from './onboarding-checklist.service.js';

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingTemplateService, OnboardingChecklistService],
  exports: [OnboardingTemplateService, OnboardingChecklistService],
})
export class OnboardingModule {}
