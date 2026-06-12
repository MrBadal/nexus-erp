import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class UpdateBrandingDto {
  @IsString() @IsOptional() @MaxLength(100)
  appName?: string;

  @IsString() @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'brandColor must be a 6-digit hex color like #2563eb',
  })
  brandColor?: string;

  @IsString() @IsOptional() @MaxLength(255)
  loginWelcomeText?: string;

  @IsString() @IsOptional()
  loginBgUrl?: string;
}
