import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeadFinderService, DiscoverDto, ApproveDto } from './lead-finder.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import type { Actor } from '../lead/lead.service.js';

function toActor(user: JwtPayload): Actor {
  const perms = user.permissions ?? [];
  const isAdmin = perms.includes('*') || user.roleSlug === 'admin';
  return {
    userId: user.sub,
    canSeeAll: isAdmin || perms.includes('crm:read_all'),
    canAssign: isAdmin || perms.includes('crm:assign'),
  };
}

@ApiTags('lead-finder')
@ApiBearerAuth()
@Controller('crm/lead-finder')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadFinderController {
  constructor(private readonly service: LeadFinderService) {}

  @Get('states')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'List states available for registry discovery' })
  states() {
    return this.service.listStates();
  }

  @Get('candidates')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'List discovered candidate leads for review' })
  candidates(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('state') state?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.listCandidates(tenantId, { status, state, search, limit, offset });
  }

  @Get('candidate-counts')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Candidate counts per status' })
  counts(@CurrentTenant() tenantId: string) {
    return this.service.candidateCounts(tenantId);
  }

  @Post('discover')
  @RequirePermissions('crm:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Scan the MCA registry for producer companies in a state' })
  discover(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: DiscoverDto,
  ) {
    return this.service.discover(tenantId, body, toActor(user));
  }

  @Post('approve')
  @RequirePermissions('crm:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve candidates into the leads pool' })
  approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: ApproveDto,
  ) {
    return this.service.approve(tenantId, body, toActor(user));
  }

  @Post('reject')
  @RequirePermissions('crm:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject candidates' })
  reject(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { ids: string[] },
  ) {
    return this.service.reject(tenantId, body?.ids ?? [], toActor(user));
  }

  @Post('enrich')
  @RequirePermissions('crm:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enrich existing leads in a state from staged registry data' })
  enrich(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { state: string },
  ) {
    return this.service.enrichState(tenantId, body?.state, toActor(user));
  }
}
