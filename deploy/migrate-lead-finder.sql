-- Lead Finder: registry-discovery candidates + lead enrichment columns.
-- Idempotent; safe to run on a live DB with data.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_candidate_status') THEN
    CREATE TYPE lead_candidate_status AS ENUM ('new', 'imported', 'rejected');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS lead_candidates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source            varchar(40) NOT NULL DEFAULT 'mca',
  name              varchar(255) NOT NULL,
  contact_name      varchar(255),
  phone             varchar(50),
  email             varchar(255),
  address           text,
  city              varchar(120),
  state             varchar(120),
  cin               varchar(30),
  company_status    varchar(50),
  registration_date varchar(20),
  classification    varchar(120),
  status            lead_candidate_status NOT NULL DEFAULT 'new',
  dedupe_key        varchar(320) NOT NULL,
  imported_lead_id  uuid,
  raw               jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS lead_candidates_tenant_dedupe_idx ON lead_candidates (tenant_id, dedupe_key);
CREATE INDEX IF NOT EXISTS lead_candidates_tenant_status_idx ON lead_candidates (tenant_id, status);
CREATE INDEX IF NOT EXISTS lead_candidates_tenant_cin_idx    ON lead_candidates (tenant_id, cin);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS registry_cin         varchar(30);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS registry_status      varchar(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS registry_verified_at timestamptz;
