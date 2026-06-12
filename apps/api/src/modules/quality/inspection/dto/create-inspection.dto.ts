import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsDateString,
  IsInt,
  IsIn,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InspectionReadingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  parameter!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  specification?: string;

  @IsString()
  @IsOptional()
  minValue?: string;

  @IsString()
  @IsOptional()
  maxValue?: string;

  @IsString()
  @IsOptional()
  actualValue?: string;

  @IsString()
  @IsOptional()
  @IsIn(['accepted', 'rejected'])
  status?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateInspectionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['incoming', 'in_process', 'outgoing'])
  referenceType!: string;

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
  @IsNotEmpty()
  inspectionDate!: string;

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

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InspectionReadingDto)
  readings?: InspectionReadingDto[];
}
