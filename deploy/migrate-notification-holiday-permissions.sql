-- Idempotent grant: notifications:read, notifications:write, ess:read_holidays
-- to every non-admin role, for every tenant.
--
-- Context: PermissionsGuard was wired onto notification.controller.ts and
-- holiday-ess.controller.ts (see docs/crm/00-DISCOVERY.md guard audit). Fresh
-- tenant registrations already get these grants automatically going forward
-- (tenant-onboarding.service.ts's seedAdditionalRoles was updated in the same
-- change). This script exists to converge any tenant whose roles were seeded
-- BEFORE that code change -- today that is exactly one tenant (`demo`), which
-- was already patched ad hoc directly in production; this script is written to
-- be a safe no-op against that tenant and the correct, tracked mechanism for
-- any other pre-existing tenant, now or from a future restore/replica.
--
-- Backfill: the UPDATE below. No new column, no NOT NULL constraint being
-- added -- purely appends to an existing jsonb array, guarded so it never
-- appends a permission a role already has (idempotent: safe to run any number
-- of times, in any order, against any tenant).
-- Rollback: remove the three grants added by this specific run --
--   UPDATE roles
--   SET permissions = permissions - 'notifications:read' - 'notifications:write' - 'ess:read_holidays'
--   WHERE slug != 'admin';
-- (jsonb `-` operator removes a matching top-level array element by value;
-- safe against roles that never had the grant in the first place -- it's a
-- no-op for them, same as the forward direction.)

UPDATE roles
SET permissions = permissions
  || (CASE WHEN NOT (permissions ? 'notifications:read') THEN '["notifications:read"]'::jsonb ELSE '[]'::jsonb END)
  || (CASE WHEN NOT (permissions ? 'notifications:write') THEN '["notifications:write"]'::jsonb ELSE '[]'::jsonb END)
  || (CASE WHEN NOT (permissions ? 'ess:read_holidays') THEN '["ess:read_holidays"]'::jsonb ELSE '[]'::jsonb END)
WHERE slug != 'admin'
  AND NOT (
    permissions ? 'notifications:read'
    AND permissions ? 'notifications:write'
    AND permissions ? 'ess:read_holidays'
  );
