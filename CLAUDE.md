# NexusERP - AI-Powered ERP System

## Project Overview

NexusERP is a multi-tenant, AI-powered Enterprise Resource Planning system built as a monorepo with Turborepo and pnpm workspaces.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: NestJS (TypeScript), Drizzle ORM, PostgreSQL 16
- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS, Shadcn/ui
- **Search**: MeiliSearch is a dependency, but list endpoints currently query via SQL `LIKE`, not MeiliSearch
- **Cache/Throttling**: Redis 7. BullMQ is registered on top of it (`modules/shared/queue.module.ts`) but has no producers/workers yet — actual recurring jobs run in-process via `@nestjs/schedule` `@Cron` (`modules/shared/scheduled-jobs.service.ts`), not a real queue
- **Object Storage**: Google Cloud Storage (`@google-cloud/storage`, `modules/files/storage.service.ts`) — not MinIO
- **AI**: Anthropic Claude API
- **Auth**: JWT (access + refresh tokens), bcrypt, optional MFA

## Monorepo Structure

```
apps/
  api/          # NestJS backend API
  web/          # Next.js frontend
packages/
  shared-types/ # TypeScript interfaces and enums shared across apps
  utils/        # Shared utility functions (validation, formatting, financial)
  config/       # Shared constants and configuration values
```

## Code Conventions

- **TypeScript strict mode** everywhere -- no `any` types
- **Drizzle ORM** for all database queries and schema definitions
- **NestJS module pattern**: each domain is a module with controller, service, and DTOs
- **Shadcn/ui** components for all frontend UI
- **File naming**: kebab-case for files (e.g., `journal-entry.service.ts`)
- **Classes/Components**: PascalCase (e.g., `JournalEntryService`, `InvoiceForm`)
- **Functions/Variables**: camelCase (e.g., `calculateTax`, `invoiceTotal`)

## API Patterns

- RESTful endpoints under `/api/v1/` prefix
- Error responses are normalized by the global `HttpExceptionFilter` to the `ApiError` shape from `@nexus-erp/shared-types`: `{ statusCode, error, message, timestamp, path }`
- **Not yet true, tracked as a Phase 1a fix**: the `ApiResponse<T>`/`PaginatedResponse<T>` success envelope and the `?page=&limit=&sort_by=&sort_order=` pagination params are declared in `@nexus-erp/shared-types` but are **not actually used anywhere in `apps/api`**. The real current convention is `?limit=&offset=&search=` with a hardcoded per-endpoint sort order and a bare array/object response (no envelope, no total count). Follow the *real* convention (`limit`/`offset`) for now; do not assume `page`/`sort_by` are wired up.
- Search via `?search=term` (SQL `LIKE`, not MeiliSearch — see Tech Stack)

## Critical Rules

- Every controller method needs `@RequirePermissions` decorator for RBAC enforcement — **but note the guards themselves (`JwtAuthGuard`, `PermissionsGuard`) are applied per-controller via `@UseGuards`, not globally**. A controller that forgets the decorator is unauthenticated/unauthorized; there is no backstop.
- Every tenant-scoped database table must have a `tenant_id` column, and every query must filter on it. **There is currently no Postgres Row-Level Security anywhere in the database — this is enforced only by each service manually adding `eq(table.tenantId, tenantId)` to its queries.** Treat this as the top platform risk, not a solved problem: a single missing filter leaks cross-tenant data. See `docs/crm/00-DISCOVERY.md` §5 (R1) for the planned RLS rollout.
- Financial transactions must always create balanced journal entries (total debits == total credits)
- Monetary amounts are stored as `decimal(20, 4)` Drizzle columns (not integer cents, not fixed 2-decimal) — match this precision/scale for any new money column
- Soft deletes everywhere -- use `deleted_at` column, never hard delete (a few join/staging tables are legitimate exceptions, e.g. `contact_group_members`)

## Getting Started

```bash
# Start infrastructure services
docker-compose up -d

# Install dependencies
pnpm install

# Run development servers
pnpm dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. See the example file for all required variables.
