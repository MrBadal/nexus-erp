import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import {
  approvalWorkflows,
  approvalWorkflowSteps,
  approvalRequests,
  approvalRequestActions,
} from '../../database/schema/index.js';

export interface CreateWorkflowDto {
  name: string;
  documentType: string;
  description?: string;
  thresholdAmount?: string;
  steps: { stepOrder: number; approverRoleId?: string; approverUserId?: string; description?: string }[];
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  thresholdAmount?: string;
  isActive?: boolean;
}

@Injectable()
export class ApprovalWorkflowService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAllWorkflows(tenantId: string) {
    return this.db
      .select()
      .from(approvalWorkflows)
      .where(and(eq(approvalWorkflows.tenantId, tenantId), isNull(approvalWorkflows.deletedAt)))
      .orderBy(desc(approvalWorkflows.createdAt));
  }

  async findWorkflowById(tenantId: string, id: string) {
    const [workflow] = await this.db
      .select()
      .from(approvalWorkflows)
      .where(and(eq(approvalWorkflows.id, id), eq(approvalWorkflows.tenantId, tenantId), isNull(approvalWorkflows.deletedAt)))
      .limit(1);

    if (!workflow) throw new NotFoundException('Approval workflow not found');

    const steps = await this.db
      .select()
      .from(approvalWorkflowSteps)
      .where(eq(approvalWorkflowSteps.workflowId, id))
      .orderBy(approvalWorkflowSteps.stepOrder);

    return { ...workflow, steps };
  }

  async createWorkflow(tenantId: string, dto: CreateWorkflowDto) {
    const [workflow] = await this.db
      .insert(approvalWorkflows)
      .values({
        tenantId,
        name: dto.name,
        documentType: dto.documentType,
        description: dto.description || null,
        thresholdAmount: dto.thresholdAmount || null,
      })
      .returning();

    if (dto.steps?.length) {
      await this.db.insert(approvalWorkflowSteps).values(
        dto.steps.map((s) => ({
          workflowId: workflow.id,
          stepOrder: s.stepOrder,
          approverRoleId: s.approverRoleId || null,
          approverUserId: s.approverUserId || null,
          description: s.description || null,
        })),
      );
    }

    return this.findWorkflowById(tenantId, workflow.id);
  }

  async updateWorkflow(tenantId: string, id: string, dto: UpdateWorkflowDto) {
    await this.findWorkflowById(tenantId, id);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.thresholdAmount !== undefined) updates.thresholdAmount = dto.thresholdAmount;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;

    const [updated] = await this.db
      .update(approvalWorkflows)
      .set(updates)
      .where(eq(approvalWorkflows.id, id))
      .returning();

    return updated;
  }

  async softDeleteWorkflow(tenantId: string, id: string) {
    await this.findWorkflowById(tenantId, id);
    await this.db.update(approvalWorkflows).set({ deletedAt: new Date() }).where(eq(approvalWorkflows.id, id));
  }

  // ─── Approval Requests ────────────────────────────────

  async findPendingRequests(tenantId: string, userId: string) {
    return this.db
      .select()
      .from(approvalRequests)
      .where(and(eq(approvalRequests.tenantId, tenantId), eq(approvalRequests.status, 'pending')))
      .orderBy(desc(approvalRequests.createdAt));
  }

  async findRequestsByDocument(tenantId: string, documentType: string, documentId: string) {
    return this.db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.tenantId, tenantId),
          eq(approvalRequests.documentType, documentType),
          eq(approvalRequests.documentId, documentId),
        ),
      )
      .orderBy(desc(approvalRequests.createdAt));
  }

  async submitForApproval(
    tenantId: string,
    dto: {
      documentType: string;
      documentId: string;
      documentNumber?: string;
      requestedBy: string;
      amount?: string;
      notes?: string;
    },
  ) {
    // Find applicable workflow
    const workflows = await this.db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.tenantId, tenantId),
          eq(approvalWorkflows.documentType, dto.documentType),
          eq(approvalWorkflows.isActive, true),
          isNull(approvalWorkflows.deletedAt),
        ),
      )
      .limit(1);

    if (workflows.length === 0) {
      throw new BadRequestException(`No active approval workflow found for ${dto.documentType}`);
    }

    const workflow = workflows[0];

    const [request] = await this.db
      .insert(approvalRequests)
      .values({
        tenantId,
        workflowId: workflow.id,
        documentType: dto.documentType,
        documentId: dto.documentId,
        documentNumber: dto.documentNumber || null,
        requestedBy: dto.requestedBy,
        amount: dto.amount || null,
        notes: dto.notes || null,
        currentStep: 1,
      })
      .returning();

    return request;
  }

  async approveRequest(tenantId: string, requestId: string, userId: string, comments?: string) {
    const [request] = await this.db
      .select()
      .from(approvalRequests)
      .where(and(eq(approvalRequests.id, requestId), eq(approvalRequests.tenantId, tenantId)))
      .limit(1);

    if (!request) throw new NotFoundException('Approval request not found');
    if (request.status !== 'pending') throw new BadRequestException('Request is not pending');

    // Record the action
    await this.db.insert(approvalRequestActions).values({
      requestId,
      stepOrder: request.currentStep,
      action: 'approved',
      actionBy: userId,
      comments: comments || null,
    });

    // Check if there are more steps
    const steps = await this.db
      .select()
      .from(approvalWorkflowSteps)
      .where(eq(approvalWorkflowSteps.workflowId, request.workflowId))
      .orderBy(approvalWorkflowSteps.stepOrder);

    const nextStep = steps.find((s) => s.stepOrder > request.currentStep);

    if (nextStep) {
      // Move to next step
      await this.db
        .update(approvalRequests)
        .set({ currentStep: nextStep.stepOrder, updatedAt: new Date() })
        .where(eq(approvalRequests.id, requestId));

      return { requestId, status: 'pending', currentStep: nextStep.stepOrder };
    } else {
      // All steps approved — mark as approved
      await this.db
        .update(approvalRequests)
        .set({ status: 'approved', updatedAt: new Date() })
        .where(eq(approvalRequests.id, requestId));

      this.eventEmitter.emit('APPROVAL_COMPLETED', {
        tenantId: request.tenantId,
        documentType: request.documentType,
        documentId: request.documentId,
        documentNumber: request.documentNumber,
      });

      return { requestId, status: 'approved' };
    }
  }

  async rejectRequest(tenantId: string, requestId: string, userId: string, comments?: string) {
    const [request] = await this.db
      .select()
      .from(approvalRequests)
      .where(and(eq(approvalRequests.id, requestId), eq(approvalRequests.tenantId, tenantId)))
      .limit(1);

    if (!request) throw new NotFoundException('Approval request not found');
    if (request.status !== 'pending') throw new BadRequestException('Request is not pending');

    await this.db.insert(approvalRequestActions).values({
      requestId,
      stepOrder: request.currentStep,
      action: 'rejected',
      actionBy: userId,
      comments: comments || null,
    });

    await this.db
      .update(approvalRequests)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(approvalRequests.id, requestId));

    this.eventEmitter.emit('APPROVAL_REJECTED', {
      tenantId: request.tenantId,
      documentType: request.documentType,
      documentId: request.documentId,
      documentNumber: request.documentNumber,
    });

    return { requestId, status: 'rejected' };
  }
}
