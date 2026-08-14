CREATE TYPE "public"."call_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."call_disposition" AS ENUM('connected', 'no_answer', 'busy', 'switched_off', 'wrong_number', 'callback', 'interested', 'not_interested', 'do_not_call', 'converted');--> statement-breakpoint
CREATE TYPE "public"."lead_candidate_status" AS ENUM('new', 'imported', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."lead_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."employee_family_relationship" AS ENUM('spouse', 'father', 'mother', 'son', 'daughter', 'sibling', 'other');--> statement-breakpoint
CREATE TYPE "public"."employee_skill_proficiency" AS ENUM('beginner', 'intermediate', 'advanced', 'expert');--> statement-breakpoint
ALTER TYPE "public"."employee_document_type" ADD VALUE 'resume' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."employee_document_type" ADD VALUE 'aadhaar' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."employee_document_type" ADD VALUE 'pan_card' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."employee_document_type" ADD VALUE 'address_proof' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."employee_document_type" ADD VALUE 'experience_letter' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"to_address" varchar(255) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"template" varchar(100),
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"message_id" varchar(255),
	"metadata" jsonb,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smtp_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"host" varchar(255) NOT NULL,
	"port" integer DEFAULT 587 NOT NULL,
	"secure" boolean DEFAULT false NOT NULL,
	"username" varchar(255) NOT NULL,
	"password_encrypted" text NOT NULL,
	"from_email" varchar(255) NOT NULL,
	"from_name" varchar(255),
	"reply_to" varchar(255),
	"enabled" boolean DEFAULT true NOT NULL,
	"last_tested_at" timestamp with time zone,
	"last_test_status" varchar(20),
	"last_test_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "smtp_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "lead_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source" varchar(40) DEFAULT 'mca' NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_name" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"address" text,
	"city" varchar(120),
	"state" varchar(120),
	"cin" varchar(30),
	"company_status" varchar(50),
	"registration_date" varchar(20),
	"classification" varchar(120),
	"status" "lead_candidate_status" DEFAULT 'new' NOT NULL,
	"dedupe_key" varchar(320) NOT NULL,
	"imported_lead_id" uuid,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"degree" varchar(100) NOT NULL,
	"institution" varchar(255) NOT NULL,
	"field_of_study" varchar(100),
	"start_year" integer NOT NULL,
	"end_year" integer,
	"grade" varchar(50),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_experience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"title" varchar(150) NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date,
	"employment_type" varchar(30),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_family" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"relationship" "employee_family_relationship" NOT NULL,
	"date_of_birth" date,
	"nominee" boolean DEFAULT false NOT NULL,
	"nominee_share_percent" integer,
	"aadhaar_number" varchar(12),
	"contact_phone" varchar(20),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"skill" varchar(150) NOT NULL,
	"category" varchar(80),
	"proficiency" "employee_skill_proficiency" DEFAULT 'intermediate' NOT NULL,
	"years_of_experience" numeric(5, 2),
	"certification_name" varchar(200),
	"certification_issuer" varchar(200),
	"certification_date" date,
	"certification_expires_at" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "salary_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"effective_date" date NOT NULL,
	"previous_ctc" numeric(20, 2),
	"new_ctc" numeric(20, 2) NOT NULL,
	"revision_percent" numeric(6, 2),
	"reason" text,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attendance_regularizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"requested_check_in" timestamp with time zone,
	"requested_check_out" timestamp with time zone,
	"requested_status" varchar(20) NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"loan_number" varchar(50) NOT NULL,
	"type" varchar(20) NOT NULL,
	"principal_amount" numeric(20, 2) NOT NULL,
	"interest_rate" numeric(6, 2) DEFAULT '0' NOT NULL,
	"installments" integer DEFAULT 1 NOT NULL,
	"installments_paid" integer DEFAULT 0 NOT NULL,
	"emi_amount" numeric(20, 2) NOT NULL,
	"outstanding_amount" numeric(20, 2) NOT NULL,
	"reason" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"disbursed_date" date,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "loan_repayments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"loan_id" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"paid_date" date NOT NULL,
	"payroll_entry_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exit_clearances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"resignation_date" date,
	"last_working_date" date,
	"reason" text,
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"it_cleared" boolean DEFAULT false NOT NULL,
	"finance_cleared" boolean DEFAULT false NOT NULL,
	"hr_cleared" boolean DEFAULT false NOT NULL,
	"admin_cleared" boolean DEFAULT false NOT NULL,
	"manager_cleared" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "final_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"exit_clearance_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"gratuity_amount" numeric(20, 2) DEFAULT '0' NOT NULL,
	"leave_encashment" numeric(20, 2) DEFAULT '0' NOT NULL,
	"pending_salary" numeric(20, 2) DEFAULT '0' NOT NULL,
	"bonus_amount" numeric(20, 2) DEFAULT '0' NOT NULL,
	"deductions" numeric(20, 2) DEFAULT '0' NOT NULL,
	"net_payable" numeric(20, 2) DEFAULT '0' NOT NULL,
	"settled_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "app_name" varchar(100);--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "brand_color" varchar(7);--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "login_welcome_text" varchar(255);--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "login_bg_url" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "lead_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "disposition" "call_disposition";--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "direction" "call_direction";--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "priority" "lead_priority" DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "next_follow_up_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_disposition" "call_disposition";--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "call_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "lost_reason" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "registry_cin" varchar(30);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "registry_status" varchar(50);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "registry_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "probation_end_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "confirmation_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "confirmation_status" varchar(20) DEFAULT 'probation' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_policies" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_policies" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smtp_settings" ADD CONSTRAINT "smtp_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_candidates" ADD CONSTRAINT "lead_candidates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_experience" ADD CONSTRAINT "employee_experience_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_experience" ADD CONSTRAINT "employee_experience_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_family" ADD CONSTRAINT "employee_family_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_family" ADD CONSTRAINT "employee_family_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_loans" ADD CONSTRAINT "employee_loans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_loans" ADD CONSTRAINT "employee_loans_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_loan_id_employee_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."employee_loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_clearances" ADD CONSTRAINT "exit_clearances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_clearances" ADD CONSTRAINT "exit_clearances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_settlements" ADD CONSTRAINT "final_settlements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_settlements" ADD CONSTRAINT "final_settlements_exit_clearance_id_exit_clearances_id_fk" FOREIGN KEY ("exit_clearance_id") REFERENCES "public"."exit_clearances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_settlements" ADD CONSTRAINT "final_settlements_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_candidates_tenant_dedupe_idx" ON "lead_candidates" USING btree ("tenant_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "lead_candidates_tenant_status_idx" ON "lead_candidates" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "lead_candidates_tenant_cin_idx" ON "lead_candidates" USING btree ("tenant_id","cin");--> statement-breakpoint
CREATE INDEX "employee_education_tenant_employee_idx" ON "employee_education" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "employee_experience_tenant_employee_idx" ON "employee_experience" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "employee_family_tenant_employee_idx" ON "employee_family" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "employee_skills_tenant_employee_idx" ON "employee_skills" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "salary_revisions_tenant_employee_idx" ON "salary_revisions" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "attendance_regularizations_tenant_employee_idx" ON "attendance_regularizations" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "attendance_regularizations_tenant_status_idx" ON "attendance_regularizations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "employee_loans_tenant_employee_idx" ON "employee_loans" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "employee_loans_tenant_status_idx" ON "employee_loans" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "exit_clearances_tenant_employee_idx" ON "exit_clearances" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "exit_clearances_tenant_status_idx" ON "exit_clearances" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "final_settlements_tenant_employee_idx" ON "final_settlements" USING btree ("tenant_id","employee_id");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_item_warehouses_reorder" ON "item_warehouses" USING btree ("tenant_id","item_id","quantity");--> statement-breakpoint
CREATE INDEX "idx_items_default_supplier" ON "items" USING btree ("default_supplier_id") WHERE "items"."default_supplier_id" IS NOT NULL;