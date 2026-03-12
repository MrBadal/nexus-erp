# NexusERP - AI-Powered ERP System

## Project Overview

NexusERP is a multi-tenant, AI-powered Enterprise Resource Planning system built as a monorepo with Turborepo and pnpm workspaces.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: NestJS (TypeScript), Drizzle ORM, PostgreSQL 16
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Shadcn/ui
- **Search**: MeiliSearch
- **Cache/Queue**: Redis 7
- **Object Storage**: MinIO (S3-compatible)
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
- Consistent error responses using `ApiError` type from `@nexus-erp/shared-types`
- Pagination via `?page=1&limit=50` query params
- Sorting via `?sort_by=created_at&sort_order=desc`
- Search via `?search=term`
- All responses wrapped in `ApiResponse<T>` or `PaginatedResponse<T>`

## Critical Rules

- Every controller method needs `@RequirePermissions` decorator for RBAC enforcement
- Every tenant-scoped database table must have a `tenant_id` column with RLS (Row-Level Security) policy
- Financial transactions must always create balanced journal entries (total debits == total credits)
- All monetary amounts stored as integers (cents) or with exactly 2 decimal precision
- Soft deletes everywhere -- use `deleted_at` column, never hard delete

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
