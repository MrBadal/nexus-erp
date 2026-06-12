import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDealStageDto {
  @ApiProperty({ enum: ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])
  stage!: string;

  @ApiPropertyOptional({ example: 'Customer chose competitor' })
  @IsOptional()
  @IsString()
  lostReason?: string;

  @ApiPropertyOptional({ example: 'Best value proposition' })
  @IsOptional()
  @IsString()
  wonReason?: string;
}
