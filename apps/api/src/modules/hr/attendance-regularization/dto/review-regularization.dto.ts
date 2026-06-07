import { IsOptional, IsString } from 'class-validator';

export class ReviewRegularizationDto {
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
