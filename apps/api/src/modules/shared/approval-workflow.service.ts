import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import {
  approvalWorkflows,
  approvalWorkflowSteps,
  approvalRequests,
  approvalRequestActions,
  purchaseOrders,
  bills,
  expenseClaims,
} from '../../database/schema/index.js';
import { NotificationService } from './notification.service.js';
import { EVENTS } from '../../common/events.constants.js';

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
  private readonly logger = new Logger(ApprovalWorkflowService.name);

  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationService: NotificationService,
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

      this.eventEmitter.emit(EVENTS.APPROVAL_COMPLETED, {
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

    this.eventEmitter.emit(EVENTS.APPROVAL_REJECTED, {
      tenantId: request.tenantId,
      documentType: request.documentType,
      documentId: request.documentId,
      documentNumber: request.documentNumber,
    });

    return { requestId, status: 'rejected' };
  }

  /**
   * Check for stale pending approvals and send escalation notifications.
   * Default escalation threshold is 24 hours if no specific value is set on the workflow step.
   */
  async checkAndEscalate() {
    const DEFAULT_ESCALATION_HOURS = 24;

    // Find all pending approval requests
    const pendingRequests = await this.db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.status, 'pending'));

    let escalated = 0;

    for (const request of pendingRequests) {
      // Get the workflow steps
      const steps = await this.db
        .select()
        .from(approvalWorkflowSteps)
        .where(eq(approvalWorkflowSteps.workflowId, request.workflowId))
        .orderBy(approvalWorkflowSteps.stepOrder);

      const currentStepDef = steps.find((s) => s.stepOrder === request.currentStep);
      if (!currentStepDef) continue;

      // Check if any action has been taken for the current step
      const actions = await this.db
        .select()
        .from(approvalRequestActions)
        .where(
          and(
            eq(approvalRequestActions.requestId, request.id),
            eq(approvalRequestActions.stepOrder, request.currentStep),
          ),
        );

      // If action already taken on this step, skip
      if (actions.length > 0) continue;

      // Calculate time since request was created or last updated
      const referenceTime = request.updatedAt || request.createdAt;
      const hoursSinceReference = (Date.now() - new Date(referenceTime).getTime()) / (1000 * 60 * 60);

      const escalationHours = DEFAULT_ESCALATION_HOURS;

      if (hoursSinceReference >= escalationHours) {
        // Send escalation notification to the approver
        const approverId = currentStepDef.approverUserId;
        if (approverId) {
          try {
            await this.notificationService.create({
              tenantId: request.tenantId,
              userId: approverId,
              title: 'Approval Escalation',
              body: `Approval request for ${request.documentType} ${request.documentNumber || request.documentId} has been pending for over ${escalationHours} hours. Please review.`,
              type: 'warning',
              metadata: {
                requestId: request.id,
                documentType: request.documentType,
                documentId: request.documentId,
              },
            });
            escalated++;
          } catch {
            // Skip if notification fails
          }
        }
      }
    }

    this.logger.log(`Escalation check complete: ${escalated} notifications sent`);
  }

  // ─── Source Document Status Updates on Approval Events ───────────────────

  @OnEvent(EVENTS.APPROVAL_COMPLETED)
  async handleApprovalCompleted(payload: {
    tenantId: string;
    documentType: string;
    documentId: string;
  }) {
    try {
      switch (payload.documentType) {
        case 'purchase_order':
          await this.db
            .update(purchaseOrders)
            .set({ status: 'approved', isPendingApproval: false, approvedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(purchaseOrders.id, payload.documentId), eq(purchaseOrders.tenantId, payload.tenantId)));
          break;
        case 'bill':
          await this.db
            .update(bills)
            .set({ status: 'approved', updatedAt: new Date() })
            .where(and(eq(bills.id, payload.documentId), eq(bills.tenantId, payload.tenantId)));
          break;
        case 'expense_claim':
          await this.db
            .update(expenseClaims)
            .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(expenseClaims.id, payload.documentId), eq(expenseClaims.tenantId, payload.tenantId)));
          break;
      }
    } catch (err) {
      this.logger.error(`Failed to update source document on approval completion: ${err}`);
    }
  }

  @OnEvent(EVENTS.APPROVAL_REJECTED)
  async handleApprovalRejected(payload: {
    tenantId: string;
    documentType: string;
    documentId: string;
  }) {
    try {
      switch (payload.documentType) {
        case 'purchase_order':
          await this.db
            .update(purchaseOrders)
            .set({ status: 'cancelled', isPendingApproval: false, updatedAt: new Date() })
            .where(and(eq(purchaseOrders.id, payload.documentId), eq(purchaseOrders.tenantId, payload.tenantId)));
          break;
        case 'bill':
          await this.db
            .update(bills)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(and(eq(bills.id, payload.documentId), eq(bills.tenantId, payload.tenantId)));
          break;
        case 'expense_claim':
          await this.db
            .update(expenseClaims)
            .set({ status: 'rejected', updatedAt: new Date() })
            .where(and(eq(expenseClaims.id, payload.documentId), eq(expenseClaims.tenantId, payload.tenantId)));
          break;
      }
    } catch (err) {
      this.logger.error(`Failed to update source document on approval rejection: ${err}`);
    }
  }
}
