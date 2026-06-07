-- Increment 2-5 migration: employee lifecycle columns + 6 new HR tables.
-- Idempotent (IF NOT EXISTS) so it is safe to re-run.

-- ── Employee probation / confirmation columns ──────────────────────────
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS probation_end_date date,
  ADD COLUMN IF NOT EXISTS confirmation_date date,
  ADD COLUMN IF NOT EXISTS confirmation_status varchar(20) NOT NULL DEFAULT 'probation';

-- ── Salary revisions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_date date NOT NULL,
  previous_ctc numeric(20,2),
  new_ctc numeric(20,2) NOT NULL,
  revision_percent numeric(6,2),
  reason text,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS salary_revisions_tenant_employee_idx ON salary_revisions(tenant_id, employee_id);

-- ── Attendance regularizations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_regularizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  requested_check_in timestamptz,
  requested_check_out timestamptz,
  requested_status varchar(20) NOT NULL,
  reason text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS attendance_regularizations_tenant_employee_idx ON attendance_regularizations(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS attendance_regularizations_tenant_status_idx ON attendance_regularizations(tenant_id, status);

-- ── Employee loans + repayments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  loan_number varchar(50) NOT NULL,
  type varchar(20) NOT NULL,
  principal_amount numeric(20,2) NOT NULL,
  interest_rate numeric(6,2) NOT NULL DEFAULT '0',
  installments integer NOT NULL DEFAULT 1,
  installments_paid integer NOT NULL DEFAULT 0,
  emi_amount numeric(20,2) NOT NULL,
  outstanding_amount numeric(20,2) NOT NULL,
  reason text,
  status varchar(20) NOT NULL DEFAULT 'pending',
  disbursed_date date,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS employee_loans_tenant_employee_idx ON employee_loans(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS employee_loans_tenant_status_idx ON employee_loans(tenant_id, status);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  loan_id uuid NOT NULL REFERENCES employee_loans(id) ON DELETE CASCADE,
  amount numeric(20,2) NOT NULL,
  paid_date date NOT NULL,
  payroll_entry_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loan_repayments_loan_idx ON loan_repayments(loan_id);

-- ── Exit clearances + final settlements ────────────────────────────────
CREATE TABLE IF NOT EXISTS exit_clearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  resignation_date date,
  last_working_date date,
  reason text,
  status varchar(20) NOT NULL DEFAULT 'in_progress',
  it_cleared boolean NOT NULL DEFAULT false,
  finance_cleared boolean NOT NULL DEFAULT false,
  hr_cleared boolean NOT NULL DEFAULT false,
  admin_cleared boolean NOT NULL DEFAULT false,
  manager_cleared boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS exit_clearances_tenant_employee_idx ON exit_clearances(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS exit_clearances_tenant_status_idx ON exit_clearances(tenant_id, status);

CREATE TABLE IF NOT EXISTS final_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exit_clearance_id uuid NOT NULL REFERENCES exit_clearances(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  gratuity_amount numeric(20,2) NOT NULL DEFAULT '0',
  leave_encashment numeric(20,2) NOT NULL DEFAULT '0',
  pending_salary numeric(20,2) NOT NULL DEFAULT '0',
  bonus_amount numeric(20,2) NOT NULL DEFAULT '0',
  deductions numeric(20,2) NOT NULL DEFAULT '0',
  net_payable numeric(20,2) NOT NULL DEFAULT '0',
  settled_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS final_settlements_tenant_employee_idx ON final_settlements(tenant_id, employee_id);
