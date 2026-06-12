import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  IsDateString,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WorkOrderOperationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  operationName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  workstation?: string;

  @IsString()
  @IsOptional()
  plannedTime?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateWorkOrderDto {
  @IsUUID()
  @IsNotEmpty()
  bomId!: string;

  @IsUUID()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  itemName!: string;

  @IsString()
  @IsNotEmpty()
  quantity!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  uom?: string;

  @IsDateString()
  @IsOptional()
  plannedStartDate?: string;

  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  warehouse?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderOperationDto)
  operations?: WorkOrderOperationDto[];
}
