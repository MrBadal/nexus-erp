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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProcedureService } from './procedure.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateProcedureDto } from './dto/create-procedure.dto.js';
import { UpdateProcedureDto } from './dto/update-procedure.dto.js';

@ApiTags('quality-procedures')
@ApiBearerAuth()
@Controller('quality')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProcedureController {
  constructor(private readonly procedureService: ProcedureService) {}

  @Get('procedures')
  @RequirePermissions('quality:read')
  @ApiOperation({ summary: 'List quality procedures with filters' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of quality procedures' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.procedureService.findAll(tenantId, { isActive: isActiveBool, search, limit, offset });
  }

  @Get('procedures/:id')
  @RequirePermissions('quality:read')
  @ApiOperation({ summary: 'Get procedure by ID' })
  @ApiResponse({ status: 200, description: 'Procedure details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.procedureService.findById(tenantId, id);
  }

  @Post('procedures')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Create a new quality procedure' })
  @ApiResponse({ status: 201, description: 'Procedure created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateProcedureDto,
  ) {
    return this.procedureService.create(tenantId, body);
  }

  @Put('procedures/:id')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Update a procedure' })
  @ApiResponse({ status: 200, description: 'Procedure updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateProcedureDto,
  ) {
    return this.procedureService.update(tenantId, id, body);
  }

  @Delete('procedures/:id')
  @RequirePermissions('quality:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a procedure' })
  @ApiResponse({ status: 204, description: 'Procedure deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.procedureService.softDelete(tenantId, id);
  }
}
