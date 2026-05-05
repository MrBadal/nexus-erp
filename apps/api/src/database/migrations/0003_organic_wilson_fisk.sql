CREATE TABLE "bill_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"item_id" uuid,
	"purchase_order_line_id" uuid,
	"description" text,
	"quantity" numeric(20, 4) DEFAULT '1' NOT NULL,
	"unit_price" numeric(20, 4) DEFAULT '0' NOT NULL,
	"discount_type" "discount_type",
	"discount_value" numeric(20, 4) DEFAULT '0',
	"tax_amount" numeric(20, 4) DEFAULT '0' NOT NULL,
	"line_total" numeric(20, 4) DEFAULT '0' NOT NULL,
	"account_id" uuid,
	"hsn_code" varchar(20),
	"cgst_rate" numeric(8, 4) DEFAULT '0',
	"sgst_rate" numeric(8, 4) DEFAULT '0',
	"igst_rate" numeric(8, 4) DEFAULT '0',
	"cgst_amount" numeric(20, 4) DEFAULT '0',
	"sgst_amount" numeric(20, 4) DEFAULT '0',
	"igst_amount" numeric(20, 4) DEFAULT '0'
);
--> statement-breakpoint
ALTER TABLE "bill_lines" ADD CONSTRAINT "bill_lines_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;