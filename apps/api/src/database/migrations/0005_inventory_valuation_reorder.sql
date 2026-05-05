-- Inventory: Stock Valuation + Reorder enhancements
-- Phase 3 of NexusERP Complete Functionality Plan

-- New enum
DO $$ BEGIN
  CREATE TYPE "public"."valuation_method" AS ENUM('weighted_average', 'fifo', 'manual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add valuation method and default supplier to items
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "valuation_method" "valuation_method" DEFAULT 'weighted_average';
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "default_supplier_id" uuid;

-- Add valuation rate to item_warehouses
ALTER TABLE "item_warehouses" ADD COLUMN IF NOT EXISTS "valuation_rate" numeric(20, 4) DEFAULT '0' NOT NULL;

-- Index for reorder checks
CREATE INDEX IF NOT EXISTS "idx_item_warehouses_reorder" ON "item_warehouses" ("tenant_id", "item_id", "quantity");
CREATE INDEX IF NOT EXISTS "idx_items_default_supplier" ON "items" ("default_supplier_id") WHERE "default_supplier_id" IS NOT NULL;
