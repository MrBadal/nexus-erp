import { Module } from '@nestjs/common';
import { ItemModule } from './item/item.module.js';
import { WarehouseModule } from './warehouse/warehouse.module.js';
import { StockModule } from './stock/stock.module.js';

@Module({
  imports: [ItemModule, WarehouseModule, StockModule],
  exports: [ItemModule, WarehouseModule, StockModule],
})
export class InventoryModule {}
