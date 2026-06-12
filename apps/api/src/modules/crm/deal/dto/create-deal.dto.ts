import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  IsNumberString,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDealDto {
  @ApiProperty({ example: 'Enterprise Software License' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ example: '50000.00' })
  @IsOptional()
  @IsNumberString()
  value?: string;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ enum: ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'], default: 'lead' })
  @IsOptional()
  @IsEnum(['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])
  stage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ enum: ['website', 'referral', 'cold_call', 'trade_show', 'social_media', 'other'] })
  @IsOptional()
  @IsEnum(['website', 'referral', 'cold_call', 'trade_show', 'social_media', 'other'])
  source?: string;

  @ApiPropertyOptional({ example: 'Large enterprise deal for software licensing' })
  @IsOptional()
  @IsString()
  description?: string;
}
