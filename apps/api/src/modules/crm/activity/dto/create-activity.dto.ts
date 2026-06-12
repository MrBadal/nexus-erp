import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActivityDto {
  @ApiProperty({ enum: ['call', 'email', 'meeting', 'task', 'note'] })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['call', 'email', 'meeting', 'task', 'note'])
  type!: string;

  @ApiProperty({ example: 'Follow-up call with client' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject!: string;

  @ApiPropertyOptional({ example: 'Discuss pricing and timeline' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  dealId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ example: '2026-03-20T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: ['pending', 'completed', 'cancelled'], default: 'pending' })
  @IsOptional()
  @IsEnum(['pending', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'], default: 'medium' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: string;
}
