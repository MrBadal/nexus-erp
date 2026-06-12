import { Module } from '@nestjs/common';
import { BomController } from './bom.controller.js';
import { BomService } from './bom.service.js';

@Module({
  controllers: [BomController],
  providers: [BomService],
  exports: [BomService],
})
export class BomModule {}
