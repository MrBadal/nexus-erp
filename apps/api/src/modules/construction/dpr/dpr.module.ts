import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { DprService } from './dpr.service.js';
import { DprController } from './dpr.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [DprController],
  providers: [DprService],
  exports: [DprService],
})
export class DprModule {}
