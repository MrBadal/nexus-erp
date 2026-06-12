import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactGroupDto {
  @ApiProperty({ example: 'VIP Clients' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'High-value customers' })
  @IsOptional()
  @IsString()
  description?: string;
}
