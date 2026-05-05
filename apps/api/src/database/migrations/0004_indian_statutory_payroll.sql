-- Indian Statutory Payroll: Schema additions
-- Phase 2 of NexusERP Complete Functionality Plan

-- New enums
DO $$ BEGIN
  CREATE TYPE "public"."tax_regime" AS ENUM('old', 'new');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."tax_declaration_section" AS ENUM('80C', '80D', '80E', '80G', '80TTA', '80CCD', '24B', 'HRA', 'LTA', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add statutory fields to employees
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "bank_ifsc_code" varchar(20);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "pan_number" varchar(10);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "uan_number" varchar(12);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "esic_number" varchar(17);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "aadhaar_number" varchar(12);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "tax_regime" "tax_regime" DEFAULT 'new';
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "pf_state" varchar(100);

-- Add attendance + employer contribution fields to payroll_entries
ALTER TABLE "payroll_entries" ADD COLUMN IF NOT EXISTS "employer_epf" numeric(20, 4) DEFAULT '0';
ALTER TABLE "payroll_entries" ADD COLUMN IF NOT EXISTS "employer_esic" numeric(20, 4) DEFAULT '0';
ALTER TABLE "payroll_entries" ADD COLUMN IF NOT EXISTS "working_days" integer;
ALTER TABLE "payroll_entries" ADD COLUMN IF NOT EXISTS "present_days" integer;
ALTER TABLE "payroll_entries" ADD COLUMN IF NOT EXISTS "lop_days" integer DEFAULT 0;

-- Tax declarations table
CREATE TABLE IF NOT EXISTS "tax_declarations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "employee_id" uuid NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "fiscal_year" varchar(10) NOT NULL,
  "section" "tax_declaration_section" NOT NULL,
  "description" text,
  "declared_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
  "proof_submitted" boolean DEFAULT false NOT NULL,
  "approved_amount" numeric(20, 4),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

-- Indexes for tax_declarations
CREATE INDEX IF NOT EXISTS "idx_tax_declarations_employee" ON "tax_declarations" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_tax_declarations_tenant_fiscal" ON "tax_declarations" ("tenant_id", "fiscal_year");
