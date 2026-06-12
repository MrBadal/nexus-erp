import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDealDto } from './create-deal.dto.js';

export class UpdateDealDto extends PartialType(CreateDealDto) {
  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  actualCloseDate?: string;

  @ApiPropertyOptional({ example: 'Budget constraints' })
  @IsOptional()
  @IsString()
  lostReason?: string;

  @ApiPropertyOptional({ example: 'Competitive pricing' })
  @IsOptional()
  @IsString()
  wonReason?: string;
}
