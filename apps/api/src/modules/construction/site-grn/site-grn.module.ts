import { Module } from '@nestjs/common';
import { SiteGrnController } from './site-grn.controller.js';
import { SiteGrnService } from './site-grn.service.js';

@Module({
  controllers: [SiteGrnController],
  providers: [SiteGrnService],
  exports: [SiteGrnService],
})
export class SiteGrnModule {}
