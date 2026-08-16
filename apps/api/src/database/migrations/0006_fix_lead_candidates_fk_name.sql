-- Corrective migration: align the lead_candidates.tenant_id FK constraint name
-- with what the drizzle-kit-generated chain expects. Production's lead_candidates
-- table was originally created via a raw deploy/*.sql script (outside the ORM's
-- migration chain), which left the FK on Postgres's own default auto-generated
-- name instead of drizzle-kit's naming convention. Confirmed via a full
-- order-independent structural diff (columns, indexes, constraints) against a
-- scratch database built from 0000-0005: this rename is the ONLY difference
-- between production's actual schema and what the migration chain produces.
--
-- Catalog-only rename: no table rewrite, no row lock, near-instant. The
-- lock_timeout guard exists because even a catalog-only ALTER TABLE still
-- needs a brief ACCESS EXCLUSIVE lock, which would otherwise queue behind
-- (and block everything behind) any long-running query already touching this
-- table -- fail fast and retry rather than stall unrelated traffic.
SET LOCAL lock_timeout = '3s';--> statement-breakpoint
ALTER TABLE "lead_candidates"
  RENAME CONSTRAINT "lead_candidates_tenant_id_fkey"
  TO "lead_candidates_tenant_id_tenants_id_fk";
