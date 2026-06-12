import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdatePurchaseOrderDto {
  @IsDateString()
  @IsOptional()
  expectedDelivery?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
