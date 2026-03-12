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
import { JournalEntryService } from './journal-entry.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('journal-entries')
@ApiBearerAuth()
@Controller('finance/journal-entries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class JournalEntryController {
  constructor(private readonly journalEntryService: JournalEntryService) {}

  @Get()
  @RequirePermissions('journal:read')
  @ApiOperation({ summary: 'List journal entries' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'posted', 'reversed'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of journal entries' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.journalEntryService.findAll(tenantId, { status, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('journal:read')
  @ApiOperation({ summary: 'Get journal entry with lines' })
  @ApiResponse({ status: 200, description: 'Journal entry details with lines' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.journalEntryService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('journal:write')
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created' })
  @ApiResponse({ status: 400, description: 'Validation error (unbalanced, etc.)' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: any,
  ) {
    return this.journalEntryService.create(tenantId, user.sub, body);
  }

  @Put(':id')
  @RequirePermissions('journal:write')
  @ApiOperation({ summary: 'Update a draft journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry updated' })
  @ApiResponse({ status: 400, description: 'Cannot update non-draft entry' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: any,
  ) {
    return this.journalEntryService.update(tenantId, id, body);
  }

  @Post(':id/post')
  @RequirePermissions('journal:post')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post a draft journal entry to the general ledger' })
  @ApiResponse({ status: 200, description: 'Journal entry posted' })
  @ApiResponse({ status: 400, description: 'Cannot post (unbalanced, closed period, etc.)' })
  async post(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.journalEntryService.post(tenantId, id, user.sub);
  }

  @Post(':id/reverse')
  @RequirePermissions('journal:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a reversing entry for a posted journal entry' })
  @ApiResponse({ status: 201, description: 'Reversing entry created' })
  @ApiResponse({ status: 400, description: 'Cannot reverse (not posted, already reversed)' })
  async reverse(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: { date?: string },
  ) {
    return this.journalEntryService.reverse(tenantId, id, user.sub, body?.date);
  }

  @Delete(':id')
  @RequirePermissions('journal:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft journal entry' })
  @ApiResponse({ status: 204, description: 'Journal entry deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete non-draft entry' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.journalEntryService.remove(tenantId, id);
  }
}
