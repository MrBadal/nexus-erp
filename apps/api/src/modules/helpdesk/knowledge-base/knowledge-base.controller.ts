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
import { KnowledgeBaseService } from './knowledge-base.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';

@ApiTags('helpdesk-knowledge-base')
@ApiBearerAuth()
@Controller('helpdesk')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get('articles')
  @RequirePermissions('helpdesk:read')
  @ApiOperation({ summary: 'List knowledge base articles' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of articles' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.knowledgeBaseService.findAll(tenantId, { status, category, search, limit, offset });
  }

  @Get('articles/:id')
  @RequirePermissions('helpdesk:read')
  @ApiOperation({ summary: 'Get article by ID' })
  @ApiResponse({ status: 200, description: 'Article details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.knowledgeBaseService.findById(tenantId, id);
  }

  @Post('articles')
  @RequirePermissions('helpdesk:write')
  @ApiOperation({ summary: 'Create a new article' })
  @ApiResponse({ status: 201, description: 'Article created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateArticleDto,
  ) {
    return this.knowledgeBaseService.create(tenantId, body);
  }

  @Put('articles/:id')
  @RequirePermissions('helpdesk:write')
  @ApiOperation({ summary: 'Update an article' })
  @ApiResponse({ status: 200, description: 'Article updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateArticleDto,
  ) {
    return this.knowledgeBaseService.update(tenantId, id, body);
  }

  @Post('articles/:id/helpful')
  @RequirePermissions('helpdesk:read')
  @ApiOperation({ summary: 'Mark article as helpful' })
  @ApiResponse({ status: 200, description: 'Helpful count incremented' })
  async markHelpful(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.knowledgeBaseService.incrementHelpful(tenantId, id);
  }

  @Delete('articles/:id')
  @RequirePermissions('helpdesk:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an article' })
  @ApiResponse({ status: 204, description: 'Article deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.knowledgeBaseService.softDelete(tenantId, id);
  }
}
