import { PartialType } from '@nestjs/swagger';
import { CreateDepartmentDto } from './create-department.dto.js';

/**
 * All fields optional — the edit form keeps `code` read-only and only sends
 * the fields it changed. Using PartialType prevents the "code must be a
 * string" validation failure when a partial update omits `code`/`name`.
 */
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
