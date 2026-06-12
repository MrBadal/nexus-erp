import { Module } from '@nestjs/common';
import { RecruitmentController } from './recruitment.controller.js';
import { RecruitmentService } from './recruitment.service.js';

@Module({
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
