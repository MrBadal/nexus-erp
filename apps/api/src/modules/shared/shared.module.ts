import { Global, Module } from '@nestjs/common';
import { NumberSeriesService } from './number-series.service.js';
import { TenantOnboardingService } from './tenant-onboarding.service.js';
import { TimesheetBillingService } from './timesheet-billing.service.js';
import { PdfService } from './pdf.service.js';
import { NotificationService } from './notification.service.js';
import { NotificationController } from './notification.controller.js';
import { NumberSeriesController } from './number-series.controller.js';
import { ApprovalWorkflowService } from './approval-workflow.service.js';
import { ApprovalWorkflowController } from './approval-workflow.controller.js';
import { ImportExportService } from './import-export.service.js';
import { ImportExportController } from './import-export.controller.js';
import { RetentionService } from './retention.service.js';
import { RetentionController } from './retention.controller.js';
import { EmailService } from './email.service.js';
import { EmailListener } from './email.listener.js';
import { SmtpSettingsController } from './smtp-settings.controller.js';

@Global()
@Module({
  controllers: [
    NotificationController,
    NumberSeriesController,
    ApprovalWorkflowController,
    ImportExportController,
    RetentionController,
    SmtpSettingsController,
  ],
  providers: [
    NumberSeriesService,
    TenantOnboardingService,
    TimesheetBillingService,
    PdfService,
    NotificationService,
    ApprovalWorkflowService,
    ImportExportService,
    RetentionService,
    EmailService,
    EmailListener,
  ],
  exports: [
    NumberSeriesService,
    TenantOnboardingService,
    TimesheetBillingService,
    PdfService,
    NotificationService,
    ApprovalWorkflowService,
    ImportExportService,
    RetentionService,
    EmailService,
  ],
})
export class SharedModule {}
