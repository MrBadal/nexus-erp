import {
  IsString,
  IsOptional,
  IsIn,
  MaxLength,
} from 'class-validator';

export class UpdateArticleDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  category?: string;

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: string;
}
