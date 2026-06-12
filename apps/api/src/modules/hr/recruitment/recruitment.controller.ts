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
import {
  RecruitmentService,
  CreateJobOpeningDto,
  UpdateJobOpeningDto,
  CreateCandidateDto,
  UpdateCandidateDto,
  ScheduleInterviewDto,
  CompleteInterviewDto,
  CreateOfferDto,
} from './recruitment.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('recruitment')
@ApiBearerAuth()
@Controller('hr/recruitment')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecruitmentController {
  constructor(private readonly service: RecruitmentService) {}

  // ─── Job Openings ───────────────────────────────────────

  @Get('job-openings')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List job openings' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAllJobs(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAllJobOpenings(tenantId, { status, search, limit, offset });
  }

  @Get('job-openings/:id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get job opening by ID' })
  async findJobById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findJobOpeningById(tenantId, id);
  }

  @Post('job-openings')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a job opening' })
  @ApiResponse({ status: 201, description: 'Job opening created' })
  async createJob(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateJobOpeningDto,
  ) {
    return this.service.createJobOpening(tenantId, body);
  }

  @Put('job-openings/:id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update a job opening' })
  async updateJob(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateJobOpeningDto,
  ) {
    return this.service.updateJobOpening(tenantId, id, body);
  }

  @Post('job-openings/:id/publish')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a job opening' })
  async publishJob(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.publishJobOpening(tenantId, id);
  }

  @Post('job-openings/:id/close')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a job opening' })
  async closeJob(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.closeJobOpening(tenantId, id);
  }

  @Delete('job-openings/:id')
  @RequirePermissions('hr:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a job opening' })
  async removeJob(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDeleteJobOpening(tenantId, id);
  }

  // ─── Candidates ─────────────────────────────────────────

  @Get('candidates')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List candidates' })
  @ApiQuery({ name: 'jobOpeningId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAllCandidates(
    @CurrentTenant() tenantId: string,
    @Query('jobOpeningId') jobOpeningId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAllCandidates(tenantId, { jobOpeningId, status, search, limit, offset });
  }

  @Get('candidates/:id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get candidate by ID' })
  async findCandidateById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findCandidateById(tenantId, id);
  }

  @Post('candidates')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a candidate application' })
  @ApiResponse({ status: 201, description: 'Candidate created' })
  async createCandidate(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateCandidateDto,
  ) {
    return this.service.createCandidate(tenantId, body);
  }

  @Put('candidates/:id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update candidate' })
  async updateCandidate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateCandidateDto,
  ) {
    return this.service.updateCandidate(tenantId, id, body);
  }

  @Delete('candidates/:id')
  @RequirePermissions('hr:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a candidate' })
  async removeCandidate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDeleteCandidate(tenantId, id);
  }

  // ─── Interviews ─────────────────────────────────────────

  @Get('candidates/:id/interviews')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get interviews for a candidate' })
  async findInterviews(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findInterviewsByCandidateId(tenantId, id);
  }

  @Post('interviews')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Schedule an interview' })
  @ApiResponse({ status: 201, description: 'Interview scheduled' })
  async scheduleInterview(
    @CurrentTenant() tenantId: string,
    @Body() body: ScheduleInterviewDto,
  ) {
    return this.service.scheduleInterview(tenantId, body);
  }

  @Post('interviews/:id/complete')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete an interview with feedback' })
  async completeInterview(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: CompleteInterviewDto,
  ) {
    return this.service.completeInterview(tenantId, id, body);
  }

  // ─── Offers ─────────────────────────────────────────────

  @Post('offers')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create an offer letter' })
  @ApiResponse({ status: 201, description: 'Offer created' })
  async createOffer(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateOfferDto,
  ) {
    return this.service.createOffer(tenantId, body);
  }

  @Post('offers/:id/accept')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an offer' })
  async acceptOffer(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.acceptOffer(tenantId, id);
  }

  @Post('offers/:id/reject')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an offer' })
  async rejectOffer(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.rejectOffer(tenantId, id);
  }

  // ─── Hire ───────────────────────────────────────────────

  @Post('candidates/:id/hire')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create employee from hired candidate' })
  async hireCandidate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: { joiningDate: string },
  ) {
    return this.service.hireCandidate(tenantId, id, body.joiningDate);
  }
}
