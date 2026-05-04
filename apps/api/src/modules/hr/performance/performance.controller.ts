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
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { PerformanceService } from './performance.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import {
  CreateCycleDto,
  UpdateCycleDto,
  CreateKraTemplateDto,
  UpdateKraTemplateDto,
  CreateGoalDto,
  UpdateGoalDto,
  ManagerCommentGoalDto,
  SubmitReviewDto,
  SubmitCompetenciesDto,
} from './dto/performance.dto.js';

interface ScopedRequest extends Request {
  scopedEmployeeId?: string;
}

@ApiTags('hr-performance')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  // ─────────────────────────────────────────────────────────
  // HR-side endpoints
  // ─────────────────────────────────────────────────────────

  // ─── Cycles ───────────────────────────────────────────

  @Get('hr/performance/cycles')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'List review cycles' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listCycles(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAllCycles(tenantId, { status, limit, offset });
  }

  @Get('hr/performance/cycles/:id')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'Get review cycle by ID' })
  async getCycle(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findCycleById(tenantId, id);
  }

  @Post('hr/performance/cycles')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'Create a review cycle' })
  async createCycle(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateCycleDto,
  ) {
    return this.service.createCycle(tenantId, body);
  }

  @Put('hr/performance/cycles/:id')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'Update a review cycle' })
  async updateCycle(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateCycleDto,
  ) {
    return this.service.updateCycle(tenantId, id, body);
  }

  @Delete('hr/performance/cycles/:id')
  @RequirePermissions('hr:manage_performance')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft review cycle' })
  async deleteCycle(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    await this.service.deleteCycle(tenantId, id);
  }

  @Get('hr/performance/cycles/:id/report')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'Cycle report aggregation per employee' })
  async cycleReport(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.cycleReport(tenantId, id);
  }

  @Get('hr/performance/cycles/:id/reviews')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'List review responses for a cycle' })
  @ApiQuery({ name: 'employeeId', required: false })
  async cycleReviews(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.findReviewsForCycle(tenantId, id, { employeeId });
  }

  // ─── KRA Templates ────────────────────────────────────

  @Get('hr/performance/templates')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'List KRA templates' })
  @ApiQuery({ name: 'designationId', required: false })
  async listTemplates(
    @CurrentTenant() tenantId: string,
    @Query('designationId') designationId?: string,
  ) {
    return this.service.findAllTemplates(tenantId, { designationId });
  }

  @Get('hr/performance/templates/:id')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'Get KRA template by ID' })
  async getTemplate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findTemplateById(tenantId, id);
  }

  @Post('hr/performance/templates')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'Create a KRA template' })
  async createTemplate(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateKraTemplateDto,
  ) {
    return this.service.createTemplate(tenantId, body);
  }

  @Put('hr/performance/templates/:id')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'Update a KRA template' })
  async updateTemplate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateKraTemplateDto,
  ) {
    return this.service.updateTemplate(tenantId, id, body);
  }

  @Delete('hr/performance/templates/:id')
  @RequirePermissions('hr:manage_performance')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a KRA template' })
  async deleteTemplate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    await this.service.deleteTemplate(tenantId, id);
  }

  // ─── HR-side Goals (manager view) ─────────────────────

  @Get('hr/performance/goals')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'List goals (HR/manager view)' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'cycleId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async listGoalsHr(
    @CurrentTenant() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('cycleId') cycleId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAllGoals(tenantId, { employeeId, cycleId, status });
  }

  @Post('hr/performance/goals/:id/manager-comment')
  @RequirePermissions('hr:manage_performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manager comment / rating on a goal' })
  async managerCommentGoal(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: ManagerCommentGoalDto,
  ) {
    return this.service.managerCommentGoal(tenantId, id, body);
  }

  // ─── HR-side Reviews ──────────────────────────────────

  @Post('hr/performance/reviews')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'Submit a manager or peer review' })
  async submitReviewHr(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: SubmitReviewDto,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException(
        'Reviewer must be linked to an employee record',
      );
    }
    return this.service.submitReview(tenantId, body, user.employeeId);
  }

  @Post('hr/performance/competencies')
  @RequirePermissions('hr:manage_performance')
  @ApiOperation({ summary: 'Submit competency ratings for an employee' })
  async submitCompetenciesHr(
    @CurrentTenant() tenantId: string,
    @Body() body: SubmitCompetenciesDto,
  ) {
    return this.service.submitCompetencies(tenantId, body);
  }

  // ─────────────────────────────────────────────────────────
  // ESS endpoints (self-scoped)
  // ─────────────────────────────────────────────────────────

  @Get('ess/performance/cycles/active')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Get the currently active cycle for the employee' })
  async getActiveCycleEss(@CurrentTenant() tenantId: string) {
    return this.service.findActiveCycle(tenantId);
  }

  @Get('ess/performance/goals')
  @ScopeToSelf()
  @ApiOperation({ summary: 'List my goals' })
  @ApiQuery({ name: 'cycleId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async listMyGoals(
    @CurrentTenant() tenantId: string,
    @Req() req: ScopedRequest,
    @Query('cycleId') cycleId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAllGoals(tenantId, {
      employeeId: req.scopedEmployeeId,
      cycleId,
      status,
    });
  }

  @Post('ess/performance/goals')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Create a personal goal' })
  async createMyGoal(
    @CurrentTenant() tenantId: string,
    @Req() req: ScopedRequest,
    @Body() body: CreateGoalDto,
  ) {
    return this.service.createGoal(tenantId, body, req.scopedEmployeeId);
  }

  @Put('ess/performance/goals/:id')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Update my goal' })
  async updateMyGoal(
    @CurrentTenant() tenantId: string,
    @Req() req: ScopedRequest,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateGoalDto,
  ) {
    return this.service.updateGoal(tenantId, id, body, req.scopedEmployeeId);
  }

  @Delete('ess/performance/goals/:id')
  @ScopeToSelf()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete my goal' })
  async deleteMyGoal(
    @CurrentTenant() tenantId: string,
    @Req() req: ScopedRequest,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    await this.service.deleteGoal(tenantId, id, req.scopedEmployeeId);
  }

  @Get('ess/performance/reviews/me')
  @ScopeToSelf()
  @ApiOperation({ summary: 'List reviews submitted about me' })
  async myReviews(
    @CurrentTenant() tenantId: string,
    @Req() req: ScopedRequest,
  ) {
    return this.service.findMyReviews(tenantId, req.scopedEmployeeId!);
  }

  @Post('ess/performance/reviews')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Submit my self-review' })
  async submitSelfReview(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: ScopedRequest,
    @Body() body: SubmitReviewDto,
  ) {
    // Force role=self on ESS endpoint.
    const dto: SubmitReviewDto = {
      ...body,
      role: 'self',
      employeeId: req.scopedEmployeeId!,
    };
    return this.service.submitReview(
      tenantId,
      dto,
      user.employeeId!,
      req.scopedEmployeeId,
    );
  }
}
