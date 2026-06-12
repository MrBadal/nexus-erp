import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  IsIn,
  MaxLength,
} from 'class-validator';

export class UpdateInspectionDto {
  @IsString()
  @IsOptional()
  @IsIn(['incoming', 'in_process', 'outgoing'])
  referenceType?: string;

  @IsUUID()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  referenceName?: string;

  @IsUUID()
  @IsOptional()
  itemId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  itemName?: string;

  @IsUUID()
  @IsOptional()
  inspectedBy?: string;

  @IsDateString()
  @IsOptional()
  inspectionDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  batchNumber?: string;

  @IsInt()
  @IsOptional()
  sampleSize?: number;

  @IsInt()
  @IsOptional()
  acceptedQuantity?: number;

  @IsInt()
  @IsOptional()
  rejectedQuantity?: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}
