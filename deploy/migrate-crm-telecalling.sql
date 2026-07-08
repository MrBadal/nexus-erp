-- CRM telecalling migration: enums + activity/lead columns. Idempotent.

DO $$ BEGIN
  CREATE TYPE call_disposition AS ENUM (
    'connected','no_answer','busy','switched_off','wrong_number',
    'callback','interested','not_interested','do_not_call','converted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE call_direction AS ENUM ('inbound','outbound');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE lead_priority AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- activities: link a call to a lead + disposition/direction/duration
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS disposition call_disposition,
  ADD COLUMN IF NOT EXISTS direction call_direction,
  ADD COLUMN IF NOT EXISTS duration_minutes integer;
CREATE INDEX IF NOT EXISTS activities_lead_id_idx ON activities(lead_id);

-- leads: telecalling workflow fields
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS priority lead_priority NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_disposition call_disposition,
  ADD COLUMN IF NOT EXISTS call_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lost_reason text;
CREATE INDEX IF NOT EXISTS leads_tenant_assigned_idx ON leads(tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS leads_tenant_followup_idx ON leads(tenant_id, next_follow_up_at);

-- Backfill Sales Manager + Telecaller roles for existing tenants
INSERT INTO roles (tenant_id, name, slug, description, is_system, hierarchy_level, permissions)
SELECT t.id, 'Sales Manager', 'sales_manager',
       'CRM — sees all leads, assigns to reps, manages the pipeline', true, 40,
       '["crm:read","crm:write","crm:delete","crm:read_all","crm:assign","activities:read","activities:write"]'::jsonb
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.tenant_id = t.id AND r.slug = 'sales_manager');

INSERT INTO roles (tenant_id, name, slug, description, is_system, hierarchy_level, permissions)
SELECT t.id, 'Telecaller', 'telecaller',
       'Inside sales — works assigned + unassigned leads, logs calls, schedules follow-ups', true, 20,
       '["crm:read","crm:write","activities:read","activities:write"]'::jsonb
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.tenant_id = t.id AND r.slug = 'telecaller');
