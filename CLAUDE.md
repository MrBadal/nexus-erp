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

## Branch State & Deploy Process (verify before trusting either)

- **Production no longer exists.** All GCP resources were deleted and billing unlinked on 2026-10-30 (cost shutdown). To bring it back, follow `docs/ops/redeploy-nexuserp-gcp.md`. Data/secrets were saved to a local, git-excluded `gcp-backups/` folder at the repo root — it is NOT in git.

- **All real work — CRM, HR, RBAC/permissions, finance — happens on `feat/platform-core-finance`, not `main`.** `main` is stale: as of 2026-08-16 it is missing the entire RBAC layer (`permissions.constants.ts`, `tenant-onboarding.service.ts`, `database/seeds/`) and dozens of commits of shipped feature work. Every `file:line` citation in `docs/crm/*.md` is against `feat/platform-core-finance`. If a session starts on a `main`-based branch, fast-forward or rebase onto `feat/platform-core-finance` before doing anything else — do not rebuild this history from `main`.
- **The local checkout can be ahead of `origin/feat/platform-core-finance` on GitHub, and worktrees can hold uncommitted work invisible to the main checkout.** Confirmed 2026-08-16: a local `feat/platform-core-finance` sat 25 commits ahead of `origin` (nothing pushed) until pushed explicitly, and a separate `.claude/worktrees/*` checkout held real, correct changes (a role-permissions consolidation) that existed only as **uncommitted working-tree edits** — same loss-if-reclaimed exposure as the 25 unpushed commits, just one level further hidden. Before trusting "this was already done," check: is it committed, and on which branch/worktree — not just whether the source file on disk looks right.
- **Deploys are manual, not CI-triggered — confirmed via `gcloud builds triggers list`, which returns zero triggers in this GCP project.** There is no `.github/workflows/` and no push-triggered build of any kind. `cloudbuild-api.yaml` / `cloudbuild-web.yaml` only build when someone runs `gcloud builds submit` by hand.
- **`gcloud builds submit` uploads the current working tree, not a git ref.** This means production can be running code that matches **no commit at all** — any uncommitted local change present at submit time ships. **Deploy rule, effective now: only deploy from a clean tree at a known SHA.** Before running `gcloud builds submit`: confirm `git status` is clean (no modified/staged files — untracked files unrelated to the build are fine but should still be noted), record the exact commit SHA being deployed, then submit. Report the SHA alongside any deploy so "what's live" is answerable later without guessing.
- **Code changes that fix a permissions bug only affect *new* rows/tenants going forward.** Already-provisioned tenants keep whatever their DB rows already say. Reaching them needs a paired, idempotent **versioned migration** (`apps/api/src/database/migrations/NNNN_*.sql`, registered in `meta/_journal.json`, applied via `drizzle-kit migrate`) — **not** an ad hoc `deploy/*.sql` script. That mechanism was explicitly retired after `docs/crm/02-SCHEMA-MIGRATION-DESIGN.md` Part A; a `deploy/migrate-*.sql` file appearing again is a policy regression to fix, not a pattern to follow, even though one briefly reappeared this way — see that document for the live status of closing it out.

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
