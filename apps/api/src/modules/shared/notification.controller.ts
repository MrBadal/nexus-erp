import { Controller, Get, Post, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service.js';
import { JwtAuthGuard } from '../../common/guards/auth.guard.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator.js';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async findAll(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationService.findByUser(tenantId, user.sub, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const count = await this.notificationService.getUnreadCount(tenantId, user.sub);
    return { count };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(tenantId, user.sub, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.markAllAsRead(tenantId, user.sub);
  }
}
