import { Module } from '@nestjs/common';
import { DealController, DealStageController } from './deal.controller.js';
import { DealService } from './deal.service.js';

@Module({
  controllers: [DealController, DealStageController],
  providers: [DealService],
  exports: [DealService],
})
export class DealModule {}
