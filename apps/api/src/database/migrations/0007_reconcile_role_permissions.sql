-- Reconciles already-provisioned tenants' role permissions with what current
-- code (permissions.constants.ts ROLE_PERMISSIONS, as of commit e6969cd) now
-- produces for newly-registered tenants. Two gaps, both confirmed live via a
-- direct read of production data on 2026-08-16, not assumed from code:
--
-- 1. The 'viewer' role still grants hr:read on every already-provisioned
--    tenant. Removed from ROLE_PERMISSIONS.viewer in commit 194e22c, but that
--    only affects tenants provisioned AFTER that commit -- code changes never
--    retroactively touch already-stored role rows. Confirmed live: the demo
--    tenant's viewer role permissions array still contains "hr:read".
--    Confirmed no user currently holds the viewer role (zero active
--    exploitation), but the grant itself is live and assignable at any time.
--
-- 2. notifications:read / notifications:write / ess:read_holidays -- these
--    ARE already present on every non-admin role for the one known tenant
--    (applied ad hoc via deploy/migrate-notification-holiday-permissions.sql,
--    which this migration formally supersedes and retires -- see
--    docs/crm/02-SCHEMA-MIGRATION-DESIGN.md's policy-breach note). Included
--    here, idempotently, so this migration is the single correct mechanism
--    for ANY tenant missing them -- not just the one already patched by hand.
--
-- SCOPE NOTE: verified correct against the one tenant confirmed to exist at
-- time of writing (`demo`, 2026-07-08). Both UPDATEs below are written as
-- generic conditions (role slug + jsonb permission-presence checks), not
-- filtered by tenant_id -- they already apply correctly to any number of
-- tenants, including ones that may exist by the time this actually runs
-- (auth.register is currently public and unauthenticated -- see the open
-- question in docs/crm/02-SCHEMA-MIGRATION-DESIGN.md about whether that
-- stays open). No rewrite is needed if the tenant count changes; this note
-- exists so that fact isn't assumed silently.
--
-- Idempotent: every guard checks current state before writing. Safe to run
-- any number of times, in any order, against any tenant -- including ones
-- provisioned after this migration exists in the chain, which will already
-- be correct and hit a no-op.
--
-- Rollback (reverts THIS migration's effect specifically -- re-adds hr:read
-- to every viewer role this migration removed it from; does not touch
-- notifications:read/write/ess:read_holidays, since removing those would
-- reopen the PermissionsGuard-wiring gap those grants exist to close):
--   UPDATE roles
--   SET permissions = permissions || '["hr:read"]'::jsonb
--   WHERE slug = 'viewer'
--     AND NOT (permissions ? 'hr:read');

-- 1. Remove hr:read from every 'viewer' role that currently has it.
UPDATE roles
SET permissions = permissions - 'hr:read'
WHERE slug = 'viewer'
  AND permissions ? 'hr:read';

-- 2. Grant notifications:read / notifications:write / ess:read_holidays to
--    every non-admin role missing any of the three.
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
