CREATE TYPE "public"."approval_action" AS ENUM('approved', 'rejected', 'returned');--> statement-breakpoint
CREATE TYPE "public"."approval_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."security_event_type" AS ENUM('login_success', 'login_failed', 'password_change', 'mfa_enabled', 'mfa_disabled', 'role_change', 'permission_change', 'account_locked', 'account_unlocked');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('info', 'success', 'warning', 'error', 'invoice', 'payment', 'leave', 'purchase', 'inventory', 'system');--> statement-breakpoint
CREATE TYPE "public"."budget_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."recurring_invoice_frequency" AS ENUM('weekly', 'monthly', 'quarterly', 'half_yearly', 'annually');--> statement-breakpoint
CREATE TYPE "public"."tds_deduction_status" AS ENUM('pending', 'deducted', 'deposited');--> statement-breakpoint
CREATE TYPE "public"."tds_threshold_period" AS ENUM('annual', 'per_transaction');--> statement-breakpoint
CREATE TYPE "public"."material_request_status" AS ENUM('draft', 'submitted', 'approved', 'partially_ordered', 'ordered', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."material_request_type" AS ENUM('purchase', 'transfer', 'manufacture');--> statement-breakpoint
CREATE TYPE "public"."msme_category" AS ENUM('micro', 'small', 'medium');--> statement-breakpoint
CREATE TYPE "public"."valuation_method" AS ENUM('weighted_average', 'fifo', 'manual');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('website', 'referral', 'social_media', 'cold_call', 'trade_show', 'email_campaign', 'advertisement', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost');--> statement-breakpoint
CREATE TYPE "public"."candidate_status" AS ENUM('new', 'screening', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."expense_claim_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."job_opening_status" AS ENUM('draft', 'open', 'on_hold', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('draft', 'sent', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."tax_declaration_section" AS ENUM('80C', '80D', '80E', '80G', '80TTA', '80CCD', '24B', 'HRA', 'LTA', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."tax_regime" AS ENUM('old', 'new');--> statement-breakpoint
CREATE TYPE "public"."employee_document_type" AS ENUM('offer_letter', 'contract', 'id_proof', 'certificate', 'payslip_archive', 'other');--> statement-breakpoint
CREATE TYPE "public"."announcement_audience_scope" AS ENUM('tenant', 'department', 'designation', 'specific');--> statement-breakpoint
CREATE TYPE "public"."holiday_type" AS ENUM('national', 'state', 'company', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."performance_goal_status" AS ENUM('draft', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."review_cycle_status" AS ENUM('draft', 'open', 'review', 'closed');--> statement-breakpoint
CREATE TYPE "public"."performance_review_role" AS ENUM('self', 'manager', 'peer');--> statement-breakpoint
CREATE TYPE "public"."offboarding_checklist_status" AS ENUM('pending', 'in_progress', 'completed', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."offboarding_default_assignee" AS ENUM('hr', 'manager', 'employee', 'it', 'admin');--> statement-breakpoint
CREATE TYPE "public"."offboarding_task_status" AS ENUM('pending', 'done', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."onboarding_checklist_status" AS ENUM('pending', 'in_progress', 'completed', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."onboarding_default_assignee" AS ENUM('hr', 'manager', 'employee', 'it', 'admin');--> statement-breakpoint
CREATE TYPE "public"."onboarding_task_status" AS ENUM('pending', 'done', 'skipped');--> statement-breakpoint
CREATE TABLE "approval_request_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"action" "approval_action" NOT NULL,
	"action_by" uuid NOT NULL,
	"comments" text,
	"action_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"document_id" uuid NOT NULL,
	"document_number" varchar(100),
	"current_step" integer DEFAULT 1 NOT NULL,
	"status" "approval_request_status" DEFAULT 'pending' NOT NULL,
	"requested_by" uuid NOT NULL,
	"amount" numeric(20, 4),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"approver_role_id" uuid,
	"approver_user_id" uuid,
	"description" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "approval_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"threshold_amount" numeric(20, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "legal_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"document_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"held_by" uuid,
	"held_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	"released_by" uuid
);
--> statement-breakpoint
CREATE TABLE "retention_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"retention_days" integer NOT NULL,
	"auto_archive" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"event_type" "security_event_type" NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"read" boolean DEFAULT false NOT NULL,
	"type" "notification_type" DEFAULT 'info' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budgeted_amount" numeric(20, 4) NOT NULL,
	"actual_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"month" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"fiscal_year" varchar(10) NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"status" "budget_status" DEFAULT 'draft' NOT NULL,
	"total_budgeted" numeric(20, 4) DEFAULT '0' NOT NULL,
	"total_actual" numeric(20, 4) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "recurring_invoice_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_invoice_id" uuid NOT NULL,
	"frequency" "recurring_invoice_frequency" NOT NULL,
	"next_run_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_generated" integer DEFAULT 0 NOT NULL,
	"last_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tds_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"tds_section_id" uuid NOT NULL,
	"gross_amount" numeric(20, 4) NOT NULL,
	"tds_rate" numeric(8, 4) NOT NULL,
	"tds_amount" numeric(20, 4) NOT NULL,
	"net_amount" numeric(20, 4) NOT NULL,
	"deduction_date" date NOT NULL,
	"fiscal_year" varchar(9) NOT NULL,
	"status" "tds_deduction_status" DEFAULT 'pending' NOT NULL,
	"certificate_number" varchar(50),
	"deposit_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tds_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"section" varchar(10) NOT NULL,
	"description" varchar(255) NOT NULL,
	"rate_individual" numeric(8, 4) NOT NULL,
	"rate_company" numeric(8, 4) NOT NULL,
	"threshold_limit" numeric(20, 4) DEFAULT '0' NOT NULL,
	"threshold_period" "tds_threshold_period" DEFAULT 'annual' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_tds_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"fiscal_year" varchar(9) NOT NULL,
	"cumulative_purchases" numeric(20, 4) DEFAULT '0' NOT NULL,
	"cumulative_tds" numeric(20, 4) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_request_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_request_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"description" text,
	"quantity" numeric(20, 4) NOT NULL,
	"ordered_qty" numeric(20, 4) DEFAULT '0' NOT NULL,
	"uom" varchar(20) DEFAULT 'Nos' NOT NULL,
	"preferred_supplier_id" uuid,
	"warehouse_id" uuid
);
--> statement-breakpoint
CREATE TABLE "material_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"request_number" varchar(50) NOT NULL,
	"request_type" "material_request_type" DEFAULT 'purchase' NOT NULL,
	"request_date" date NOT NULL,
	"required_date" date,
	"status" "material_request_status" DEFAULT 'draft' NOT NULL,
	"department" varchar(100),
	"purpose" text,
	"notes" text,
	"requested_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_pending_approval" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "po_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"company" varchar(255),
	"job_title" varchar(255),
	"source" "lead_source" DEFAULT 'other' NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"estimated_value" numeric(20, 4),
	"notes" text,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"assigned_to" uuid,
	"converted_contact_id" uuid,
	"converted_deal_id" uuid,
	"converted_at" timestamp with time zone,
	"last_contacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_opening_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"resume_url" text,
	"current_company" varchar(255),
	"current_designation" varchar(255),
	"experience_years" integer,
	"current_salary" numeric(20, 4),
	"expected_salary" numeric(20, 4),
	"source" varchar(100),
	"status" "candidate_status" DEFAULT 'new' NOT NULL,
	"rating" integer,
	"notes" text,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hired_employee_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "expense_claim_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_claim_id" uuid NOT NULL,
	"expense_date" date NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"amount" numeric(20, 4) NOT NULL,
	"receipt" text
);
--> statement-breakpoint
CREATE TABLE "expense_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"claim_number" varchar(50) NOT NULL,
	"employee_id" uuid NOT NULL,
	"claim_date" date NOT NULL,
	"status" "expense_claim_status" DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"approved_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"purpose" text,
	"notes" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"interviewer_ids" text[],
	"round" integer DEFAULT 1 NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration" integer DEFAULT 60,
	"location" varchar(255),
	"meeting_link" varchar(500),
	"interview_round_status" "interview_status" DEFAULT 'scheduled' NOT NULL,
	"feedback" text,
	"rating" integer,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "job_openings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"department_id" uuid,
	"designation_id" uuid,
	"status" "job_opening_status" DEFAULT 'draft' NOT NULL,
	"positions" integer DEFAULT 1 NOT NULL,
	"filled_positions" integer DEFAULT 0 NOT NULL,
	"description" text,
	"requirements" text,
	"location" varchar(255),
	"employment_type" "employment_type" DEFAULT 'full_time',
	"min_salary" numeric(20, 4),
	"max_salary" numeric(20, 4),
	"publish_date" date,
	"closing_date" date,
	"hiring_manager" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "offer_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"job_opening_id" uuid NOT NULL,
	"offer_date" date NOT NULL,
	"joining_date" date,
	"offered_salary" numeric(20, 4) NOT NULL,
	"designation" varchar(255),
	"department" varchar(255),
	"offer_status" "offer_status" DEFAULT 'draft' NOT NULL,
	"expiry_date" date,
	"accepted_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tax_declarations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "employee_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "employee_document_type" DEFAULT 'other' NOT NULL,
	"name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"expires_at" date,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visible_to_employee" boolean DEFAULT true NOT NULL,
	"notes" text,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "announcement_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"audience_scope" "announcement_audience_scope" DEFAULT 'tenant' NOT NULL,
	"audience_ids" uuid[],
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"date" date NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "holiday_type" DEFAULT 'company' NOT NULL,
	"regions" text[],
	"is_recurring" boolean DEFAULT false NOT NULL,
	"year" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "competency_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"competency" varchar(255) NOT NULL,
	"self_rating" integer,
	"manager_rating" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"weight" numeric(5, 2) DEFAULT '0' NOT NULL,
	"target" text,
	"achievement" text,
	"status" "performance_goal_status" DEFAULT 'draft' NOT NULL,
	"self_rating" integer,
	"manager_rating" integer,
	"manager_comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kra_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"designation_id" uuid,
	"name" varchar(255) NOT NULL,
	"kras" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "review_cycle_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"reviewer_id" uuid,
	"role" "performance_review_role" NOT NULL,
	"responses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"overall_rating" numeric(4, 2),
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offboarding_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"template_id" uuid,
	"status" "offboarding_checklist_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "offboarding_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checklist_id" uuid NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"assigned_to" uuid,
	"due_date" date,
	"status" "offboarding_task_status" DEFAULT 'pending' NOT NULL,
	"completed_by" uuid,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offboarding_template_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"default_assignee" "offboarding_default_assignee" DEFAULT 'hr' NOT NULL,
	"due_days" integer DEFAULT 0 NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offboarding_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"designation_id" uuid,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "onboarding_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"template_id" uuid,
	"status" "onboarding_checklist_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "onboarding_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checklist_id" uuid NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"assigned_to" uuid,
	"due_date" date,
	"status" "onboarding_task_status" DEFAULT 'pending' NOT NULL,
	"completed_by" uuid,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_template_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"default_assignee" "onboarding_default_assignee" DEFAULT 'hr' NOT NULL,
	"due_days" integer DEFAULT 0 NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"designation_id" uuid,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "asset_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"returned_at" timestamp with time zone,
	"condition_at_assign" varchar(50),
	"condition_at_return" varchar(50),
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"grace_minutes" integer DEFAULT 15 NOT NULL,
	"late_threshold_minutes" integer DEFAULT 30 NOT NULL,
	"deduction_per_instance" numeric(20, 4) DEFAULT '0' NOT NULL,
	"monthly_tolerance_count" integer DEFAULT 3 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"shift_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(20) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"weekend_days" integer[] DEFAULT '{0,6}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "gratuity_provisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"fiscal_year" varchar(10) NOT NULL,
	"last_basic" numeric(20, 4) DEFAULT '0' NOT NULL,
	"completed_years" numeric(6, 2) DEFAULT '0' NOT NULL,
	"gratuity_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"provided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "currency_code" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "bank_accounts" ALTER COLUMN "currency_code" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "bills" ALTER COLUMN "currency_code" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "currency_code" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "journal_entries" ALTER COLUMN "currency_code" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "currency_code" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "currency" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "currency" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "quotations" ALTER COLUMN "currency" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "sales_orders" ALTER COLUMN "currency" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "employee_id" uuid;--> statement-breakpoint
ALTER TABLE "bill_lines" ADD COLUMN "rcm_applicable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bill_lines" ADD COLUMN "itc_eligible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "bill_lines" ADD COLUMN "itc_block_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "tds_section_id" uuid;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "tds_rate" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "tds_amount" numeric(20, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "rcm_applicable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "item_warehouses" ADD COLUMN "valuation_rate" numeric(20, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "valuation_method" "valuation_method" DEFAULT 'weighted_average';--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "default_supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "bank_ifsc_code" varchar(20);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "pan_number" varchar(10);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "uan_number" varchar(12);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "esic_number" varchar(17);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "aadhaar_number" varchar(12);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "tax_regime" "tax_regime" DEFAULT 'new';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "pf_state" varchar(100);--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "employer_epf" numeric(20, 4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "employer_esic" numeric(20, 4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "working_days" integer;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "present_days" integer;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "lop_days" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "amended_from_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "amendment_reason" text;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "advance_amount" numeric(20, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "advance_percentage" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "advance_paid" numeric(20, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "is_pending_approval" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "pan_number" varchar(10);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "gst_number" varchar(15);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "msme_registered" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "msme_category" "msme_category";--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "msme_number" varchar(30);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "bank_account_name" varchar(255);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "bank_account_number" varchar(30);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "bank_ifsc_code" varchar(11);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "bank_name" varchar(255);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "bank_branch" varchar(255);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "tds_applicable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "default_tds_section_id" uuid;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "sla_id" uuid;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "first_response_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "resolution_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "sla_breached" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "construction_contracts" ADD COLUMN "advance_recovery_percent" numeric(5, 2) DEFAULT '10.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "ra_bills" ADD COLUMN "advance_adjusted" numeric(20, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "approval_request_actions" ADD CONSTRAINT "approval_request_actions_request_id_approval_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."approval_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_workflow_id_approval_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_steps" ADD CONSTRAINT "approval_workflow_steps_workflow_id_approval_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_held_by_users_id_fk" FOREIGN KEY ("held_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_released_by_users_id_fk" FOREIGN KEY ("released_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoice_templates" ADD CONSTRAINT "recurring_invoice_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tds_deductions" ADD CONSTRAINT "tds_deductions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tds_deductions" ADD CONSTRAINT "tds_deductions_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tds_sections" ADD CONSTRAINT "tds_sections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_tds_ledger" ADD CONSTRAINT "vendor_tds_ledger_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_request_lines" ADD CONSTRAINT "material_request_lines_material_request_id_material_requests_id_fk" FOREIGN KEY ("material_request_id") REFERENCES "public"."material_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_request_lines" ADD CONSTRAINT "material_request_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_request_lines" ADD CONSTRAINT "material_request_lines_preferred_supplier_id_suppliers_id_fk" FOREIGN KEY ("preferred_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_request_lines" ADD CONSTRAINT "material_request_lines_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_amendments" ADD CONSTRAINT "po_amendments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_amendments" ADD CONSTRAINT "po_amendments_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_amendments" ADD CONSTRAINT "po_amendments_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_job_opening_id_job_openings_id_fk" FOREIGN KEY ("job_opening_id") REFERENCES "public"."job_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claim_lines" ADD CONSTRAINT "expense_claim_lines_expense_claim_id_expense_claims_id_fk" FOREIGN KEY ("expense_claim_id") REFERENCES "public"."expense_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_designation_id_designations_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_hiring_manager_users_id_fk" FOREIGN KEY ("hiring_manager") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letters" ADD CONSTRAINT "offer_letters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letters" ADD CONSTRAINT "offer_letters_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letters" ADD CONSTRAINT "offer_letters_job_opening_id_job_openings_id_fk" FOREIGN KEY ("job_opening_id") REFERENCES "public"."job_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_declarations" ADD CONSTRAINT "tax_declarations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_declarations" ADD CONSTRAINT "tax_declarations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_ratings" ADD CONSTRAINT "competency_ratings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_ratings" ADD CONSTRAINT "competency_ratings_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_ratings" ADD CONSTRAINT "competency_ratings_cycle_id_review_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."review_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_cycle_id_review_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."review_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kra_templates" ADD CONSTRAINT "kra_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kra_templates" ADD CONSTRAINT "kra_templates_designation_id_designations_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_cycles" ADD CONSTRAINT "review_cycles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_cycle_id_review_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."review_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_reviewer_id_employees_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_checklists" ADD CONSTRAINT "offboarding_checklists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_checklists" ADD CONSTRAINT "offboarding_checklists_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_checklists" ADD CONSTRAINT "offboarding_checklists_template_id_offboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."offboarding_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_tasks" ADD CONSTRAINT "offboarding_tasks_checklist_id_offboarding_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."offboarding_checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_tasks" ADD CONSTRAINT "offboarding_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_tasks" ADD CONSTRAINT "offboarding_tasks_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_template_tasks" ADD CONSTRAINT "offboarding_template_tasks_template_id_offboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."offboarding_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_templates" ADD CONSTRAINT "offboarding_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_templates" ADD CONSTRAINT "offboarding_templates_designation_id_designations_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_checklists" ADD CONSTRAINT "onboarding_checklists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_checklists" ADD CONSTRAINT "onboarding_checklists_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_checklists" ADD CONSTRAINT "onboarding_checklists_template_id_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."onboarding_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_checklist_id_onboarding_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."onboarding_checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_template_tasks" ADD CONSTRAINT "onboarding_template_tasks_template_id_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."onboarding_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_templates" ADD CONSTRAINT "onboarding_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_templates" ADD CONSTRAINT "onboarding_templates_designation_id_designations_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_policies" ADD CONSTRAINT "attendance_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gratuity_provisions" ADD CONSTRAINT "gratuity_provisions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gratuity_provisions" ADD CONSTRAINT "gratuity_provisions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rec_invoice_tpl_tenant_idx" ON "recurring_invoice_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "rec_invoice_tpl_next_run_idx" ON "recurring_invoice_templates" USING btree ("tenant_id","next_run_date");--> statement-breakpoint
CREATE INDEX "tds_deductions_tenant_id_idx" ON "tds_deductions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tds_deductions_bill_id_idx" ON "tds_deductions" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "tds_deductions_supplier_fy_idx" ON "tds_deductions" USING btree ("tenant_id","supplier_id","fiscal_year");--> statement-breakpoint
CREATE INDEX "tds_sections_tenant_id_idx" ON "tds_sections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tds_sections_tenant_section_idx" ON "tds_sections" USING btree ("tenant_id","section");--> statement-breakpoint
CREATE INDEX "vendor_tds_ledger_tenant_supplier_fy_idx" ON "vendor_tds_ledger" USING btree ("tenant_id","supplier_id","fiscal_year");--> statement-breakpoint
CREATE INDEX "po_amendments_po_id_idx" ON "po_amendments" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "employee_documents_tenant_employee_idx" ON "employee_documents" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "employee_documents_tenant_type_idx" ON "employee_documents" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "announcement_reads_unique_idx" ON "announcement_reads" USING btree ("announcement_id","employee_id");--> statement-breakpoint
CREATE INDEX "announcement_reads_employee_idx" ON "announcement_reads" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "announcements_tenant_idx" ON "announcements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "announcements_published_idx" ON "announcements" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "holidays_tenant_year_idx" ON "holidays" USING btree ("tenant_id","year");--> statement-breakpoint
CREATE INDEX "holidays_tenant_date_idx" ON "holidays" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "competency_ratings_tenant_id_idx" ON "competency_ratings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "competency_ratings_cycle_emp_idx" ON "competency_ratings" USING btree ("tenant_id","cycle_id","employee_id");--> statement-breakpoint
CREATE INDEX "performance_goals_tenant_id_idx" ON "performance_goals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "performance_goals_employee_idx" ON "performance_goals" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "performance_goals_cycle_idx" ON "performance_goals" USING btree ("tenant_id","cycle_id");--> statement-breakpoint
CREATE INDEX "kra_templates_tenant_id_idx" ON "kra_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "kra_templates_designation_idx" ON "kra_templates" USING btree ("tenant_id","designation_id");--> statement-breakpoint
CREATE INDEX "review_cycles_tenant_id_idx" ON "review_cycles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "review_cycles_status_idx" ON "review_cycles" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "review_responses_tenant_id_idx" ON "review_responses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "review_responses_cycle_emp_idx" ON "review_responses" USING btree ("tenant_id","cycle_id","employee_id");--> statement-breakpoint
CREATE INDEX "offboarding_checklists_tenant_status_idx" ON "offboarding_checklists" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "offboarding_checklists_employee_idx" ON "offboarding_checklists" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "offboarding_tasks_checklist_idx" ON "offboarding_tasks" USING btree ("checklist_id");--> statement-breakpoint
CREATE INDEX "offboarding_templates_tenant_id_idx" ON "offboarding_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "onboarding_checklists_tenant_status_idx" ON "onboarding_checklists" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "onboarding_checklists_employee_idx" ON "onboarding_checklists" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "onboarding_tasks_checklist_idx" ON "onboarding_tasks" USING btree ("checklist_id");--> statement-breakpoint
CREATE INDEX "onboarding_templates_tenant_id_idx" ON "onboarding_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "asset_assignments_tenant_asset_idx" ON "asset_assignments" USING btree ("tenant_id","asset_id");--> statement-breakpoint
CREATE INDEX "asset_assignments_tenant_employee_idx" ON "asset_assignments" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "attendance_policies_tenant_id_idx" ON "attendance_policies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "shift_assignments_tenant_employee_idx" ON "shift_assignments" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "shift_assignments_shift_idx" ON "shift_assignments" USING btree ("shift_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shifts_tenant_code_unique_idx" ON "shifts" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "shifts_tenant_id_idx" ON "shifts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "gratuity_provisions_tenant_id_idx" ON "gratuity_provisions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "gratuity_provisions_tenant_employee_fy_idx" ON "gratuity_provisions" USING btree ("tenant_id","employee_id","fiscal_year");--> statement-breakpoint
CREATE INDEX "accounts_tenant_id_idx" ON "accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "accounts_tenant_type_idx" ON "accounts" USING btree ("tenant_id","account_type");--> statement-breakpoint
CREATE INDEX "accounts_tenant_code_idx" ON "accounts" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "invoices_tenant_id_idx" ON "invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invoices_tenant_status_idx" ON "invoices" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "invoices_tenant_due_date_idx" ON "invoices" USING btree ("tenant_id","due_date");--> statement-breakpoint
CREATE INDEX "invoices_customer_id_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "journal_entries_tenant_id_idx" ON "journal_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "journal_entries_tenant_status_idx" ON "journal_entries" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "journal_entries_tenant_date_idx" ON "journal_entries" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "journal_lines_tenant_id_idx" ON "journal_lines" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "journal_lines_entry_id_idx" ON "journal_lines" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "journal_lines_tenant_account_idx" ON "journal_lines" USING btree ("tenant_id","account_id");--> statement-breakpoint
CREATE INDEX "payments_tenant_id_idx" ON "payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payments_tenant_status_idx" ON "payments" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "payments_tenant_date_idx" ON "payments" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "item_warehouses_tenant_id_item_id_idx" ON "item_warehouses" USING btree ("tenant_id","item_id");--> statement-breakpoint
CREATE INDEX "items_tenant_id_idx" ON "items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "items_tenant_id_code_idx" ON "items" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "stock_movements_tenant_id_created_at_idx" ON "stock_movements" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "contacts_tenant_id_idx" ON "contacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contacts_tenant_id_type_idx" ON "contacts" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "deals_tenant_id_idx" ON "deals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "deals_tenant_id_stage_idx" ON "deals" USING btree ("tenant_id","stage");--> statement-breakpoint
CREATE INDEX "attendance_records_tenant_id_date_idx" ON "attendance_records" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "employees_tenant_id_idx" ON "employees" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "employees_tenant_id_status_idx" ON "employees" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "leave_applications_tenant_id_status_idx" ON "leave_applications" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "customers_tenant_id_idx" ON "customers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sales_orders_tenant_id_idx" ON "sales_orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sales_orders_tenant_id_status_idx" ON "sales_orders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "purchase_orders_tenant_id_idx" ON "purchase_orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_tenant_id_status_idx" ON "purchase_orders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "suppliers_tenant_pan_idx" ON "suppliers" USING btree ("tenant_id","pan_number");--> statement-breakpoint
CREATE INDEX "suppliers_tenant_gst_idx" ON "suppliers" USING btree ("tenant_id","gst_number");