import { Module } from '@nestjs/common';
import { NcrController } from './ncr.controller.js';
import { NcrService } from './ncr.service.js';

@Module({
  controllers: [NcrController],
  providers: [NcrService],
  exports: [NcrService],
})
export class NcrModule {}
