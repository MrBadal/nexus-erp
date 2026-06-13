import { PartialType } from '@nestjs/swagger';
import { CreateDesignationDto } from './create-designation.dto.js';

/** All fields optional for partial edits (mirrors UpdateDepartmentDto). */
export class UpdateDesignationDto extends PartialType(CreateDesignationDto) {}
