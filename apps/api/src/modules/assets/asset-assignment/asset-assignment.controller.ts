import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AssetAssignmentService } from './asset-assignment.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { AssignAssetDto } from './dto/assign-asset.dto.js';
import { ReturnAssetDto } from './dto/return-asset.dto.js';

@ApiTags('hr-asset-assignments')
@ApiBearerAuth()
@Controller('hr/asset-assignments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetAssignmentController {
  constructor(private readonly assignmentService: AssetAssignmentService) {}

  @Get()
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List asset assignments' })
  @ApiQuery({ name: 'assetId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of asset assignments' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('assetId') assetId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.assignmentService.findAll(tenantId, {
      assetId,
      employeeId,
      activeOnly: activeOnly === 'true',
      limit,
      offset,
    });
  }

  @Get(':id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get asset assignment by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.assignmentService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Assign an asset to an employee' })
  @ApiResponse({ status: 201, description: 'Asset assigned' })
  @ApiResponse({ status: 409, description: 'Asset already assigned' })
  async assign(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string | null,
    @Body() body: AssignAssetDto,
  ) {
    return this.assignmentService.assign(tenantId, body, userId);
  }

  @Post(':id/return')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Return an assigned asset' })
  @ApiResponse({ status: 200, description: 'Assignment closed (asset returned)' })
  async returnAssignment(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: ReturnAssetDto,
  ) {
    return this.assignmentService.returnAssignment(tenantId, id, body);
  }
}
