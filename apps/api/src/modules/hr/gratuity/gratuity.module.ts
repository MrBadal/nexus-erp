import { Module } from '@nestjs/common';
import { GratuityController } from './gratuity.controller.js';
import { GratuityService } from './gratuity.service.js';

@Module({
  controllers: [GratuityController],
  providers: [GratuityService],
  exports: [GratuityService],
})
export class GratuityModule {}
