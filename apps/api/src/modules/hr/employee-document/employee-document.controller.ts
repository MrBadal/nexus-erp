import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { EmployeeDocumentService } from './employee-document.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import {
  CurrentUser,
  JwtPayload,
} from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';

@ApiTags('hr-employee-documents')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class EmployeeDocumentController {
  constructor(private readonly service: EmployeeDocumentService) {}

  // ─── HR-side endpoints ──────────────────────────────────

  @Get('hr/employee-documents')
  @RequirePermissions('hr:manage_documents')
  @ApiOperation({ summary: 'List employee documents (HR)' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of employee documents' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAll(tenantId, {
      employeeId,
      type,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('hr/employee-documents/:id')
  @RequirePermissions('hr:manage_documents')
  @ApiOperation({ summary: 'Get a single employee document (HR)' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post('hr/employee-documents')
  @RequirePermissions('hr:manage_documents')
  @ApiOperation({ summary: 'Upload an employee document (HR)' })
  @ApiResponse({ status: 201, description: 'Document created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateDocumentDto,
  ) {
    return this.service.create(tenantId, user.sub, body);
  }

  @Put('hr/employee-documents/:id')
  @RequirePermissions('hr:manage_documents')
  @ApiOperation({ summary: 'Update an employee document (HR)' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateDocumentDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Delete('hr/employee-documents/:id')
  @RequirePermissions('hr:manage_documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an employee document (HR)' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDelete(tenantId, id);
  }

  // ─── ESS-side endpoints ─────────────────────────────────

  @Get('ess/documents')
  @ScopeToSelf()
  @ApiOperation({ summary: 'List my visible employee documents (ESS)' })
  @ApiResponse({ status: 200, description: 'List of own documents' })
  async findMine(
    @CurrentTenant() tenantId: string,
    @Req() req: Request & { scopedEmployeeId?: string },
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    return this.service.findMine(tenantId, employeeId);
  }

  @Post('ess/documents')
  @ScopeToSelf()
  @ApiOperation({
    summary: 'Upload a personal document (ESS)',
    description:
      'Employee uploads a personal document (resume, ID copy, certificate). The document is auto-tagged to the calling employee, marked visibleToEmployee=true so they can see/download it themselves, and uploadedBy is set to the user.',
  })
  async uploadMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request & { scopedEmployeeId?: string },
    @Body() body: Omit<CreateDocumentDto, 'employeeId' | 'visibleToEmployee'>,
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    return this.service.create(tenantId, user.sub, {
      ...body,
      employeeId,
      visibleToEmployee: true,
    });
  }

  @Get('ess/documents/:id/download')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Download my document (ESS)' })
  async download(
    @CurrentTenant() tenantId: string,
    @Req() req: Request & { scopedEmployeeId?: string },
    @Param('id', UuidValidationPipe) id: string,
    @Res() res: Response,
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    const doc = await this.service.findMineById(tenantId, employeeId, id);

    // TODO: when MinIO storage service is wired up, stream the object body
    // here. For now we redirect to the stored fileUrl which may be a
    // pre-signed URL or external link set during upload.
    return res.redirect(doc.fileUrl);
  }
}
