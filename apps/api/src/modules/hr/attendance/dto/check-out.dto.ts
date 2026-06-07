import {
  IsUUID,
  IsOptional,
  IsString,
} from 'class-validator';

export class CheckOutDto {
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
