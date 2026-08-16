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
--
-- Guarded, not unconditional: this fixes production's specific history, but a
-- FRESH environment bootstrapped from 0000 never has the old name in the
-- first place -- 0005 creates lead_candidates with the correct
-- "..._tenants_id_fk" name directly, since that migration was generated from
-- scratch rather than inherited from a raw deploy/*.sql script. An
-- unconditional RENAME CONSTRAINT here would fail with "constraint ...
-- does not exist" on every fresh environment (caught by re-running this
-- chain against a clean scratch database before trusting it). Only rename
-- if the old, pre-fix name is actually present.
SET LOCAL lock_timeout = '3s';--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lead_candidates_tenant_id_fkey'
      AND conrelid = 'lead_candidates'::regclass
  ) THEN
    ALTER TABLE "lead_candidates"
      RENAME CONSTRAINT "lead_candidates_tenant_id_fkey"
      TO "lead_candidates_tenant_id_tenants_id_fk";
  END IF;
END $$;
