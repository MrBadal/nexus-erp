CREATE TYPE "public"."payment_allocation_doc_type" AS ENUM('invoice', 'bill', 'credit_note', 'debit_note');--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"document_type" "payment_allocation_doc_type" NOT NULL,
	"document_id" uuid NOT NULL,
	"amount" numeric(20, 4) NOT NULL,
	"allocated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "business_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_name" varchar(255),
	"address_line1" varchar(255),
	"address_line2" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100) DEFAULT 'India',
	"phone" varchar(30),
	"website" varchar(255),
	"tax_id" varchar(50),
	"gst_number" varchar(20),
	"pan_number" varchar(15),
	"industry" varchar(100),
	"logo_url" text,
	"default_currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"fiscal_year_start_month" integer DEFAULT 4 NOT NULL,
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata' NOT NULL,
	"date_format" varchar(20) DEFAULT 'DD/MM/YYYY' NOT NULL,
	"setup_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "number_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"prefix" varchar(20) NOT NULL,
	"suffix" varchar(20),
	"current_number" integer DEFAULT 0 NOT NULL,
	"pad_length" integer DEFAULT 6 NOT NULL,
	"fiscal_year" varchar(10),
	"reset_annually" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "hsn_code" varchar(20);--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "cgst_rate" numeric(8, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "sgst_rate" numeric(8, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "igst_rate" numeric(8, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "cgst_amount" numeric(20, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "sgst_amount" numeric(20, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "igst_amount" numeric(20, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "sales_order_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "hsn_code" varchar(20);--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "default_tax_rate_id" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "purchase_order_id" uuid;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "bill_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "number_series" ADD CONSTRAINT "number_series_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;