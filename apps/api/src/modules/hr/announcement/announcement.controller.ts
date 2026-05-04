import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { AnnouncementService } from './announcement.service.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';

// ─── HR-side controller ─────────────────────────────────────

@ApiTags('hr-announcements')
@ApiBearerAuth()
@Controller('hr/announcements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  @Get()
  @RequirePermissions('hr:post_announcement')
  @ApiOperation({ summary: 'List announcements (HR view, includes drafts)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of announcements' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAll(tenantId, { search, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('hr:post_announcement')
  @ApiOperation({ summary: 'Get announcement by ID' })
  @ApiResponse({ status: 200, description: 'Announcement details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('hr:post_announcement')
  @ApiOperation({ summary: 'Create announcement' })
  @ApiResponse({ status: 201, description: 'Announcement created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateAnnouncementDto,
  ) {
    return this.service.create(tenantId, user.sub, body);
  }

  @Patch(':id')
  @RequirePermissions('hr:post_announcement')
  @ApiOperation({ summary: 'Update announcement' })
  @ApiResponse({ status: 200, description: 'Announcement updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateAnnouncementDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Post(':id/publish')
  @RequirePermissions('hr:post_announcement')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish announcement now' })
  @ApiResponse({ status: 200, description: 'Announcement published' })
  async publish(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.publish(tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('hr:post_announcement')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete (soft) announcement' })
  @ApiResponse({ status: 200, description: 'Announcement deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }
}

// ─── ESS-side controller ────────────────────────────────────

@ApiTags('ess-announcements')
@ApiBearerAuth()
@Controller('ess/announcements')
@UseGuards(JwtAuthGuard, SelfScopedGuard)
export class EssAnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  @Get()
  @ScopeToSelf()
  @ApiOperation({ summary: 'Get announcement feed for current employee' })
  @ApiResponse({ status: 200, description: 'List of visible announcements' })
  async feed(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findFeed(tenantId, user.employeeId as string);
  }

  @Get('unread-count')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Get unread announcement count for current employee' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async unreadCount(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getUnreadCount(tenantId, user.employeeId as string);
  }

  @Post(':id/read')
  @ScopeToSelf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark announcement as read for current employee' })
  @ApiResponse({ status: 200, description: 'Announcement marked as read' })
  async markRead(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.markRead(tenantId, id, user.employeeId as string);
  }
}
