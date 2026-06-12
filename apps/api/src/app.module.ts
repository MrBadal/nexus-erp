import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { appConfig } from './config/app.config.js';
import { databaseConfig } from './config/database.config.js';
import { DatabaseModule } from './database/database.module.js';
import { TenantMiddleware } from './common/middleware/tenant.middleware.js';

// Platform / core
import { AuthModule } from './modules/auth/auth.module.js';
import { TenantModule } from './modules/tenant/tenant.module.js';
import { UserModule } from './modules/user/user.module.js';
import { RoleModule } from './modules/role/role.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { SharedModule } from './modules/shared/shared.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { IntegrationModule } from './modules/integration/integration.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { FilesModule } from './modules/files/files.module.js';
import { HealthModule } from './modules/health/health.module.js';

// Finance
import { FinanceModule } from './modules/finance/finance.module.js';

// Buying / Selling / Inventory
import { BuyingModule } from './modules/buying/buying.module.js';
import { SellingModule } from './modules/selling/selling.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';

// Operations
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module.js';
import { QualityModule } from './modules/quality/quality.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { AssetsModule } from './modules/assets/assets.module.js';

// CRM, Helpdesk, Construction
import { CrmModule } from './modules/crm/crm.module.js';
import { HelpdeskModule } from './modules/helpdesk/helpdesk.module.js';
import { ConstructionModule } from './modules/construction/construction.module.js';

// HR core
import { HrModule } from './modules/hr/hr.module.js';

// HR Phase-3 modules (each registered directly because hr.module.ts has not yet absorbed them)
import { ShiftModule } from './modules/hr/shift/shift.module.js';
import { AttendancePolicyModule } from './modules/hr/attendance-policy/attendance-policy.module.js';
import { OnboardingModule } from './modules/hr/onboarding/onboarding.module.js';
import { OffboardingModule } from './modules/hr/offboarding/offboarding.module.js';
import { HrDashboardModule } from './modules/hr/hr-dashboard/hr-dashboard.module.js';
import { EmployeeDocumentModule } from './modules/hr/employee-document/employee-document.module.js';
import { AnnouncementModule } from './modules/hr/announcement/announcement.module.js';
import { HolidayModule } from './modules/hr/holiday/holiday.module.js';
import { PerformanceModule } from './modules/hr/performance/performance.module.js';
import { Form16Module } from './modules/hr/form-16/form-16.module.js';
import { GratuityModule } from './modules/hr/gratuity/gratuity.module.js';
import { StatutoryReportsModule } from './modules/hr/statutory-reports/statutory-reports.module.js';
import { EmployeeEducationModule } from './modules/hr/employee-education/employee-education.module.js';
import { EmployeeExperienceModule } from './modules/hr/employee-experience/employee-experience.module.js';
import { EmployeeFamilyModule } from './modules/hr/employee-family/employee-family.module.js';
import { EmployeeSkillModule } from './modules/hr/employee-skill/employee-skill.module.js';
import { SalaryRevisionModule } from './modules/hr/salary-revision/salary-revision.module.js';
import { AttendanceRegularizationModule } from './modules/hr/attendance-regularization/attendance-regularization.module.js';
import { LoanModule } from './modules/hr/loan/loan.module.js';
import { ExitClearanceModule } from './modules/hr/exit-clearance/exit-clearance.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // Global rate limit: 300 req/min per IP; auth routes carry stricter
    // per-route @Throttle limits (5/min login, 3/min forgot-password).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    DatabaseModule,

    // Platform
    AuthModule,
    TenantModule,
    UserModule,
    RoleModule,
    AuditModule,
    SharedModule,
    SettingsModule,
    IntegrationModule,
    DashboardModule,
    FilesModule,
    HealthModule,

    // Finance
    FinanceModule,

    // P2P & O2C
    BuyingModule,
    SellingModule,
    InventoryModule,

    // Operations
    ManufacturingModule,
    QualityModule,
    ProjectsModule,
    AssetsModule,

    // CRM / Helpdesk / Construction
    CrmModule,
    HelpdeskModule,
    ConstructionModule,

    // HR core
    HrModule,

    // HR Phase-3
    ShiftModule,
    AttendancePolicyModule,
    OnboardingModule,
    OffboardingModule,
    HrDashboardModule,
    EmployeeDocumentModule,
    AnnouncementModule,
    HolidayModule,
    PerformanceModule,
    Form16Module,
    GratuityModule,
    StatutoryReportsModule,
    EmployeeEducationModule,
    EmployeeExperienceModule,
    EmployeeFamilyModule,
    EmployeeSkillModule,
    SalaryRevisionModule,
    AttendanceRegularizationModule,
    LoanModule,
    ExitClearanceModule,
  ],
  providers: [
    // Enforces the global throttle + per-route @Throttle overrides.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
