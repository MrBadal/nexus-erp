import { Module } from '@nestjs/common';
import { HolidayController } from './holiday.controller.js';
import { HolidayEssController } from './holiday-ess.controller.js';
import { HolidayService } from './holiday.service.js';

@Module({
  controllers: [HolidayController, HolidayEssController],
  providers: [HolidayService],
  exports: [HolidayService],
})
export class HolidayModule {}
