import { Module } from '@nestjs/common';
import { TdsController } from './tds.controller.js';
import { TdsService } from './tds.service.js';

@Module({
  controllers: [TdsController],
  providers: [TdsService],
  exports: [TdsService],
})
export class TdsModule {}
