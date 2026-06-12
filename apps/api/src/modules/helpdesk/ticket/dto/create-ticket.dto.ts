import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsIn,
  MaxLength,
  IsEmail,
} from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  subject!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  category?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  subCategory?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactName?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  contactEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  assignedGroup?: string;

  @IsString()
  @IsOptional()
  @IsIn(['email', 'phone', 'web', 'chat'])
  source?: string;
}
