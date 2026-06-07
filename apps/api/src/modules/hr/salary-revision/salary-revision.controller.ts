import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SalaryRevisionService } from './salary-revision.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateSalaryRevisionDto } from './dto/create-salary-revision.dto.js';
import { UpdateSalaryRevisionDto } from './dto/update-salary-revision.dto.js';

@ApiTags('hr-salary-revisions')
@ApiBearerAuth()
@Controller('hr/salary-revisions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalaryRevisionController {
  constructor(private readonly salaryRevisionService: SalaryRevisionService) {}

  @Get()
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List salary revisions (optionally filter by employee)' })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of salary revisions' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit !== undefined ? Number(limit) : undefined;
    const offsetNum = offset !== undefined ? Number(offset) : undefined;
    return this.salaryRevisionService.findAll(tenantId, {
      employeeId: employeeId || undefined,
      limit: Number.isFinite(limitNum) ? limitNum : undefined,
      offset: Number.isFinite(offsetNum) ? offsetNum : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get salary revision by ID' })
  @ApiResponse({ status: 200, description: 'Salary revision details' })
  @ApiResponse({ status: 404, description: 'Salary revision not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.salaryRevisionService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a salary revision' })
  @ApiResponse({ status: 201, description: 'Salary revision created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateSalaryRevisionDto,
  ) {
    return this.salaryRevisionService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update a salary revision' })
  @ApiResponse({ status: 200, description: 'Salary revision updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateSalaryRevisionDto,
  ) {
    return this.salaryRevisionService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('hr:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a salary revision (soft delete)' })
  @ApiResponse({ status: 200, description: 'Salary revision deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.salaryRevisionService.softDelete(tenantId, id);
  }
}
