import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AttendanceRegularizationService } from './attendance-regularization.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateRegularizationDto } from './dto/create-regularization.dto.js';
import { ReviewRegularizationDto } from './dto/review-regularization.dto.js';

@ApiTags('hr-attendance-regularizations')
@ApiBearerAuth()
@Controller('hr/attendance-regularizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceRegularizationController {
  constructor(
    private readonly regularizationService: AttendanceRegularizationService,
  ) {}

  @Get()
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List attendance regularization requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of regularization requests' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.regularizationService.findAll(tenantId, {
      status,
      employeeId,
      limit,
      offset,
    });
  }

  @Get(':id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get a regularization request by ID' })
  @ApiResponse({ status: 200, description: 'Regularization request details' })
  @ApiResponse({ status: 404, description: 'Regularization request not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.regularizationService.findById(tenantId, id);
  }

  @Post(':id/approve')
  @RequirePermissions('hr:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a regularization request and apply it to attendance' })
  @ApiResponse({ status: 200, description: 'Regularization request approved' })
  async approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: ReviewRegularizationDto,
  ) {
    return this.regularizationService.approve(tenantId, id, user.sub, body.reviewNotes);
  }

  @Post(':id/reject')
  @RequirePermissions('hr:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a regularization request' })
  @ApiResponse({ status: 200, description: 'Regularization request rejected' })
  async reject(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: ReviewRegularizationDto,
  ) {
    return this.regularizationService.reject(tenantId, id, user.sub, body.reviewNotes);
  }

  @Delete(':id')
  @RequirePermissions('hr:delete')
  @ApiOperation({ summary: 'Soft-delete a regularization request' })
  @ApiResponse({ status: 200, description: 'Regularization request deleted' })
  async softDelete(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.regularizationService.softDelete(tenantId, id);
  }
}

// ─── ESS (Employee Self-Service) ─────────────────────────

@ApiTags('ess-attendance-regularizations')
@ApiBearerAuth()
@Controller('ess/attendance/regularizations')
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class EssAttendanceRegularizationController {
  constructor(
    private readonly regularizationService: AttendanceRegularizationService,
  ) {}

  @Get()
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiOperation({ summary: 'List my own attendance regularization requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.regularizationService.findAll(tenantId, {
      employeeId: user.employeeId!,
      status,
      limit,
      offset,
    });
  }

  @Post()
  @ScopeToSelf()
  @RequirePermissions('ess:check_in')
  @ApiOperation({ summary: 'Submit a regularization request for myself' })
  async createMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Omit<CreateRegularizationDto, 'employeeId'>,
  ) {
    return this.regularizationService.create(tenantId, user.employeeId!, body);
  }
}
