import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsEnum,
  IsISO8601,
  MaxLength,
  MinLength,
} from 'class-validator';

export type AnnouncementAudienceScope =
  | 'tenant'
  | 'department'
  | 'designation'
  | 'specific';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsEnum(['tenant', 'department', 'designation', 'specific'])
  audienceScope!: AnnouncementAudienceScope;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  audienceIds?: string[];

  @IsOptional()
  @IsISO8601()
  publishedAt?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
