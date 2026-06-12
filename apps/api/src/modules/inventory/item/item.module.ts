import { Module } from '@nestjs/common';
import { ItemController } from './item.controller.js';
import { ItemService } from './item.service.js';

@Module({
  controllers: [ItemController],
  providers: [ItemService],
  exports: [ItemService],
})
export class ItemModule {}
