-- Reorder-check indexes for items / item_warehouses.
--
-- Provenance: this is the surviving, non-redundant delta from a file that used
-- to live at apps/api/src/database/migrations/0005_inventory_valuation_reorder.sql.
-- That file's enum + ALTER TABLE statements (valuation_method, default_supplier_id,
-- item_warehouses.valuation_rate) turned out to already be covered by the officially
-- drizzle-kit-generated 0004_complex_whizzer.sql (which IS registered in
-- meta/_journal.json). This file's TWO indexes were the only part 0004_complex_whizzer
-- did not already create, and the file itself was never registered in the drizzle
-- journal, so `drizzle-kit migrate` would never have applied it. Confirmed via a
-- live-DB check (2026-08-15) that neither index exists on the production database yet.
--
-- This lives outside apps/api/src/database/migrations/ deliberately: it must NOT be
-- mistaken for a drizzle-kit-tracked migration. Phase 1a's migration-hygiene work
-- will fold this into a proper `drizzle-kit generate` migration (capturing this and
-- all other schema drift accumulated since 0004_complex_whizzer via `push --force`)
-- and then this file can be deleted.

CREATE INDEX IF NOT EXISTS "idx_item_warehouses_reorder" ON "item_warehouses" ("tenant_id", "item_id", "quantity");
CREATE INDEX IF NOT EXISTS "idx_items_default_supplier" ON "items" ("default_supplier_id") WHERE "default_supplier_id" IS NOT NULL;
