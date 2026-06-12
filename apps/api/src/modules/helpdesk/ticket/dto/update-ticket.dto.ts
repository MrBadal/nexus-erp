import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsIn,
  MaxLength,
  IsEmail,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  subject?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['open', 'replied', 'resolved', 'closed'])
  status?: string;

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
  resolution?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  satisfactionRating?: number;
}

export class CreateTicketCommentDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;

  @IsString()
  @IsOptional()
  attachments?: string;
}
