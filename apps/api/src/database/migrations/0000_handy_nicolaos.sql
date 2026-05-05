CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'trial', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'locked', 'pending_verification');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'approve', 'reject', 'post', 'reverse', 'send', 'void', 'archive');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('asset', 'liability', 'equity', 'revenue', 'expense', 'contra_asset', 'contra_liability', 'contra_equity', 'contra_revenue', 'contra_expense');--> statement-breakpoint
CREATE TYPE "public"."bank_import_source" AS ENUM('csv', 'ofx', 'plaid', 'manual');--> statement-breakpoint
CREATE TYPE "public"."bank_matched_by" AS ENUM('manual', 'auto', 'ai');--> statement-breakpoint
CREATE TYPE "public"."bank_transaction_status" AS ENUM('unmatched', 'matched', 'reconciled', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."bank_transaction_type" AS ENUM('deposit', 'withdrawal', 'transfer', 'fee', 'interest', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."bill_status" AS ENUM('draft', 'received', 'approved', 'partially_paid', 'paid', 'overdue', 'cancelled', 'void');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."exchange_rate_source" AS ENUM('manual', 'api', 'central_bank');--> statement-breakpoint
CREATE TYPE "public"."financial_statement" AS ENUM('balance_sheet', 'income_statement');--> statement-breakpoint
CREATE TYPE "public"."fiscal_period_status" AS ENUM('open', 'closed', 'locked');--> statement-breakpoint
CREATE TYPE "public"."fiscal_period_type" AS ENUM('month', 'quarter', 'year');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled', 'void');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('standard', 'credit_note', 'debit_note', 'proforma');--> statement-breakpoint
CREATE TYPE "public"."journal_source_type" AS ENUM('manual', 'invoice', 'bill', 'payment', 'bank_reconciliation', 'adjustment', 'closing', 'opening');--> statement-breakpoint
CREATE TYPE "public"."journal_status" AS ENUM('draft', 'posted', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."normal_balance" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank_transfer', 'check', 'credit_card', 'debit_card', 'online', 'mobile_money', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('draft', 'confirmed', 'reconciled', 'void');--> statement-breakpoint
CREATE TYPE "public"."payment_terms" AS ENUM('due_on_receipt', 'net_7', 'net_10', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'custom');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('received', 'made');--> statement-breakpoint
CREATE TYPE "public"."tax_scope" AS ENUM('sales', 'purchase', 'both');--> statement-breakpoint
CREATE TYPE "public"."tax_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."three_way_match_status" AS ENUM('pending', 'partial_match', 'matched', 'mismatch', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('stock', 'service', 'consumable');--> statement-breakpoint
CREATE TYPE "public"."stock_adjustment_status" AS ENUM('draft', 'submitted', 'approved');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('receipt', 'issue', 'transfer', 'adjustment', 'return');--> statement-breakpoint
CREATE TYPE "public"."unit_of_measure" AS ENUM('each', 'kg', 'g', 'lb', 'oz', 'litre', 'ml', 'gallon', 'box', 'pack', 'carton', 'pallet', 'metre', 'cm', 'inch', 'foot', 'sq_metre', 'sq_foot', 'cubic_metre', 'pair', 'dozen', 'set', 'hour', 'day', 'unit');--> statement-breakpoint
CREATE TYPE "public"."activity_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."activity_status" AS ENUM('pending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('call', 'email', 'meeting', 'task', 'note');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('email', 'social', 'event', 'referral');--> statement-breakpoint
CREATE TYPE "public"."contact_source" AS ENUM('website', 'referral', 'cold_call', 'trade_show', 'social_media', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."contact_type" AS ENUM('customer', 'vendor', 'lead', 'both');--> statement-breakpoint
CREATE TYPE "public"."deal_stage_value" AS ENUM('lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'half_day', 'late', 'on_leave');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'inactive', 'terminated', 'on_leave');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'intern');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."leave_application_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."marital_status" AS ENUM('single', 'married', 'divorced', 'widowed');--> statement-breakpoint
CREATE TYPE "public"."payroll_payment_method" AS ENUM('bank_transfer', 'check', 'cash');--> statement-breakpoint
CREATE TYPE "public"."payroll_status" AS ENUM('draft', 'submitted', 'approved', 'paid');--> statement-breakpoint
CREATE TYPE "public"."salary_component_type" AS ENUM('earning', 'deduction');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('active', 'inactive', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('individual', 'company');--> statement-breakpoint
CREATE TYPE "public"."delivery_note_status" AS ENUM('draft', 'dispatched', 'delivered', 'returned');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'sent', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."sales_order_status" AS ENUM('draft', 'confirmed', 'delivered', 'invoiced', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'submitted', 'approved', 'received', 'partially_received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."purchase_receipt_status" AS ENUM('draft', 'submitted', 'completed');--> statement-breakpoint
CREATE TYPE "public"."supplier_quotation_status" AS ENUM('draft', 'received', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."bom_status" AS ENUM('draft', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."work_order_operation_status" AS ENUM('pending', 'in_progress', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."work_order_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."work_order_status" AS ENUM('draft', 'not_started', 'in_progress', 'completed', 'stopped', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."project_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."project_task_status" AS ENUM('open', 'working', 'pending_review', 'completed', 'cancelled', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."project_update_status" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."timesheet_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('draft', 'submitted', 'in_use', 'maintenance', 'disposed', 'scrapped');--> statement-breakpoint
CREATE TYPE "public"."depreciation_method" AS ENUM('straight_line', 'declining_balance', 'double_declining', 'units_of_production');--> statement-breakpoint
CREATE TYPE "public"."maintenance_status" AS ENUM('planned', 'in_progress', 'completed', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."maintenance_type" AS ENUM('preventive', 'corrective', 'calibration', 'inspection');--> statement-breakpoint
CREATE TYPE "public"."movement_status" AS ENUM('pending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."inspection_reading_status" AS ENUM('accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."inspection_reference_type" AS ENUM('incoming', 'in_process', 'outgoing');--> statement-breakpoint
CREATE TYPE "public"."inspection_status" AS ENUM('draft', 'in_progress', 'accepted', 'rejected', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."ncr_severity" AS ENUM('minor', 'major', 'critical');--> statement-breakpoint
CREATE TYPE "public"."ncr_status" AS ENUM('open', 'investigation', 'corrective_action', 'closed', 'void');--> statement-breakpoint
CREATE TYPE "public"."kb_article_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_source" AS ENUM('email', 'phone', 'web', 'chat');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'replied', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."boq_item_type" AS ENUM('civil', 'structural', 'mechanical', 'electrical', 'plumbing', 'finishing', 'external', 'provisional_sum', 'prime_cost');--> statement-breakpoint
CREATE TYPE "public"."construction_contract_status" AS ENUM('draft', 'tendering', 'awarded', 'active', 'completed', 'terminated', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."construction_contract_type" AS ENUM('lump_sum', 'item_rate', 'cost_plus', 'epc', 'turnkey', 'labour_only');--> statement-breakpoint
CREATE TYPE "public"."dpr_status" AS ENUM('draft', 'submitted', 'approved');--> statement-breakpoint
CREATE TYPE "public"."ra_bill_status" AS ENUM('draft', 'submitted', 'under_review', 'certified', 'approved', 'paid', 'rejected', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."site_grn_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."site_material_request_status" AS ENUM('draft', 'approved', 'issued', 'partially_issued');--> statement-breakpoint
CREATE TYPE "public"."tds_rate_type" AS ENUM('individual_huf', 'company_firm', 'professional');--> statement-breakpoint
CREATE TYPE "public"."work_order_type" AS ENUM('subcontractor', 'supplier', 'labour', 'service');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"domain" varchar(255),
	"logo_url" text,
	"favicon_url" text,
	"primary_color" varchar(7) DEFAULT '#1B4F72',
	"secondary_color" varchar(7) DEFAULT '#2874A6',
	"plan_id" uuid,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"billing_email" varchar(255) NOT NULL,
	"max_users" integer DEFAULT 5 NOT NULL,
	"storage_limit_gb" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"avatar_url" text,
	"phone" varchar(20),
	"role_id" uuid,
	"status" "user_status" DEFAULT 'pending_verification' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret" varchar(255),
	"last_login_at" timestamp with time zone,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"password_changed_at" timestamp with time zone DEFAULT now(),
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"hierarchy_level" integer DEFAULT 0 NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"action" "audit_action" NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"changes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"account_type" "account_type" NOT NULL,
	"parent_id" uuid,
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_header" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"tax_rate_id" uuid,
	"department_id" uuid,
	"opening_balance" numeric(20, 4) DEFAULT '0' NOT NULL,
	"current_balance" numeric(20, 4) DEFAULT '0' NOT NULL,
	"normal_balance" "normal_balance" NOT NULL,
	"financial_statement" "financial_statement" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"account_id" uuid NOT NULL,
	"bank_name" varchar(255),
	"account_number_last4" varchar(4),
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"current_balance" numeric(20, 4) DEFAULT '0' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"date" date NOT NULL,
	"description" text,
	"amount" numeric(20, 4) NOT NULL,
	"running_balance" numeric(20, 4),
	"reference" varchar(255),
	"type" "bank_transaction_type" NOT NULL,
	"status" "bank_transaction_status" DEFAULT 'unmatched' NOT NULL,
	"matched_journal_line_id" uuid,
	"matched_by" "bank_matched_by",
	"import_source" "bank_import_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bill_number" varchar(50) NOT NULL,
	"vendor_id" uuid,
	"vendor_invoice_number" varchar(100),
	"status" "bill_status" DEFAULT 'draft' NOT NULL,
	"purchase_order_id" uuid,
	"issue_date" date NOT NULL,
	"received_date" date,
	"due_date" date NOT NULL,
	"payment_terms" "payment_terms" DEFAULT 'net_30',
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"exchange_rate" numeric(20, 8) DEFAULT '1' NOT NULL,
	"subtotal" numeric(20, 4) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"total" numeric(20, 4) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(20, 4) DEFAULT '0' NOT NULL,
	"balance_due" numeric(20, 4) DEFAULT '0' NOT NULL,
	"three_way_match_status" "three_way_match_status" DEFAULT 'not_applicable',
	"journal_entry_id" uuid,
	"notes" text,
	"attachments" text[],
	"ai_extracted" boolean DEFAULT false NOT NULL,
	"ai_confidence" numeric(5, 4),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" varchar(3) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"decimal_places" integer DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"from_currency" varchar(3) NOT NULL,
	"to_currency" varchar(3) NOT NULL,
	"rate" numeric(20, 8) NOT NULL,
	"effective_date" date NOT NULL,
	"source" "exchange_rate_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "fiscal_period_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "fiscal_period_status" DEFAULT 'open' NOT NULL,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"year_end_closing_done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"product_id" uuid,
	"description" text,
	"quantity" numeric(20, 4) DEFAULT '1' NOT NULL,
	"unit_price" numeric(20, 4) DEFAULT '0' NOT NULL,
	"unit_of_measure" varchar(50),
	"discount_type" "discount_type",
	"discount_value" numeric(20, 4),
	"discount_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"tax_rate_id" uuid,
	"tax_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"account_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"type" "invoice_type" DEFAULT 'standard' NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"customer_id" uuid,
	"billing_address" jsonb,
	"shipping_address" jsonb,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"payment_terms" "payment_terms" DEFAULT 'net_30',
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"exchange_rate" numeric(20, 8) DEFAULT '1' NOT NULL,
	"subtotal" numeric(20, 4) DEFAULT '0' NOT NULL,
	"discount_type" "discount_type",
	"discount_value" numeric(20, 4),
	"discount_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"total" numeric(20, 4) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(20, 4) DEFAULT '0' NOT NULL,
	"balance_due" numeric(20, 4) DEFAULT '0' NOT NULL,
	"notes" text,
	"customer_notes" text,
	"terms_and_conditions" text,
	"footer" text,
	"recurring" boolean DEFAULT false NOT NULL,
	"journal_entry_id" uuid,
	"credit_note_for_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entry_number" varchar(50) NOT NULL,
	"date" date NOT NULL,
	"posted_date" date,
	"reference" varchar(255),
	"description" text,
	"source_type" "journal_source_type" DEFAULT 'manual' NOT NULL,
	"source_id" uuid,
	"status" "journal_status" DEFAULT 'draft' NOT NULL,
	"is_reversing" boolean DEFAULT false NOT NULL,
	"reversed_by_id" uuid,
	"reverses_id" uuid,
	"fiscal_period_id" uuid,
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"exchange_rate" numeric(20, 8) DEFAULT '1' NOT NULL,
	"total_debit" numeric(20, 4) DEFAULT '0' NOT NULL,
	"total_credit" numeric(20, 4) DEFAULT '0' NOT NULL,
	"attachments" text[],
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"tags" text[],
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"account_id" uuid NOT NULL,
	"description" text,
	"debit_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"credit_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"base_debit_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"base_credit_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"department_id" uuid,
	"project_id" uuid,
	"contact_id" uuid,
	"tax_rate_id" uuid,
	"tax_amount" numeric(20, 4),
	"reconciled" boolean DEFAULT false NOT NULL,
	"reconciled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payment_number" varchar(50) NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(20, 4) NOT NULL,
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"exchange_rate" numeric(20, 8) DEFAULT '1' NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"reference" varchar(255),
	"bank_account_id" uuid,
	"customer_id" uuid,
	"vendor_id" uuid,
	"type" "payment_type" NOT NULL,
	"status" "payment_status" DEFAULT 'draft' NOT NULL,
	"journal_entry_id" uuid,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"rate" numeric(8, 4) NOT NULL,
	"type" "tax_type" DEFAULT 'percentage' NOT NULL,
	"scope" "tax_scope" DEFAULT 'both' NOT NULL,
	"is_compound" boolean DEFAULT false NOT NULL,
	"is_inclusive" boolean DEFAULT false NOT NULL,
	"account_id" uuid,
	"reporting_code" varchar(50),
	"effective_from" date,
	"effective_to" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "item_warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"quantity" numeric(20, 4) DEFAULT '0' NOT NULL,
	"reserved_quantity" numeric(20, 4) DEFAULT '0' NOT NULL,
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"description" text,
	"category_id" uuid,
	"item_type" "item_type" DEFAULT 'stock' NOT NULL,
	"unit" "unit_of_measure" DEFAULT 'each' NOT NULL,
	"purchase_price" numeric(20, 4) DEFAULT '0' NOT NULL,
	"selling_price" numeric(20, 4) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"image_url" text,
	"min_stock_level" integer DEFAULT 0 NOT NULL,
	"reorder_quantity" integer DEFAULT 0 NOT NULL,
	"weight" numeric(12, 4),
	"dimensions" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_adjustment_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adjustment_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"current_qty" numeric(20, 4) NOT NULL,
	"adjusted_qty" numeric(20, 4) NOT NULL,
	"difference_qty" numeric(20, 4) NOT NULL,
	"reason" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "stock_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"adjustment_number" varchar(50) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"reason" varchar(255) NOT NULL,
	"status" "stock_adjustment_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"adjusted_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"to_warehouse_id" uuid,
	"movement_type" "stock_movement_type" NOT NULL,
	"quantity" numeric(20, 4) NOT NULL,
	"unit_cost" numeric(20, 4),
	"reference" varchar(255),
	"description" text,
	"source_type" varchar(100),
	"source_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"subject" varchar(255) NOT NULL,
	"description" text,
	"contact_id" uuid,
	"deal_id" uuid,
	"assigned_to" uuid,
	"due_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"status" "activity_status" DEFAULT 'pending' NOT NULL,
	"priority" "activity_priority" DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "campaign_type" NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"start_date" date,
	"end_date" date,
	"budget" numeric(20, 4),
	"actual_cost" numeric(20, 4),
	"target_audience" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contact_group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"group_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" "contact_type" DEFAULT 'lead' NOT NULL,
	"salutation" varchar(20),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"mobile" varchar(50),
	"company" varchar(255),
	"job_title" varchar(255),
	"website" varchar(500),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"postal_code" varchar(20),
	"source" "contact_source",
	"status" "contact_status" DEFAULT 'active' NOT NULL,
	"assigned_to" uuid,
	"tags" text[],
	"notes" text,
	"image_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "deal_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"order" integer NOT NULL,
	"probability" integer DEFAULT 0 NOT NULL,
	"color" varchar(20),
	"is_default" boolean DEFAULT false NOT NULL,
	"is_won" boolean DEFAULT false NOT NULL,
	"is_lost" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"contact_id" uuid,
	"value" numeric(20, 4),
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"stage" "deal_stage_value" DEFAULT 'lead' NOT NULL,
	"stage_id" uuid,
	"probability" integer DEFAULT 0,
	"expected_close_date" date,
	"actual_close_date" date,
	"assigned_to" uuid,
	"source" "contact_source",
	"description" text,
	"lost_reason" text,
	"won_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"check_in" timestamp with time zone,
	"check_out" timestamp with time zone,
	"status" "attendance_status" DEFAULT 'present' NOT NULL,
	"working_hours" numeric(5, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"manager_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "designations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"level" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"employee_id" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"date_of_birth" date,
	"gender" "gender",
	"marital_status" "marital_status",
	"national_id" varchar(100),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"postal_code" varchar(20),
	"department_id" uuid,
	"designation_id" uuid,
	"manager_id" uuid,
	"employment_type" "employment_type" DEFAULT 'full_time' NOT NULL,
	"date_of_joining" date NOT NULL,
	"date_of_leaving" date,
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"emergency_contact_name" varchar(255),
	"emergency_contact_phone" varchar(20),
	"bank_name" varchar(255),
	"bank_account_number" varchar(100),
	"bank_routing_number" varchar(50),
	"profile_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "leave_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"fiscal_year" varchar(10) NOT NULL,
	"total_days" integer DEFAULT 0 NOT NULL,
	"used_days" integer DEFAULT 0 NOT NULL,
	"carried_forward_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "leave_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"total_days" integer NOT NULL,
	"reason" text,
	"status" "leave_application_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejected_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"default_days" integer DEFAULT 0 NOT NULL,
	"is_paid" boolean DEFAULT true NOT NULL,
	"is_carry_forward" boolean DEFAULT false NOT NULL,
	"max_carry_forward_days" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payroll_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"period" varchar(10) NOT NULL,
	"salary_structure_id" uuid,
	"gross_pay" numeric(20, 4) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(20, 4) DEFAULT '0' NOT NULL,
	"net_pay" numeric(20, 4) DEFAULT '0' NOT NULL,
	"payroll_entry_status" "payroll_status" DEFAULT 'draft' NOT NULL,
	"paid_date" date,
	"payroll_payment_method" "payroll_payment_method",
	"journal_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payroll_entry_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_entry_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"payroll_component_type" "salary_component_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"type" "salary_component_type" NOT NULL,
	"is_taxable" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "salary_structure_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"structure_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"formula" text,
	"amount" numeric(20, 4),
	"percentage" numeric(8, 4),
	"based_on" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "salary_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_number" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"customer_type" "customer_type" DEFAULT 'company' NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"mobile" varchar(50),
	"company" varchar(255),
	"tax_id" varchar(100),
	"website" varchar(500),
	"billing_address" text,
	"billing_city" varchar(100),
	"billing_state" varchar(100),
	"billing_country" varchar(100),
	"billing_postal_code" varchar(20),
	"shipping_address" text,
	"shipping_city" varchar(100),
	"shipping_state" varchar(100),
	"shipping_country" varchar(100),
	"shipping_postal_code" varchar(20),
	"credit_limit" numeric(20, 4) DEFAULT '0' NOT NULL,
	"outstanding_balance" numeric(20, 4) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"payment_terms" varchar(100),
	"status" "customer_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"assigned_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "delivery_note_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_note_id" uuid NOT NULL,
	"sales_order_line_id" uuid,
	"item_id" uuid NOT NULL,
	"quantity" numeric(20, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"delivery_number" varchar(50) NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"delivery_date" date NOT NULL,
	"status" "delivery_note_status" DEFAULT 'draft' NOT NULL,
	"carrier" varchar(255),
	"tracking_number" varchar(255),
	"shipping_address" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quotation_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"description" text,
	"quantity" numeric(20, 4) NOT NULL,
	"unit_price" numeric(20, 4) NOT NULL,
	"discount" numeric(8, 4) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"line_total" numeric(20, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"quotation_number" varchar(50) NOT NULL,
	"customer_id" uuid NOT NULL,
	"quotation_date" date NOT NULL,
	"valid_until" date NOT NULL,
	"status" "quotation_status" DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(20, 4) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"total_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"notes" text,
	"terms_and_conditions" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"description" text,
	"quantity" numeric(20, 4) NOT NULL,
	"unit_price" numeric(20, 4) NOT NULL,
	"discount" numeric(8, 4) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"line_total" numeric(20, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"customer_id" uuid NOT NULL,
	"quotation_id" uuid,
	"order_date" date NOT NULL,
	"delivery_date" date,
	"status" "sales_order_status" DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(20, 4) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"total_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"notes" text,
	"terms_and_conditions" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "purchase_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"description" text,
	"quantity" numeric(20, 4) NOT NULL,
	"received_qty" numeric(20, 4) DEFAULT '0' NOT NULL,
	"unit_price" numeric(20, 4) NOT NULL,
	"discount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"line_total" numeric(20, 4) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"order_date" date NOT NULL,
	"expected_delivery" date,
	"status" "purchase_order_status" DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(20, 4) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"total_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"notes" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "purchase_receipt_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_receipt_id" uuid NOT NULL,
	"purchase_order_line_id" uuid,
	"item_id" uuid NOT NULL,
	"accepted_qty" numeric(20, 4) DEFAULT '0' NOT NULL,
	"rejected_qty" numeric(20, 4) DEFAULT '0' NOT NULL,
	"rejected_reason" text
);
--> statement-breakpoint
CREATE TABLE "purchase_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"purchase_order_id" uuid,
	"supplier_id" uuid NOT NULL,
	"receipt_date" date NOT NULL,
	"status" "purchase_receipt_status" DEFAULT 'draft' NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "supplier_quotation_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"description" text,
	"quantity" numeric(20, 4) NOT NULL,
	"unit_price" numeric(20, 4) NOT NULL,
	"lead_time" integer
);
--> statement-breakpoint
CREATE TABLE "supplier_quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"quotation_number" varchar(50) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"request_date" date NOT NULL,
	"valid_until" date,
	"status" "supplier_quotation_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"total_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"company" varchar(255),
	"tax_id" varchar(100),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"contact_person" varchar(255),
	"payment_terms" varchar(100),
	"status" "supplier_status" DEFAULT 'active' NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"website" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bom_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bom_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"quantity" numeric(20, 4) NOT NULL,
	"uom" varchar(50) DEFAULT 'Nos' NOT NULL,
	"rate" numeric(20, 4) DEFAULT '0' NOT NULL,
	"amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bom_number" varchar(50) NOT NULL,
	"item_id" uuid NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"quantity" numeric(20, 4) DEFAULT '1' NOT NULL,
	"uom" varchar(50) DEFAULT 'Nos' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" "bom_status" DEFAULT 'draft' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"workstation" varchar(255),
	"default_time" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "work_order_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"work_order_id" uuid NOT NULL,
	"operation_name" varchar(255) NOT NULL,
	"workstation" varchar(255),
	"planned_time" numeric(10, 2) DEFAULT '0' NOT NULL,
	"actual_time" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" "work_order_operation_status" DEFAULT 'pending' NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"work_order_number" varchar(50) NOT NULL,
	"bom_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"quantity" numeric(20, 4) NOT NULL,
	"pending_qty" numeric(20, 4) DEFAULT '0' NOT NULL,
	"completed_qty" numeric(20, 4) DEFAULT '0' NOT NULL,
	"uom" varchar(50) DEFAULT 'Nos' NOT NULL,
	"planned_start_date" date,
	"planned_end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"status" "work_order_status" DEFAULT 'draft' NOT NULL,
	"priority" "work_order_priority" DEFAULT 'medium' NOT NULL,
	"warehouse" varchar(255),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workstations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"hourly_rate" numeric(20, 4) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"production_capacity" integer DEFAULT 0 NOT NULL,
	"working_hours" numeric(5, 2) DEFAULT '8' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_number" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "project_task_status" DEFAULT 'open' NOT NULL,
	"priority" "project_priority" DEFAULT 'medium' NOT NULL,
	"assigned_to" uuid,
	"start_date" date,
	"end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"estimated_hours" numeric(10, 2) DEFAULT '0' NOT NULL,
	"actual_hours" numeric(10, 2) DEFAULT '0' NOT NULL,
	"percent_complete" integer DEFAULT 0 NOT NULL,
	"parent_task_id" uuid,
	"depends_on" uuid,
	"is_milestone" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"posted_by" uuid,
	"status" "project_update_status" DEFAULT 'info' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"project_number" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'planning' NOT NULL,
	"priority" "project_priority" DEFAULT 'medium' NOT NULL,
	"project_type" varchar(100),
	"department" varchar(100),
	"company" varchar(255),
	"estimated_cost" numeric(20, 4) DEFAULT '0' NOT NULL,
	"actual_cost" numeric(20, 4) DEFAULT '0' NOT NULL,
	"percent_complete" integer DEFAULT 0 NOT NULL,
	"start_date" date,
	"end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"project_manager" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "timesheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid,
	"employee_name" varchar(255) NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid,
	"activity_type" varchar(100) NOT NULL,
	"hours" numeric(10, 2) NOT NULL,
	"billing_hours" numeric(10, 2) DEFAULT '0' NOT NULL,
	"billing_rate" numeric(20, 4) DEFAULT '0' NOT NULL,
	"billing_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"date" date NOT NULL,
	"description" text,
	"status" timesheet_status DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "asset_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"depreciation_method" "depreciation_method" DEFAULT 'straight_line' NOT NULL,
	"useful_life" integer DEFAULT 60 NOT NULL,
	"account_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "asset_maintenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"maintenance_type" "maintenance_type" DEFAULT 'preventive' NOT NULL,
	"maintenance_date" date NOT NULL,
	"next_maintenance_date" date,
	"cost" numeric(20, 4) DEFAULT '0' NOT NULL,
	"performed_by" varchar(255),
	"description" text,
	"status" "maintenance_status" DEFAULT 'planned' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "asset_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"from_location" varchar(255),
	"to_location" varchar(255),
	"movement_date" date NOT NULL,
	"reason" text,
	"moved_by" uuid,
	"status" "movement_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_number" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"asset_category" uuid,
	"status" "asset_status" DEFAULT 'draft' NOT NULL,
	"location" varchar(255),
	"department" varchar(255),
	"custodian" uuid,
	"purchase_date" date,
	"purchase_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"current_value" numeric(20, 4) DEFAULT '0' NOT NULL,
	"depreciation_method" "depreciation_method" DEFAULT 'straight_line' NOT NULL,
	"useful_life" integer DEFAULT 60 NOT NULL,
	"salvage_value" numeric(20, 4) DEFAULT '0' NOT NULL,
	"last_depreciation_date" date,
	"warranty_expiry" date,
	"serial_number" varchar(255),
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "non_conformance_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"ncr_number" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"inspection_id" uuid,
	"severity" "ncr_severity" DEFAULT 'minor' NOT NULL,
	"status" "ncr_status" DEFAULT 'open' NOT NULL,
	"root_cause" text,
	"corrective_action" text,
	"preventive_action" text,
	"assigned_to" uuid,
	"due_date" date,
	"closed_date" date,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quality_inspection_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"inspection_id" uuid NOT NULL,
	"parameter" varchar(255) NOT NULL,
	"specification" varchar(255),
	"min_value" numeric(20, 4),
	"max_value" numeric(20, 4),
	"actual_value" numeric(20, 4),
	"status" "inspection_reading_status" DEFAULT 'accepted' NOT NULL,
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "quality_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"inspection_number" varchar(50) NOT NULL,
	"reference_type" "inspection_reference_type" NOT NULL,
	"reference_id" uuid,
	"reference_name" varchar(255),
	"item_id" uuid,
	"item_name" varchar(255),
	"inspected_by" uuid,
	"inspection_date" date NOT NULL,
	"status" "inspection_status" DEFAULT 'draft' NOT NULL,
	"batch_number" varchar(100),
	"sample_size" integer,
	"accepted_quantity" integer,
	"rejected_quantity" integer,
	"remarks" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quality_procedures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"process_owner" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"steps" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text,
	"category" varchar(255),
	"tags" text,
	"author" uuid,
	"status" "kb_article_status" DEFAULT 'draft' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sla_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"priority" "ticket_priority" NOT NULL,
	"first_response_hours" integer NOT NULL,
	"resolution_hours" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"escalate_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ticket_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"ticket_id" uuid NOT NULL,
	"content" text NOT NULL,
	"commented_by" uuid,
	"is_internal" boolean DEFAULT false NOT NULL,
	"attachments" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"ticket_number" varchar(50) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"description" text,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"category" varchar(255),
	"sub_category" varchar(255),
	"contact_name" varchar(255),
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"assigned_to" uuid,
	"assigned_group" varchar(255),
	"source" "ticket_source" DEFAULT 'web' NOT NULL,
	"resolution" text,
	"first_response_time" timestamp with time zone,
	"resolution_time" timestamp with time zone,
	"satisfaction_rating" integer,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boq_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"item_code" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"item_type" "boq_item_type" DEFAULT 'civil' NOT NULL,
	"unit" varchar(50) NOT NULL,
	"quantity" numeric(20, 4) NOT NULL,
	"rate" numeric(20, 4) NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"quantity_executed" numeric(20, 4) DEFAULT '0' NOT NULL,
	"amount_billed" numeric(20, 2) DEFAULT '0' NOT NULL,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_provisional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "construction_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_number" varchar(50) NOT NULL,
	"name" varchar(500) NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"client_gstin" varchar(20),
	"contract_type" "construction_contract_type" DEFAULT 'item_rate' NOT NULL,
	"status" "construction_contract_status" DEFAULT 'draft' NOT NULL,
	"contract_value" numeric(20, 2) NOT NULL,
	"gst_rate" numeric(6, 2) DEFAULT '12' NOT NULL,
	"retention_percentage" numeric(6, 2) DEFAULT '5' NOT NULL,
	"mobilisation_advance" numeric(20, 2) DEFAULT '0' NOT NULL,
	"start_date" date,
	"end_date" date,
	"revised_end_date" date,
	"project_location" varchar(500),
	"state" varchar(100),
	"is_rera_applicable" boolean DEFAULT false NOT NULL,
	"rera_number" varchar(100),
	"is_bocw_applicable" boolean DEFAULT true NOT NULL,
	"total_billed" numeric(20, 2) DEFAULT '0' NOT NULL,
	"total_received" numeric(20, 2) DEFAULT '0' NOT NULL,
	"retention_held" numeric(20, 2) DEFAULT '0' NOT NULL,
	"completion_percentage" numeric(6, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dpr_work_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dpr_id" uuid NOT NULL,
	"boq_item_id" uuid,
	"description" text NOT NULL,
	"unit" varchar(50) NOT NULL,
	"quantity_today" numeric(20, 4) NOT NULL,
	"cumulative_quantity" numeric(20, 4) NOT NULL,
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "dprs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"dpr_number" varchar(50) NOT NULL,
	"report_date" date NOT NULL,
	"status" "dpr_status" DEFAULT 'draft' NOT NULL,
	"weather" varchar(100),
	"temperature" varchar(20),
	"skilled_labour" integer DEFAULT 0 NOT NULL,
	"unskilled_labour" integer DEFAULT 0 NOT NULL,
	"supervisors" integer DEFAULT 0 NOT NULL,
	"engineers" integer DEFAULT 0 NOT NULL,
	"equipment_details" jsonb,
	"work_done_today" text,
	"issues_observed" text,
	"next_day_plan" text,
	"visitors_on_site" text,
	"submitted_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurement_book_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mb_id" uuid NOT NULL,
	"boq_item_id" uuid NOT NULL,
	"description" text,
	"no_of_items" numeric(10, 2) DEFAULT '1',
	"length" numeric(12, 4),
	"breadth" numeric(12, 4),
	"height" numeric(12, 4),
	"quantity" numeric(20, 4) NOT NULL,
	"rate" numeric(20, 4) NOT NULL,
	"amount" numeric(20, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurement_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"mb_number" varchar(50) NOT NULL,
	"measurement_date" date NOT NULL,
	"measured_by" varchar(255),
	"checked_by" varchar(255),
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ra_bill_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ra_bill_id" uuid NOT NULL,
	"boq_item_id" uuid NOT NULL,
	"mb_id" uuid,
	"description" text,
	"unit" varchar(50) NOT NULL,
	"total_quantity" numeric(20, 4) NOT NULL,
	"previous_quantity" numeric(20, 4) DEFAULT '0' NOT NULL,
	"current_quantity" numeric(20, 4) NOT NULL,
	"rate" numeric(20, 4) NOT NULL,
	"amount" numeric(20, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ra_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"bill_number" varchar(50) NOT NULL,
	"bill_date" date NOT NULL,
	"status" "ra_bill_status" DEFAULT 'draft' NOT NULL,
	"bill_sequence" integer DEFAULT 1 NOT NULL,
	"gross_amount" numeric(20, 2) NOT NULL,
	"previous_billed_amount" numeric(20, 2) DEFAULT '0' NOT NULL,
	"current_bill_amount" numeric(20, 2) NOT NULL,
	"retention_amount" numeric(20, 2) DEFAULT '0' NOT NULL,
	"mobilisation_recovery" numeric(20, 2) DEFAULT '0' NOT NULL,
	"other_deductions" numeric(20, 2) DEFAULT '0' NOT NULL,
	"gst_amount" numeric(20, 2) DEFAULT '0' NOT NULL,
	"gst_rate" numeric(6, 2) DEFAULT '12' NOT NULL,
	"net_payable" numeric(20, 2) NOT NULL,
	"measurement_period_from" date,
	"measurement_period_to" date,
	"journal_entry_id" uuid,
	"ar_invoice_id" uuid,
	"certified_by" varchar(255),
	"certified_at" timestamp with time zone,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_grn_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_grn_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"item_description" varchar(500),
	"unit" varchar(50) NOT NULL,
	"quantity_ordered" numeric(20, 4),
	"quantity_received" numeric(20, 4) NOT NULL,
	"quantity_rejected" numeric(20, 4) DEFAULT '0' NOT NULL,
	"unit_rate" numeric(20, 4) NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"boq_item_id" uuid
);
--> statement-breakpoint
CREATE TABLE "site_grns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"grn_number" varchar(50) NOT NULL,
	"grn_date" date NOT NULL,
	"status" "site_grn_status" DEFAULT 'draft' NOT NULL,
	"work_order_id" uuid,
	"supplier_name" varchar(255),
	"vehicle_number" varchar(30),
	"challan_number" varchar(100),
	"warehouse_id" uuid,
	"total_value" numeric(20, 2) DEFAULT '0' NOT NULL,
	"journal_entry_id" uuid,
	"received_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_material_issue_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"item_description" varchar(500),
	"unit" varchar(50) NOT NULL,
	"quantity_issued" numeric(20, 4) NOT NULL,
	"unit_rate" numeric(20, 4) NOT NULL,
	"amount" numeric(20, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_material_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"issue_number" varchar(50) NOT NULL,
	"issue_date" date NOT NULL,
	"status" "site_material_request_status" DEFAULT 'draft' NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"issued_to" varchar(255),
	"boq_item_id" uuid,
	"total_value" numeric(20, 2) DEFAULT '0' NOT NULL,
	"journal_entry_id" uuid,
	"approved_by" uuid,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "work_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"boq_item_id" uuid,
	"description" text NOT NULL,
	"unit" varchar(50),
	"quantity" numeric(20, 4),
	"rate" numeric(20, 4),
	"amount" numeric(20, 2) NOT NULL,
	"line_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_order_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"work_order_id" uuid NOT NULL,
	"payment_number" varchar(50) NOT NULL,
	"payment_date" date NOT NULL,
	"gross_amount" numeric(20, 2) NOT NULL,
	"gst_amount" numeric(20, 2) DEFAULT '0' NOT NULL,
	"tds_amount" numeric(20, 2) DEFAULT '0' NOT NULL,
	"retention_amount" numeric(20, 2) DEFAULT '0' NOT NULL,
	"net_payable" numeric(20, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"journal_entry_id" uuid,
	"notes" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_matched_journal_line_id_journal_lines_id_fk" FOREIGN KEY ("matched_journal_line_id") REFERENCES "public"."journal_lines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_warehouses" ADD CONSTRAINT "item_warehouses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_warehouses" ADD CONSTRAINT "item_warehouses_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_warehouses" ADD CONSTRAINT "item_warehouses_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_lines" ADD CONSTRAINT "stock_adjustment_lines_adjustment_id_stock_adjustments_id_fk" FOREIGN KEY ("adjustment_id") REFERENCES "public"."stock_adjustments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_lines" ADD CONSTRAINT "stock_adjustment_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_adjusted_by_users_id_fk" FOREIGN KEY ("adjusted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_group_members" ADD CONSTRAINT "contact_group_members_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_group_members" ADD CONSTRAINT "contact_group_members_group_id_contact_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."contact_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stages" ADD CONSTRAINT "deal_stages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_deal_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."deal_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designations" ADD CONSTRAINT "designations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_designation_id_designations_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_allocations" ADD CONSTRAINT "leave_allocations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_allocations" ADD CONSTRAINT "leave_allocations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_allocations" ADD CONSTRAINT "leave_allocations_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_salary_structure_id_salary_structures_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entry_components" ADD CONSTRAINT "payroll_entry_components_payroll_entry_id_payroll_entries_id_fk" FOREIGN KEY ("payroll_entry_id") REFERENCES "public"."payroll_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entry_components" ADD CONSTRAINT "payroll_entry_components_component_id_salary_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."salary_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structure_components" ADD CONSTRAINT "salary_structure_components_structure_id_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structure_components" ADD CONSTRAINT "salary_structure_components_component_id_salary_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."salary_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_note_lines" ADD CONSTRAINT "delivery_note_lines_delivery_note_id_delivery_notes_id_fk" FOREIGN KEY ("delivery_note_id") REFERENCES "public"."delivery_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_note_lines" ADD CONSTRAINT "delivery_note_lines_sales_order_line_id_sales_order_lines_id_fk" FOREIGN KEY ("sales_order_line_id") REFERENCES "public"."sales_order_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_note_lines" ADD CONSTRAINT "delivery_note_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_lines" ADD CONSTRAINT "purchase_receipt_lines_purchase_receipt_id_purchase_receipts_id_fk" FOREIGN KEY ("purchase_receipt_id") REFERENCES "public"."purchase_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_lines" ADD CONSTRAINT "purchase_receipt_lines_purchase_order_line_id_purchase_order_lines_id_fk" FOREIGN KEY ("purchase_order_line_id") REFERENCES "public"."purchase_order_lines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_lines" ADD CONSTRAINT "purchase_receipt_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotation_lines" ADD CONSTRAINT "supplier_quotation_lines_quotation_id_supplier_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."supplier_quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotation_lines" ADD CONSTRAINT "supplier_quotation_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_bom_id_boms_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."boms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boms" ADD CONSTRAINT "boms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boms" ADD CONSTRAINT "boms_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_operations" ADD CONSTRAINT "work_order_operations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_operations" ADD CONSTRAINT "work_order_operations_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_bom_id_boms_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."boms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workstations" ADD CONSTRAINT "workstations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_manager_users_id_fk" FOREIGN KEY ("project_manager") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_task_id_project_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_moved_by_users_id_fk" FOREIGN KEY ("moved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_asset_category_asset_categories_id_fk" FOREIGN KEY ("asset_category") REFERENCES "public"."asset_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_custodian_users_id_fk" FOREIGN KEY ("custodian") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "non_conformance_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "non_conformance_reports_inspection_id_quality_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."quality_inspections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "non_conformance_reports_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "non_conformance_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspection_readings" ADD CONSTRAINT "quality_inspection_readings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspection_readings" ADD CONSTRAINT "quality_inspection_readings_inspection_id_quality_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."quality_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_inspected_by_users_id_fk" FOREIGN KEY ("inspected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_procedures" ADD CONSTRAINT "quality_procedures_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_procedures" ADD CONSTRAINT "quality_procedures_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_articles" ADD CONSTRAINT "knowledge_base_articles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_articles" ADD CONSTRAINT "knowledge_base_articles_author_users_id_fk" FOREIGN KEY ("author") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_escalate_to_users_id_fk" FOREIGN KEY ("escalate_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_commented_by_users_id_fk" FOREIGN KEY ("commented_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_contract_id_construction_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."construction_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_contracts" ADD CONSTRAINT "construction_contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_contracts" ADD CONSTRAINT "construction_contracts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpr_work_items" ADD CONSTRAINT "dpr_work_items_dpr_id_dprs_id_fk" FOREIGN KEY ("dpr_id") REFERENCES "public"."dprs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpr_work_items" ADD CONSTRAINT "dpr_work_items_boq_item_id_boq_items_id_fk" FOREIGN KEY ("boq_item_id") REFERENCES "public"."boq_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dprs" ADD CONSTRAINT "dprs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dprs" ADD CONSTRAINT "dprs_contract_id_construction_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."construction_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dprs" ADD CONSTRAINT "dprs_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dprs" ADD CONSTRAINT "dprs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_book_lines" ADD CONSTRAINT "measurement_book_lines_mb_id_measurement_books_id_fk" FOREIGN KEY ("mb_id") REFERENCES "public"."measurement_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_book_lines" ADD CONSTRAINT "measurement_book_lines_boq_item_id_boq_items_id_fk" FOREIGN KEY ("boq_item_id") REFERENCES "public"."boq_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_books" ADD CONSTRAINT "measurement_books_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_books" ADD CONSTRAINT "measurement_books_contract_id_construction_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."construction_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_books" ADD CONSTRAINT "measurement_books_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ra_bill_lines" ADD CONSTRAINT "ra_bill_lines_ra_bill_id_ra_bills_id_fk" FOREIGN KEY ("ra_bill_id") REFERENCES "public"."ra_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ra_bill_lines" ADD CONSTRAINT "ra_bill_lines_boq_item_id_boq_items_id_fk" FOREIGN KEY ("boq_item_id") REFERENCES "public"."boq_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ra_bill_lines" ADD CONSTRAINT "ra_bill_lines_mb_id_measurement_books_id_fk" FOREIGN KEY ("mb_id") REFERENCES "public"."measurement_books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_contract_id_construction_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."construction_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_grn_lines" ADD CONSTRAINT "site_grn_lines_site_grn_id_site_grns_id_fk" FOREIGN KEY ("site_grn_id") REFERENCES "public"."site_grns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_grn_lines" ADD CONSTRAINT "site_grn_lines_boq_item_id_boq_items_id_fk" FOREIGN KEY ("boq_item_id") REFERENCES "public"."boq_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_grns" ADD CONSTRAINT "site_grns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_grns" ADD CONSTRAINT "site_grns_contract_id_construction_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."construction_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_grns" ADD CONSTRAINT "site_grns_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_grns" ADD CONSTRAINT "site_grns_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_grns" ADD CONSTRAINT "site_grns_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_material_issue_lines" ADD CONSTRAINT "site_material_issue_lines_issue_id_site_material_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."site_material_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_material_issues" ADD CONSTRAINT "site_material_issues_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_material_issues" ADD CONSTRAINT "site_material_issues_contract_id_construction_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."construction_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_material_issues" ADD CONSTRAINT "site_material_issues_boq_item_id_boq_items_id_fk" FOREIGN KEY ("boq_item_id") REFERENCES "public"."boq_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_material_issues" ADD CONSTRAINT "site_material_issues_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_material_issues" ADD CONSTRAINT "site_material_issues_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_lines" ADD CONSTRAINT "work_order_lines_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_lines" ADD CONSTRAINT "work_order_lines_boq_item_id_boq_items_id_fk" FOREIGN KEY ("boq_item_id") REFERENCES "public"."boq_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_payments" ADD CONSTRAINT "work_order_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_payments" ADD CONSTRAINT "work_order_payments_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_payments" ADD CONSTRAINT "work_order_payments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_payments" ADD CONSTRAINT "work_order_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;