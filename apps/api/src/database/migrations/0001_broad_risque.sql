CREATE TYPE "public"."construction_work_order_status" AS ENUM('draft', 'approved', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "construction_work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"work_order_number" varchar(50) NOT NULL,
	"type" "work_order_type" DEFAULT 'subcontractor' NOT NULL,
	"status" "construction_work_order_status" DEFAULT 'draft' NOT NULL,
	"vendor_name" varchar(255) NOT NULL,
	"vendor_gstin" varchar(20),
	"vendor_pan" varchar(15),
	"vendor_type" "tds_rate_type" DEFAULT 'company_firm' NOT NULL,
	"scope_of_work" text NOT NULL,
	"work_location" varchar(500),
	"order_value" numeric(20, 2) NOT NULL,
	"gst_rate" numeric(6, 2) DEFAULT '12' NOT NULL,
	"retention_percentage" numeric(6, 2) DEFAULT '5' NOT NULL,
	"tds_applicable" boolean DEFAULT true NOT NULL,
	"tds_rate" numeric(6, 2) DEFAULT '2' NOT NULL,
	"tds_section" varchar(20) DEFAULT '194C' NOT NULL,
	"total_paid" numeric(20, 2) DEFAULT '0' NOT NULL,
	"tds_deducted" numeric(20, 2) DEFAULT '0' NOT NULL,
	"retention_held" numeric(20, 2) DEFAULT '0' NOT NULL,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "site_grns" DROP CONSTRAINT "site_grns_work_order_id_work_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "work_order_lines" DROP CONSTRAINT "work_order_lines_work_order_id_work_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "work_order_payments" DROP CONSTRAINT "work_order_payments_work_order_id_work_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "construction_work_orders" ADD CONSTRAINT "construction_work_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_work_orders" ADD CONSTRAINT "construction_work_orders_contract_id_construction_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."construction_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_work_orders" ADD CONSTRAINT "construction_work_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_work_orders" ADD CONSTRAINT "construction_work_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_grns" ADD CONSTRAINT "site_grns_work_order_id_construction_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."construction_work_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_lines" ADD CONSTRAINT "work_order_lines_work_order_id_construction_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."construction_work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_payments" ADD CONSTRAINT "work_order_payments_work_order_id_construction_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."construction_work_orders"("id") ON DELETE cascade ON UPDATE no action;